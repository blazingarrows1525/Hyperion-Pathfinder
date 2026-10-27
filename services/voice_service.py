"""
services/voice_service.py
Voice STT/TTS normalization helpers, spoken briefing construction,
locale validation, and voice state machine contracts for SRM Career Catalyst.
"""

import re
from typing import Dict, List, Optional, Tuple, Literal, Any
from models import PlacementBenchmarkingReport, ExecutivePersonaReview


# Supported locales for voice interactions
SUPPORTED_LOCALES = {
    "en-IN": {"name": "English (India)", "default_voice_pitch": 1.0, "default_rate": 1.0},
    "en-US": {"name": "English (United States)", "default_voice_pitch": 1.0, "default_rate": 1.0},
    "hi-IN": {"name": "Hindi (India)", "default_voice_pitch": 1.0, "default_rate": 0.95},
}


def validate_voice_locale(locale: Optional[str]) -> Tuple[bool, str]:
    """
    Validates whether the requested voice locale is supported.
    Returns (is_supported, canonical_locale_or_fallback_message).
    """
    if not locale:
        return True, "en-IN"
    clean_locale = locale.strip()
    if clean_locale in SUPPORTED_LOCALES:
        return True, clean_locale
    return False, f"Locale '{clean_locale}' is not officially supported. Recommended fallback: 'en-IN' or 'en-US'."


def sanitize_text_for_speech(text: str) -> str:
    """
    Sanitizes raw report/feedback text for clean, natural browser speech synthesis.
    - Strips markdown formatting (bold, italic, headings, links, code blocks).
    - Removes raw HTML/XML tags.
    - Pronounces technical symbols naturally (C++ -> C plus plus, .NET -> dot net).
    - Replaces redacted placeholders with polite spoken tokens.
    """
    if not text:
        return ""

    s = text

    # Strip code blocks
    s = re.sub(r"```[\s\S]*?```", " [code snippet omitted] ", s)
    s = re.sub(r"`([^`]+)`", r"\1", s)

    # Strip full script/style blocks including contents
    s = re.sub(r'<script\b[^>]*>[\s\S]*?<\/script>', ' ', s, flags=re.IGNORECASE)
    s = re.sub(r'<style\b[^>]*>[\s\S]*?<\/style>', ' ', s, flags=re.IGNORECASE)

    # Strip general HTML tags
    s = re.sub(r"<[^>]+>", " ", s)

    # Technical acronyms & symbols expansion
    s = re.sub(r"\bC\+\+(?!\w)", "C plus plus", s)
    s = re.sub(r"\bC#(?!\w)", "C sharp", s)
    s = re.sub(r"\.NET\b", "dot net", s)
    s = re.sub(r"\bNode\.js\b", "Node J S", s)
    s = re.sub(r"\bp95\b", "p 95", s)
    s = re.sub(r"\bp99\b", "p 99", s)
    s = re.sub(r"(\d+)\s*ms\b", r"\1 milliseconds", s)
    s = re.sub(r"\bms\b", " milliseconds", s)
    s = re.sub(r"%", " percent", s)
    s = re.sub(r"\bQPS\b", " queries per second", s)
    s = re.sub(r"\bLPA\b", " lakhs per annum", s)

    # Redacted tokens
    s = s.replace("[EMAIL_REDACTED]", "redacted email")
    s = s.replace("[PHONE_REDACTED]", "redacted phone")
    s = s.replace("[LINK_REDACTED]", "redacted link")

    # Strip markdown headings, bullet markers, brackets, and emphasis
    s = re.sub(r"^#{1,6}\s*", "", s, flags=re.MULTILINE)
    s = re.sub(r"^\s*[\*\-\+]\s+", "", s, flags=re.MULTILINE)
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    s = re.sub(r"\*([^*]+)\*", r"\1", s)
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
    s = re.sub(r"\[|\]", "", s)

    # Normalize whitespace
    s = re.sub(r"\s+", " ", s).strip()
    return s


