"""
services/retrieval.py
Hybrid retrieval engine combining Dense FAISS (Cosine) + Sparse BM25 + Reciprocal Rank Fusion (RRF).
"""

import os
import re
import pickle
import faiss
import numpy as np
from typing import Dict, List, Optional, Tuple
from functools import lru_cache
from rank_bm25 import BM25Okapi

from services.embedding import encode_query


STORE_DIR = os.path.join(os.path.dirname(__file__), "..", "vector_store")
FAISS_PATH = os.path.join(STORE_DIR, "benchmark_resumes.index")
META_PATH = os.path.join(STORE_DIR, "benchmark_resumes.pkl")


@lru_cache(maxsize=1)
def load_vector_store() -> Tuple[faiss.Index, List[Dict]]:
    """Loads the FAISS index and pickled metadata."""
    if not os.path.exists(FAISS_PATH) or not os.path.exists(META_PATH):
        raise FileNotFoundError(f"Vector store artifacts not found at {STORE_DIR}")

    index = faiss.read_index(FAISS_PATH)
    with open(META_PATH, "rb") as f:
        metadata = pickle.load(f)

    return index, metadata


TOKEN_PATTERN = re.compile(r'\b[a-zA-Z0-9\+\#\.\-]+(?<!\.)\b')


def tokenize_for_bm25(text: str) -> List[str]:
    """
    Tokenizes text while preserving technical symbols like C++, C#, .NET, Node.js.
    """
    if not text:
        return []
    return [token.lower() for token in TOKEN_PATTERN.findall(text)]


@lru_cache(maxsize=1)
def get_bm25_index() -> Tuple[BM25Okapi, List[str]]:
    """
    Builds and caches the BM25Okapi lexical index over the alumni resume metadata corpus.
    """
    _, metadata = load_vector_store()
    corpus = [tokenize_for_bm25(m.get("text", "")) for m in metadata]
    bm25 = BM25Okapi(corpus)
    return bm25, corpus


def dense_search(query_text: str, top_k: int = 15) -> List[Dict]:
    """
    Executes dense vector search and converts squared L2 distance into true Cosine Similarity.
    """
    index, metadata = load_vector_store()
    query_vector = encode_query(query_text)

    # Search FAISS index
    k_search = min(top_k, index.ntotal)
    distances, indices = index.search(query_vector, k=k_search)

    results = []
    for rank_idx, (idx, dist_sq) in enumerate(zip(indices[0], distances[0])):
        if idx == -1 or idx >= len(metadata):
            continue
        # Convert L2 distance squared of normalized vectors to cosine similarity:
        # cos = 1 - (dist_sq / 2)
        cosine_sim = float(max(-1.0, min(1.0, 1.0 - (dist_sq / 2.0))))
        meta = metadata[idx]

        results.append({
            "index_id": int(idx),
            "rank": rank_idx + 1,
            "cosine_similarity": cosine_sim,
            "file_name": meta.get("file_name", ""),
            "archetype": meta.get("archetype", "General"),
            "text": meta.get("text", "")
        })

    return results


def sparse_search(query_text: str, top_k: int = 15) -> List[Dict]:
    """
    Executes BM25 sparse keyword search over the alumni resume corpus.
    """
    _, metadata = load_vector_store()
    bm25, _ = get_bm25_index()

    tokens = tokenize_for_bm25(query_text)
    if not tokens:
        return []

    scores = bm25.get_scores(tokens)
    top_indices = np.argsort(scores)[::-1][:top_k]

    results = []
    for rank_idx, idx in enumerate(top_indices):
        score = float(scores[idx])
        if score <= 0.0:
            continue
        meta = metadata[idx]
        results.append({
            "index_id": int(idx),
            "rank": rank_idx + 1,
            "bm25_score": score,
            "file_name": meta.get("file_name", ""),
            "archetype": meta.get("archetype", "General"),
            "text": meta.get("text", "")
        })

    return results


