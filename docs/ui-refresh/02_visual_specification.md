# UI refresh, Phase 2: visual specification

The art direction, design tokens and section map as built on `feat/ui-art-direction-refresh`. Values are read from
`styles.css` **[source]**; contrast ratios are computed from the token values with the WCAG 2.2 formula **[source]**
and checked on the rendered page by `scripts/ui_probes/contrast_scan.js` **[browser]**. Labels as in
[00_baseline.md](00_baseline.md).

## 1. Direction

**Career Intelligence Observatory**: an editorial, evidence-first product. Warm paper and ink carry the reading
surfaces; one instrument, the Career Atlas, carries the spatial identity; the analyzer and report are a quiet precision
workspace. Every number on the page names its source, and illustrative material says so where it appears.

| RISEN | Decision record |
|---|---|
| Requirement | One coherent art direction across ten sections, in the existing vanilla stack, with the Atlas kept as working 3D and a 2D fallback, without removing features or changing contracts. |
| Information | The branch had five competing languages (paper, prism gradients, glass, neumorphism, cyber HUD) and a 382-line override layer. The current brief names Terra Atelier and Midnight Grove; an older brief chose Prism. |
| Strategy | Follow the current brief. One material (paper surfaces, a quiet inset well for fields, hairline borders, one soft shadow), one accent per role, the display serif for statements only, mono for data. Retire the override layer and the Prism themes instead of layering on top. |
| Evaluation | Contrast scan 0 failures in both themes at 1440 and 375; 13 widths without document overflow in both themes; 200% text and forced colours usable; workflows unchanged (probe results in [09](09_accessibility_and_responsive_audit.md) and [10](10_performance_and_3d_lifecycle.md)). |
| Negotiation | Prism work stays on the unpushed branch `feat/hyperion-spatial-redesign` for the owner. The neumorphic class names (`.neu-*`) are kept as the component API, restyled to the one material, because renaming them would touch every template in `app.js` for no visible gain. |

## 2. Colour

Two themes, chosen by `html[data-theme]` before first paint. `:root` carries Terra, so the page is correct before
any script runs. Components read semantic tokens (`--color-*`) or the aliases in section 2 of `styles.css`, never raw
colours: `scripts/check_colors.py` reports 0 literals outside the token layer **[test]**.

### Terra Atelier (default, light)

| Token | Value | Role | Contrast |
|---|---|---|---|
| `--color-canvas` | `#F3EFE6` | Page | |
| `--color-canvas-alt` | `#EAE4D8` | Alternate section band | |
| `--color-surface` | `#FFFCF6` | Cards, panels | |
| `--color-surface-raised` | `#FFFDF9` | Dialogs, popovers | |
| `--color-surface-inset` | `#E7E0D4` | Wells, segment tracks | |
| `--color-surface-sage` / `-lilac` | `#E1EBE2` / `#ECE7F3` | Evidence panels, Prompt Studio band | |
| `--color-ink` | `#262438` | Text | 13.15 on canvas, 14.73 on surface |
| `--color-ink-soft` | `#484457` | Secondary text | 9.15 on surface |
| `--color-muted` | `#625D69` | Captions, hints | 4.87 on inset (lowest), 5.56 on canvas |
| `--color-forest` | `#1E6655` | Primary action, selection | 6.64 with on-accent text |
| `--color-forest-ink` | `#154B40` | Forest text on pale tints | 8.13 on sage |
| `--color-terracotta` | `#C85E47` | Accent for the hero phrase, archetype 2 | 3.55 on canvas: display size only |
| `--color-terracotta-ink` / `-ochre-ink` / `-lagoon-ink` / `-orchid-ink` | `#8A3424` / `#6E4A12` / `#1B5B5C` / `#4F3F7A` | Accent text | 7.4 to 7.9 on their backgrounds |
| `--color-focus` | `#5C4A9A` | Focus ring | 6.31 on canvas |
| `--color-danger` | `#A93F2B` | Errors | 5.97 on surface |
| `--color-border` / `-strong` | `#D5CDBF` / `#B7AD9D` | Hairlines, dividers | decorative |

### Midnight Grove (dark)

