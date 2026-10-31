import pathlib, re

html = pathlib.Path("index.html").read_text(encoding="utf-8")
anchors = re.findall(r'href=[\"\']#([a-zA-Z0-9_\-]+)[\"\']', html)
ids = set(re.findall(r'\bid=[\"\']([^\"\']+)[\"\']', html))
broken = [a for a in set(anchors) if a not in ids]

print(f"Total unique anchor targets: {len(set(anchors))}")
print(f"Targets: {sorted(list(set(anchors)))}")
if broken:
    print(f"[FAIL] Broken anchor links found: {broken}")
else:
    print("[PASS] All internal anchor links resolve to valid HTML elements!")
