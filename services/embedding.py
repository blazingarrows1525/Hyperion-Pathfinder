"""
services/embedding.py
SentenceTransformer embedding wrapper with strict L2-normalization and dimension guarantees.
"""

from functools import lru_cache
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer


MODEL_NAME = "all-MiniLM-L6-v2"
EXPECTED_DIMENSION = 384


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """Loads and caches the SentenceTransformer embedding model."""
    model = SentenceTransformer(MODEL_NAME)
    return model


def encode_query(query_text: str) -> np.ndarray:
    """
    Encodes query text to an L2-normalized float32 vector of shape (1, 384).
    """
    model = get_embedding_model()
    clean_text = query_text.strip()
    vector = model.encode([clean_text], normalize_embeddings=True)
    vector = vector.astype(np.float32)

    if vector.shape[1] != EXPECTED_DIMENSION:
        raise ValueError(f"Embedding dimension mismatch: expected {EXPECTED_DIMENSION}, got {vector.shape[1]}")
    if np.isnan(vector).any() or np.isinf(vector).any():
        raise ValueError("Generated query embedding contains NaN or Inf values.")

    return vector


def encode_documents(doc_texts: List[str]) -> np.ndarray:
    """
    Encodes multiple document texts into an L2-normalized float32 matrix.
    """
    model = get_embedding_model()
    vectors = model.encode(doc_texts, normalize_embeddings=True, show_progress_bar=False)
    vectors = vectors.astype(np.float32)

    if vectors.shape[1] != EXPECTED_DIMENSION:
        raise ValueError(f"Embedding dimension mismatch: expected {EXPECTED_DIMENSION}, got {vectors.shape[1]}")
    if np.isnan(vectors).any() or np.isinf(vectors).any():
        raise ValueError("Generated document embeddings contain NaN or Inf values.")

    return vectors
