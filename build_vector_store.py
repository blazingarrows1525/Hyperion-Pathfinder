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
faiss_index_path = os.path.join(store_output_dir, 'srm_resumes.index')
metadata_path = os.path.join(store_output_dir, 'srm_resumes.pkl')
# ---------------------

def build_and_save_store(df, embeddings):
    """
    Builds the FAISS index and saves it along with the metadata.
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

    # 2. Get the dimensions of the embeddings
    d = embeddings.shape[1]
    
    # 3. Create the FAISS index
    print(f"Creating FAISS index with {embeddings.shape[0]} vectors of dimension {d}...")
    index = faiss.IndexFlatL2(d)  # Using L2 distance for similarity
    index = faiss.IndexIDMap(index) # Maps index position to our embedding_id

    # 4. Add vectors to the index
    # We need to map our DataFrame's 'embedding_id' to the vectors
    # This ensures the index ID matches our CSV's ID.
    index_ids = df['embedding_id'].values.astype('int64')
    index.add_with_ids(embeddings.astype('float32'), index_ids)
    print(f"Successfully added {index.ntotal} vectors to the index.")

    # 5. Create the metadata
    # This is a list of dictionaries, where each dict is the "document"
    # our LLM will see. We store the text and the label.
    metadata = []
    for _, row in df.iterrows():
        metadata.append({
            'file_name': row['file_name'],
            'text': row['cleaned_text'],
            'archetype': row['archetype_label']
        })
    
    # 6. Save the index and metadata to disk
    os.makedirs(store_output_dir, exist_ok=True)
    
    print(f"Saving FAISS index to '{faiss_index_path}'...")
    faiss.write_index(index, faiss_index_path)
    
    print(f"Saving metadata to '{metadata_path}'...")
    with open(metadata_path, 'wb') as f:
        pickle.dump(metadata, f)
        
    print("\n--- ✅ Phase 2 Complete! ---")
    print("Your vector store is built and ready for the application.")
    print(f"Files created in '{store_output_dir}':")
    print(f"  - {os.path.basename(faiss_index_path)} (The AI vector database)")
    print(f"  - {os.path.basename(metadata_path)} (The resume text & labels)")

def main():
    """
    Main function to run the vector store creation process.
    """
    # Check for input files
    if not os.path.exists(csv_input_path) or not os.path.exists(embeddings_input_path):
        print("❌ Error: Input files from the clustering step were not found.")
        print("Please run 'cluster_and_visualize.py' first.")
        return

    print("Loading data and embeddings...")
    df = pd.read_csv(csv_input_path)
    embeddings = np.load(embeddings_input_path)
    
    build_and_save_store(df, embeddings)

# --- Run the script ---
if __name__ == "__main__":
    main()
