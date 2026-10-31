# Prismatic Career Intelligence — Design Direction & Specification (Milestone 1)

**Project:** Hyperion Pathfinder  
**Audited Commit:** `ae38857bee5c99fcc1fff815500f3b62915d791b`  
**Feature Branch:** `feat/prismatic-3d-redesign`  
**Selected Visual Thesis:** **PRISMATIC CAREER INTELLIGENCE**  

---

## 1. Reference Study & Translation Matrix (Awwwards 3D & WebGPU Analysis)

| Reference Project | First Visual Impression | Dominant Metaphor | Interaction Discovery | Scroll Behavior | Readability Strategy | Translated to Hyperion Pathfinder | Rejected Pattern |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **USAvionix** *(Awwwards SOTD)* | Central aerospace spatial model over dark brushed titanium coordinates | Precision telemetry instrument with coordinate lines | Gyroscopic axis rings & visible zoom controls | Native scroll with smooth camera tracking | Smoked glass HUD panels (`backdrop-filter`) with crisp monospace telemetry | Smoked glass HUD cards, coordinate ground grid, gyroscopic orbital rings | Heavy multi-megabyte glTF downloads, uninvited audio |
| **RefractWeb** *(Developer Award)* | Translucent refractive glass prism dispersing light into spectral hues | Optical refraction / spectral dispersion | Pointer tilt creates chromatic dispersion | Discrete chapter reveals | Clean typography on high-contrast surfaces; refraction on accents | **Prismatic Career Lens**: raw candidate resume entered -> refracted into 5 archetypes and score bands | Heavy postprocessing passes (bloom + aberration) that kill mobile GPUs |
| **Seasats** *(Honorable Mention)* | High-contrast data layout with clean 3D vessel telemetry | Autonomous command dashboard | Numbered badges (`01`, `02`) expanding into details | Content-first vertical flow; 3D docks into header | Monospace tabular figures, black/white/safety-accent contrast | Asymmetric hero grid, numbered chapter markers (`01`, `02`), high-contrast KPI cards | Dark-mode only; lack of light theme contrast |
| **Cerebrium** *(AI Platform)* | Kinetic typography paired with interactive 3D compute core | High-throughput intelligence engine | Nodes react to hover with immediate tooltip | 3D core simplifies into docked indicator on scroll | Deep porcelain canvas with satin card surfaces | Docked 3D scene lifecycle (idle at 0 frames when offscreen; pause during analysis) | Floating 3D elements occluding text forms |
| **The Monolith Project** *(WebGPU)* | Monumental spatial geometry with crisp facets and directional lighting | Monolithic structural foundation | Drag to rotate azimuth; keyboard focus navigation | Discrete chapter shifts with camera targets | Editorial cards with strong borders, reading length < 75ch | 5 distinct geometric silhouettes for the 5 archetypes; keyboard DOM legend | Full-screen scroll trapping / hijacking |

---

## 2. Design Direction Evaluation & Selection

