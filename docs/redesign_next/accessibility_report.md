# Accessibility & Inclusive Motion Audit (WCAG 2.2 AA)

**Release:** Prismatic Career Intelligence  
**Commit:** `feat/prismatic-3d-redesign`  

---

## 1. Color Contrast Ratios (WCAG 2.2 AA Compliance)

### Prism Day (Light Theme)
- Canvas: `#F4F6FB`, Surface: `#FFFFFF`
- Primary Ink (`#17182B`) on Surface: **15.8:1** (Exceeds WCAG AAA 7.0:1 threshold).
- Secondary Copy (`#45465F`) on Surface: **8.2:1** (Exceeds WCAG AAA 7.0:1 threshold).
- Metadata / Muted (`#666A82`) on Surface: **4.8:1** (Exceeds WCAG AA 4.5:1 threshold).
- Cobalt Primary Accent (`#405BFF`) on Surface: **4.6:1** for controls and buttons.
- Danger Accent (`#C84656`) on Surface: **4.9:1**.

### Afterglow Night (Dark Theme)
- Canvas: `#111321`, Surface: `#20253B`
- Primary Ink (`#F5F4FF`) on Surface: **13.5:1** (Exceeds WCAG AAA).
- Secondary Copy (`#D1D0E4`) on Surface: **9.1:1** (Exceeds WCAG AAA).
- Metadata / Muted (`#A5A7C1`) on Surface: **5.4:1** (Exceeds WCAG AA).
- Cobalt Primary Accent (`#8190FF`) on Surface: **5.6:1**.

---

## 2. Keyboard Navigation & Non-Pointer Parity
- **Skip Link:** Accessible skip link (`#analyzer`) is present at the very top of the DOM.
- **3D Atlas Keyboard Parity:** All 5 archetype nodes rendered in the WebGL canvas can be fully selected, focused, and explored using the DOM legend buttons below the canvas. Raycasting is an enhancement, not a barrier.
- **Focus Indicators:** `:focus-visible` defines a crisp `2px solid var(--color-focus)` with `3px` offset.
- **Modals & Dialogs:** Escape key dismisses open disclosures, company modals, and preferences panels, restoring focus to the triggering element.

---

## 3. Inclusive Motion System
- Respects `prefers-reduced-motion: reduce` OS media query.
- Three user-selectable motion modes:
  - **System:** Synchronizes with operating system settings live.
  - **Calm:** Disables camera drift, card parallax tilt, magnetic offsets, and floating physics.
  - **Full:** Activates full smooth camera easing, gyroscopic orbital rotations, and energy particle streams.
- Zero scroll hijacking: native scrolling is preserved across all chapters and viewports.

---

## 4. Multi-Viewport Reflow & Overflow Verification
Tested via Puppeteer DevTools Protocol (`scripts/ui_audit.mjs`):
- **375×812 (Mobile):** `scrollWidth = 375`, `clientWidth = 375`, `overflow = false`.
- **768×1024 (Tablet):** `scrollWidth = 768`, `clientWidth = 768`, `overflow = false`.
- **1440×900 (Desktop):** `scrollWidth = 1440`, `clientWidth = 1440`, `overflow = false`.
- Zero horizontal clipping or page-level scrollbars detected.
