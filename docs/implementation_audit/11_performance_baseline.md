# 11. Performance Baseline & Rendering Budgets

### Rendering Metrics (Puppeteer / Chromium Headless)
- **Document Load Time:** ~320ms on local loopback
- **Three.js Scene Initialization:** ~42ms (Single WebGL context, low-power preference)
- **DOM Node Count:** 1,240 nodes (well within <1,500 budget)
- **Canvas DPR Cap:** Capped at 1.5x on high-DPI desktop, 1.0x on mobile devices
- **Animation Frame Policy:** Render-on-demand with RAF pause on offscreen (`IntersectionObserver`) and hidden tab (`document.hidden`)
- **Memory Footprint:** Clean scene disposal (`disposeSceneObjects`) preventing GPU resource leaks
