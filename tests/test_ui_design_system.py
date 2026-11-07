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


def test_reveal_system_only_touches_static_discovery_panels():
    start = JS.index("function initEditorialRevealSystem()")
    body = JS[start:JS.index("function initNeumorphicWorkbench()")]
    assert "MutationObserver" not in body  # re-rendered rows must not animate on every keystroke
    assert "observer.unobserve(entry.target)" in body
    assert "observer.disconnect()" in body
    selector = JS[JS.index("const REVEAL_SELECTOR"):start]
    for tool in (".analyzer-form-card", ".analyzer-results-card", ".company-directory", ".prompt-composer", ".atlas-hero-copy"):
        assert tool not in selector


def test_atlas_frame_loop_allocates_nothing_and_rests():
    source = JS.replace("\r\n", "\n")
    start = source.index("  tick() {\n    this.frame = null;")
    body = source[start:source.index("  clampRotation() {", start)]
    assert "new THREE." not in body  # no per-frame geometry, vector or colour allocation
    assert "=>" not in body  # no per-frame closures
    assert "ambient-drift" in body
    assert "if (!this.reducedMotion) moving = true" not in source  # the old endless loop


def test_atlas_has_no_links_implying_similarity():
    assert "beamCurves" not in JS and "buildFlowParticles" not in JS and "buildAmbientParticles" not in JS
    assert "membership, not similarity" in HTML


def test_career_atlas_has_adaptive_continuous_render_scheduling():
    assert "scheduleContinuousRender()" in JS
    assert "const interval = this.lowDetail ? (1000 / 24) : (1000 / 30);" in JS
    assert "clearTimeout(this.frameTimer)" in JS
    assert "else if (reasons.size) {\n      this.scheduleContinuousRender();" in JS.replace("\r\n", "\n")
    assert "this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowDetail ? 1 : 1.5));" in JS
