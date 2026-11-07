"""Every framework in the registry has complete writing help, and nothing else defines a framework.

The browser run (scripts/ui_probes/prompt_studio.js) exercises the same 18 frameworks end to end.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGISTRY = json.loads((ROOT / "prompt_frameworks.json").read_text(encoding="utf-8"))
JS = (ROOT / "app.js").read_text(encoding="utf-8").replace("\r\n", "\n")
HTML = (ROOT / "index.html").read_text(encoding="utf-8")

RESEARCH = ["CLEAR", "SMART", "QUEST", "GUIDE", "FOCUS", "IDEA", "RISEN", "RHODES", "CREATE"]
TASKS = ["RACE", "TAG", "TRACE", "CARE", "PAR", "STAR", "APE", "CRISPE", "RTF"]


def normalise(name):
    return re.sub(r"[^a-z]", "", name.lower())


def guide_blocks():
    start = JS.index("const promptFrameworksRegistry = [")
    block = JS[start:JS.index("\n];", start)]
    parts = re.split(r"\n  \{\n    id: '", block)[1:]
    return {part[:part.index("'")]: part for part in parts}


def test_registry_holds_exactly_the_two_groups():
    by_group = {}
    for framework in REGISTRY["frameworks"]:
        by_group.setdefault(framework["group"], []).append(framework["id"])
    assert by_group == {"Research & Structured Work": RESEARCH, "Task & Response Structuring": TASKS}


def test_every_registry_entry_is_complete():
    for framework in REGISTRY["frameworks"]:
        for key in ("id", "name", "group", "acronym", "best_use"):
            assert framework[key], (framework["id"], key)
        assert framework["fields"], framework["id"]
        assert len(set(framework["fields"])) == len(framework["fields"]), framework["id"]
        assert ", ".join(framework["fields"]) == framework["acronym"], framework["id"]


def test_the_guide_covers_every_field_of_every_framework():
    guides = guide_blocks()
    assert list(guides) == [f["id"] for f in REGISTRY["frameworks"]]
    for framework in REGISTRY["frameworks"]:
        guide = guides[framework["id"]]
        keys = re.findall(r"\{ key: '([^']+)'", guide)
        assert [normalise(k) for k in keys] == [normalise(f) for f in framework["fields"]], framework["id"]
        sample = guide[guide.index("sample: {"):guide.index("fields: [")]
        for key in keys:
            assert re.search(rf"\b{re.escape(key)}: '", sample) or re.search(rf"'{re.escape(key)}': '", sample), (framework["id"], key)


def test_nothing_else_defines_a_framework():
    guide = "".join(guide_blocks().values())
    for definition in ("name:", "acronym:", "category:", "expansion:", "bestFor:", "label:"):
        assert f"\n    {definition}" not in guide, definition
    assert "Bundled list" not in JS
    # The coach's list is built from the registry, so the page ships no framework options.
    select = HTML[HTML.index('id="coach-framework-select"'):HTML.index("</select>", HTML.index('id="coach-framework-select"'))]
    assert select.count("<option") == 1


def test_recommendations_point_at_registry_frameworks():
    ids = {f["id"] for f in REGISTRY["frameworks"]}
    block = JS[JS.index("const scenarioRecommendations = {"):]
    block = block[:block.index("\n};")]
    referenced = set(re.findall(r"(?:primaryId|altId): '([A-Z]+)'", block))
    assert referenced and referenced <= ids
