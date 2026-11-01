"""
tests/test_live_api.py
Integration smoke test sending a synthetic PDF to POST /analyze on a running server and verifying
the streaming output.

Opt-in: set LIVE_API_BASE_URL (for example http://127.0.0.1:8010) to a server you started yourself.
Point it at a server running the deterministic engine; a server with provider keys would forward
the synthetic resume to that provider.
"""

import os
import urllib.request

import pytest


def test_analyze_endpoint():
    base = os.environ.get("LIVE_API_BASE_URL", "").rstrip("/")
    if not base:
        pytest.skip("LIVE_API_BASE_URL is not set; start a deterministic server and set it to run this test")
    print(f"Executing live API test against {base}/analyze...")

    # Minimal valid PDF stream with extractable text
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

    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    disposition = '--' + boundary + '\r\nContent-Disposition: form-data; name="resume_file"; filename="candidate_resume.pdf"\r\nContent-Type: application/pdf\r\n\r\n'
    footer = '\r\n--' + boundary + '--\r\n'
    
    payload = disposition.encode('utf-8') + pdf_bytes + footer.encode('utf-8')

    url = f'{base}/analyze?job_description=Senior+Python+Backend+Developer+with+FastAPI+Docker+and+Kubernetes'
    req = urllib.request.Request(
        url,
        data=payload,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
        method='POST'
    )

    with urllib.request.urlopen(req, timeout=30) as resp:
        print(f"HTTP Status: {resp.status}")
        data = resp.read().decode('utf-8')
        print(f"Received {len(data)} characters from stream.")
        print("=" * 60)
        print(data[:600])
        print("=" * 60)
        assert resp.status == 200
        assert len(data) > 50
        print("SUCCESS: Live POST /analyze streaming test PASSED!")


if __name__ == "__main__":
    test_analyze_endpoint()