| Criterion | Direction A: Cyberpunk Terminal | Direction B: Pastel Claymorphism | Direction C: Prismatic Career Intelligence (SELECTED) |
| :--- | :--- | :--- | :--- |
| **Visual Distinctiveness** | High initially, but generic gamer aesthetic | Soft and friendly, but looks like a toy | **High, memorable, professional, spatial instrument** |
| **Greyscale Integrity** | Poor (relies heavily on glowing green/cyan) | Poor (relies on soft shadows without crisp edges) | **Exceptional (sharp neo-brutalist borders + distinct typography)** |
| **Enterprise / Career Credibility** | Low (feels like a crypto trading tool) | Low (feels like a children's game) | **High (balanced design tool + data studio + executive advisor)** |
| **Accessibility (WCAG 2.2 AA)** | Challenging on small neon text | Challenging on low-contrast pastel backgrounds | **Engineered for >= 4.5:1 text and 3:1 UI controls** |
| **Mobile & Performance** | Heavy glow shaders crush mobile GPUs | Heavy inset shadows cause mobile redraw lag | **Lightweight single Three.js canvas + CSS hardware transforms** |

---

## 3. Prismatic Color Architecture (Prism Day & Afterglow Night)

```css
/* ==========================================================================
   PRISMATIC CAREER INTELLIGENCE: SEMANTIC COLOR TOKENS
   ========================================================================== */

/* PRISM DAY (Light Theme) */
[data-theme="prism-day"], :root:not([data-theme="afterglow-night"]) {
  --color-canvas: #F4F6FB;          /* Cool porcelain canvas */
  --color-canvas-alt: #E9EDF6;      /* Alternate chapter background */
  --color-surface: #FFFFFF;         /* Primary workspace cards */
  --color-surface-raised: #FFFFFF;  /* Raised dialogs, active panels */
  --color-surface-inset: #E5E9F2;   /* Inset inputs, control wells */
  --color-surface-glass: rgba(255, 255, 255, 0.78);
  --color-ink: #17182B;             /* Primary deep ink (15.8:1 contrast) */
  --color-ink-soft: #45465F;        /* Secondary copy (6.9:1 contrast) */
  --color-muted: #666A82;           /* Captions, metadata (4.8:1 contrast) */
  --color-border: #D7DDEC;          /* Crisp neo-brutalist dividers */
  --color-border-subtle: #E2E6F2;
  --color-focus: #405BFF;           /* Accessible focus ring */

  /* Spectral Accent Roles */
  --color-primary: #405BFF;         /* Cobalt primary action */
  --color-primary-hover: #2B45E6;
  --color-violet: #865BFF;          /* Ultraviolet spatial accent */
  --color-coral: #FF705E;           /* Refractive coral callout */
  --color-aqua: #2CBFB7;            /* Precision data / match accent */
  --color-lime: #C8E65A;            /* High-energy small highlights */
  --color-amber: #E7A842;           /* Caution / pending / unverified */
  --color-danger: #C84656;          /* Critical gap / error */

  /* Shadows & Depth */
  --elevation-flat: none;
  --elevation-1: 0 2px 8px rgba(23, 24, 43, 0.05);
  --elevation-2: 0 8px 24px rgba(23, 24, 43, 0.08);
  --elevation-3: 0 16px 48px rgba(23, 24, 43, 0.12);
  --elevation-glass: 0 12px 40px rgba(64, 91, 255, 0.08), 0 1px 2px rgba(23, 24, 43, 0.04);
}

/* AFTERGLOW NIGHT (Dark Theme) */
[data-theme="afterglow-night"] {
  --color-canvas: #111321;          /* Deep blue-plum night canvas */
  --color-canvas-alt: #191D31;      /* Alternate chapter */
  --color-surface: #20253B;         /* Surface cards */
  --color-surface-raised: #292F49;  /* Raised dialogs and floating panels */
  --color-surface-inset: #15192B;   /* Inset inputs */
  --color-surface-glass: rgba(32, 37, 59, 0.78);
  --color-ink: #F5F4FF;             /* Primary light ink (14.2:1 contrast) */
  --color-ink-soft: #D1D0E4;        /* Secondary copy (9.8:1 contrast) */
  --color-muted: #A5A7C1;           /* Captions, metadata (5.5:1 contrast) */
  --color-border: #353B57;          /* Structured dark borders */
  --color-border-subtle: #2A3049;
  --color-focus: #8190FF;           /* Accessible focus ring */

  /* Spectral Accent Roles */
  --color-primary: #8190FF;         /* Electric cobalt */
  --color-primary-hover: #9BA8FF;
  --color-violet: #B39AFF;          /* Glowing ultraviolet */
  --color-coral: #FF9383;           /* Luminous coral */
  --color-aqua: #6DE0D5;            /* Luminous aqua data */
  --color-lime: #D8EF75;            /* Lime accent */
  --color-amber: #F2C46C;           /* Amber caution */
  --color-danger: #FF8799;          /* Crisp danger */

  /* Shadows & Depth */
  --elevation-flat: none;
  --elevation-1: 0 2px 8px rgba(0, 0, 0, 0.35);
  --elevation-2: 0 8px 24px rgba(0, 0, 0, 0.45);
  --elevation-3: 0 16px 48px rgba(0, 0, 0, 0.60);
  --elevation-glass: 0 12px 40px rgba(0, 0, 0, 0.50), 0 0 0 1px rgba(129, 144, 255, 0.15);
}
```

---

## 4. Typography Scale & Hierarchy

- **Display:** `Space Grotesk`, -0.02em letter spacing, crisp tabular numerals for metrics.
- **Body:** `Inter`, neutral and highly legible across dense candidate reports and dossiers.
- **Code / Telemetry:** `JetBrains Mono` / `IBM Plex Mono` for token metrics, cluster IDs, CTC figures.
- Clamp scale:
  - Hero Display: `clamp(2.75rem, 5.5vw, 4.5rem)`
  - Section Headings: `clamp(1.75rem, 3.2vw, 2.75rem)`
  - Subsection Headings: `clamp(1.25rem, 2vw, 1.75rem)`
  - Body: `clamp(0.9375rem, 1.1vw, 1.0625rem)`, line-height 1.6
  - Telemetry / Labels: `0.8125rem`, uppercase, +0.06em tracking.

---

## 5. Structural Recomposition of Nested Application Workspaces

1. **Chapter Architecture:**
   - **Chapter 00:** Navigation Bar & Live Engine Status Pill
   - **Chapter 01:** 3D Career Atlas & Benchmark Topology Lens (Hero)
   - **Chapter 02:** Data Provenance & Evidence Verification (Corpus vs Placement Snapshot)
   - **Chapter 03:** Placement Intelligence Dashboard (8,214 Offers, CTC bands, Recruiter Table)
   - **Chapter 04:** Resume Workbench (Guided Intake FSM: Upload, JD, Executive Lens)
   - **Chapter 05:** Analysis Results Studio (Deterministic Rubric Breakdown & Evidence Board)
   - **Chapter 06:** Executive Review Dossier (Three AI Directors with Role Skepticism & Questions)
   - **Chapter 07:** Interactive Resume Tailoring (Exact-Span Annotated Editor, Diff Drawer, Undo/Redo)
   - **Chapter 08:** Career Genome (5 Archetype Silhouettes, Cluster Comparison Matrix)
   - **Chapter 09:** Company Intelligence (Sourced Recruiter Facts + Practice Material)
   - **Chapter 10:** 18-Framework Prompt Studio (Composer, Registry Drafts, Coach Handoff)
   - **Chapter 11:** Career Coach & Voice Briefing (Text Chat, Optional Audio Dictation)
   - **Chapter 12:** Methodology, System Preferences & FAQ
2. **Recomposing Nested Results Surfaces:**
   - Transform the plain text output into an **executive dossier canvas**:
     - Summary KPI Banner with deterministic score dial and benchmark comparison.
     - 5-category breakdown bars with maximum caps (35/25/20/10/10).
     - Color-coded evidence matrix (Demonstrated, Partial, Weakly Evidenced, Missing).
     - Prioritized recommendation cards with estimated effort and target sections.
   - Interactive Resume Editor: Split-pane review with line-numbered canonical text, inline severity badges, and floating critique popover.
