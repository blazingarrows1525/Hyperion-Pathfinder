"""Inventory of the frontend's selector and data contract.

Records the DOM IDs that index.html defines and app.js depends on, inline handler
targets, CSS custom properties, appState keys and FastAPI routes, so a structural
redesign can be checked for dropped selectors.

    python scripts/frontend_inventory.py [--out docs/terra-atelier/selector_contract.json]
    python scripts/frontend_inventory.py --compare docs/terra-atelier/selector_contract_baseline.json
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def read(name):
    return (ROOT / name).read_text(encoding="utf-8")


def object_keys(source, anchor):
    """Top-level keys of the object literal that starts at `anchor`."""
    start = source.find(anchor)
    if start < 0:
        return []
    i = source.index("{", start)
    depth, keys, token = 0, [], ""
    for ch in source[i:]:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                break
        if depth == 1:
            token += ch
            if ch in ",\n":
                m = re.match(r"\s*,?\s*([A-Za-z_$][\w$]*)\s*:", token)
                if m:
                    keys.append(m.group(1))
                token = ""
    return keys


def build():
    html, js, css, main = read("index.html"), read("app.js"), read("styles.css"), read("main.py")
    html_ids = re.findall(r'\bid=["\']([^"\']+)["\']', html)
    js_ids = set(re.findall(r"getElementById\(\s*['\"]([^'\"]+)['\"]", js))
    js_ids |= set(re.findall(r"querySelector(?:All)?\(\s*['\"]#([\w-]+)", js))
    handlers = set()
    for code in re.findall(r'\son[a-z]+="([^"]*)"', html):
        handlers |= set(re.findall(r"([A-Za-z_$][\w$]*)\s*\(", code))
    handlers -= {"event", "this", "if", "return"}
    defined = set(re.findall(r"function\s+([A-Za-z_$][\w$]*)\s*\(", js))
    defined |= set(re.findall(r"window\.([A-Za-z_$][\w$]*)\s*=", js))
    tokens = sorted(set(re.findall(r"(--[\w-]+)\s*:", css)))
    routes = re.findall(r'@app\.(get|post|put|delete|patch)\("([^"]+)"', main)
    sections = re.findall(r'<(?:section|header|footer|nav)[^>]*\bid=["\']([^"\']+)["\']', html)
    return {
        "sections": sections,
        "html_ids": sorted(set(html_ids)),
        "duplicate_ids": sorted({i for i in html_ids if html_ids.count(i) > 1}),
        "js_referenced_ids": sorted(js_ids),
        "js_ids_missing_from_html": sorted(js_ids - set(html_ids)),
        "inline_handlers": sorted(handlers),
        "inline_handlers_undefined": sorted(h for h in handlers if h not in defined),
        "css_custom_properties": tokens,
        "app_state_keys": object_keys(js, "const appState"),
        "api_routes": [f"{m.upper()} {p}" for m, p in routes],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out")
    parser.add_argument("--compare")
    args = parser.parse_args()
    inv = build()
    if args.out:
        Path(args.out).write_text(json.dumps(inv, indent=2) + "\n", encoding="utf-8")
    summary = {k: len(v) for k, v in inv.items()}
    print(json.dumps(summary, indent=2))
    for key in ("duplicate_ids", "js_ids_missing_from_html", "inline_handlers_undefined"):
        if inv[key]:
            print(f"{key}: {inv[key]}")
    if args.compare:
        base = json.loads(Path(args.compare).read_text(encoding="utf-8"))
        dropped = sorted(set(base["html_ids"]) - set(inv["html_ids"]))
        added = sorted(set(inv["html_ids"]) - set(base["html_ids"]))
        print(f"IDs dropped since baseline ({len(dropped)}): {dropped}")
        print(f"IDs added since baseline ({len(added)}): {added}")
        lost_sections = sorted(set(base["sections"]) - set(inv["sections"]))
        print(f"Sections dropped since baseline: {lost_sections}")
        return 1 if inv["js_ids_missing_from_html"] or inv["duplicate_ids"] else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
