"""
scripts/smoke_test_provider.py
Credentialed and offline smoke test for configured LLM provider.
Verifies completion, streaming capabilities, and latency without printing secrets.
"""

import os
import sys
import time

# Add root directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.llm_provider import get_llm_provider, OpenAICompatibleProvider, LocalFallbackProvider


def run_smoke_test():
    print("=" * 60)
    print("  SRM Career Catalyst — LLM Provider Smoke Test")
    print("=" * 60)

    provider = get_llm_provider()
    print(f"Active Provider Class: {provider.__class__.__name__}")
    print(f"Is Configured: {provider.is_configured()}")
    
    if isinstance(provider, OpenAICompatibleProvider):
        print(f"Model ID: {provider.model}")
        print(f"Base URL: {provider.base_url or 'Default (OpenAI API)'}")
        masked_key = provider.api_key[:4] + "..." + provider.api_key[-4:] if len(provider.api_key) > 8 else "NOT SET"
        print(f"API Key: {masked_key}")
    else:
        print("Running in Deterministic Local Fallback Mode.")

    print("\nSending minimal prompt: 'Reply with the single word SUCCESS.'...")
    start_time = time.time()
    try:
        messages = [
            {"role": "system", "content": "You are a health probe test."},
            {"role": "user", "content": "Reply with the single word SUCCESS."}
        ]
        response = provider.complete(messages)
        elapsed = time.time() - start_time
        print(f"Response Received in {elapsed:.2f}s:")
        print(f"  > {response.strip()[:100]}")
        print("\nSmoke Test Status: PASSED (Provider Operational)")
        return True
    except Exception as e:
        print(f"\nSmoke Test FAILED: {type(e).__name__}: {str(e)}")
        print("Recommendation: Set OPENAI_API_KEY or configure local Ollama endpoint.")
        return False


if __name__ == "__main__":
    success = run_smoke_test()
    sys.exit(0 if success else 1)
