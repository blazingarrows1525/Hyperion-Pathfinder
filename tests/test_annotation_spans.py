"""
tests/test_annotation_spans.py
Unit tests verifying exact character span boundaries, UTF-16 code unit conversions,
deterministic markup detection, overlap resolution, and in-memory draft revisions.
"""

import os
import sys
import unittest

# Ensure project root is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import WordMarkupItem, ResumeDocumentSnapshot
from services.markup import (
    codepoint_to_utf16_offset,
    utf16_to_codepoint_offset,
    normalize_canonical_text,
    compute_text_hash,
    create_document_snapshot,
    detect_rule_based_markups,
    resolve_span_overlaps,
    apply_markup_replacement
)


class TestUnicodeAndOffsetConversion(unittest.TestCase):

    def test_ascii_offset_parity(self):
        text = "FastAPI backend with Python 3.10 and PyTorch."
        for idx in range(len(text)):
            u16 = codepoint_to_utf16_offset(text, idx)
            cp = utf16_to_codepoint_offset(text, u16)
            self.assertEqual(u16, idx)
            self.assertEqual(cp, idx)

    def test_emoji_and_surrogate_pairs(self):
        # Emojis like 🚀 (U+1F680) are 1 code point in Python, but 2 code units in UTF-16
        text = "Launch 🚀 model with 95% accuracy."
        emoji_cp_idx = text.index("🚀")
        
        # UTF-16 offset of character right after emoji
        after_emoji_cp = emoji_cp_idx + 1
        after_emoji_u16 = codepoint_to_utf16_offset(text, after_emoji_cp)
        
        # Since 'Launch ' is 7 chars, emoji starts at 7 and spans 2 UTF-16 units (7 and 8)
        self.assertEqual(after_emoji_u16, emoji_cp_idx + 2)
        
        # Round-trip conversion back to code point
        restored_cp = utf16_to_codepoint_offset(text, after_emoji_u16)
        self.assertEqual(restored_cp, after_emoji_cp)

    def test_crlf_normalization(self):
        crlf_text = "Line 1\r\nLine 2\rLine 3\n"
        normalized = normalize_canonical_text(crlf_text)
        self.assertNotIn("\r", normalized)
        self.assertEqual(normalized, "Line 1\nLine 2\nLine 3\n")


class TestDocumentSnapshotAndHashing(unittest.TestCase):

    def test_snapshot_creation_and_hash_integrity(self):
        raw = "Contact: test@university.edu. Summary: Experienced in C++ and Python."
        snapshot = create_document_snapshot(raw, document_id="doc_123")
        
        # Assert PII is redacted
        self.assertNotIn("test@university.edu", snapshot.canonical_display_text)
        self.assertIn("[EMAIL_REDACTED]", snapshot.canonical_display_text)
        
        # Hash matches SHA-256 of display text
        computed_hash = compute_text_hash(snapshot.canonical_display_text)
        self.assertEqual(snapshot.text_hash, computed_hash)
        self.assertEqual(snapshot.offset_unit, "utf-16")


class TestDeterministicMarkupDetection(unittest.TestCase):

    def setUp(self):
        self.resume_text = (
            "Experience\n"
            "Software Engineer at Acme Corp.\n"
            "Worked on deep learning models achieving 94.5% accuracy and reduced inference latency by 35ms.\n"
            "Responsible for cutting-edge game-changing solutions using various technologies.\n"
        )
        self.snapshot = create_document_snapshot(self.resume_text, document_id="doc_test")

    def test_detects_metric_highlights_green(self):
        markups = detect_rule_based_markups(self.snapshot)
        green_marks = [m for m in markups if m.color_tag == "green"]
        
        self.assertGreaterEqual(len(green_marks), 1)
        for m in green_marks:
            self.assertEqual(m.category, "metric_highlight")
            # Slice equality check
            cp_start = utf16_to_codepoint_offset(self.snapshot.canonical_display_text, m.start_char)
            cp_end = utf16_to_codepoint_offset(self.snapshot.canonical_display_text, m.end_char)
            extracted_slice = self.snapshot.canonical_display_text[cp_start:cp_end]
            self.assertEqual(extracted_slice, m.original_text)

    def test_detects_passive_verbs_yellow(self):
        markups = detect_rule_based_markups(self.snapshot)
        yellow_marks = [m for m in markups if m.color_tag == "yellow"]
        
        self.assertGreaterEqual(len(yellow_marks), 1)
        found_texts = [m.original_text.lower() for m in yellow_marks]
        self.assertTrue(any("worked on" in t or "responsible for" in t for t in found_texts))

    def test_detects_buzzwords_red(self):
        markups = detect_rule_based_markups(self.snapshot)
        red_marks = [m for m in markups if m.color_tag == "red"]
        
        self.assertGreaterEqual(len(red_marks), 1)
        found_buzzwords = [m.original_text.lower() for m in red_marks]
        self.assertTrue(any("cutting-edge" in t or "game-changing" in t for t in found_buzzwords))

    def test_non_overlapping_intervals_and_precedence(self):
        markups = detect_rule_based_markups(self.snapshot)
        
        # Assert strict half-open intervals with no overlaps
        for i in range(len(markups) - 1):
            current_m = markups[i]
            next_m = markups[i + 1]
            self.assertLessEqual(
                current_m.end_char,
                next_m.start_char,
                f"Overlap detected between markup {current_m.markup_id} and {next_m.markup_id}"
            )


class TestInMemoryDraftMutation(unittest.TestCase):

    def test_surgical_replacement(self):
        text = "Summary: Worked on scalable microservices using Docker."
        snapshot = create_document_snapshot(text, document_id="doc_mut")
        markups = detect_rule_based_markups(snapshot)
        
        # Pick the 'Worked on' markup
        target_m = next(m for m in markups if "worked on" in m.original_text.lower())
        replacement = "Architected and deployed"
        
        updated_snapshot, diff = apply_markup_replacement(
            snapshot=snapshot,
            markup=target_m,
            replacement_text=replacement,
            new_revision_id="rev_1"
        )
        
        # Assert updated display text contains new phrasing and excludes old phrasing
        self.assertIn("Architected and deployed", updated_snapshot.canonical_display_text)
        self.assertNotIn("Worked on", updated_snapshot.canonical_display_text)
        self.assertNotEqual(updated_snapshot.text_hash, snapshot.text_hash)
        self.assertEqual(diff["old_revision_id"], "rev_0")
        self.assertEqual(diff["new_revision_id"], "rev_1")

    def test_stale_offset_replacement_rejected(self):
        text = "Summary: Worked on scalable microservices using Docker."
        snapshot = create_document_snapshot(text, document_id="doc_stale")
        markups = detect_rule_based_markups(snapshot)
        target_m = markups[0]
        
        # Create a modified snapshot where the text has changed
        altered_snapshot = create_document_snapshot("Different text entirely.", document_id="doc_stale", revision_id="rev_1")
        
        # Applying target_m to altered_snapshot must fail
        with self.assertRaises(ValueError):
            apply_markup_replacement(
                snapshot=altered_snapshot,
                markup=target_m,
                replacement_text="New text",
                new_revision_id="rev_2"
            )


if __name__ == "__main__":
    unittest.main()
