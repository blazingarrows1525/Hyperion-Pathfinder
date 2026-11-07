# Hyperion Pathfinder: frontend art direction refresh

**Branch:** `feat/ui-art-direction-refresh` (draft pull request
[blazingarrows1525/Hyperion-Pathfinder#1](https://github.com/blazingarrows1525/Hyperion-Pathfinder/pull/1), base
`main`). **Stack:** unchanged: vanilla HTML, CSS and JavaScript, Three.js r128 from a pinned CDN with SRI, FastAPI.
No dependency was added or upgraded.

This file used to hold the source-only audit written before any browser check ran. It is now the summary of the
branch. The earlier version, including its proposed 30/24 fps Atlas cadence (replaced by a render-on-change
scheduler), is in git history.

## Direction

**Career Intelligence Observatory**, in the Terra Atelier (light) and Midnight Grove (dark) themes: warm paper and
ink for reading, one instrument (the Career Atlas) for the spatial identity, a quiet precision workspace for the
analyzer and report, and a named source on every number. Details: [02_visual_specification.md](ui-refresh/02_visual_specification.md).

## Reports

| Phase | Report |
|---|---|
| 0 Baseline | [ui-refresh/00_baseline.md](ui-refresh/00_baseline.md) and the `ui-refresh/before/` screenshots |
| 1 Source and interaction audit | [ui-refresh/01_source_and_interaction_audit.md](ui-refresh/01_source_and_interaction_audit.md), [ui-refresh/control_inventory.json](ui-refresh/control_inventory.json) |
| 2 Visual specification | [ui-refresh/02_visual_specification.md](ui-refresh/02_visual_specification.md) and the `ui-refresh/after/` screenshots |
| 9 Accessibility and responsive | [ui-refresh/09_accessibility_and_responsive_audit.md](ui-refresh/09_accessibility_and_responsive_audit.md) |
| 10 Performance, 3D lifecycle, test runs | [ui-refresh/10_performance_and_3d_lifecycle.md](ui-refresh/10_performance_and_3d_lifecycle.md) |
| Server findings for the owner | [ui-refresh/11_server_findings.md](ui-refresh/11_server_findings.md) |

## What changed, in short

- **Correctness first.** The live report showed sample scores; the dropzone ignored clicks; failed or cancelled runs
  reported success or erased the earlier report; the coach invented a score; tailoring pasted advice into the
  resume; the dictation panel never appeared; the sound control was dead; the review's next steps dropped the
  server's fields. All fixed, each with a regression check ([01](ui-refresh/01_source_and_interaction_audit.md),
  section 4).
- **One design system.** The 382-line override layer and the unused Prism themes are gone; one material, one
  border and shadow set, four radii, three type families, tokens for every colour.
- **The Career Atlas** is an instrument that rests: it renders only while something changes, pauses offscreen, in
  a hidden tab and on context loss, falls back to an accessible 2D map, and frees what it builds.
- **Accessibility:** 0 contrast failures in both themes, field edges at 3:1, 44 px targets on phones, keyboard
  patterns for tabs, dialogs, marks and the legend, 200% text and forced colours.
- **Honesty in the UI:** illustrative material is labelled where it appears and in copied or exported text;
  toasts state the true result; no figure appears without a source.

## Not changed

API routes and payloads, JSON keys, the scoring rubric, preference storage keys, event names and every feature.
Server-side security and privacy findings are recorded separately for the owner and were not changed here.