def build_spoken_briefing(
    report: PlacementBenchmarkingReport,
    persona_review: Optional[ExecutivePersonaReview] = None,
    max_observations: int = 3,
    rate_setting: str = "default"
) -> Dict[str, Any]:
    """
    Constructs a concise, truth-telling spoken review briefing.
    Guarantees:
    - Never describes alignment score as hiring probability.
    - Preserves disclaimer.
    - Strips all raw markdown and scriptable HTML.
    - Never reads sensitive raw contact information.
    - Validates rate setting bounds.
    """
    # 1. Rate normalization
    rate_map = {
        "default": 1.0,
        "slow": 0.85,
        "fast": 1.15
    }
    playback_rate = rate_map.get(rate_setting, 1.0)

    # 2. Score opening with explicit disclaimer
    sentences = [
        f"Your resume-to-job evidence alignment score is {report.overall_score} out of 100.",
        "This is an evidence alignment diagnostic, not a probability of being hired."
    ]

    # 3. Persona reaction if present
    pr = persona_review or report.persona_review
    if pr:
        sentences.append(f"Review lens: {pr.persona_title}.")
        if pr.reaction_summary:
            clean_summary = sanitize_text_for_speech(pr.reaction_summary)
            sentences.append(clean_summary)

        # Top attention points
        if pr.what_catches_attention:
            top_attention = pr.what_catches_attention[:max_observations]
            sentences.append("Key positive evidence noted:")
            for obs in top_attention:
                sentences.append(f"- {sanitize_text_for_speech(obs.statement)}")

        # Top strategic priority
        if pr.strategic_priorities:
            top_action = pr.strategic_priorities[0]
            sentences.append(f"Top recommendation: {sanitize_text_for_speech(top_action.action)}")
    else:
        # Fallback to base recommendations
        if report.recommendations:
            top_rec = report.recommendations[0]
            sentences.append(f"Top recommendation: {sanitize_text_for_speech(top_rec.action)}")

    full_spoken_text = " ".join(sentences)
    sanitized_briefing = sanitize_text_for_speech(full_spoken_text)

    return {
        "spoken_text": sanitized_briefing,
        "playback_rate": playback_rate,
        "overall_score": report.overall_score,
        "has_disclaimer": True,
        "char_count": len(sanitized_briefing)
    }


# ==============================================================================
# 3. VOICE STATE MACHINE (FSM)
# ==============================================================================

VoiceStatus = Literal[
    "idle",
    "requesting_permission",
    "listening",
    "processing",
    "transcript_ready",
    "inserting",
    "error",
    "unsupported",
    "cancelled"
]

VALID_TRANSITIONS = {
    "idle": {"requesting_permission", "listening", "unsupported"},
    "requesting_permission": {"listening", "error", "cancelled", "idle"},
    "listening": {"processing", "transcript_ready", "error", "cancelled", "idle"},
    "processing": {"transcript_ready", "error", "cancelled", "idle"},
    "transcript_ready": {"inserting", "cancelled", "listening", "idle"},
    "inserting": {"idle"},
    "error": {"idle", "listening"},
    "unsupported": {"idle"},
    "cancelled": {"idle", "listening"}
}


class VoiceSTTStateMachine:
    """
    Finite State Machine managing speech recognition lifecycles.
    Enforces valid transitions and prevents corrupted/stale audio states.
    """

    def __init__(self, locale: str = "en-IN", destination: str = "replace_jd"):
        self.locale = locale
        self.destination = destination
        self.state: VoiceStatus = "idle"
        self.final_transcript: str = ""
        self.interim_transcript: str = ""
        self.error_message: Optional[str] = None

    def transition_to(self, new_state: VoiceStatus, error_msg: Optional[str] = None) -> bool:
        allowed = VALID_TRANSITIONS.get(self.state, set())
        if new_state not in allowed:
            return False
        self.state = new_state
        if error_msg:
            self.error_message = error_msg
        return True

    def receive_interim_result(self, text: str) -> None:
        if self.state == "listening":
            self.interim_transcript = text

    def receive_final_result(self, text: str) -> None:
        if self.state in {"listening", "processing"}:
            if self.final_transcript:
                self.final_transcript += " " + text.strip()
            else:
                self.final_transcript = text.strip()
            self.interim_transcript = ""
            self.state = "transcript_ready"

    def cancel(self) -> None:
        self.interim_transcript = ""
        self.transition_to("cancelled")
        self.transition_to("idle")

    def reset(self) -> None:
        self.state = "idle"
        self.final_transcript = ""
        self.interim_transcript = ""
        self.error_message = None
