"""
tests/test_feature_api.py
Integration tests for FastAPI endpoints:
- GET /health (capability discovery)
- POST /api/coach/chat (conversational career coach)
- POST /api/markup/recalculate (stateless draft recalculation)
- POST /transcribe-audio (graceful 503 fallback when provider unconfigured)
"""

import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


class TestFeatureAPIEndpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_capabilities_schema(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("capabilities", data)
        caps = data["capabilities"]
        self.assertTrue(caps["persona_review_enabled"])
        self.assertTrue(caps["resume_markup_enabled"])
        self.assertTrue(caps["draft_recalculation_enabled"])
        self.assertTrue(caps["browser_tts_recommended"])

    def test_coach_chat_endpoint(self):
        payload = {
            "message": "How do I explain my Kubernetes experience to a hiring manager?",
            "selected_persona_id": "cloud_infrastructure_director",
            "target_role": "DevOps Engineer",
            "current_score": 75,
            "matched_skills": ["Docker", "Linux"],
            "missing_skills": ["Kubernetes", "Terraform"]
        }
        response = self.client.post("/api/coach/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("answer", data)
        self.assertIn("spoken_summary", data)
        self.assertEqual(data["persona_id"], "cloud_infrastructure_director")
        self.assertIn("Cloud Infrastructure Director", data["persona_title"])
        self.assertIn("Simulated career coaching", data["disclaimer"])

    def test_draft_recalculation_endpoint(self):
        edited_text = (
            "Experience\n"
            "Software Developer at Acme Inc.\n"
            "Engineered distributed caching with Redis, reducing p95 latency from 180ms to 45ms at 10k QPS.\n"
            "Skills\n"
            "Python, Redis, Docker, FastAPI\n"
        )
        payload = {
            "edited_text": edited_text,
            "job_description": "Required: Python, Redis, Docker, FastAPI",
            "document_id": "doc_api_test",
            "revision_id": "rev_api_1",
            "selected_persona_id": "principal_sde"
        }
        response = self.client.post("/api/markup/recalculate", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("overall_score", data)
        self.assertGreaterEqual(data["overall_score"], 0)
        self.assertLessEqual(data["overall_score"], 100)
        self.assertIn("resume_markups", data)
        self.assertIn("document_snapshot", data)
        self.assertEqual(data["document_snapshot"]["revision_id"], "rev_api_1")

    def test_framework_list_endpoints(self):
        for path in ["/framework-list", "/api/frameworks"]:
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("frameworks", data)
            self.assertEqual(len(data["frameworks"]), 18)
            ids = [f["id"] for f in data["frameworks"]]
            self.assertIn("CLEAR", ids)
            self.assertIn("RACE", ids)
            self.assertIn("STAR", ids)

    def test_persona_review_endpoint(self):
        payload = {
            "persona": "director_ai_research",
            "company": "Google",
            "resumeText": "Engineered PyTorch neural models with 92% accuracy and 15ms latency.",
            "target_role": "AI Research Scientist"
        }
        response = self.client.post("/persona-review", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("verdict", data)
        self.assertIn("reactionSummary", data)
        self.assertIn("priorities", data)
        self.assertEqual(data["persona_id"], "director_ai_research")
        self.assertIn("Director of AI & Research", data["persona_title"])

    def test_annotate_resume_endpoint(self):
        payload = {
            "resumeText": "Assisted with team development. Synergy and best-of-breed algorithms. Reduced latency by 30%.",
            "jdText": "Required: Python, Distributed Systems, Redis"
        }
        response = self.client.post("/annotate-resume", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("markups", data)
        self.assertGreater(len(data["markups"]), 0)

    def test_apply_rewrite_endpoint(self):
        payload = {
            "originalText": "Assisted with team development",
            "suggestion": "Spearheaded distributed microservice implementation",
            "resumeText": "Candidate Profile: Assisted with team development on AWS."
        }
        response = self.client.post("/apply-rewrite", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("updatedText", data)
        self.assertIn("Spearheaded distributed microservice implementation", data["updatedText"])
        self.assertNotIn("Assisted with team development", data["updatedText"])

    def test_coach_chat_with_framework(self):
        payload = {
            "message": "How do I describe my caching project?",
            "selected_persona_id": "principal_sde",
            "target_role": "Senior Backend Engineer",
            "prompt_framework_id": "RACE"
        }
        response = self.client.post("/api/coach/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["framework_applied"], "RACE")
        self.assertIn("RACE", data["answer"])

    def test_llm_providers_list(self):
        response = self.client.get("/api/llm/providers")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("active_provider", data)
        self.assertIn("providers", data)
        provider_ids = [p["id"] for p in data["providers"]]
        self.assertIn("neural_local", provider_ids)
        self.assertIn("gemini", provider_ids)
        self.assertIn("openai", provider_ids)
        self.assertIn("groq", provider_ids)
        self.assertIn("ollama", provider_ids)

    def test_llm_ping_probe(self):
        payload = {"provider_id": "neural_local"}
        response = self.client.post("/api/llm/test", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["reply"], "PONG")

    def test_llm_configure_endpoint(self):
        payload = {"provider_id": "neural_local"}
        response = self.client.post("/api/llm/configure", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["provider_id"], "neural_local")


if __name__ == "__main__":
    unittest.main()


