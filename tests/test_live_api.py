"""
tests/test_live_api.py
Integration smoke test sending a synthetic PDF to POST /analyze and verifying the streaming output.
"""

import sys
import io
import urllib.request
from pypdf import PdfWriter


def test_analyze_endpoint():
    print("Executing live API test against http://127.0.0.1:8000/analyze...")
    
    # Minimal valid PDF stream with extractable text
    pdf_bytes = (
        b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        b"/Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n"
        b"4 0 obj\n<< /Length 210 >>\nstream\nBT\n/F1 12 Tf\n50 700 Td\n"
        b"(Senior Software Engineer with 4 years Python, C++, and Docker experience. "
        b"Built microservices with 10k QPS and 99.9% uptime. Education: SRM Institute of Science and Technology.) Tj\n"
        b"ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n"
        b"0000000115 00000 n \n0000000282 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n514\n%%EOF"
    )

    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    disposition = '--' + boundary + '\r\nContent-Disposition: form-data; name="resume_file"; filename="candidate_resume.pdf"\r\nContent-Type: application/pdf\r\n\r\n'
    footer = '\r\n--' + boundary + '--\r\n'
    
    payload = disposition.encode('utf-8') + pdf_bytes + footer.encode('utf-8')

    url = 'http://127.0.0.1:8000/analyze?job_description=Senior+Python+Backend+Developer+with+FastAPI+Docker+and+Kubernetes'
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
