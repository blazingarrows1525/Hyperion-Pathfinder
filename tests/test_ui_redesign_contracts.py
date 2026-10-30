"""Regression checks for the Terra Atelier redesign: truthfulness, security and wiring.

Static checks over index.html and app.js; no server needed.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
JS = (ROOT / "app.js").read_text(encoding="utf-8")


def test_no_public_api_key_entry():
    assert 'type="password"' not in HTML
    assert "/api/llm/configure" not in JS
    assert "/api/llm/test" not in JS


def test_third_party_scripts_are_pinned_with_integrity():
    scripts = re.findall(r'<script\s+src="(https://[^"]+)"([^>]*)>', HTML)
    assert scripts, "expected third-party scripts"
    for src, attrs in scripts:
        assert "@latest" not in src, src
        assert re.search(r"@\d|/r\d+/", src), f"unversioned script: {src}"
        assert 'integrity="sha384-' in attrs, f"missing SRI: {src}"
        assert 'crossorigin="anonymous"' in attrs, f"missing crossorigin: {src}"


def test_api_calls_use_the_configurable_base():
    assert "127.0.0.1" not in JS
    assert "backendBaseUrl" not in JS
    for call in re.findall(r"fetch\(([^,)]+)", JS):
        # the analyzer builds a URL object from apiUrl('/analyze') and fetches url.toString()
        assert call.startswith("apiUrl(") or call.startswith("url.toString("), f"fetch without apiUrl: {call}"


def test_client_never_downloads_the_full_manifest():
    assert "data_manifest.json" not in JS
    assert "/api/corpus-summary" in JS


def test_hero_has_no_fabricated_numbers():
    for fake in ("SAMPLE SCORE", "Sample Score", "95% Match", "94.8%", "₹16.0 LPA", "Super Dream (₹20+ LPA)"):
        assert fake not in HTML, fake


def test_review_lens_radios_match_the_script():
    names = set(re.findall(r'type="radio" name="([^"]+)" value="(?:auto|director_ai_research|principal_sde)', HTML))
    assert names == {"executive_persona"}
    assert 'input[name="executive_persona"]' in JS
    assert 'input[name="persona_option"]' not in JS


def test_demo_annotations_locate_their_text():
    text = re.search(r"const demoResumeText = `(.*?)`;", JS, re.S).group(1)
    block = JS[JS.index("const demoMarkups = ["):]
    originals = re.findall(r"original_text: '([^']+)'", block[: block.index("\n  ];")])
    assert len(originals) == 5
    for original in originals:
        assert text.count(original) == 1, original
    assert "demoResumeText.indexOf(m.original_text)" in JS


def test_prompt_studio_reads_the_registry():
    assert "fetch(apiUrl('/api/frameworks'))" in JS
    assert "onclick=\"copyPromptAndOpenAnalyzer()\"" not in HTML


def test_career_atlas_renders_the_five_archetypes():
    assert "PLACEMENT_SKILLS_3D" not in JS
    assert "class CareerAtlas" in JS
    for cluster_id in range(5):
        assert f'data-archetype-id="{cluster_id}"' in HTML
    assert "webglcontextlost" in JS and "webglcontextrestored" in JS
    assert "ResizeObserver" in JS


def test_motion_preference_has_system_calm_full():
    assert "career_ui_motion_v1" in JS
    assert "prefers-reduced-motion: reduce" in JS
    assert re.search(r"\['system', 'calm', 'full'\]", JS)
