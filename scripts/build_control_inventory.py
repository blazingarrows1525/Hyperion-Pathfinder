"""Build docs/ui-refresh/control_inventory.json from a live control census.

The census (scripts/ui_probes/control_census.js) records every actionable control the browser found, with its
real listeners and what activating it changed. This script joins each control to the behaviour of its family
(the fields of section 11 of the UI brief) and writes one record per control.

    node scripts/ui_audit.mjs --url "http://127.0.0.1:8010/?census=demo" --widths 1440 --no-shots \\
        --out <dir> --eval-file scripts/ui_probes/control_census.js
    python scripts/build_control_inventory.py <dir>/audit.json [docs/ui-refresh/control_inventory.json]

A control that matches no family is listed under "unclassified", so a new control cannot slip in unnoticed.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# (pattern on the census id, family): the first match wins.
# handler: the init function in app.js that binds it; the census adds the listeners it actually saw.
FAMILIES = [
    (r"^a\.skip-link", dict(family="skip link", intent="Jump past the masthead to the content or the analyzer",
        handler="native anchor", reads="", changes="focus", api="", success="Focus lands on the target (main has tabindex -1)",
        failure="", keys="First Tab stops; Enter follows", test="keyboard_walk.js")),
    (r"^a\.wordmark|^a\.nav-link-btn|^a(?!\.atlas-legend-link)(\.|$)|^a\.btn-(primary|secondary)", dict(family="section link",
        intent="Go to a section", handler="native anchor; initSectionScrollSpy marks the current section",
        reads="scroll position", changes="aria-current on the nav link", api="", success="Section scrolls under the sticky masthead (scroll-margin-top)",
        failure="", keys="Enter", test="navigation_and_data.js")),
    (r"^#btn-nav-more$|^#btn-mobile-menu$|^#btn-prefs$", dict(family="masthead disclosure",
        intent="Open the More menu, the phone menu or Preferences", handler="initMasthead / initDisclosure",
        reads="", changes="aria-expanded, panel hidden", api="", success="Panel opens beside its button",
        failure="", keys="Enter/Space toggle; Escape closes and returns focus; click outside closes", test="navigation_and_data.js")),
    (r"^#btn-theme-toggle$", dict(family="preference", intent="Switch Terra Atelier / Midnight Grove",
        handler="initThemeSwitcher", reads="localStorage career_ui_theme_v2", changes="html[data-theme], career_ui_theme_v2, Atlas palette",
        api="", success="Theme and its label change; the Atlas keeps its renderer and the report stays", failure="Storage blocked: theme still applies for the visit",
        keys="Enter/Space", test="theme_contract.js, text_and_modes.js")),
    (r"^#btn-motion-toggle$", dict(family="preference", intent="Motion: System, Full or Calm",
        handler="initAccessibilityAndMotion / applyMotionSetting", reads="career_ui_motion_v1, prefers-reduced-motion",
        changes="body[data-motion], career_ui_motion_v1, Atlas reduced motion", api="", success="Label states the setting; Calm stops all continuous motion",
        failure="", keys="Enter/Space", test="reveal_motion.js, atlas_lifecycle.js")),
    (r"^#btn-sound-toggle$", dict(family="preference", intent="Interface sound on or off (off by default)",
        handler="initSpatialAudioController", reads="", changes="aria-pressed, sound state for the visit", api="",
        success="One click sound confirms it is on; nothing autoplays", failure="",
        keys="Enter/Space", test="coach_and_sound.js")),
    (r"^#btn-designhead-", dict(family="preference", intent="3D detail Low or High", handler="initDesignheadController",
        reads="localStorage resume_checker_mode", changes="aria-checked, resume_checker_mode, Atlas detail", api="",
        success="Selected segment shows ink on paper", failure="", keys="Enter/Space", test="atlas_lifecycle.js")),
    (r"^#btn-llm-control-hub$|^#btn-close-llm-modal$", dict(family="engine dialog", intent="See which analysis engine is active (read-only)",
        handler="initLLMControlHub", reads="GET /api/llm/providers (at load)", changes="dialog open", api="GET /api/llm/providers",
        success="Dialog lists the active engine and supported engines; says configuration happens on the server",
        failure="Providers request fails: the dialog and the Preferences row say the status is unavailable", keys="Escape closes, focus returns; Tab stays inside", test="navigation_and_data.js")),
    (r"^button\.btn-3d-mode", dict(family="Atlas mode", intent="Atlas, Orbit or Evidence map view", handler="initAtlasControls -> careerAtlas.setMode",
        reads="", changes="aria-pressed, camera target", api="", success="Camera eases to the mode, then the scene rests",
        failure="No WebGL: the 2D fallback answers instead", keys="Enter/Space", test="atlas_lifecycle.js")),
    (r"^#btn-3d-(zoom-in|zoom-out|reset-cam-stage)$", dict(family="Atlas camera", intent="Zoom in, zoom out, reset the view",
        handler="initAtlasControls -> zoomBy / resetCamera", reads="zoom level", changes="camera; disabled at the zoom limits", api="",
        success="One eased move, then rest (Calm: an instant move, one frame)", failure="Disabled at the limit", keys="Enter/Space", test="atlas_lifecycle.js")),
    (r"^button\.atlas-legend-item|^button#?\d$", dict(family="Atlas legend", intent="Select an archetype in the Atlas",
        handler="initAtlasLegend -> selectArchetype", reads="corpus summary counts", changes="aria-pressed, Atlas selection, Genome selection",
        api="", success="The solid lifts, the evidence card names the archetype, #atlas-status announces it", failure="", keys="Enter/Space", test="atlas_lifecycle.js, navigation_and_data.js")),
    (r"^a\.atlas-legend-link|^button\.fb-node|^button\.atlas-load-3d", dict(family="Atlas follow-up and 2D fallback",
        intent="Open the selected archetype in Genome; pick a node in the 2D map; retry 3D", handler="initAtlasLegend / showAtlasFallback",
        reads="", changes="selection", api="", success="Genome shows the archetype; 2D node pressed state", failure="", keys="Enter/Space", test="atlas_lifecycle.js")),
    (r"^#snapshot-company-search$", dict(family="snapshot filter", intent="Filter the recruiter table", handler="initPlacementSnapshot -> filterSnapshotTable",
        reads="placement_snapshot_2026.json", changes="visible rows, #snapshot-empty", api="GET /placement_snapshot_2026.json (at load)",
        success="Rows filter as you type", failure="No match: an empty-state row says so", keys="Typing", test="navigation_and_data.js")),
    (r"^#demo-mode-toggle$", dict(family="analyzer input", intent="Play the bundled illustrative report instead of analyzing",
        handler="initResumeAnalyzer", reads="", changes="appState.analyzer.demoMode", api="", success="Report is labelled illustrative everywhere, copy and export included",
        failure="", keys="Space", test="analyzer_states.js")),
    (r"^#resume-file-input$|^#clear-file-btn$", dict(family="analyzer input", intent="Choose or clear the resume PDF",
        handler="initResumeAnalyzer -> resumeFileProblem", reads="file type and size", changes="selected file, file name chip",
        api="", success="File name and size shown", failure="Not a PDF or over 10 MB: inline error linked by aria-describedby; nothing is sent",
        keys="The dropzone is the native input: Enter/Space opens the picker; drop works", test="analyzer_inputs.js")),
    (r"^#jd-textarea$|^#btn-clear-jd$|^button\.btn-preset-chip", dict(family="analyzer input", intent="Write, fill from a sample, or clear the job description",
        handler="initResumeAnalyzer -> syncJobDescription", reads="", changes="job description, character count",
        api="", success="Counter shows n of 20,000", failure="Empty or over 20,000 characters: inline error; replacing typed text asks first",
        keys="Typing; chips Enter/Space", test="analyzer_inputs.js")),
    (r"^input\.sr-only|executive_persona", dict(family="review lens", intent="Choose the simulated reviewer",
        handler="initExecutivePersonaSelector", reads="", changes="appState.executiveReview.selectedPersonaId", api="sent as selected_persona_id with /analyze",
        success="Chip shows the selection; the review names the lens used", failure="", keys="Arrow keys within the radio group", test="workflow_live.js")),
    (r"^#btn-analyze-submit$|^#btn-cancel-request$|^button\.btn-secondary$", dict(family="analysis run", intent="Run or cancel the analysis",
        handler="initResumeAnalyzer -> executeAnalysis / cancelAnalysis", reads="file, job description, lens",
        changes="analyzer status idle|submitting|streaming|complete|cancelled|error; report only after validation",
        api="POST /analyze (multipart file; job_description and selected_persona_id in the query)",
        success="Progress panel names each stage; the report replaces the old one only when complete",
        failure="Safe message from an allow-list (no exception text); cancel and failure keep the earlier report", keys="Enter/Space", test="analyzer_states.js, workflow_live.js")),
    (r"^#tab-btn-", dict(family="report tabs", intent="Report, Executive Review, Resume Tailoring, Career Coach",
        handler="initResultsWorkspaceTabs -> selectResultsTab", reads="", changes="aria-selected, roving tabindex, visible pane", api="",
        success="Pane shows; focus stays on the tab", failure="", keys="Arrow keys, Home, End; Enter/Space", test="navigation_and_data.js, keyboard_walk.js")),
    (r"^button\.btn-icon-circle", dict(family="report actions and lab icons", intent="Copy or export the report; lab sample icons",
        handler="copyAnalysisToClipboard / exportAnalysisReport (inline onclick); lab samples", reads="report", changes="clipboard or a .md download",
        api="", success="Toast states the true result; demo output is labelled illustrative", failure="No report yet: toast says so; clipboard blocked: fallback copy",
        keys="Enter/Space", test="analyzer_states.js, workflow_live.js")),
    (r"^#btn-quick-play-tts$|^#voice-tts-|^button\.btn-tts-speed", dict(family="spoken briefing", intent="Hear the report briefing",
        handler="initSpeechSynthesisController", reads="report", changes="speechSynthesis queue", api="",
        success="Plays, pauses, stops; speed 1.0x or 0.85x", failure="No speech synthesis: the briefing controls are hidden, and the quick button says the browser cannot read aloud", keys="Enter/Space", test="voice.js")),
    (r"^#btn-draft-|^#btn-toggle-diff$|^#btn-recalculate-draft$|^#btn-export-draft$|^#btn-diff-undo$|^#btn-close-diff$", dict(family="tailoring draft",
        intent="Undo, redo, see the diff, rescore or export the edited draft", handler="initResumeTailoringController",
        reads="draftHistory", changes="draft revision, diff drawer", api="POST /api/markup/recalculate {edited_text, job_description, revision_id, document_id}",
        success="Diff lists each change; rescoring updates ring and meters together", failure="Recalculation fails: a toast says the draft could not be re-scored; the edits and the earlier score are kept",
        keys="Enter/Space", test="tailoring.js")),
    (r"^span\.doc-markup-span|doc-markup-span|^#btn-close-popover$|^#popover-", dict(family="tailoring mark",
        intent="Read a mark's reason and apply a rewrite", handler="initResumeTailoringController -> openMarkupPopover / applyMarkupReplacement",
        reads="resume_markups", changes="draft text and remaining marks", api="",
        success="Replacement lands in the draft, the diff records it", failure="Unfilled [insert] placeholder, empty text or a stale span: refused inline, nothing changes",
        keys="Enter/Space opens; Escape closes and returns focus to the mark", test="tailoring.js")),
    (r"^button\.btn-coach-chip|^#coach-|^#btn-coach-voice-input$|^#btn-send-coach-msg$", dict(family="career coach",
        intent="Ask the coach, optionally through a framework lens", handler="initCareerCoachController -> submitCoachQuery",
        reads="report values only (never sample values)", changes="transcript", api="POST /api/coach/chat (message up to 2,000 characters)",
        success="Answer rendered through DOMPurify with its evidence references", failure="Service down: general guidance clearly labelled, no invented score or results",
        keys="Enter asks, Shift+Enter adds a line", test="coach_and_sound.js, workflow_live.js")),
    (r"^button\.archetype-tab|^#archetype-tab-|data-genome-action|data-compare-index|^button\.modal-close-btn|^select\.sort-select", dict(family="Career Genome",
        intent="Choose an archetype, use its sample JD, compare two", handler="initCareerGenome -> selectArchetype / openArchetypeComparisonModal",
        reads="corpus summary, curated archetype data", changes="selected archetype, comparison pair", api="",
        success="Profile and Atlas follow the selection; comparing an archetype with itself is called out", failure="",
        keys="Tabs: arrow keys; dialog: Escape, Tab wraps, focus returns", test="navigation_and_data.js")),
    (r"^#company-|^button\.btn-company-filter|data-company-action|^button\.btn-use-context", dict(family="company directory",
        intent="Search, filter, sort; open details; use a sample JD", handler="initCompanyIntelligence",
        reads="placement snapshot, curated company data", changes="visible companies, dialog", api="",
        success="Count line says n of 10; details separate snapshot figures from unverified practice material", failure="No match: empty state",
        keys="Typing; Enter/Space; dialog Escape", test="navigation_and_data.js")),
    (r"^button\.btn-scenario-chip|^#framework-search-input$|^button\.btn-filter-pill|^button\.framework-item-btn|^textarea\.fw-field-input|^#fw-field-|^#btn-fw-|^#btn-copy-prompt$|^#btn-prompt-to-coach$|btn-registry-retry",
        dict(family="Prompt Studio", intent="Find a framework, fill its fields, copy the prompt or hand it to the coach",
        handler="initPromptStudio / startPromptStudio", reads="GET /api/frameworks (18 frameworks)", changes="selected framework, per-framework draft for the visit",
        api="GET /api/frameworks", success="Live preview; copy reports blanks; handoff puts the draft in the coach box and sends nothing",
        failure="Registry fails: an error with a retry button", keys="Typing; Enter/Space", test="prompt_studio.js")),
    (r"^#btn-open-prefs$|^summary\.showcase-summary|^button\.btn-(magnetic-glow|glass-shimmer|cyber-border|3d-push|emerald-liquid)|^#lab-|^#btn-neu-shape-|^#neu-|^button\.neu-btn|^#neu-tactile-toggle",
        dict(family="control samples", intent="Open Preferences, or try the sample controls", handler="initInteractionLab / initNeumorphicWorkbench",
        reads="", changes="sample state only", api="", success="Toasts say the sample changes nothing else", failure="",
        keys="Enter/Space; the light puck moves with arrow keys", test="navigation_and_data.js, target_sizes.js")),
    (r"^summary\.faq-summary", dict(family="FAQ", intent="Read an answer", handler="native details", reads="", changes="open state",
        api="", success="Answer expands", failure="", keys="Enter/Space", test="keyboard_walk.js")),
    (r"^#voice-|^#btn-quick-dictate-jd$", dict(family="dictation", intent="Dictate into the job description or the coach, then insert",
        handler="initVoiceAssistantController -> setVoiceDrawerOpen / startVoiceRecognition", reads="", changes="transcript preview, destination field",
        api="browser speech recognition (may use the browser maker's service)", success="Text appears in the preview; Insert puts it where chosen",
        failure="No speech recognition or permission denied: a specific message; closing the panel always stops the microphone",
        keys="Escape closes the panel", test="voice.js")),
    (r"^#resume-document-viewport$|^div\.company-table-scroll|^div\.recruiters-table-wrapper|^#pane-|^#archetype-detail-panel$|^#prompt-preview-code$",
        dict(family="focusable region", intent="Reach a tab panel or scroll a long region with the keyboard",
        handler="native (tabindex 0)", reads="", changes="", api="", success="", failure="", keys="Tab to focus, arrow keys scroll", test="keyboard_walk.js")),
    (r"^label", dict(family="field label", intent="Name a field; clicking it focuses or toggles the field",
        handler="native label", reads="", changes="", api="", success="", failure="", keys="n/a (the field takes focus)", test="a11y_census.js")),
]


def classify(record):
    key = record["id"]
    for pattern, meta in FAMILIES:
        if re.search(pattern, key):
            return meta
    return None


def main():
    census_path = Path(sys.argv[1])
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "docs" / "ui-refresh" / "control_inventory.json"
    audit = json.loads(census_path.read_text(encoding="utf-8"))
    width, viewport = next(iter(audit["viewports"].items()))
    census = viewport["evalResult"]
    controls, unclassified = [], []
    for record in census["controls"]:
        meta = classify(record)
        wiring = record["wiring"]
        seen = [f"own:{','.join(wiring['own'])}" if wiring["own"] else "",
                f"inline:{','.join(wiring['inline'])}" if wiring["inline"] else "",
                f"delegated:{','.join(wiring['delegated'])}" if wiring["delegated"] else "",
                f"native:{wiring['native']}" if wiring["native"] else ""]
        entry = {
            "selector": record["id"],
            "section": record["section"],
            "name": record["name"],
            "visible_at_census": record["visible"],
            "size_px": [record["width"], record["height"]],
            "state_attributes": record["state"],
            "listeners_seen": [s for s in seen if s],
            "activation_effect": record.get("activation"),
        }
        if meta:
            entry.update({
                "family": meta["family"], "user_intent": meta["intent"], "handler": meta["handler"],
                "state_read": meta["reads"], "state_changed": meta["changes"], "api_request": meta["api"],
                "success_feedback": meta["success"], "failure_disabled_loading": meta["failure"],
                "keyboard_touch": meta["keys"], "test": meta["test"],
            })
        else:
            unclassified.append(record["id"])
        controls.append(entry)
    result = {
        "generated_from": "scripts/ui_probes/control_census.js with ?census=demo",
        "viewport": f"{width}px",
        "summary": census["summary"],
        "unclassified": unclassified,
        "controls": controls,
    }
    out_path.write_text(json.dumps(result, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{len(controls)} controls, {len(unclassified)} unclassified -> {out_path}")
    for item in unclassified:
        print("  unclassified:", item)


if __name__ == "__main__":
    main()
