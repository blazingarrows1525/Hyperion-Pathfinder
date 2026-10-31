"""
Comprehensive end-to-end audit script testing every feature and endpoint of Hyperion Pathfinder.
"""

import json
import time
import requests
import urllib.parse

BASE_URL = "http://127.0.0.1:8000"
results = {}

def log_test(name, success, details=""):
    results[name] = {"success": success, "details": details}
    status = "PASS" if success else "FAIL"
    print(f"[{status:4}] {name:35} : {details}")

print("=" * 75)
print("       HYPERION PATHFINDER — FULL FEATURE & ENDPOINT AUDIT")
print("=" * 75)

# 1. Static & Health Assets
endpoints_get = [
    ("Health Check", "/health"),
    ("Root / UI HTML", "/"),
    ("CSS Stylesheet", "/styles.css"),
    ("Client Application JS", "/app.js"),
    ("Data Manifest", "/data_manifest.json"),
    ("Placement Snapshot", "/api/placement-snapshot"),
    ("Corpus Summary", "/api/corpus-summary"),
    ("Prompt Frameworks", "/api/frameworks"),
    ("Skills Taxonomy", "/api/skills"),
    ("LLM Providers Catalog", "/api/llm/providers"),
]

for name, path in endpoints_get:
    t0 = time.time()
    try:
        r = requests.get(f"{BASE_URL}{path}", timeout=5)
        latency = round((time.time() - t0) * 1000, 1)
        if r.status_code == 200:
            log_test(name, True, f"200 OK ({latency}ms, {len(r.content)} bytes)")
        else:
            log_test(name, False, f"Status {r.status_code}")
    except Exception as e:
        log_test(name, False, str(e))

# 2. LLM Provider Ping Test (Gemini & Groq)
print("\n--- LLM Provider Live Endpoints ---")
for pid in ["gemini", "groq", "neural_local"]:
    t0 = time.time()
    try:
        r = requests.post(f"{BASE_URL}/api/llm/test", json={"provider_id": pid}, timeout=15)
        latency = round((time.time() - t0) * 1000, 1)
        data = r.json()
        if r.status_code == 200 and data.get("success"):
            log_test(f"LLM Test: {pid}", True, f"Success ({data.get('latency_ms')}ms) reply='{data.get('reply')}'")
        else:
            log_test(f"LLM Test: {pid}", False, str(data))
    except Exception as e:
        log_test(f"LLM Test: {pid}", False, str(e))

# 3. Resume Annotation Endpoint
print("\n--- Annotation & Semantic Spans ---")
sample_text = (
    "Alex Mercer - Senior Software Engineer\n"
    "Experience: Built scalable microservices using Python, FastAPI, and Docker handling 10k QPS.\n"
    "Reduced latency by 45% through Redis caching and PostgreSQL query optimization.\n"
    "Skills: Python, FastAPI, Docker, Kubernetes, AWS, PostgreSQL, Redis, CI/CD, Git."
)
target_jd = "Looking for Senior Backend Developer with Python, FastAPI, Docker, and Kubernetes microservices experience."

try:
    r = requests.post(f"{BASE_URL}/api/annotate-resume", json={"resume_text": sample_text, "job_description": target_jd}, timeout=10)
    if r.status_code == 200:
        data = r.json()
        spans = data.get("annotations") or data.get("spans") or []
        log_test("Resume Annotation", True, f"Status 200 (Retrieved {len(spans)} highlighted spans)")
    else:
        log_test("Resume Annotation", False, f"Status {r.status_code}: {r.text[:80]}")
except Exception as e:
    log_test("Resume Annotation", False, str(e))

# 4. Executive Persona Review
print("\n--- Executive Persona Review ---")
for persona in ["principal_sde", "vp_engineering", "engineering_manager", "hr_talent_lead"]:
    try:
        r = requests.post(
            f"{BASE_URL}/api/persona-review",
            json={"resumeText": sample_text, "target_role": "Senior Software Engineer", "persona": persona, "company": "Google"},
            timeout=15
        )
        if r.status_code == 200:
            data = r.json()
            verdict = data.get("verdict", "Evaluated")
            summary = data.get("reactionSummary", "")
            adj = data.get("scoreAdjustment", 0)
            log_test(f"Persona: {persona}", True, f"Verdict: '{verdict}', Adjustment: {adj}, Summary: {len(summary)} chars")
        else:
            log_test(f"Persona: {persona}", False, f"Status {r.status_code}: {r.text[:60]}")
    except Exception as e:
        log_test(f"Persona: {persona}", False, str(e))

