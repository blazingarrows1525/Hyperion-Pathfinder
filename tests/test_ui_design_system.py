"""Static checks for the Terra Atelier design system and the frontend selector contract."""
import importlib.util
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS = (ROOT / "styles.css").read_text(encoding="utf-8")
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
JS = (ROOT / "app.js").read_text(encoding="utf-8")


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def theme_block(selector):
    start = CSS.index(selector)
    return CSS[start:CSS.index("}", start)]


def test_terra_is_the_first_load_theme():
    assert re.search(r'<html[^>]*\bdata-theme="terra"', HTML)
    terra = theme_block('html[data-theme="terra"]')
    for token, value in {"--color-canvas": "#F3EFE6", "--color-ink": "#262438", "--color-forest": "#1E6655",
                         "--color-terracotta": "#C85E47", "--color-focus": "#5C4A9A"}.items():
        assert f"{token}: {value}" in terra


def test_midnight_grove_replaces_the_cyber_theme():
    grove = theme_block('html[data-theme="grove"]')
    for token, value in {"--color-canvas": "#201E2B", "--color-ink": "#F6F0E7", "--color-forest": "#80C9A9"}.items():
        assert f"{token}: {value}" in grove
    assert "ceramic" not in CSS
    assert "#060608" not in CSS.lower()  # the old obsidian canvas


def test_archetype_accents_are_keyed_by_cluster_id():
    expected = {0: "forest", 1: "orchid", 2: "terracotta", 3: "lagoon", 4: "ochre"}
    for cluster_id, accent in expected.items():
        assert f"--arch-{cluster_id}-color: var(--color-{accent});" in CSS


def test_theme_preference_storage_is_versioned_and_migrated():
    assert "career_ui_theme_v2" in JS
    assert "resume_checker_theme" in JS  # read once for migration
    assert "legacy === 'cyber' ? 'grove' : 'terra'" in JS


def test_no_hard_coded_colours_outside_the_token_layer():
    checker = load_script("check_colors")
    violations = checker.css_violations() + checker.html_violations() + checker.js_violations()
    assert violations == []


def test_selector_contract_holds():
    inventory = load_script("frontend_inventory").build()
    assert inventory["duplicate_ids"] == []
    assert inventory["js_ids_missing_from_html"] == []
    assert inventory["inline_handlers_undefined"] == []


def test_editorial_reveal_system_respects_reduced_motion():
    assert "function initEditorialRevealSystem()" in JS
    assert "initEditorialRevealSystem();" in JS
    assert ".hp-reveal.hp-reveal-visible" in CSS
    assert '[data-motion="reduced"] .hp-reveal' in CSS
    assert "@media (prefers-reduced-motion: reduce)" in CSS


def test_career_atlas_has_adaptive_continuous_render_scheduling():
    assert "scheduleContinuousRender()" in JS
    assert "const interval = this.lowDetail ? (1000 / 24) : (1000 / 30);" in JS
    assert "clearTimeout(this.frameTimer)" in JS
    assert "if (moving) this.scheduleContinuousRender();" in JS
    assert "this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowDetail ? 1 : 1.5));" in JS
