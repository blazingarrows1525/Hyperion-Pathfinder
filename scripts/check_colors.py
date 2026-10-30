"""Flag one-off colour literals outside the design-token layer.

Colours belong in the theme blocks at the top of styles.css. Everywhere else,
components should use tokens (var(--color-*), rgba(var(--*-rgb), a)). Allowed
exceptions: white highlights inside box-shadow (the shared light source) and
the token blocks themselves.

    python scripts/check_colors.py          # report, exit 1 on violations
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HEX = re.compile(r"#[0-9a-fA-F]{3,8}\b")
RGB = re.compile(r"rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+")
WHITE_HIGHLIGHT = re.compile(r"rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*[\d.]+\s*\)")
TOKEN_LAYER_END = "2. ACCESSIBILITY & REDUCED MOTION"


def css_violations():
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    body = css[css.index(TOKEN_LAYER_END):]
    offset = css[: css.index(TOKEN_LAYER_END)].count("\n")
    found = []
    for lineno, line in enumerate(body.split("\n"), offset + 1):
        code = re.sub(r"/\*.*?\*/", "", line)
        if "url(#" in code:
            code = re.sub(r"url\(#[\w-]+\)", "", code)
        prop = code.split(":", 1)[0].strip()
        if prop in ("box-shadow", "text-shadow") or code.lstrip().startswith(("0 ", "inset", "-")):
            code = WHITE_HIGHLIGHT.sub("", code)
        for m in list(HEX.finditer(code)) + list(RGB.finditer(code)):
            found.append(f"styles.css:{lineno}: {m.group(0)}")
    return found


def html_violations():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    found = []
    for lineno, line in enumerate(html.split("\n"), 1):
        for style in re.findall(r'style="([^"]*)"', line):
            for m in list(HEX.finditer(style)) + list(RGB.finditer(style)):
                found.append(f"index.html:{lineno}: {m.group(0)}")
    return found


def js_violations():
    js = (ROOT / "app.js").read_text(encoding="utf-8")
    found = []
    for lineno, line in enumerate(js.split("\n"), 1):
        if "style=" not in line and ".style." not in line and "Style =" not in line:
            continue
        if "glare" in line:  # specular glare is the shared white light source
            line = WHITE_HIGHLIGHT.sub("", line)
        for m in list(HEX.finditer(line)) + list(RGB.finditer(line)):
            found.append(f"app.js:{lineno}: {m.group(0)}")
    return found


def main():
    violations = css_violations() + html_violations() + js_violations()
    for v in violations:
        print(v)
    print(f"{len(violations)} hard-coded colour literal(s) outside the token layer")
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
