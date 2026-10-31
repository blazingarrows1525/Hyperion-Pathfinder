# Rollback & Recovery Plan

**Release:** Prismatic Career Intelligence  
**Feature Branch:** `feat/prismatic-3d-redesign`  
**Base Commit (Known Good):** `ae38857bee5c99fcc1fff815500f3b62915d791b`  

---

## 1. Rollback Procedure
If any production anomaly or visual regression is observed, rollback to the audited base commit can be completed in under 60 seconds:

```bash
# 1. Switch back to the known-good base branch
git checkout feat/fieldnotes-dual-ide

# 2. Or reset working branch to known-good commit
git checkout -b rollback-to-ae38857 ae38857bee5c99fcc1fff815500f3b62915d791b

# 3. Verify test suite
.\.venv\Scripts\pytest.exe

# 4. Restart server
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## 2. Zero Database Migrations
Because Hyperion Pathfinder uses static structured JSON files (`placement_snapshot_2026.json`, `prompt_frameworks.json`, `skill_taxonomy.json`) and an in-memory FAISS index without persistent relational schema mutations, rolling back code has zero database migration risk.
