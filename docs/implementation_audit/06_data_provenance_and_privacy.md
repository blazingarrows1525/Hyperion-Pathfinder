# 06. Data Provenance & Privacy Governance

### 4 Separate Data Classes (Never Combined)
1. **Alumni Benchmark Corpus:** 226 indexed resume vectors (v2.0.0, 384 dimensions). Used exclusively for K-Nearest Neighbor reference comparison. Never displayed as hiring probability.
2. **2026 Placement Snapshot:** Dated 17 September 2026 from the campus placement portal. 8,214 total offers across 421 employers. `students_placed_count: null`. Total offers != placed students.
3. **Runtime Engine Telemetry:** Live health status from `GET /health` (`status: healthy`, `faiss_ready: true`, `vector_count: 226`). No simulated quantum or neural FPS.
4. **Interactive UI Demo Fixtures:** Synthetic mock resume and JD clearly watermarked `[DEMO / ILLUSTRATIVE]`.

### PII Protection Status
- **Client Manifest Request Eliminated:** Client fetches PII-safe `GET /api/corpus-summary` instead of raw `data_manifest.json`.
- **In-Memory File Parsing:** Uploaded PDF files are parsed directly in RAM via `pypdf.PdfReader(io.BytesIO(...))` and never saved to local disk or cloud buckets.
- **Zero LocalStorage Persistence for Resumes:** Neither raw resume text nor extracted contact details are stored in browser `localStorage`.
