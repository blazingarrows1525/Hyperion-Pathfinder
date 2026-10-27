"""
services/pdf_ingestion.py
Robust PDF validation, section-aware heuristic parsing, PII redaction, and chunking.
"""

import io
import re
from typing import Dict, List, Optional, Tuple
from pypdf import PdfReader


MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB limit
MAX_PAGE_COUNT = 15
MIN_TEXT_CHARS = 100


class PDFValidationError(Exception):
    """Raised when PDF input fails validation checks."""
    pass


def validate_pdf_bytes(file_bytes: bytes) -> None:
    """Validates raw bytes for PDF magic signature and size."""
    if not file_bytes:
        raise PDFValidationError("The uploaded file is empty (0 bytes).")
    if len(file_bytes) > MAX_FILE_BYTES:
        raise PDFValidationError(f"File size exceeds the {MAX_FILE_BYTES // (1024*1024)}MB maximum limit.")
    if not file_bytes.startswith(b"%PDF-"):
        raise PDFValidationError("Invalid file signature. File is not a valid PDF document.")


URL_REGEX = re.compile(r'https?://\S+|www\.\S+')
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
PHONE_REGEX = re.compile(r'(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{4,6}')


def redact_pii(text: str) -> str:
    """
    Redacts personal identifiers (emails, phone numbers, external URLs)
    to protect alumni and candidate privacy.
    """
    if not text:
        return ""
    # Redact URLs
    text = URL_REGEX.sub('[LINK_REDACTED]', text)
    # Redact Email addresses
    text = EMAIL_REGEX.sub('[EMAIL_REDACTED]', text)
    # Redact Indian & International phone numbers
    text = PHONE_REGEX.sub('[PHONE_REDACTED]', text)
    return text


def extract_text_and_sections(file_bytes: bytes) -> Dict:
    """
    Extracts text per page, evaluates extraction quality, and parses logical sections.
    """
    validate_pdf_bytes(file_bytes)

    pdf_stream = io.BytesIO(file_bytes)
    try:
        reader = PdfReader(pdf_stream)
    except Exception as e:
        raise PDFValidationError(f"Failed to parse PDF document structure: {str(e)}")

    if reader.is_encrypted:
        try:
            reader.decrypt('')
        except Exception:
            raise PDFValidationError("PDF document is encrypted with password protection.")

    page_count = len(reader.pages)
    if page_count > MAX_PAGE_COUNT:
        raise PDFValidationError(f"PDF page count ({page_count}) exceeds allowed limit of {MAX_PAGE_COUNT} pages.")

    pages_text: List[str] = []
    total_text = ""

    for page_idx, page in enumerate(reader.pages):
        try:
            extracted = page.extract_text() or ""
            pages_text.append(extracted)
            total_text += extracted + "\n"
        except Exception:
            pages_text.append("")

    cleaned_total = total_text.strip()
    total_chars = len(cleaned_total)

    if total_chars < MIN_TEXT_CHARS:
        quality = "low"
    elif total_chars < 800:
        quality = "medium"
    else:
        quality = "high"

    sections = parse_resume_sections(cleaned_total)

    return {
        "page_count": page_count,
        "total_chars": total_chars,
        "quality": quality,
        "pages_text": pages_text,
        "full_text": cleaned_total,
        "sections": sections
    }


SECTION_HEADERS = {
    "education": [r"\beducation\b", r"\bacademics\b", r"\bqualifications\b"],
    "experience": [r"\bexperience\b", r"\bwork experience\b", r"\binternships?\b", r"\bemployment\b"],
    "projects": [r"\bprojects?\b", r"\bacademic projects\b", r"\bpersonal projects\b", r"\btechnical projects\b"],
    "skills": [r"\bskills\b", r"\btechnical skills\b", r"\bcompetencies\b", r"\bcore competencies\b", r"\btools\b"],
    "certifications": [r"\bcertifications?\b", r"\bcertificates?\b", r"\blicenses?\b", r"\bcourses\b"],
    "achievements": [r"\bachievements?\b", r"\bawards\b", r"\bhonn?ors\b", r"\bpublications?\b", r"\bextracurricular\b"]
}


def parse_resume_sections(text: str) -> Dict[str, str]:
    """
    Heuristically splits resume text into standard sections based on detected headings.
    """
    lines = text.split("\n")
    sections: Dict[str, List[str]] = {
        "summary": [],
        "education": [],
        "experience": [],
        "projects": [],
        "skills": [],
        "certifications": [],
        "achievements": [],
        "other": []
    }

    current_section = "summary"

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Check if line looks like a header (short, title-cased or upper, matches keywords)
        matched_section = None
        if len(stripped) < 40:
            lower_line = stripped.lower()
            for sec_name, patterns in SECTION_HEADERS.items():
                if any(re.search(pat, lower_line) for pat in patterns):
                    matched_section = sec_name
                    break

        if matched_section:
            current_section = matched_section
        else:
            sections[current_section].append(stripped)

    return {k: "\n".join(v).strip() for k, v in sections.items() if v}


def chunk_resume_text(text: str, chunk_size: int = 400, overlap: int = 80) -> List[Dict]:
    """
    Creates overlapping chunks preserving sentence and technical boundaries.
    """
    words = text.split()
    if not words:
        return []

    chunks = []
    chunk_idx = 0
    start = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk_words = words[start:end]
        chunk_text = " ".join(chunk_words)

        chunks.append({
            "chunk_id": chunk_idx,
            "text": chunk_text,
            "word_count": len(chunk_words)
        })
        chunk_idx += 1
        if end >= len(words):
            break
        start += chunk_size - overlap

    return chunks