| Token | Value | Contrast |
|---|---|---|
| `--color-canvas` / `-surface` / `-inset` | `#201E2B` / `#302D40` / `#191824` | |
| `--color-ink` | `#F6F0E7` | 14.46 on canvas, 11.77 on surface |
| `--color-muted` | `#B3AAB5` | 5.15 on sage (lowest), 7.28 on canvas |
| `--color-forest` | `#80C9A9` | 8.87 with on-accent `#1B1A26` |
| `--color-terracotta` | `#F18A70` | 6.72 on canvas |
| `--color-focus` | `#E7C4FF` | 10.72 on canvas |
| `--color-danger` | `#F59C86` | 6.34 on surface |

Archetype accents are keyed by K-Means cluster id, never by array position: 0 forest, 1 orchid, 2 terracotta,
3 lagoon, 4 ochre. Each archetype also has its own solid in the Atlas and its own legend glyph, so colour is never
the only cue. Tailoring marks differ by underline style as well as tint (solid, dashed, double) **[test]**
`tailoring.js`.

**Non-text contrast.** Form-field borders use their own token, `--color-border-control` (Terra `#877D6E`, Grove
`#8A8296`), which keeps at least 3:1 against every background a field sits on. Hairline dividers stay decorative.

## 3. Typography

| Role | Family | Size and leading |
|---|---|---|
| Hero statement | DM Serif Display | `clamp(2.4rem, 4.3vw, 4.1rem)`, 1.04, -0.012em; italic terracotta for the closing phrase |
| Section title | DM Serif Display | `clamp(2rem, 3.6vw, 3.1rem)`, 1.08 |
| Card and panel titles | DM Serif Display | 1.0 to 1.4rem |
| Key figures | DM Serif Display | 1.85rem in the evidence strip; `clamp(2.2rem, 3vw, 2.8rem)` for the lead KPI |
| Body, controls | DM Sans | 1rem, 1.65 on body; 0.84 to 0.92rem in controls |
| Data, kickers, codes | JetBrains Mono | 0.72 to 0.82rem; kickers uppercase with tracking |

Only these three families load (one Google Fonts request, `display=swap`) **[test]**
`test_only_the_three_chosen_font_families_load`. Local fallback faces carry measured `size-adjust` and
ascent/descent overrides, so text barely moves when the web fonts arrive ([10](10_performance_and_3d_lifecycle.md)).

## 4. Space, shape and depth

| Item | Value |
|---|---|
| Content width | `--container-max: 1360px`; gutters 24 px, 16 px at 640 px and below |
| Radii | 4, 8, 10 and 14 px, and a pill. Every panel shares the 14 px corner (`lg` = `xl` = `2xl`). |
| Elevation | `--shadow-card` for panels, `--shadow-raised` for controls, `--shadow-float` for dialogs and the sheet, `--shadow-inset` for wells. One light source, top left. |
| Fields | `--field-bg` (the canvas tone, a quiet well) and `--field-border` (`--color-border-control`) |
| Glass | `--glass-fill` and `--glass-edge`, for floating controls only, never behind long text |
| Breakpoints | 1279 and 1180 (masthead and hero), 1024 (two-column workspaces stack), 768/760, 640 (phone layouts, bottom sheets, touch targets), 480 and 400 (narrow phones) |

## 5. Component states

| Component | Rest | Hover | Focus | Selected / active | Disabled / loading |
|---|---|---|---|---|---|
| Primary button | Forest fill, on-accent text | Deeper forest | 3 px focus ring, 3 px offset | n/a | Muted fill, `not-allowed`; analyze shows a progress panel, never a spinner alone |
| Secondary button | Paper, strong border | Border darkens | Ring | n/a | As above |
| Segmented control (Atlas modes, 3D detail, filters) | Inset track | Ink text | Ring | Ink on paper with `aria-pressed` or `aria-checked` | n/a |
| Nav link, report tab | Ink text | Underline appears | Ring | Forest underline, `aria-current` or `aria-selected` | n/a |
| Field | Canvas well, control border | Border darkens | Ring | n/a | Error: danger border and an inline message linked with `aria-describedby` |
| Card (company, archetype) | Surface, hairline, card shadow | Small tilt on fine pointers in full motion only | Ring on its controls | Forest edge on the selected archetype | n/a |
| Dialog | Raised surface, float shadow; bottom sheet at 640 px and below | | Focus moves in, Tab wraps, Escape closes, focus returns | | |
| Toast | Ink on raised surface, `role="status"` | | | | States the true result of the action |
| Tailoring mark | Tint plus underline style per category | Outline | Ring | Focus colour outline while its popover is open | |

## 6. Motion

