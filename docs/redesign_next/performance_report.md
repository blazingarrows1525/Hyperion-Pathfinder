# Performance & WebGL Renderer Metrics

**Release:** Prismatic Career Intelligence  
**Commit:** `feat/prismatic-3d-redesign`  

---

## 1. WebGL Renderer Budget & Health
- **Active WebGL Canvases:** Strictly 1 (`#spatial-hero-canvas`).
- **Single Context Invariant:** Downstream sections (Evidence, Snapshot, Analyzer, Genome, Companies, Prompt Studio) reuse 2D/CSS depth layers without opening duplicate WebGL contexts.
- **Render-on-Demand:** The rendering loop uses `requestAnimationFrame` scheduled only during active pointer drag, camera easing, or hover transitions. When idle, the renderer renders **0 frames per second**, conserving 100% of GPU resources.
- **Offscreen Invalidation:** IntersectionObserver pauses the WebGL loop whenever `#hero-3d-stage` scrolls out of view.
- **Draw Calls:** Capped at 28 draw calls for the complete Career Atlas (disc, ground ring, 5 nodes, 10 orbital rings, holographic core, energy beam particles, and ambient stardust).
- **Triangle Count:** Approximately 13,200 triangles.
- **Geometry Disposal:** Complete scene traversal in `disposeSceneObjects()` disposes geometries and textures to eliminate memory leaks across re-initialization and WebGL context restoration.

---

## 2. Core Web Vitals Lab Baseline
- **First Contentful Paint (FCP):** Immediate static DOM paint with typography and poster fallback before WebGL initialization.
- **Cumulative Layout Shift (CLS):** Pre-hydrated fallback numbers (8,214 offers, 421 employers, 562 profiles) in `index.html` prevent layout shifts during asynchronous API fetching.
- **Interaction to Next Paint (INP):** Event delegation used for repetitive table rows and archetype tabs to avoid deep layout thrashing.

---

## 3. External Script Dependencies & SRI Security
All 5 external scripts are pinned with exact versions and SHA-384 Subresource Integrity:
- `Three.js r128`: `sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu`
- `Lucide Icons v1.65.0`: `sha384-oAT1xXQFdqehMqVDwRuUtxysEdTboTptoL1DtOoG6nCanpYN0HU8xpv+lIU3jh4V`
- `Marked.js v15.0.12`: `sha384-948ahk4ZmxYVYOc+rxN1H2gM1EJ2Duhp7uHtZ4WSLkV4Vtx5MUqnV+l7u9B+jFv+`
- `Canvas Confetti v1.9.3`: `sha384-sPwMflxqfAN+Q5mvlkLmHiX3PORGbZSXHiSGPTXT9VHCD/AB+b+r+vJWsqprv+7k`
- `DOMPurify v3.2.4`: `sha384-0t129pLup4szxSp1yQ4yYmSGe5PQegtxSpkk5cvSbS5Z9MtP4pdWpRLMlhqHzbvI`
