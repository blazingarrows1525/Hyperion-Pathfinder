"""Browser regression tests: each probe drives the real page and reports named checks.

Opt-in, because they need Chrome and a running server with every provider key blank:

    GEMINI_API_KEY= GOOGLE_API_KEY= OPENAI_API_KEY= GROQ_API_KEY= GITHUB_TOKEN= \
        python -m uvicorn main:app --host 127.0.0.1 --port 8010
    UI_BROWSER_BASE_URL=http://127.0.0.1:8010/ python -m pytest tests/test_ui_browser.py -q

Never point this at a server that holds real keys: the probes run real analyses.
"""
import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = os.environ.get("UI_BROWSER_BASE_URL", "")

# probe file, query string, widths, extra harness arguments
PROBES = [
    ("analyzer_inputs.js", "", "1440,375", []),
    ("analyzer_states.js", "", "1440,375", []),
    ("coach_and_sound.js", "", "1440,375", []),
    ("tailoring.js", "", "1440,375", []),
    ("reveal_motion.js", "", "1440,375", []),
    ("reveal_motion.js", "", "1440,375", ["--reduced-motion"]),
    ("atlas_lifecycle.js", "", "1440,375", []),
    ("prompt_studio.js", "", "1440,375", []),
    ("voice.js", "", "1440,375", []),
    ("contrast_scan.js", "?scan=demo", "1440,375", ["--theme", "terra"]),
    ("contrast_scan.js", "?scan=demo", "1440,375", ["--theme", "grove"]),
]

pytestmark = pytest.mark.skipif(
    not BASE_URL or not shutil.which("node"),
    reason="set UI_BROWSER_BASE_URL to a keys-off server and install Node to run the browser probes",
)


def run_probe(probe, query, widths, extra, out_dir):
    url = BASE_URL.rstrip("/") + "/" + query
    done = subprocess.run(
        ["node", "scripts/ui_audit.mjs", "--no-shots", "--url", url, "--widths", widths,
         "--out", str(out_dir), "--eval-file", f"scripts/ui_probes/{probe}", *extra],
        cwd=ROOT, capture_output=True, text=True, timeout=600,
    )
    assert done.returncode == 0, done.stderr[-1500:]
    return json.loads((out_dir / "audit.json").read_text(encoding="utf-8"))["viewports"]


@pytest.mark.parametrize("probe,query,widths,extra", PROBES, ids=[" ".join([p[0], *p[3]]) for p in PROBES])
def test_probe_reports_no_failures(probe, query, widths, extra, tmp_path):
    viewports = run_probe(probe, query, widths, extra, tmp_path)
    problems = []
    for width, entry in viewports.items():
        if entry["consoleErrors"]:
            problems.append(f"{width}px console: {entry['consoleErrors']}")
        if entry["failedRequests"]:
            problems.append(f"{width}px requests: {entry['failedRequests']}")
        if entry["overflow"]["overflow"]:
            problems.append(f"{width}px page overflow: {entry['overflow']['offenders']}")
        result = entry.get("evalResult") or {}
        assert result.get("checks"), f"{width}px: the probe returned no checks: {result}"
        for item in result["checks"]:
            if not item["ok"]:
                problems.append(f"{width}px {item['name']}: {item['detail']}")
    assert not problems, "\n".join(problems)
