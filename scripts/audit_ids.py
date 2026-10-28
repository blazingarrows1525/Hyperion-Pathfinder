import re

with open('app.js', encoding='utf-8') as f:
    js = f.read()
with open('index.html', encoding='utf-8') as f:
    html = f.read()

js_get_ids = set(re.findall(r"document\.getElementById\(['\"]([^'\"]+)['\"]\)", js))
html_ids = set(re.findall(r'\bid=["\']([^"\']+)["\']', html))

missing_in_html = js_get_ids - html_ids
print(f"Total getElementById in app.js: {len(js_get_ids)}")
print(f"Total IDs in index.html: {len(html_ids)}")
print("\nIDs queried in app.js but missing in index.html:")
for m in sorted(missing_in_html):
    print(f"  - {m}")
