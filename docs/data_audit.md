# Data Audit & Corpus Lineage Report
**Project:** SRM Career Catalyst  
**Date:** October 26, 2026  
**Auditor:** Principal Machine Learning & NLP Reviewer  
**Status:** VERIFIED ON DISK

---

## 1. Executive Summary: Resolving the 1,200+ vs. 226 Discrepancy

A critical discrepancy was identified in the project documentation:
- **Historical Claim (README):** Stated the knowledge base was built from *"1,200+ resumes of successfully placed alumni"*.
- **Verified Ground Truth on Disk:** The actual serialized vector store in [vector_store/srm_resumes.index](file:///c:/Users/ASUS/Desktop/resume%20expert/SRM_Resume_Expert/vector_store/srm_resumes.index) and [vector_store/srm_resumes.pkl](file:///c:/Users/ASUS/Desktop/resume%20expert/SRM_Resume_Expert/vector_store/srm_resumes.pkl) contains **exactly 226 resumes**.
- **Source Inspection:**
  - The directories `Resumes/` and `processed_data/` do not exist in the working repository; both are explicitly ignored in [.gitignore](file:///c:/Users/ASUS/Desktop/resume%20expert/SRM_Resume_Expert/.gitignore) (`Resumes/`, `processed_data/`, `data/`).
  - The 1,200+ figure represents an aspirational institutional target or an uncommitted raw historical folder from prior exploratory batches.
  - **Decision:** All user-facing statistics, calculations, diagnostics, and documentation must truthfully report the verified count of **226 alumni records**. Fabricated claims of 1,200+ records have been excised.

---

## 2. Quantitative Artifact Inventory

| Property | Measured Value | Verification Method |
| :--- | :--- | :--- |
| **FAISS Index File** | `vector_store/srm_resumes.index` (349,034 bytes) | Disk verification |
| **FAISS Metadata File** | `vector_store/srm_resumes.pkl` (829,423 bytes) | Disk verification |
| **Total Stored Vectors ($N$)** | **226** | `index.ntotal` via `faiss.read_index` |
| **Vector Dimension ($d$)** | **384** | `index.d` (matches `all-MiniLM-L6-v2`) |
| **FAISS Index Class** | `faiss.IndexIDMap` wrapping `faiss.IndexFlatL2` | Python runtime inspection |
| **Vector $L_2$ Norms** | $\text{min}=1.0000, \text{max}=1.0000, \mu=1.0000, \sigma=0.0000$ | `np.linalg.norm(vectors, axis=1)` |
| **Unique Filenames** | **226 / 226 (100% unique)** | Metadata hash audit |
| **Text Length (Chars)** | $\text{min}=1, \text{max}=16,071, \mu=3,811.8$ | Python string inspection |

---

## 3. Career Archetype Distribution

The 226 records are partitioned into 5 unsupervised K-Means clusters mapped to the following human-readable taxonomies:

| Cluster ID | Taxonomy Label | Record Count | Corpus Share | Dominant Technical Tokens |
| :---: | :--- | :---: | :---: | :--- |
| **Cluster 2** | General CS & Software Development | 88 | 38.9% | `c++`, `java`, `dsa`, `algorithms`, `oop`, `linux`, `os`, `dbms` |
| **Cluster 1** | Data Science & AI/ML | 53 | 23.5% | `python`, `pytorch`, `tensorflow`, `nlp`, `scikit-learn`, `pandas` |
| **Cluster 4** | Core Engineering (Mechanical/Civil) | 37 | 16.4% | `autocad`, `solidworks`, `embedded c`, `matlab`, `fea`, `ansys` |
| **Cluster 3** | Full-Stack Web Development | 31 | 13.7% | `react`, `nodejs`, `fastapi`, `mongodb`, `express`, `docker` |
| **Cluster 0** | Core Engineering & Business | 17 | 7.5% | `analytics`, `operations`, `consulting`, `finance`, `supply chain` |
| **Total** | **Verified Alumni Knowledge Genome** | **226** | **100.0%** | **Dense Dimension: 384** |

---

## 4. Extraction Quality & Edge-Case Findings

Two records in the metadata were identified as severely degraded or unreadable:
1. `DHRUV SRIVASTAVA RESUME.pdf` (Index 56): Extracted text length is **1 character** (image-only or corrupt PDF).
2. `SOUMIL SAHA_Doc.pdf` (Index 201): Extracted text length is **67 characters** (partial scan).

### Operational Remediation:
- In the upgraded retrieval layer, candidate chunks with extracted text length $< 150$ characters are flagged with `quality_score = "degraded"` and excluded from reference citation snippets to prevent the LLM from receiving empty precedents.
