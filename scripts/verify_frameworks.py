import json
import re

with open("prompt_frameworks.json", "r", encoding="utf-8") as f:
    data = json.load(f)

json_frameworks = data.get("frameworks", [])
print(f"Total frameworks in prompt_frameworks.json: {len(json_frameworks)}")
json_ids = [fw["id"] for fw in json_frameworks]
print("JSON IDs:", json_ids)

EXPECTED_18 = [
    "CLEAR", "SMART", "QUEST", "GUIDE", "FOCUS", "IDEA", "RISEN", "RHODES", "CREATE",
    "RACE", "TAG", "TRACE", "CARE", "PAR", "STAR", "APE", "CRISPE", "RTF"
]

print("Matches expected 18?", set(json_ids) == set(EXPECTED_18))

with open("app.js", "r", encoding="utf-8") as f:
    js_content = f.read()

# Extract IDs from promptFrameworksRegistry in app.js
match = re.search(r'const promptFrameworksRegistry = \[([\s\S]+?)\];\s*\n// =', js_content)
if match:
    js_ids = re.findall(r"id:\s*['\"]([^'\"]+)['\"]", match.group(1))
    print(f"\nTotal frameworks in app.js promptFrameworksRegistry: {len(js_ids)}")
    print("app.js IDs:", js_ids)
    print("app.js matches expected 18?", set(js_ids) == set(EXPECTED_18))
    print("JSON and app.js IDs match exactly?", json_ids == js_ids)
else:
    print("Could not parse promptFrameworksRegistry in app.js")
