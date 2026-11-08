"""The suite must never reach a paid provider, whatever .env contains (see tests/conftest.py)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from conftest import PROVIDER_KEYS
from services.llm_provider import IntelligentLocalProvider, get_llm_provider


def test_provider_keys_are_blank():
    for key in PROVIDER_KEYS:
        assert os.environ.get(key) == "", key


def test_default_provider_is_the_local_engine():
    assert isinstance(get_llm_provider(), IntelligentLocalProvider)
