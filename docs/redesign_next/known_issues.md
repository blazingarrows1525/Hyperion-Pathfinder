# Known Issues & Architectural Constraints (Pre-Redesign Baseline)

**Audited Commit:** `ae38857bee5c99fcc1fff815500f3b62915d791b`  
**Date:** 31 October 2026  
**Auditor:** Lead Product Designer & Quality Architect  

---

## 1. Visual & Compositional Deficits
1. **Nested Results Layout Not Recomposed:**
   - In the Terra Atelier update, inner results components (Executive Review dossier, resume tailoring editor, Career Coach drawer, Voice panel) received token color swaps but remained in their original boxy card geometry.
2. **Long Flat Single-Page Reading Rhythm:**
   - The ten top-level sections (`#hero`, `#evidence`, `#how-it-works`, `#placement-snapshot`, `#analyzer`, `#genome`, `#company-intel`, `#prompt-studio`, `#buttons-lab`, `#faq`) still read as a continuous scroll of separate boxes without dynamic chapter pacing or cohesive spatial depth.
3. **Legacy Neumorphic Residuals:**
   - `#buttons-lab` still retains sample controls that feel disconnected from a serious career intelligence tool.
4. **Theme Rigidity:**
   - Only Terra Atelier and Midnight Grove exist. A modern prismatic visual system (Prism Day / Afterglow Night) with translucent resin, smoked glass, refractive accents, and neo-brutalist structure is required.

## 2. 3D Spatial & Atlas Architecture
1. **Scene Decoupling from Application Workspaces:**
   - While the 3D Career Atlas renders 5 real archetypes with gyroscopic orbitals and particle beams, it is largely confined to the hero section and does not meaningfully transition or project into the downstream analysis or genome chapters.
2. **Three.js Pinning:**
   - The engine is pinned to `three.min.js` r128 via CDN. While stable and zero-idle-frame verified, any upgrade must follow a careful migration plan to avoid WebGL 2 breaking changes.
3. **Single Renderer Invariant:**
   - Must strictly maintain one WebGL context. Downstream sections must not create secondary canvas instances.

## 3. Data & Privacy Invariants
1. **Corpus vs. Placement Distinction:**
   - 226 benchmark alumni resume vectors vs. 8,214 placement snapshot offers. Total offers != unique placed students. Must never conflate.
2. **Scoring Invariant:**
   - 100-point deterministic rubric (35/25/20/10/10) must never fluctuate across themes, personas, or UI states.
3. **Server Security Owner Actions:**
   - `vector_store/benchmark_resumes.pkl` contains legacy alumni records in Git history.
   - `/api/llm/configure` and `/api/llm/test` are unauthenticated endpoints requiring server-side owner hardening.
   - Client-side must continue to enforce zero secret storage, zero localStorage persistence of resumes/JDs, and strict DOMPurify sanitization.
