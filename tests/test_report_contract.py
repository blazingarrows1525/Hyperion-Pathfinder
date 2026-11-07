"""The browser reads exactly the report fields the backend sends (baseline HP-03, HP-04, HP-17).

A live analysis used to show sample rubric numbers and no score, because app.js read fields
the backend never sent. These checks pin both sides of the contract.
"""
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import DraftRecalculateResponse, PlacementBenchmarkingReport, ResumeDocumentSnapshot

ROOT = Path(__file__).resolve().parent.parent
JS = (ROOT / "app.js").read_text(encoding="utf-8")
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SCORING = (ROOT / "services" / "scoring.py").read_text(encoding="utf-8")


def test_report_fields_read_by_the_browser_exist():
    report_fields = PlacementBenchmarkingReport.model_fields
    for name in ("overall_score", "score_breakdown", "document_snapshot", "resume_markups", "persona_review"):
        assert name in report_fields, name
    for name in ("canonical_display_text", "revision_id", "text_hash"):
        assert name in ResumeDocumentSnapshot.model_fields, name
    for name in ("overall_score", "score_breakdown", "document_snapshot", "resume_markups"):
        assert name in DraftRecalculateResponse.model_fields, name

    assert "report.overall_score" in JS and "report.score_breakdown" in JS
    assert "report.document_snapshot" in JS and "snapshot.canonical_display_text" in JS
    assert "data.score_breakdown" in JS and "data.document_snapshot" in JS
    assert "deterministic_score" not in JS  # never sent by the backend


def test_rubric_keys_match_the_scoring_engine():
    engine_keys = set(re.findall(r'"key": "([a-z_]+)"', SCORING))
    block = JS[JS.index("const RUBRIC_METERS = {"):]
    ui_keys = set(re.findall(r"^\s+([a-z_]+): \{ id:", block[: block.index("};")], re.M))
    assert engine_keys and ui_keys == engine_keys


def test_rubric_starts_empty_and_is_never_invented():
    for meter in ("skills", "projects", "domain", "metrics", "structure"):
        value = re.search(rf'id="meter-val-{meter}">([^<]*)<small>', HTML).group(1)
        assert value == "—", (meter, value)
        assert f'id="meter-fill-{meter}" style="width:0%;"' in HTML, meter
    assert "35 * r" not in JS  # no proportional split of a total into components
    # The score ring never parses numbers out of narrative text.
    ring = JS[JS.index("function updateScoreRing()"):]
    assert ".match(" not in ring[: ring.index("\n}\n")]


def test_demo_breakdown_adds_up_to_the_demo_score():
    block = JS[JS.index("const mockReport = {"):]
    block = block[: block.index("\n  };")]
    score = int(re.search(r"overall_score: (\d+)", block).group(1))
    points = [int(p) for p in re.findall(r"points_earned: (\d+)", block)]
    assert len(points) == 5 and sum(points) == score
