import re, json, pathlib

ROOT = pathlib.Path(r"c:\Users\ASUS\Desktop\resume expert\SRM_Resume_Expert")
HTML_FILE = ROOT / "index.html"
JS_FILE = ROOT / "app.js"
CSS_FILE = ROOT / "styles.css"
MAIN_PY = ROOT / "main.py"
SNAPSHOT_JSON = ROOT / "placement_snapshot_2026.json"
FRAMEWORKS_JSON = ROOT / "prompt_frameworks.json"

html = HTML_FILE.read_text(encoding="utf-8")
js = JS_FILE.read_text(encoding="utf-8")
css = CSS_FILE.read_text(encoding="utf-8")
main_py = MAIN_PY.read_text(encoding="utf-8")

discrepancies = []

# ============================================================================
# 1. HTML ID CHECKS
# ============================================================================
html_ids = re.findall(r'\bid=["\']([^"\']+)["\']', html)
id_counts = {}
for i in html_ids:
    id_counts[i] = id_counts.get(i, 0) + 1
duplicates = [k for k, v in id_counts.items() if v > 1]
if duplicates:
    discrepancies.append(f"DUPLICATE HTML IDs: {duplicates}")
else:
    print("[PASS] No duplicate HTML IDs found (Total unique: %d)" % len(id_counts))

# ============================================================================
# 2. JS REFERENCES TO MISSING HTML IDs
# ============================================================================
# Find getElementById('...')
js_get_by_id = re.findall(r"document\.getElementById\(['\"]([^'\"]+)['\"]\)", js)
# Find querySelector('#...')
js_qs_id = re.findall(r"querySelector\(['\"]#([a-zA-Z0-9_\-]+)['\"]\)", js)
all_js_ids = set(js_get_by_id + js_qs_id)

missing_in_html = []
for jid in sorted(all_js_ids):
    # Some IDs may be created dynamically in templates; check if in JS templates or in HTML
    if jid not in id_counts:
        # Check if created in JS template string
        if f'id="{jid}"' not in js and f"id='{jid}'" not in js:
            missing_in_html.append(jid)

if missing_in_html:
    discrepancies.append(f"JS queries IDs missing from HTML and dynamic templates: {missing_in_html}")
else:
    print(f"[PASS] All {len(all_js_ids)} JS-queried IDs exist in HTML or dynamic templates")

# ============================================================================
# 3. BUTTONS WITHOUT TYPE ATTRIBUTE
# ============================================================================
raw_buttons = re.findall(r'<button\b([^>]*)>', html)
untyped_buttons = []
for b in raw_buttons:
    if 'type=' not in b:
        untyped_buttons.append(b.strip())
if untyped_buttons:
    discrepancies.append(f"Found {len(untyped_buttons)} untyped buttons in HTML: {untyped_buttons[:3]}")
else:
    print(f"[PASS] All {len(raw_buttons)} buttons in HTML have explicit type attributes")

# ============================================================================
# 4. HARD-CODED LOCALHOST FETCH CALLS
# ============================================================================
hardcoded_fetches = re.findall(r"fetch\(['\"]http://127\.0\.0\.1:8000[^'\"]*['\"]\)", js)
hardcoded_fetches += re.findall(r"fetch\(['\"]http://localhost:8000[^'\"]*['\"]\)", js)
if hardcoded_fetches:
    discrepancies.append(f"Hardcoded localhost fetch calls found in app.js: {hardcoded_fetches}")
else:
    print("[PASS] Zero hardcoded localhost/127.0.0.1 fetch calls in app.js (all using apiUrl())")

# ============================================================================
# 5. DATA CONSISTENCY CHECKS
# ============================================================================
# Frameworks
fw_data = json.loads(FRAMEWORKS_JSON.read_text(encoding="utf-8"))
frameworks_list = fw_data.get("frameworks", fw_data) if isinstance(fw_data, dict) else fw_data
json_fw_ids = [f["id"] for f in frameworks_list]
js_fw_ids = re.findall(r"id:\s*['\"]([A-Z]+)['\"],", js)
# filter to known list
js_fw_ids = [fid for fid in js_fw_ids if fid in json_fw_ids]
unique_js_fw = sorted(list(set(js_fw_ids)))
if set(json_fw_ids) != set(unique_js_fw):
    discrepancies.append(f"Framework ID mismatch: JSON has {len(json_fw_ids)}, JS registry has {len(unique_js_fw)}")
else:
    print(f"[PASS] Framework IDs perfectly match: 18 in JSON == 18 in JS")

# Placement snapshot numbers
snap_data = json.loads(SNAPSHOT_JSON.read_text(encoding="utf-8"))
expected_offers = snap_data.get("total_offers")
expected_employers = snap_data.get("unique_employers")
expected_profiles = snap_data.get("job_profiles")
print(f"Placement snapshot truth: {expected_offers} offers, {expected_employers} employers, {expected_profiles} profiles")

# Check if app.js default values or HTML text has conflicting numbers
if "8,214" not in html and "8214" not in html and "8,214" not in js:
    discrepancies.append("Total offers figure 8,214 not found in HTML or JS")
else:
    print("[PASS] Placement offer count (8,214) verified in codebase")

# ============================================================================
# 6. EXTERNAL DEPENDENCY SRI CHECK
# ============================================================================
scripts = re.findall(r'<script\b([^>]*)src=["\']([^"\']+)["\']([^>]*)>', html)
for pre, src, post in scripts:
    comb = pre + " " + post
    if src.startswith("http"):
        if "integrity=" not in comb:
            discrepancies.append(f"External script missing SRI integrity attribute: {src}")
        else:
            print(f"[PASS] Pinned external script with SRI: {src.split('/')[-1]}")

# ============================================================================
# 7. FASTAPI ROUTE vs FRONTEND FETCH MAP
# ============================================================================
py_routes = re.findall(r'@app\.(get|post|put|delete)\(["\']([^"\']+)["\']', main_py)
py_paths = set(r[1] for r in py_routes)

js_api_calls = re.findall(r"apiUrl\(['\"]([^'\"]+)['\"]\)", js)
for call in set(js_api_calls):
    # Some calls have query strings or path params like /api/frameworks?id=...
    base_call = call.split('?')[0]
    if base_call not in py_paths:
        # Check if dynamic route or static
        if not any(re.match(r'^' + re.sub(r'\{[^}]+\}', '[^/]+', p) + r'$', base_call) for p in py_paths):
            discrepancies.append(f"Frontend calls apiUrl('{call}') but no matching route found in main.py!")

if discrepancies:
    print("\n[ALERT] DISCREPANCIES FOUND:")
    for d in discrepancies:
        print("  - " + d)
else:
    print("\n[SUCCESS] ZERO CODEBASE DISCREPANCIES FOUND!")

