"""
scripts/evaluate_matching.py
Offline evaluation harness benchmarking Dense-only, BM25-only, and Hybrid (RRF) retrieval
across representative placement Job Descriptions for all 5 archetypes.
"""

import os
import sys
import json
import time
from typing import Dict, List

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.retrieval import dense_search, sparse_search, hybrid_search
from services.archetypes import classify_archetype_by_vote


BENCHMARK_JDS = [
    {
        "id": "SWE_01",
        "expected_archetype": "General CS & Software Development",
        "role": "Software Development Engineer (SDE-1)",
        "jd": "Strong proficiency in C++, Java, or Go. In-depth understanding of Data Structures and Algorithms, Graphs, Dynamic Programming, and OOP principles. Experience with Linux systems, memory optimization, and distributed multithreading."
    },
    {
        "id": "SWE_02",
        "expected_archetype": "General CS & Software Development",
        "role": "Systems Software Engineer",
        "jd": "Backend systems engineer with expertise in operating systems, DBMS indexing, concurrency, POSIX sockets, and high-performance C++ backend architectures."
    },
    {
        "id": "ML_01",
        "expected_archetype": "Data Science & AI/ML",
        "role": "Machine Learning Engineer",
        "jd": "Hands-on experience in Python, PyTorch, and TensorFlow. Knowledge of Natural Language Processing, computer vision with OpenCV, transformers, HuggingFace, and scikit-learn for supervised/unsupervised machine learning modeling."
    },
    {
        "id": "ML_02",
        "expected_archetype": "Data Science & AI/ML",
        "role": "Data Scientist / NLP Specialist",
        "jd": "Deep understanding of exploratory data analysis, Pandas, NumPy, statistical hypothesis testing, feature engineering, and LLM fine-tuning using PyTorch."
    },
    {
        "id": "WEB_01",
        "expected_archetype": "Full-Stack Web Development",
        "role": "Full-Stack Developer",
        "jd": "Building modern web applications using React, TypeScript, Node.js, Express, and FastAPI. Experience with MongoDB, PostgreSQL, RESTful APIs, and Docker containerization."
    },
    {
        "id": "WEB_02",
        "expected_archetype": "Full-Stack Web Development",
        "role": "Frontend / React Engineer",
        "jd": "Expertise in React, Redux, modern JavaScript (ES6+), CSS styling, responsive user interfaces, and state management alongside Node.js microservices."
    },
    {
        "id": "MECH_01",
        "expected_archetype": "Core Engineering (Mechanical/Civil)",
        "role": "Mechanical Design Engineer",
        "jd": "Proficiency in 3D modeling using AutoCAD and SolidWorks. Knowledge of Finite Element Analysis (FEA), ANSYS simulation, GD&T, and thermodynamics."
    },
    {
        "id": "EMBED_01",
        "expected_archetype": "Core Engineering (Mechanical/Civil)",
        "role": "Embedded Systems Engineer",
        "jd": "Firmware programming in Embedded C. Hands-on experience with microcontrollers (STM32, Arduino), IoT sensors, MATLAB/Simulink, and serial protocols (UART, SPI, I2C)."
    },
    {
        "id": "BIZ_01",
        "expected_archetype": "Core Engineering & Business",
        "role": "Business Analyst / Consultant",
        "jd": "Data analytics, business operations, strategy consulting, supply chain management, and advanced Excel modeling. Experience in Power BI, Tableau, and stakeholder presentation."
    },
    {
        "id": "BIZ_02",
        "expected_archetype": "Core Engineering & Business",
        "role": "Operations & Strategy Associate",
        "jd": "Analyzing logistics and financial datasets, optimizing operational workflows, risk assessment, and quantitative business modeling."
    }
]


def evaluate_retrievers():
    print("=" * 70)
    print("  Resume Checker — Offline Retrieval Benchmark Evaluation")
    print("=" * 70)

    modes = ["dense_only", "sparse_only", "hybrid_rrf"]
    results_by_mode: Dict[str, Dict] = {m: {"correct_archetype": 0, "total": len(BENCHMARK_JDS), "latencies": []} for m in modes}
    detailed_logs = []

    for item in BENCHMARK_JDS:
        jd = item["jd"]
        expected = item["expected_archetype"]

        # 1. Dense Only
        t0 = time.time()
        dense_cands = dense_search(jd, top_k=5)
        dense_lat = (time.time() - t0) * 1000
        dense_vote = classify_archetype_by_vote(dense_cands)
        results_by_mode["dense_only"]["latencies"].append(dense_lat)
        if dense_vote["target_archetype"] == expected:
            results_by_mode["dense_only"]["correct_archetype"] += 1

        # 2. Sparse (BM25) Only
        t0 = time.time()
        sparse_cands = sparse_search(jd, top_k=5)
        sparse_lat = (time.time() - t0) * 1000
        sparse_vote = classify_archetype_by_vote(sparse_cands)
        results_by_mode["sparse_only"]["latencies"].append(sparse_lat)
        if sparse_vote["target_archetype"] == expected:
            results_by_mode["sparse_only"]["correct_archetype"] += 1

        # 3. Hybrid RRF
        t0 = time.time()
        hybrid_res = hybrid_search(jd, top_k=5)
        hybrid_lat = (time.time() - t0) * 1000
        hybrid_vote = classify_archetype_by_vote(hybrid_res["candidates"])
        results_by_mode["hybrid_rrf"]["latencies"].append(hybrid_lat)
        if hybrid_vote["target_archetype"] == expected:
            results_by_mode["hybrid_rrf"]["correct_archetype"] += 1

        detailed_logs.append({
            "test_id": item["id"],
            "role": item["role"],
            "expected_archetype": expected,
            "dense_predicted": dense_vote["target_archetype"],
            "sparse_predicted": sparse_vote["target_archetype"],
            "hybrid_predicted": hybrid_vote["target_archetype"],
            "hybrid_confidence": hybrid_vote["confidence_ratio"],
            "hybrid_is_uncertain": hybrid_vote["is_uncertain"]
        })

    # Summary Output
    print(f"\n{'Retriever Mode':<20} | {'Archetype Accuracy':<20} | {'Avg Latency (ms)':<15}")
    print("-" * 65)

    summary_metrics = {}
    for m in modes:
        correct = results_by_mode[m]["correct_archetype"]
        total = results_by_mode[m]["total"]
        acc = (correct / total) * 100.0
        avg_lat = sum(results_by_mode[m]["latencies"]) / len(results_by_mode[m]["latencies"])
        summary_metrics[m] = {
            "accuracy_percent": round(acc, 2),
            "correct_count": correct,
            "total_count": total,
            "avg_latency_ms": round(avg_lat, 2)
        }
        print(f"{m:<20} | {correct}/{total} ({acc:.1f}%)           | {avg_lat:.2f} ms")

    print("-" * 65)

    output_payload = {
        "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "test_set_size": len(BENCHMARK_JDS),
        "summary": summary_metrics,
        "detailed_results": detailed_logs
    }

    docs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs")
    out_file = os.path.join(docs_dir, "evaluation_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, indent=2)

    print(f"\nEvaluation results written to {out_file}")
    return summary_metrics


if __name__ == "__main__":
    evaluate_retrievers()
