# 12. Decisions, Governance & Residual Risks Register

### Key Architectural Decisions (ADR Summary)
1. **ADR-01: Single WebGL Context Lifecycle:** Career Atlas owns exactly one Three.js canvas. No competing renderers.
2. **ADR-02: PII Redaction Strategy:** Client requests aggregate `/api/corpus-summary`; raw resumes never exposed via public API.
3. **ADR-03: Deterministic Scoring Rubric Invariance:** Executive review lenses and AI coaches never mutate the 100-point deterministic rubric score.
4. **ADR-04: Repository Hygiene:** History scrubbed of third-party contributor tags; dedicated clean repository published at `blazingarrows1525/Hyperion-Pathfinder`.

### Residual Risks & Monitoring
- **Browser Web Speech API:** SpeechRecognition support is browser-dependent (Chrome/Edge native; Safari/Firefox limited). Fully mitigated by native keyboard and textarea fallbacks.
- **External LLM Connectivity:** When third-party keys are unconfigured, backend transparently falls back to local deterministic rule-based evaluation.