| Rule | Value |
|---|---|
| Durations | `--motion-fast` 120 ms, `--motion-control` 180 ms, `--motion-panel` 260 ms, `--motion-scene` 520 ms |
| Easing | `--ease-standard`, `--ease-out`, `--ease-smooth`; `--ease-spring` only on small controls |
| Reveal | Section heads, evidence panels, process steps, story panels and FAQ items fade in once, only if they start below the fold. Rows, tables, forms and the report never animate. The end state is `transform: none`. |
| Career Atlas | Renders only while something changes: camera easing, a selection, a drag, or a 10 s ambient drift after load or an action in Full motion. Then it rests and renders nothing. |
| Calm (Preferences → Motion, or the OS setting) | No continuous motion anywhere: no ambient drift, no tilt, no confetti, instant camera moves, reveals already visible |
| Sound | Off by default; never autoplays; one click sound when the user turns it on |

## 7. Section map

Widths refer to the screenshot matrix in `docs/ui-refresh/before/` and `docs/ui-refresh/after/`.

| # | Section (`id`) | Purpose | Desktop | Tablet (768) | Phone (375, 320) |
|---|---|---|---|---|---|
| — | Masthead | Wordmark, five sections plus More, engine status, Preferences, one CTA | Full bar; links collapse into a menu below 1180 | Wordmark, status, Preferences, CTA, menu | Compass mark and name, status dot, Preferences, menu |
| — | Hero and Career Atlas (`hero`) | The statement, two actions, the score caveat, and the Atlas instrument with its legend | Statement left, Atlas right | Stacked: statement, then the Atlas | Stacked; toolbar above the stage; legend as a list |
| — | Evidence strip (`evidence`) | Two separate sources: A alumni corpus, B 2026 placement snapshot | Two panels side by side | Side by side, tighter | Stacked |
| 01 | How a resume is read (`how-it-works`) | Four steps of the real pipeline | Process rail | Rail | Vertical rail |
| 02 | Placement snapshot (`placement-snapshot`) | Batch-level offers, CTC bands, recruiters, categories, caveats | KPI band, then charts and tables | Two columns | One column; recruiter table scrolls inside its frame |
| 03 | Resume analyzer (`analyzer`) | Inputs left, report right: score, rubric, skill evidence, executive review, tailoring, coach | Two columns | Stacked | Stacked; tailoring detail is a bottom sheet |
| 04 | Career Genome (`genome`) | Five archetypes, profile, comparison | Field strip, five tabs, profile panel | Tabs wrap to rows | Tabs scroll sideways; comparison stacks per attribute |
| 05 | Company directory (`company-intel`) | Snapshot figures beside curated practice material, each labelled | Table with filters | Table | Cards |
| 06 | Prompt Studio (`prompt-studio`) | 18 registry frameworks, guided form, live preview, coach handoff | Directory, builder, preview | Two columns | One column |
| 07 | Preferences and control samples (`buttons-lab`) | Where preferences live, and a sample panel of controls | Collapsed samples | Same | Same |
| 08 | Sources, method and questions (`faq`) | Source notes beside native `<details>` questions | Two columns | Two columns | One column |
| — | Footer | Product line, section links | Row | Row | Wrapped rows |

## 8. Reuse plan

Kept and restyled rather than replaced: the `.neu-*` control primitives, the modal and toast system, the results tab
system, the Atlas class and its 2D fallback, the analyzer state machine, the Prompt Studio builder, the voice
widget. New pieces are small and local: the analysis progress panel, the skill evidence panel, the diff change
list, the Atlas status line and evidence card, the comparison layout for narrow phones.

## 9. What stays unchanged

API routes and payloads, JSON keys, the scoring rubric (35/25/20/10/10), persisted preference keys
(`career_ui_theme_v2`, `career_ui_motion_v1`, `resume_checker_mode`, and the one-time migration from
`resume_checker_theme`), event names, and every feature. DOM changes and their migration are listed in
[01](01_source_and_interaction_audit.md#selector-and-dom-migration).

## 10. Screenshot matrix

`docs/ui-refresh/before/<width>/` holds the baseline; `docs/ui-refresh/after/<width>/` holds the same viewport, theme
and state after the refresh, with the same file names. States that only exist after the refresh (voice panel, a
failed request, an applied edit in the diff drawer, a coach answer, the evidence map) have no before pair.
Regenerate with `bash scripts/capture_redesign_matrix.sh docs/ui-refresh/after http://127.0.0.1:8010/`.
