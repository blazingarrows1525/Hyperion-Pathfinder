# 07. Security Findings & Hardening Register

| ID | Issue Description | Severity | Status | Resolution / Verification |
|---|---|---|---|---|
| SEC-01 | Public API-key entry in client | HIGH | RESOLVED | Removed public API-key configuration forms from UI. Keys managed via server-side `.env`. |
| SEC-02 | Unpinned CDN scripts with no SRI | MEDIUM | RESOLVED | Pinned exact CDN versions for Three.js, Lucide, Marked, DOMPurify, Confetti with SHA-384 Subresource Integrity. |
| SEC-03 | Insecure regex Markdown sanitizer | HIGH | RESOLVED | Replaced bypassable regex with pinned DOMPurify v3.4.17 allowlist sanitizer. |
| SEC-04 | Hard-coded `127.0.0.1:8000` base URL | MEDIUM | RESOLVED | Converted all client fetches to relative `apiUrl()` respecting same-origin deployments. |
| SEC-05 | Alumni PII in public manifest | HIGH | RESOLVED | Frontend migrated to redacted `/api/corpus-summary` aggregate endpoint. |
| SEC-06 | Wildcard CORS with credentials | MEDIUM | MITIGATED | CORS restricted in production deployment configuration. |
