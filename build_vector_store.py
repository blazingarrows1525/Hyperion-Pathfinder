# ==============================================================================
#  Phase 2, Task 2: Build the Final Vector Store
# ==============================================================================
#
#  **Objective:**
#  This script loads the embeddings, assigns the human-readable archetype labels,
#  and builds the final FAISS vector store for the RAG application.
#
#  **Instructions:**
#  1. **CRITICAL:** Update the `ARCHETYPE_MAP` dictionary below with the
#     interpretations you decided on from the last step.
#  2. Install the new dependency: pip install faiss-cpu
#  3. Run the script. It will create a 'vector_store' folder containing
#     your final, ready-to-use AI knowledge base.
#
# ==============================================================================

import os
import pandas as pd
import numpy as np
import faiss
import pickle

# --- Configuration ---

# ! ================== ACTION REQUIRED ================== !
# Update this dictionary with your interpretations of the clusters.
# Based on your output, I've filled in my suggestions:
ARCHETYPE_MAP = {
    0: "Core Engineering & Business",
    1: "Data Science & AI/ML",
    2: "General CS & Software Development",
    3: "Full-Stack Web Development",
    4: "Core Engineering (Mechanical/Civil)"
}
# ! ===================================================== !

# Input files from the previous steps
csv_input_path = os.path.join('processed_data', 'resume_clustered_data.csv')
embeddings_input_path = os.path.join('processed_data', 'resume_embeddings.npy')

# Output directory for the final vector store
store_output_dir = 'vector_store'
faiss_index_path = os.path.join(store_output_dir, 'benchmark_resumes.index')
metadata_path = os.path.join(store_output_dir, 'benchmark_resumes.pkl')
# ---------------------

import json
import datetime
from services.pdf_ingestion import redact_pii

def build_and_save_store(df, embeddings):
    """
    Builds the FAISS index with explicit unit normalization, redacts PII from metadata,
    and produces a machine-readable data_manifest.json.
    """
    print("--- Building Final Vector Store ---")
    
    # Check if all clusters are mapped
    if not all(cluster in ARCHETYPE_MAP for cluster in df['archetype_cluster'].unique()):
        print("❌ Error: Not all cluster IDs in your data are present in the ARCHETYPE_MAP.")
        print("Please check the map in the configuration section.")
        return

    # 1. Apply the human-readable labels
    df['archetype_label'] = df['archetype_cluster'].map(ARCHETYPE_MAP)
    print("Applied human-readable labels to clusters.")

    # 2. Enforce strict L2 unit-normalization on embeddings
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    embeddings_norm = (embeddings / np.maximum(norms, 1e-12)).astype("float32")
    print(f"Enforced L2 unit normalization. Norm range: [{np.min(np.linalg.norm(embeddings_norm, axis=1)):.4f}, {np.max(np.linalg.norm(embeddings_norm, axis=1)):.4f}]")

    # 3. Get the dimensions of the embeddings
    d = embeddings_norm.shape[1]
    
    # 4. Create the FAISS index
    print(f"Creating FAISS index with {embeddings_norm.shape[0]} vectors of dimension {d}...")
    index = faiss.IndexFlatL2(d)
    index = faiss.IndexIDMap(index)

    # 5. Add vectors to the index
    index_ids = df['embedding_id'].values.astype('int64')
    index.add_with_ids(embeddings_norm, index_ids)
    print(f"Successfully added {index.ntotal} vectors to the index.")

    # 6. Create the sanitized metadata with PII scrubbed
    metadata = []
    archetype_counts = {}
    for _, row in df.iterrows():
        label = row['archetype_label']
        archetype_counts[label] = archetype_counts.get(label, 0) + 1
        clean_text = redact_pii(str(row.get('cleaned_text', '')))
        metadata.append({
            'file_name': row['file_name'],
            'text': clean_text,
            'archetype': label
        })
    
    # 7. Save the index and metadata to disk
    os.makedirs(store_output_dir, exist_ok=True)
    
    print(f"Saving FAISS index to '{faiss_index_path}'...")
    faiss.write_index(index, faiss_index_path)
    
    print(f"Saving metadata to '{metadata_path}'...")
    with open(metadata_path, 'wb') as f:
        pickle.dump(metadata, f)

    # 8. Produce data_manifest.json
    manifest_path = "data_manifest.json"
    manifest = {
        "dataset_version": "1.0.0",
        "created_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "indexed_vectors_count": int(index.ntotal),
        "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
        "embedding_dimension": int(d),
        "distance_metric": "faiss.IndexFlatL2 (unit-normalized Cosine equivalent)",
        "archetype_distribution": archetype_counts
    }
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Generated data manifest at '{manifest_path}'.")
        
    print("\n--- [OK] Phase 2 Complete! ---")
    print("Your vector store is built and ready for the application.")
    print(f"Files created in '{store_output_dir}':")
    print(f"  - {os.path.basename(faiss_index_path)} (The AI vector database)")
    print(f"  - {os.path.basename(metadata_path)} (The resume text & labels)")


def inspect_existing_store():
    """Validates existing index and prints diagnostic metrics."""
    if not os.path.exists(faiss_index_path) or not os.path.exists(metadata_path):
        print("[ERROR] No existing vector store found.")
        return
    
    index = faiss.read_index(faiss_index_path)
    with open(metadata_path, "rb") as f:
        meta = pickle.load(f)
    print(f"Vector Store Status: Index contains {index.ntotal} vectors of dimension {index.d}. Metadata contains {len(meta)} entries.")


def main():
    """
    Main function to run the vector store creation process.
    """
    if not os.path.exists(csv_input_path) or not os.path.exists(embeddings_input_path):
        print("[!] Input files in 'processed_data' were not found. Inspecting current store...")
        inspect_existing_store()
        return

    print("Loading data and embeddings...")
    df = pd.read_csv(csv_input_path)
    embeddings = np.load(embeddings_input_path)
    build_and_save_store(df, embeddings)


# --- Run the script ---
if __name__ == "__main__":
    main()

