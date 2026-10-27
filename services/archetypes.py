"""
services/archetypes.py
Weighted K-NN archetype voting with confidence ratios and uncertainty diagnostics.
"""

from typing import Dict, List, Tuple
from collections import defaultdict


ARCHETYPE_TAXONOMY = {
    0: "Core Engineering & Business",
    1: "Data Science & AI/ML",
    2: "General CS & Software Development",
    3: "Full-Stack Web Development",
    4: "Core Engineering (Mechanical/Civil)"
}


def classify_archetype_by_vote(candidates: List[Dict], min_confidence_threshold: float = 0.40) -> Dict:
    """
    Computes a weighted neighborhood vote across retrieved alumni documents:
    Weight(i) = max(0.05, cosine_similarity_i)
    Returns predicted archetype, vote distribution, and an explicit uncertainty flag.
    """
    if not candidates:
        return {
            "target_archetype": "General CS & Software Development",
            "confidence_ratio": 0.0,
            "is_uncertain": True,
            "alternatives": [],
            "support_count": 0,
            "vote_distribution": {}
        }

    archetype_scores: Dict[str, float] = defaultdict(float)
    archetype_counts: Dict[str, int] = defaultdict(int)
    total_weight = 0.0

    for cand in candidates:
        arch = cand.get("archetype", "General CS & Software Development")
        # Use nonnegative transformed similarity
        sim = cand.get("cosine_similarity", 0.5)
        weight = max(0.05, float(sim))

        archetype_scores[arch] += weight
        archetype_counts[arch] += 1
        total_weight += weight

    if total_weight == 0.0:
        total_weight = 1.0

    # Calculate normalized vote share
    vote_distribution = {
        arch: round(score / total_weight, 4)
        for arch, score in archetype_scores.items()
    }

    # Sort descending
    sorted_votes = sorted(vote_distribution.items(), key=lambda x: x[1], reverse=True)

    winner_arch, winner_share = sorted_votes[0]
    alternatives = [
        {"archetype": arch, "vote_share": share, "support_count": archetype_counts[arch]}
        for arch, share in sorted_votes[1:]
    ]

    # Check uncertainty conditions:
    # 1. Winning share is lower than threshold
    # 2. Score gap between top-1 and top-2 is smaller than 0.10
    score_gap = (winner_share - sorted_votes[1][1]) if len(sorted_votes) > 1 else winner_share
    is_uncertain = (winner_share < min_confidence_threshold) or (score_gap < 0.10)

    return {
        "target_archetype": winner_arch,
        "confidence_ratio": winner_share,
        "is_uncertain": is_uncertain,
        "support_count": archetype_counts[winner_arch],
        "alternatives": alternatives,
        "vote_distribution": vote_distribution
    }
