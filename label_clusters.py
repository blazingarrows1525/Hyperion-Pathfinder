# ==============================================================================
#  Phase 2, Task 1: Cluster Interpretation & Labeling
# ==============================================================================
#
#  **Objective:**
#  This script analyzes the text within each cluster to find the most
#  important keywords using TF-IDF. This helps you understand what each
#  cluster represents so you can give it a human-readable label.
#
#  **Instructions:**
#  1. Make sure 'resume_clustered_data.csv' exists in 'processed_data'.
#  2. Ensure all dependencies from the previous step are installed.
#  3. Run the script. It will print the top keywords for each cluster to the
#     terminal.
#  4. Based on the keywords, decide on a name for each cluster
#     (e.g., 'Data Science', 'Backend SDE', 'Embedded Systems').
#  5. We will use these names in the next script.
#
# ==============================================================================

import os
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer

# --- Configuration ---
# Input file from the previous step.
csv_input_path = os.path.join('processed_data', 'resume_clustered_data.csv')
# Number of top keywords to show for each cluster.
TOP_N_KEYWORDS = 50
# ---------------------

def get_top_tfidf_features(documents, top_n):
    """
    Applies TF-IDF to a list of documents and returns the top_n features.
    """
    # We use stop_words='english' to remove common words like 'and', 'the', 'is'
    # which don't give us much meaning.
    tfidf_vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
    tfidf_matrix = tfidf_vectorizer.fit_transform(documents)
    
    # Get the average TF-IDF score for each word across all documents in the cluster
    avg_tfidf_scores = tfidf_matrix.mean(axis=0).A1
    feature_names = tfidf_vectorizer.get_feature_names_out()
    
    # Get the indices of the top N scores
    top_indices = avg_tfidf_scores.argsort()[-top_n:][::-1]
    
    # Get the feature names for these indices
    top_features = [feature_names[i] for i in top_indices]
    
    return top_features

def main():
    """
    Main function to load clustered data and find top keywords for each cluster.
    """
    print("--- Starting Cluster Interpretation ---")

    # Check for input file
    if not os.path.exists(csv_input_path):
        print(f"❌ Error: Input file '{csv_input_path}' not found.")
        print("Please run 'cluster_and_visualize.py' with 'OPTIMAL_K' set first.")
        return

    print(f"Loading data from '{csv_input_path}'...")
    df = pd.read_csv(csv_input_path)

    if 'archetype_cluster' not in df.columns or 'cleaned_text' not in df.columns:
        print("❌ Error: 'archetype_cluster' or 'cleaned_text' columns not found.")
        return

    # Group the dataframe by the cluster label
    clusters = df.groupby('archetype_cluster')
    
    print("\n--- Top Keywords per Cluster (via TF-IDF) ---")

    for cluster_id, group_df in clusters:
        print("\n" + "="*50)
        print(f"  Cluster {cluster_id}   (Size: {len(group_df)} resumes)")
        print("="*50)
        
        # Get all text documents for this cluster
        documents = group_df['cleaned_text'].dropna().tolist()
        
        if not documents:
            print("  This cluster has no text data.")
            continue
            
        # Get top keywords
        top_keywords = get_top_tfidf_features(documents, TOP_N_KEYWORDS)
        
        print(", ".join(top_keywords))
    
    print("\n" + "="*50)
    print("\n--- ✅ Analysis Complete! ---")
    print("Based on the keywords above, decide on a descriptive name for each cluster.")
    print("Example: Cluster 0 might be 'Data Science', Cluster 1 might be 'Web Development', etc.")
    

# --- Run the script ---
if __name__ == "__main__":
    main()
