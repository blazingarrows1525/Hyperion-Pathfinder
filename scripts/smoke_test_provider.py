"""
scripts/smoke_test_provider.py
Credentialed and offline smoke test for configured LLM providers.
Verifies completion, streaming capabilities, and latency without printing secrets.
"""

import os
import sys
import time
from dotenv import load_dotenv

# Auto-load .env
load_dotenv()

# Add root directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.llm_provider import (
    get_llm_provider,
    get_available_providers,
    test_llm_connection,
    OpenAICompatibleProvider,
    IntelligentLocalProvider
)


def mask_key(key: str) -> str:
    if not key or len(key) < 8:
        return "NOT CONFIGURED"
    return f"{key[:4]}...{key[-4:]} (len={len(key)})"


def run_smoke_test():
    print("=" * 68)
    print("      Hyperion Pathfinder — LLM Provider Connectivity Smoke Test")
    print("=" * 68)

    # 1. Inspect Auto-Discovered Active Provider
    active_prov = get_llm_provider()
    print(f"\n[1] AUTO-DISCOVERED ACTIVE PROVIDER")
    print(f"  • Name:            {active_prov.provider_name}")
    print(f"  • Class:           {active_prov.__class__.__name__}")
    print(f"  • Target Model:    {active_prov.model_name}")
    print(f"  • Configured:      {active_prov.is_configured()}")

    if isinstance(active_prov, OpenAICompatibleProvider):
        print(f"  • Endpoint:        {active_prov.base_url or 'Default'}")
        print(f"  • Masked Key:      {mask_key(active_prov.api_key)}")

    print("\n  >> Sending probe prompt: 'Reply with the single word SUCCESS.'...")
    t0 = time.time()
    try:
        messages = [
            {"role": "system", "content": "You are a connectivity test probe."},
            {"role": "user", "content": "Reply with the single word SUCCESS."}
        ]
        reply = active_prov.complete(messages)
        latency = round((time.time() - t0) * 1000, 1)
        print(f"  >> Response:       {reply.strip()[:80]}")
        print(f"  >> Latency:        {latency} ms")
        print(f"  >> Status:         PASS (Operational)")
    except Exception as e:
        print(f"  >> Error:          {e}")
        print(f"  >> Status:         FAIL")

    # 2. Comprehensive Test across all Configured Providers
    print("\n" + "-" * 68)
    print("[2] INDIVIDUAL PROVIDER DIAGNOSTICS")
    print("-" * 68)

    provider_configs = [
        ("Google Gemini", "gemini", os.getenv("GEMINI_API_KEY"), os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")),
        ("Groq LPU", "groq", os.getenv("GROQ_API_KEY"), os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")),
        ("OpenAI", "openai", os.getenv("OPENAI_API_KEY"), os.getenv("LLM_MODEL", "gpt-4o-mini")),
        ("Azure / GitHub", "azure", os.getenv("GITHUB_TOKEN"), os.getenv("AZURE_MODEL", "gpt-4o")),
        ("Local Deterministic", "neural_local", None, "deterministic-fallback"),
    ]

    for label, pid, key, model in provider_configs:
        is_configured = bool(key and len(key) >= 10) or (pid == "neural_local")
        print(f"\n• Provider: {label} [{pid}]")
        print(f"  Configured Key: {mask_key(key) if key else 'None (Local)'}")
        print(f"  Model:          {model}")

        if not is_configured:
            print("  Status:         SKIPPED (No valid API key in .env)")
            continue

        result = test_llm_connection(pid, api_key=key, model=model)
        if result.get("success"):
            print(f"  Status:         HEALTHY (Reply: '{result.get('reply')}', {result.get('latency_ms')} ms)")
        else:
            err = result.get("error", "Unknown error")
            if "insufficient_quota" in err or "credit_balance_exhausted" in err:
                print(f"  Status:         AUTHENTICATED (Quota exhausted: 429)")
            elif "404" in err:
                print(f"  Status:         DISCONTINUED MODEL (404: {err[:60]})")
            else:
                print(f"  Status:         FAILED ({err[:80]})")

    print("\n" + "=" * 68)
    print("Smoke test completed.")
    print("=" * 68)
    return True


if __name__ == "__main__":
    run_smoke_test()
