# Evaluation Protocol & Offline Benchmark Methodology

**Project**: SRM Career Catalyst — Intelligent Placement Benchmarking Engine  
**Version**: 1.0.0  
**Scope**: Retrieval, Archetype Classification, Skill Alignment, and LLM Groundedness  

---

## 1. Objectives & Guiding Principles

The evaluation suite ensures that all architectural, retrieval, and heuristic enhancements are empirical, reproducible, and verifiable.

### Non-Negotiable Evaluation Rules:
1. **Never manufacture metrics**: Every quoted precision, recall, or latency metric must be produced by an executable script run against a verified dataset.
2. **Deterministic release gates**: Code changes cannot merge without passing unit test suites, schema validation, and evaluation harnesses.
3. **Strict separation of scores from probabilities**: Heuristic alignment scores (0–100) are decision-support diagnostics and must never be framed as hiring probabilities.

---

## 2. Benchmark Dataset & Gold Set Construction

### 2.1 Test Job Description Dataset (`scripts/evaluate_matching.py`)
The evaluation suite evaluates matching performance across 10 diverse job descriptions spanning all 5 target career archetypes:
- **General CS & Software Development**: SDE-1, Systems Software Engineer
- **Data Science & AI/ML**: Machine Learning Engineer, Data Scientist / NLP Specialist
- **Full-Stack Web Development**: Full-Stack Developer, Frontend React Engineer
- **Core Engineering (Mechanical/Civil)**: Mechanical Design Engineer, Embedded Systems Engineer
- **Core Engineering & Business**: Business Analyst / Consultant, Operations & Strategy Associate

### 2.2 Schema for Gold Set Test Items
```json
{
  "test_id": "SWE_01",
  "role": "Software Development Engineer (SDE-1)",
  "expected_archetype": "General CS & Software Development",
  "job_description": "..."
}
```

---

## 3. Retrieval Metrics & Formulations

The benchmark evaluates three search modes over identical queries:
1. **Dense Vector Search**:
   - Model: `sentence-transformers/all-MiniLM-L6-v2` (384D)
   - Cosine Similarity derived from squared Euclidean distance on unit-normalized vectors:
     $$\text{Cosine}(u, v) = 1.0 - \frac{\|u - v\|_2^2}{2.0}$$
2. **Sparse Lexical Search**:
   - Model: `rank_bm25.BM25Okapi` with token-preserving regex preserving technical terms (`C++`, `C#`, `.NET`, `Node.js`).
3. **Hybrid Reciprocal Rank Fusion (RRF)**:
   - Rank-based fusion with configurable constant $k = 60$:
     $$RRF(d) = \sum_{m \in \{\text{dense}, \text{sparse}\}} \frac{1}{60 + \text{rank}_m(d)}$$
   - Document-level deduplication suppresses multiple chunks from identical source resumes.

---

## 4. Benchmark Results Summary

Measured on local CPU using `scripts/evaluate_matching.py`:

| Retrieval Mode | Archetype Top-1 Accuracy | Average Query Latency | Notes |
| :--- | :---: | :---: | :--- |
| **Dense Only** | **60.0%** (6/10) | 564.98 ms | High semantic recall; occasional confusion on hybrid roles. |
| **Sparse Only** | **50.0%** (5/10) | 13.36 ms | Lightning fast; prone to vocabulary mismatch on descriptions. |
| **Hybrid RRF** | **60.0%** (6/10) | 23.54 ms | Combines exact skill tokens with semantic embeddings. |

---

## 5. Report Quality & Groundedness Invariants (`scripts/evaluate_reports.py`)

Every generated report must pass the following deterministic invariant checks:
1. **Schema Integrity**: Validates strictly against Pydantic v2 `PlacementBenchmarkingReport`.
2. **Score Range Invariant**: Overall score must satisfy $0 \le \text{overall\_score} \le 100$.
3. **Weight Summation**: Component max points must sum to 100, and earned points must equal overall score within $\pm 1.0$ rounding tolerance.
4. **Zero-PII Invariant**: No email addresses, telephone numbers, or personal profile links may appear in generated text or recommendations.
5. **No Contradiction**: No skill categorized in `missing_required_skills` may have evidence status `demonstrated` in `matched_skills`.

---

## 6. How to Run the Evaluation Suite

```bash
# Run retrieval & archetype benchmark
.\.venv\Scripts\python.exe scripts/evaluate_matching.py

# Run deterministic report validation harness
.\.venv\Scripts\python.exe scripts/evaluate_reports.py

# Run full automated unit & regression test suite
.\.venv\Scripts\python.exe -m unittest discover tests -v
```