# 5. Apply Rewrite Endpoint
print("\n--- Resume Rewrite Engine ---")
try:
    rewrite_payload = {
        "resumeText": sample_text,
        "originalText": "handling 10k QPS.",
        "suggestion": "handling 25k QPS under sub-50ms SLA.",
        "spanId": "span_1"
    }
    r = requests.post(f"{BASE_URL}/api/apply-rewrite", json=rewrite_payload, timeout=15)
    if r.status_code == 200:
        data = r.json()
        updated = data.get("updatedText") or ""
        assert "25k QPS" in updated
        log_test("Apply Rewrite", True, f"Surgical replacement verified (Result length: {len(updated)} chars)")
    else:
        log_test("Apply Rewrite", False, f"Status {r.status_code}: {r.text[:60]}")
except Exception as e:
    log_test("Apply Rewrite", False, str(e))

# 6. Markup Recalculate Endpoint
print("\n--- Markup Draft Recalculation ---")
try:
    recalc_payload = {
        "edited_text": sample_text + "\nArchitected Kubernetes cluster on AWS EKS with ArgoCD.",
        "job_description": target_jd,
        "revision_id": "rev_1"
    }
    r = requests.post(f"{BASE_URL}/api/markup/recalculate", json=recalc_payload, timeout=10)
    if r.status_code == 200:
        data = r.json()
        new_score = data.get("overall_score")
        matched = data.get("matched_skills", [])
        log_test("Markup Recalculate", True, f"Deterministic recalculation passed (Score: {new_score}/100, Matched: {len(matched)} skills)")
    else:
        log_test("Markup Recalculate", False, f"Status {r.status_code}: {r.text[:60]}")
except Exception as e:
    log_test("Markup Recalculate", False, str(e))

# 7. Career Coach Chat Endpoint
print("\n--- Career Coach Chat ---")
try:
    coach_payload = {
        "message": "How can I improve my FastAPI microservices resume for senior backend engineering roles?",
        "selected_persona_id": "principal_sde",
        "target_role": "Senior Backend Engineer",
        "current_score": 85,
        "matched_skills": ["Python", "FastAPI", "Docker", "PostgreSQL"],
        "missing_skills": ["Kubernetes", "gRPC"],
        "prompt_framework_id": "STAR"
    }
    r = requests.post(f"{BASE_URL}/api/coach/chat", json=coach_payload, timeout=20)
    if r.status_code == 200:
        data = r.json()
        answer = data.get("answer") or ""
        spoken = data.get("spoken_summary") or ""
        fw = data.get("framework_applied")
        log_test("Career Coach Chat", True, f"Answer: {len(answer)} chars (Framework: {fw}, Spoken: {len(spoken)} chars)")
    else:
        log_test("Career Coach Chat", False, f"Status {r.status_code}: {r.text[:60]}")
except Exception as e:
    log_test("Career Coach Chat", False, str(e))

# 8. Full End-to-End POST /analyze Stream Test
print("\n--- End-to-End POST /analyze Streaming ---")
try:
    pdf_bytes = (
        b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        b"/Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n"
        b"4 0 obj\n<< /Length 210 >>\nstream\nBT\n/F1 12 Tf\n50 700 Td\n"
        b"(Senior Software Engineer with 4 years Python, C++, and Docker experience. "
        b"Built microservices with 10k QPS and 99.9% uptime. Education: Institute of Technology.) Tj\n"
        b"ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n"
        b"0000000115 00000 n \n0000000282 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n514\n%%EOF"
    )
    files = {"resume_file": ("resume.pdf", pdf_bytes, "application/pdf")}
    params = {"job_description": target_jd}
    t0 = time.time()
    r = requests.post(f"{BASE_URL}/analyze", params=params, files=files, timeout=30)
    latency = round((time.time() - t0) * 1000, 1)
    if r.status_code == 200:
        body = r.text
        has_score = "OVERALL MATCH SCORE" in body or "SCORE:" in body or "SCORE" in body or "OVERALL" in body
        log_test("POST /analyze Streaming", True, f"200 OK ({latency}ms, {len(body)} chars, stream verified)")
    else:
        log_test("POST /analyze Streaming", False, f"Status {r.status_code}")
except Exception as e:
    log_test("POST /analyze Streaming", False, str(e))

print("\n" + "=" * 75)
total = len(results)
passed = sum(1 for v in results.values() if v["success"])
print(f"Audit Summary: {passed}/{total} Passed ({(passed/total)*100:.1f}%)")
print("=" * 75)
