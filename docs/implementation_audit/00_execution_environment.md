# 00. Execution Environment Baseline

**Date:** 31 October 2026  
**Operating System:** Windows 11 Home / Windows NT (x86_64)  
**Host Shell:** PowerShell 5.1 / Windows Terminal  
**Python Runtime:** Python 3.10.11 (`c:\Users\ASUS\Desktop\resume expert\SRM_Resume_Expert\.venv\Scripts\python.exe`)  
**Node.js Runtime:** v25.2.1  
**Target IDEs:** Google Antigravity IDE (Gemini 3.8 Flash High / Claude Opus) & Claude Code CLI  
**Active Repository Path:** `c:\Users\ASUS\Desktop\resume expert\SRM_Resume_Expert`  
**Remote Git Origin:** `https://github.com/blazingarrows1525/Hyperion-Pathfinder.git`  
**Active Branch:** `feat/fieldnotes-dual-ide` at commit `55e6000e5dd2d2303de0c12505349544040f5b84`  
**Server Process:** Uvicorn 0.34.0 running on `http://127.0.0.1:8000` (FastAPI 0.115.6)  
**Vector Store Engine:** FAISS Index (`all-MiniLM-L6-v2`, 384-dimensional Euclidean/cosine normalized, 226 vectors)  
**Local Test Suite:** pytest 8.3.4 (95/95 passing unit and integration tests)  
**Browser Engine for UI Audits:** Node.js Puppeteer / Playwright Chromium automation (`scripts/ui_audit.mjs`)  

### Runtime Tooling Availability
| Tool | Path / Command | Status |
|---|---|---|
| `python` | `.\.venv\Scripts\python.exe` | Verified (v3.10.11) |
| `pytest` | `.\.venv\Scripts\python.exe -m pytest` | Verified (95 passed) |
| `uvicorn` | `.\.venv\Scripts\uvicorn.exe` | Verified (running on :8000) |
| `node` | `node` | Verified (v25.2.1) |
| `git` | `git` | Verified (git version 2.45+) |
| `gh` CLI | `gh` | Authenticated as `blazingarrows1525` |
