"""Report (or remove) CSS rules whose selectors can match nothing in index.html or app.js.

A rule counts as dead only when every comma-separated selector names at least one class or id that
appears nowhere in index.html and in no string of app.js. A class built at runtime from a template
such as `coach-msg-${sender}` stays alive through its prefix, which is read from app.js.

    python scripts/css_dead_selectors.py            # report
    python scripts/css_dead_selectors.py --apply    # remove dead rules, empty @media blocks and unused @keyframes
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS_PATH = ROOT / "styles.css"


def dynamic_prefixes():
    js = (ROOT / "app.js").read_text(encoding="utf-8")
    return tuple(sorted(set(re.findall(r"([a-z][a-z0-9-]*-)\$\{", js))))


def used_tokens():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    js = (ROOT / "app.js").read_text(encoding="utf-8")
    tokens = set()
    for match in re.finditer(r'(?:class|id)="([^"]*)"', html):
        tokens.update(match.group(1).split())
    # Every word-like piece of app.js that could be a class or id: its strings, templates and selectors.
    tokens.update(re.findall(r"[A-Za-z][A-Za-z0-9_-]+", js))
    return tokens


def selector_is_dead(selector, tokens):
    names = re.findall(r"[.#](-?[A-Za-z_][A-Za-z0-9_-]*)", re.sub(r"\[[^\]]*\]", "", selector))
    for name in names:
        if name in tokens or name.startswith(DYNAMIC_PREFIXES):
            continue
        return True
    return False


def parse(css):
    """Yield (start, end, prelude, body_start) for each top-level block; comments are skipped."""
    blocks = []
    i = 0
    n = len(css)
    while i < n:
        if css.startswith("/*", i):
            i = css.index("*/", i) + 2
            continue
        brace = css.find("{", i)
        semicolon = css.find(";", i)
        if brace == -1:
            break
        if semicolon != -1 and semicolon < brace and css[i:semicolon].strip().startswith("@"):
            i = semicolon + 1
            continue
        start = i
        prelude = css[i:brace]
        prelude = re.sub(r"/\*.*?\*/", "", prelude, flags=re.S).strip()
        depth = 1
        j = brace + 1
        while depth:
            if css.startswith("/*", j):
                j = css.index("*/", j) + 2
                continue
            if css[j] == "{":
                depth += 1
            elif css[j] == "}":
                depth -= 1
            j += 1
        blocks.append((start, j, prelude, brace + 1))
        i = j
    return blocks


def prune(css, tokens, removed):
    out = []
    cursor = 0
    for start, end, prelude, body_start in parse(css):
        if prelude.startswith(("@media", "@supports")):
            inner = prune(css[body_start:end - 1], tokens, removed)
            if inner.strip():
                out.append(css[cursor:body_start] + inner + "}")
            else:
                # Keep any comment that precedes the block out of the dropped text.
                out.append(css[cursor:start])
                removed.append(prelude + " (now empty)")
            cursor = end
        elif prelude.startswith("@"):
            continue
        else:
            selectors = [s.strip() for s in prelude.split(",") if s.strip()]
            alive = [s for s in selectors if not selector_is_dead(s, tokens)]
            if not alive:
                removed.append(prelude)
                out.append(css[cursor:start])
                cursor = end
            elif len(alive) < len(selectors):
                indent = re.match(r"\s*", css[start:]).group(0)
                removed.append(", ".join(s for s in selectors if s not in alive) + " (selector only)")
                out.append(css[cursor:start] + indent + (",\n" + indent.lstrip("\n")).join(alive) + " " + css[body_start - 1:end])
                cursor = end
    out.append(css[cursor:])
    return "".join(out)


def drop_unused_keyframes(css, removed):
    for name in set(re.findall(r"@keyframes\s+([A-Za-z0-9_-]+)", css)):
        uses = len(re.findall(rf"(?<![A-Za-z0-9_-]){re.escape(name)}(?![A-Za-z0-9_-])", css))
        if uses > 1:
            continue
        for start, end, prelude, _ in parse(css):
            if prelude == f"@keyframes {name}":
                css = css[:start] + css[end:]
                removed.append(prelude)
                break
    return css


DYNAMIC_PREFIXES = dynamic_prefixes()


def main():
    raw = CSS_PATH.read_bytes().decode("utf-8")
    crlf = "\r\n" in raw
    css = raw.replace("\r\n", "\n")
    removed = []
    pruned = prune(css, used_tokens(), removed)
    pruned = drop_unused_keyframes(pruned, removed)
    pruned = re.sub(r"\n{3,}", "\n\n", pruned)
    print(f"{len(removed)} dead rules or selectors; {css.count(chr(10)) + 1} lines -> {pruned.count(chr(10)) + 1} lines")
    for item in removed:
        print("  ", item[:110].replace("\n", " "))
    if "--apply" in sys.argv:
        CSS_PATH.write_bytes((pruned.replace("\n", "\r\n") if crlf else pruned).encode("utf-8"))
        print("applied")


if __name__ == "__main__":
    main()
