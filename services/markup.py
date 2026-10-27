"""
services/markup.py
Deterministic in-document resume annotation engine, exact character span tracking,
UTF-16/codepoint conversion, overlap resolution, and draft revision operations.
"""

import re
import hashlib
import unicodedata
from typing import List, Dict, Tuple, Optional, Any

from models import WordMarkupItem, ResumeDocumentSnapshot
import services.pdf_ingestion as pdf_ingest


# ==============================================================================
# 1. UNICODE & UTF-16 CODE-UNIT CONVERSION HELPERS
# ==============================================================================

def normalize_canonical_text(text: str) -> str:
    """
    Normalizes text to Unicode NFC and standardizes newlines to '\n'.
    Preserves exact string length and character order.
    """
    if not text:
        return ""
    # NFC normalization
    normalized = unicodedata.normalize("NFC", text)
    # Standardize CRLF and CR to LF
    normalized = normalized.replace("\r\n", "\n").replace("\r", "\n")
    return normalized


def compute_text_hash(text: str) -> str:
    """Returns SHA-256 hex digest of the canonical UTF-8 encoded text."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def codepoint_to_utf16_offset(text: str, cp_offset: int) -> int:
    """
    Converts a Python Unicode code point index into a JavaScript UTF-16 code unit offset.
    Characters in the Supplementary Multilingual Planes (e.g. emojis > U+FFFF)
    occupy 1 code point in Python but 2 code units (surrogate pair) in JS UTF-16.
    """
    if cp_offset <= 0:
        return 0
    if cp_offset >= len(text):
        return len(text.encode("utf-16-le")) // 2
    
    sub = text[:cp_offset]
    return len(sub.encode("utf-16-le")) // 2


def utf16_to_codepoint_offset(text: str, u16_offset: int) -> int:
    """
    Converts a JavaScript UTF-16 code unit offset into a Python Unicode code point index.
    """
    if u16_offset <= 0:
        return 0
    
    current_u16 = 0
    for cp_idx, char in enumerate(text):
        if current_u16 >= u16_offset:
            return cp_idx
        # Characters outside BMP (ordinal > 0xFFFF) require 2 UTF-16 code units
        current_u16 += 2 if ord(char) > 0xFFFF else 1
        
    return len(text)


# ==============================================================================
# 2. DOCUMENT SNAPSHOT & OFFSET-AWARE SECTION PARSER
# ==============================================================================

def create_document_snapshot(
    raw_text: str,
    document_id: str = "doc_default",
    revision_id: str = "rev_0",
    page_count: int = 1,
    extraction_quality: str = "high"
) -> ResumeDocumentSnapshot:
    """
    Creates an immutable canonical document snapshot with PII redaction and
    exact section character offset boundaries.
    """
    # 1. Apply PII redaction
    redacted = pdf_ingest.redact_pii(raw_text)
    
    # 2. Normalize characters and newlines
    canonical_text = normalize_canonical_text(redacted)
    text_hash = compute_text_hash(canonical_text)
    
    # 3. Parse section ranges with exact offsets into canonical_text
    section_ranges = parse_section_offsets(canonical_text)
    
    return ResumeDocumentSnapshot(
        document_id=document_id,
        revision_id=revision_id,
        text_version="1.0",
        text_hash=text_hash,
        canonical_display_text=canonical_text,
        offset_unit="utf-16",
        page_count=page_count,
        extraction_quality=extraction_quality,
        redaction_applied=True,
        section_ranges=section_ranges
    )


def parse_section_offsets(text: str) -> Dict[str, Dict[str, int]]:
    """
    Locates standard resume section headers and returns exact UTF-16 [start_char, end_char)
    slices into the canonical text.
    """
    lines = text.split("\n")
    section_ranges: Dict[str, Dict[str, int]] = {}
    current_offset = 0
    current_section = "summary"
    section_start_u16 = 0

    for line in lines:
        stripped = line.strip()
        matched_section = None
        
        if stripped and len(stripped) < 40:
            lower = stripped.lower()
            for sec_name, patterns in pdf_ingest.SECTION_HEADERS.items():
                if any(re.search(pat, lower) for pat in patterns):
                    matched_section = sec_name
                    break

        line_u16_len = len(line.encode("utf-16-le")) // 2 + 1  # +1 for newline '\n'

        if matched_section and matched_section != current_section:
            # Close previous section
            if current_offset > section_start_u16:
                section_ranges[current_section] = {
                    "start_char": section_start_u16,
                    "end_char": current_offset
                }
            current_section = matched_section
            section_start_u16 = current_offset

        current_offset += line_u16_len

    # Close trailing section
    total_u16 = len(text.encode("utf-16-le")) // 2
    if total_u16 > section_start_u16:
        section_ranges[current_section] = {
            "start_char": section_start_u16,
            "end_char": total_u16
        }

    return section_ranges


# ==============================================================================
# 3. DETERMINISTIC MARKUP DETECTOR PATTERNS
# ==============================================================================

# High-impact metric patterns (Green: metric_highlight)
METRIC_REGEXES = [
    # Quantified percentage, latency, throughput, scale
    re.compile(r'\b(?:reduced|increased|improved|scaled|optimized|accelerated|lowered)\b[^.,;\n]{0,60}?\b(?:\d+(?:\.\d+)?%|\d+\s*(?:ms|s|seconds|minutes|qps|rps|tps|users|queries|gb|mb|tb))\b', re.IGNORECASE),
    re.compile(r'\b(?:\d+(?:\.\d+)?%|\d+\s*(?:ms|qps|rps|tps|users|queries|gb|mb))\b', re.IGNORECASE),
    re.compile(r'\b(?:from\s+\d+(?:\.\d+)?\s*(?:ms|s|%|k)?\s+to\s+\d+(?:\.\d+)?\s*(?:ms|s|%|k)?)\b', re.IGNORECASE)
]

# Vague / passive phrasing patterns (Yellow: passive_verb)
PASSIVE_VERB_PATTERNS = [
    (re.compile(r'\b(?:worked on)\b', re.IGNORECASE), "Implemented and benchmarked"),
    (re.compile(r'\b(?:assisted with|assisted in)\b', re.IGNORECASE), "Collaborated on designing and testing"),
    (re.compile(r'\b(?:responsible for)\b', re.IGNORECASE), "Engineered and maintained"),
    (re.compile(r'\b(?:helped develop|helped build)\b', re.IGNORECASE), "Developed core modules for"),
    (re.compile(r'\b(?:involved in)\b', re.IGNORECASE), "Contributed to building"),
    (re.compile(r'\b(?:various technologies|multiple technologies)\b', re.IGNORECASE), "specific target framework stack"),
    (re.compile(r'\b(?:good knowledge of|familiar with)\b', re.IGNORECASE), "demonstrated practical proficiency in"),
    (re.compile(r'\b(?:team player)\b', re.IGNORECASE), "cross-functional engineering partner"),
    (re.compile(r'\b(?:was assigned to)\b', re.IGNORECASE), "Took architectural ownership of"),
    (re.compile(r'\b(?:participated in)\b', re.IGNORECASE), "Led implementation of")
]

# Empty buzzword patterns without evidence (Red: buzzword_gap)
BUZZWORD_PATTERNS = [
    re.compile(r'\b(?:cutting[- ]edge)\b', re.IGNORECASE),
    re.compile(r'\b(?:world[- ]class)\b', re.IGNORECASE),
    re.compile(r'\b(?:game[- ]changing)\b', re.IGNORECASE),
    re.compile(r'\b(?:synergistic|synergy)\b', re.IGNORECASE),
    re.compile(r'\b(?:spearheaded modern methodologies)\b', re.IGNORECASE),
    re.compile(r'\b(?:rockstar|guru|ninja)\b', re.IGNORECASE),
    re.compile(r'\b(?:state[- ]of[- ]the[- ]art)\b', re.IGNORECASE)
]


def detect_rule_based_markups(
    snapshot: ResumeDocumentSnapshot,
    jd_missing_required: Optional[List[str]] = None
) -> List[WordMarkupItem]:
    """
    Scans the canonical display text deterministically for green, yellow, and red candidate spans.
    Computes exact UTF-16 offsets, validates substrings, and builds typed WordMarkupItems.
    """
    text = snapshot.canonical_display_text
    markups: List[WordMarkupItem] = []
    seen_spans = set()
    counter = 0

    # A. Detect Green (Metric Highlights)
    for regex in METRIC_REGEXES:
        for match in regex.finditer(text):
            matched_text = match.group(0).strip()
            # Ignore isolated 4-digit years like 2023 or 2024
            if re.fullmatch(r'20\d\d', matched_text) or len(matched_text) < 3:
                continue

            cp_start, cp_end = match.span()
            u16_start = codepoint_to_utf16_offset(text, cp_start)
            u16_end = codepoint_to_utf16_offset(text, cp_end)

            span_key = (u16_start, u16_end)
            if span_key in seen_spans:
                continue
            seen_spans.add(span_key)

            counter += 1
            markup_id = f"mk_{snapshot.revision_id}_green_{counter}"
            markups.append(
                WordMarkupItem(
                    markup_id=markup_id,
                    start_char=u16_start,
                    end_char=u16_end,
                    original_text=matched_text,
                    category="metric_highlight",
                    color_tag="green",
                    severity="info",
                    evidence_basis="rule",
                    critique="Clear quantitative evidence demonstrating concrete project impact or measured throughput/latency.",
                    suggested_rewrite=f"Preserve this verified measurement: '{matched_text}'. Ensure the baseline comparison is also visible.",
                    confidence=0.95,
                    created_from_text_version=snapshot.text_version,
                    requires_user_confirmation=False
                )
            )

    # B. Detect Yellow (Passive / Vague Phrasing)
    for regex, suggested_replacement in PASSIVE_VERB_PATTERNS:
        for match in regex.finditer(text):
            matched_text = match.group(0).strip()
            cp_start, cp_end = match.span()
            u16_start = codepoint_to_utf16_offset(text, cp_start)
            u16_end = codepoint_to_utf16_offset(text, cp_end)

            span_key = (u16_start, u16_end)
            if span_key in seen_spans:
                continue
            seen_spans.add(span_key)

            counter += 1
            markup_id = f"mk_{snapshot.revision_id}_yellow_{counter}"
            critique = (
                f"Phrasing '{matched_text}' weakens ownership. Senior reviewers look for active technical "
                f"verbs that clearly distinguish individual engineering from team tasks."
            )
            rewrite = f"{suggested_replacement} [insert specific component and verified outcome if available]"

            markups.append(
                WordMarkupItem(
                    markup_id=markup_id,
                    start_char=u16_start,
                    end_char=u16_end,
                    original_text=matched_text,
                    category="passive_verb",
                    color_tag="yellow",
                    severity="review",
                    evidence_basis="rule",
                    critique=critique,
                    suggested_rewrite=rewrite,
                    confidence=0.90,
                    created_from_text_version=snapshot.text_version,
                    requires_user_confirmation=True
                )
            )

    # C. Detect Red (Buzzword Gaps / Unsubstantiated Claims)
    for regex in BUZZWORD_PATTERNS:
        for match in regex.finditer(text):
            matched_text = match.group(0).strip()
            cp_start, cp_end = match.span()
            u16_start = codepoint_to_utf16_offset(text, cp_start)
            u16_end = codepoint_to_utf16_offset(text, cp_end)

            span_key = (u16_start, u16_end)
            if span_key in seen_spans:
                continue
            seen_spans.add(span_key)

            counter += 1
            markup_id = f"mk_{snapshot.revision_id}_red_{counter}"
            critique = (
                f"Subjective buzzword '{matched_text}' lacks architectural evidence. Executive reviewers "
                f"heavily discount self-descriptive superlatives without accompanying implementation proof."
            )
            rewrite = "[Replace with concrete technical architecture, test coverage, or benchmark result]"

            markups.append(
                WordMarkupItem(
                    markup_id=markup_id,
                    start_char=u16_start,
                    end_char=u16_end,
                    original_text=matched_text,
                    category="buzzword_gap",
                    color_tag="red",
                    severity="critical",
                    evidence_basis="rule",
                    critique=critique,
                    suggested_rewrite=rewrite,
                    confidence=0.92,
                    created_from_text_version=snapshot.text_version,
                    requires_user_confirmation=True
                )
            )

    # Resolve overlapping spans using strict precedence: red > yellow > green
    return resolve_span_overlaps(markups, text)


# ==============================================================================
# 4. OVERLAP RESOLUTION & VALIDATION INVARIANTS
# ==============================================================================

def resolve_span_overlaps(markups: List[WordMarkupItem], text: str) -> List[WordMarkupItem]:
    """
    Enforces non-overlapping, half-open intervals [start_char, end_char).
    Precedence policy: Red (critical gap) > Yellow (review verb) > Green (metric highlight).
    Validates exact slice equality: text_slice == markup.original_text.
    """
    priority_map = {
        "red": 3,
        "yellow": 2,
        "green": 1
    }

    # Sort by priority descending, then by span length descending, then start ascending
    sorted_markups = sorted(
        markups,
        key=lambda m: (-priority_map.get(m.color_tag, 0), -(m.end_char - m.start_char), m.start_char)
    )

    accepted_markups: List[WordMarkupItem] = []
    occupied_intervals: List[Tuple[int, int]] = []

    for m in sorted_markups:
        # 1. Bounds verification
        if m.start_char < 0 or m.end_char <= m.start_char:
            continue

        # 2. Slice equality check (UTF-16 to code point conversion)
        cp_start = utf16_to_codepoint_offset(text, m.start_char)
        cp_end = utf16_to_codepoint_offset(text, m.end_char)
        actual_slice = text[cp_start:cp_end]

        if actual_slice.strip() != m.original_text.strip():
            # Offset mismatch detected; reject candidate to prevent corrupting text
            continue

        # 3. Overlap check against already accepted intervals
        overlaps = False
        for occ_start, occ_end in occupied_intervals:
            # Overlap occurs if start < occ_end and end > occ_start
            if m.start_char < occ_end and m.end_char > occ_start:
                overlaps = True
                break

        if not overlaps:
            accepted_markups.append(m)
            occupied_intervals.append((m.start_char, m.end_char))

    # Return accepted markups sorted by start position ascending for linear DOM rendering
    return sorted(accepted_markups, key=lambda m: m.start_char)


# ==============================================================================
# 5. IN-MEMORY DRAFT MUTATION & SCORE RECALCULATION
# ==============================================================================

def apply_markup_replacement(
    snapshot: ResumeDocumentSnapshot,
    markup: WordMarkupItem,
    replacement_text: str,
    new_revision_id: str
) -> Tuple[ResumeDocumentSnapshot, Dict[str, Any]]:
    """
    Applies an exact inline replacement in browser draft memory.
    Ensures that ONLY the selected span changes. Recomputes text hash and invalidates old offsets.
    Does NOT modify or touch any PDF files on disk.
    """
    original_display = snapshot.canonical_display_text
    
    # Validate expected original text
    cp_start = utf16_to_codepoint_offset(original_display, markup.start_char)
    cp_end = utf16_to_codepoint_offset(original_display, markup.end_char)
    target_slice = original_display[cp_start:cp_end]

    if target_slice.strip() != markup.original_text.strip():
        raise ValueError(
            f"Stale markup replacement rejected: expected '{markup.original_text}' "
            f"but found '{target_slice}' at [{markup.start_char}:{markup.end_char}]."
        )

    # Perform surgical replacement
    new_text = original_display[:cp_start] + replacement_text + original_display[cp_end:]
    normalized_new = normalize_canonical_text(new_text)
    new_hash = compute_text_hash(normalized_new)

    # Build updated snapshot
    updated_snapshot = ResumeDocumentSnapshot(
        document_id=snapshot.document_id,
        revision_id=new_revision_id,
        text_version="draft",
        text_hash=new_hash,
        canonical_display_text=normalized_new,
        offset_unit=snapshot.offset_unit,
        page_count=snapshot.page_count,
        extraction_quality=snapshot.extraction_quality,
        redaction_applied=snapshot.redaction_applied,
        section_ranges=parse_section_offsets(normalized_new)
    )

    diff_metadata = {
        "applied_markup_id": markup.markup_id,
        "old_slice": target_slice,
        "new_slice": replacement_text,
        "old_revision_id": snapshot.revision_id,
        "new_revision_id": new_revision_id,
        "old_hash": snapshot.text_hash,
        "new_hash": new_hash
    }

    return updated_snapshot, diff_metadata
