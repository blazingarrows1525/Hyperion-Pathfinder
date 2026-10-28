import re
from collections import Counter

with open("index.html", "r", encoding="utf-8") as f:
    html_content = f.read()

ids = re.findall(r'\bid=["\']([^"\']+)["\']', html_content)
id_counts = Counter(ids)
duplicates = {k: v for k, v in id_counts.items() if v > 1}
print(f"Total ID attributes found: {len(ids)}, Unique: {len(id_counts)}")
print(f"Duplicate IDs: {duplicates if duplicates else 'None'}")

# Check CSS variables for accent aliases in styles.css
with open("styles.css", "r", encoding="utf-8") as f:
    css_content = f.read()

print("\n=== CSS Accent Token Audit ===")
for var_name in ["--accent-blue", "--accent-cyan", "--accent-violet", "--accent-emerald", "--accent-amber", "--accent-coral", "--accent-purple", "--accent-teal"]:
    matches = re.findall(rf"({var_name}\s*:\s*[^;]+;)", css_content)
    print(f"{var_name}: {matches}")

# Check controls without handlers or missing in app.js
with open("app.js", "r", encoding="utf-8") as f:
    js_content = f.read()

buttons = re.findall(r'<button[^>]+id=["\']([^"\']+)["\']', html_content)
print(f"\nTotal buttons with IDs: {len(buttons)}")
missing_in_js = []
for b_id in buttons:
    if b_id not in js_content:
        missing_in_js.append(b_id)
print(f"Buttons whose ID is not referenced in app.js: {missing_in_js}")