def rerank_candidates(query_text: str, candidates: List[Dict], top_n: int = 5) -> List[Dict]:
    """
    Optional cross-encoder reranking over top candidate pool.
    Gated by environment variable ENABLE_RERANKER=true.
    Preserves fast local determinism by default.
    """
    if not candidates:
        return []

    enable_reranker = os.getenv("ENABLE_RERANKER", "false").lower() in ("true", "1", "yes")
    if not enable_reranker:
        return candidates[:top_n]

    try:
        from sentence_transformers import CrossEncoder
        model_name = os.getenv("RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")
        reranker = CrossEncoder(model_name)
        pairs = [[query_text, c.get("text", "")[:500]] for c in candidates]
        scores = reranker.predict(pairs)

        for i, score in enumerate(scores):
            candidates[i]["reranker_score"] = float(score)

        ranked = sorted(candidates, key=lambda x: x.get("reranker_score", 0.0), reverse=True)
        return ranked[:top_n]
    except Exception:
        # Graceful fallback to initial RRF order if model or memory unavailable
        return candidates[:top_n]


def hybrid_search(query_text: str, top_k: int = 5, rrf_k: int = 60) -> Dict:
    """
    Executes Hybrid Search combining Dense (FAISS) and Sparse (BM25) via Reciprocal Rank Fusion.
    RRF(d) = sum( 1.0 / (rrf_k + rank(d)) )
    Optionally applies Cross-Encoder reranking when ENABLE_RERANKER=true.
    """
    dense_results = dense_search(query_text, top_k=top_k * 3)
    sparse_results = sparse_search(query_text, top_k=top_k * 3)

    rrf_scores: Dict[int, float] = {}
    doc_registry: Dict[int, Dict] = {}

    for d in dense_results:
        idx = d["index_id"]
        doc_registry[idx] = d
        rrf_scores[idx] = rrf_scores.get(idx, 0.0) + (1.0 / (rrf_k + d["rank"]))

    for s in sparse_results:
        idx = s["index_id"]
        if idx not in doc_registry:
            doc_registry[idx] = s
        rrf_scores[idx] = rrf_scores.get(idx, 0.0) + (1.0 / (rrf_k + s["rank"]))

    # Sort descending by RRF score
    sorted_candidates = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

    fused_results = []
    seen_files = set()

    # Pool more candidates for potential reranking
    candidate_pool_size = top_k * 2 if os.getenv("ENABLE_RERANKER", "false").lower() in ("true", "1", "yes") else top_k

    for idx, rrf_score in sorted_candidates:
        doc = doc_registry[idx]
        file_name = doc["file_name"]

        # Deduplicate multiple chunks from the exact same source document
        if file_name in seen_files:
            continue
        seen_files.add(file_name)

        fused_results.append({
            "index_id": idx,
            "file_name": file_name,
            "archetype": doc["archetype"],
            "rrf_score": float(rrf_score),
            "cosine_similarity": doc.get("cosine_similarity", 0.0),
            "bm25_score": doc.get("bm25_score", 0.0),
            "text": doc["text"]
        })

        if len(fused_results) >= candidate_pool_size:
            break

    # Optional cross-encoder reranking
    final_candidates = rerank_candidates(query_text, fused_results, top_n=top_k)

    # Retrieval diagnostics
    top_sim = final_candidates[0]["cosine_similarity"] if final_candidates else 0.0
    second_sim = final_candidates[1]["cosine_similarity"] if len(final_candidates) > 1 else top_sim
    score_margin = max(0.0, top_sim - second_sim)

    return {
        "candidates": final_candidates,
        "diagnostics": {
            "top_similarity": round(top_sim, 4),
            "score_margin": round(score_margin, 4),
            "unique_sources": len(seen_files),
            "dense_pool_size": len(dense_results),
            "sparse_pool_size": len(sparse_results),
            "reranked": os.getenv("ENABLE_RERANKER", "false").lower() in ("true", "1", "yes")
        }
    }

