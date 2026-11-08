"""Keep the test suite away from real LLM providers.

main.py and services/llm_provider.py call load_dotenv() at import time, and .env may hold real
provider keys. python-dotenv never overrides a variable that already exists, so blanking the keys
here, before any test module imports the app, makes every in-process test run on the deterministic
local engine and never send data to a paid provider.
"""
import os

PROVIDER_KEYS = ("GEMINI_API_KEY", "GOOGLE_API_KEY", "OPENAI_API_KEY", "GROQ_API_KEY", "GITHUB_TOKEN")

for key in PROVIDER_KEYS:
    os.environ[key] = ""
