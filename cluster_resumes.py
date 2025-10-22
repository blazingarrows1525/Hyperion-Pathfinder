# ==============================================================================
#  Phase 1, Task 4 & 5: Cluster and Visualize
# ==============================================================================
#
#  **Objective:**
#  This single script performs K-Means clustering and then immediately
#  generates a t-SNE visualization of the results.
#
#  **Instructions (A Two-Step Process):**
#  1. **STEP 1: Find the Optimal 'k'**
#     - Leave `OPTIMAL_K` as `None`.
#     - Run the script. It will generate a chart named 'elbow_plot.png'.
#     - Examine the chart to find the "elbow point" and decide on a number.
#  2. **STEP 2: Cluster & Visualize**
#     - Update the `OPTIMAL_K` variable with the number you chose (e.g., 5).
#     - Run the script again. It will save 'resume_clustered_data.csv' AND
#       'cluster_visualization.png'.
#
#  **Dependencies:**
#  - pip install scikit-learn matplotlib pandas numpy seaborn
#
# ==============================================================================

import os
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.manifold import TSNE
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm

# --- Configuration ---
# Set this to the number of clusters you want to create after running Step 1.
# Leave as None to run the Elbow Method plot generation first.
OPTIMAL_K = 5  # Example: 5

# Input files from the previous step.
csv_input_path = os.path.join('processed_data', 'resume_embedded_data.csv')
embeddings_input_path = os.path.join('processed_data', 'resume_embeddings.npy')
# Final output files.
output_csv_path = os.path.join('processed_data', 'resume_clustered_data.csv')
elbow_plot_path = 'elbow_plot.png'
cluster_plot_path = 'cluster_visualization.png'
# ---------------------

def find_optimal_k(embeddings, max_k=20):
    """
    Runs K-Means for a range of k values and plots the inertia (WCSS)
    to help find the optimal number of clusters via the Elbow Method.
    """
    print(f"--- Running Elbow Method to find optimal k (up to k={max_k}) ---")
    wcss = []  # Within-Cluster-Sum-of-Squares
    k_range = range(1, max_k + 1)
    
    for k in tqdm(k_range, desc="Testing k values"):
        kmeans = KMeans(n_clusters=k, init='k-means++', random_state=42, n_init=10)
        kmeans.fit(embeddings)
        wcss.append(kmeans.inertia_)
        
    print(f"Generating Elbow Method plot and saving to '{elbow_plot_path}'...")
    plt.figure(figsize=(12, 6))
    plt.plot(k_range, wcss, marker='o', linestyle='--')
    plt.title('Elbow Method for Optimal k')
    plt.xlabel('Number of Clusters (k)')
    plt.ylabel('WCSS (Inertia)')
    plt.xticks(k_range)
    plt.grid(True)
    plt.savefig(elbow_plot_path)
    
    print("\n--- ✅ Elbow Plot Generated ---")
    print(f"Please open '{elbow_plot_path}', find the 'elbow point', and update the 'OPTIMAL_K' variable in this script.")

def generate_cluster_visualization(df, embeddings):
    """
    Applies t-SNE to embeddings and generates a 2D scatter plot
    of the clusters, colored by their assigned label.
    """
    print("\n--- Starting Cluster Visualization ---")
    print(f"Original embeddings shape: {embeddings.shape}")
    print("Applying t-SNE to reduce to 2 dimensions... (this may take a minute)")
    
    perplexity_value = min(30, len(df) - 2)
    if perplexity_value <= 0:
        print("❌ Error: Not enough data points to run t-SNE.")
        return

    # --- FIX ---
    # Removed the 'n_iter' argument as it is deprecated in newer scikit-learn versions.
    # The default (1000) will be used.
    tsne = TSNE(n_components=2, random_state=42, perplexity=perplexity_value)
    # -------------
    
    print("t-SNE is running. Please be patient...")
    embeddings_2d = tsne.fit_transform(embeddings)
    print("t-SNE complete.")
    
    df['tsne-x'] = embeddings_2d[:, 0]
    df['tsne-y'] = embeddings_2d[:, 1]
    
    n_clusters = df['archetype_cluster'].nunique()

    print(f"Generating scatter plot and saving to '{cluster_plot_path}'...")
    plt.figure(figsize=(16, 10))
    sns.scatterplot(
        x="tsne-x", y="tsne-y",
        hue="archetype_cluster",
        palette=sns.color_palette("hsv", n_clusters),
        data=df,
        legend="full",
        alpha=0.8
    )
    plt.title('2D Visualization of Resume Clusters (via t-SNE)')
    plt.xlabel('t-SNE Component 1')
    plt.ylabel('t-SNE Component 2')
    plt.legend(title='Cluster')
    plt.grid(True)
    
    plt.savefig(cluster_plot_path)
    
    print("\n--- ✅ Visualization Complete! ---")
    print(f"Please open '{cluster_plot_path}' to see your clusters.")

def perform_clustering_and_visualize(embeddings, k, df):
    """
    Performs K-Means clustering, saves the results, and then
    calls the visualization function.
    """
    print(f"--- Performing K-Means clustering with k={k} ---")
    kmeans = KMeans(n_clusters=k, init='k-means++', random_state=42, n_init=10)
    kmeans.fit(embeddings)
    
    cluster_labels = kmeans.labels_
    df['archetype_cluster'] = cluster_labels
    
    print(f"Saving clustered data to '{output_csv_path}'...")
    df.to_csv(output_csv_path, index=False)
    
    print("\n--- ✅ Clustering Complete! ---")
    print("Each resume now has an 'archetype_cluster' assigned.")
    print("\n--- Cluster Distribution ---")
    print(df['archetype_cluster'].value_counts().sort_index())
    print("----------------------------")
    
    # Now, call the visualization function
    generate_cluster_visualization(df, embeddings)

def main():
    """
    Main function to orchestrate the clustering and visualization process.
    """
    # Check for input files
    if not os.path.exists(csv_input_path) or not os.path.exists(embeddings_input_path):
        print("❌ Error: Input files from the vectorization step were not found.")
        print("Please run 'vectorize_resumes.py' first.")
        return
        
    print("Loading data and embeddings...")
    df = pd.read_csv(csv_input_path)
    embeddings = np.load(embeddings_input_path)
    
    if OPTIMAL_K is None:
        # Step 1: Generate the elbow plot
        find_optimal_k(embeddings)
    else:
        # Step 2: Perform the final clustering and visualization
        perform_clustering_and_visualize(embeddings, OPTIMAL_K, df)

# --- Run the script ---
if __name__ == "__main__":
    main()

