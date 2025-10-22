# ==============================================================================
#  Phase 1, Task 3: Vectorization (Embedding)
# ==============================================================================
#
#  **Objective:**
#  This script converts the cleaned text of each resume into a numerical vector
#  (embedding) using a sentence-transformer model.
#
#  **Instructions:**
#  1. Place this script in your 'Placement-Project' root folder.
#  2. Ensure the 'resume_cleaned_data.csv' file exists in 'processed_data'.
#  3. Install the new required libraries by running this in your terminal:
#     pip install sentence-transformers torch numpy
#  4. Run the script. It will create two new files: 'resume_embeddings.npy'
#     and 'resume_embedded_data.csv'.
#  5. NOTE: The first time you run this, it will download the ML model
#     (approx. 90MB), so an internet connection is required.
#
# ==============================================================================

import os
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# --- Configuration ---
# Input file from the previous step.
input_csv_path = os.path.join('processed_data', 'resume_cleaned_data.csv')
# The name of the final output CSV file.
output_csv_path = os.path.join('processed_data', 'resume_embedded_data.csv')
# The path to save the embeddings numpy array.
embeddings_output_path = os.path.join('processed_data', 'resume_embeddings.npy')
# The pre-trained model we will use.
model_name = 'all-MiniLM-L6-v2'
# ---------------------

def main():
    """
    Main function to run the vectorization process.
    """
    print("--- Starting Resume Vectorization Process ---")

    # Check if the input file exists
    if not os.path.exists(input_csv_path):
        print(f"❌ Error: The input file '{input_csv_path}' was not found.")
        print("Please run the 'clean_text.py' script first.")
        return

    print(f"Reading data from '{input_csv_path}'...")
    df = pd.read_csv(input_csv_path)

    if 'cleaned_text' not in df.columns:
        print("❌ Error: 'cleaned_text' column not found in the CSV.")
        return
        
    # Drop rows where cleaned_text might be empty or just whitespace
    df.dropna(subset=['cleaned_text'], inplace=True)
    df = df[df['cleaned_text'].str.strip() != '']
    if df.empty:
        print("❌ Error: No valid text to process after cleaning up empty rows.")
        return

    print(f"Loading sentence-transformer model: '{model_name}'...")
    print("(This may take a moment and will download the model on the first run)")
    model = SentenceTransformer(model_name)

    # Convert the cleaned text column to a list for the model
    texts_to_embed = df['cleaned_text'].tolist()

    print(f"Generating embeddings for {len(texts_to_embed)} resumes...")
    # The model's encode function can show a progress bar
    embeddings = model.encode(texts_to_embed, show_progress_bar=True)

    print(f"\nEmbeddings generated successfully. Shape: {embeddings.shape}")

    # Save the embeddings array to a .npy file for efficient loading
    print(f"Saving embeddings to '{embeddings_output_path}'...")
    np.save(embeddings_output_path, embeddings)

    # Add an index to the dataframe that corresponds to the row in the numpy array
    df['embedding_id'] = range(len(df))

    # Save the updated dataframe with the mapping
    print(f"Saving updated data with embedding IDs to '{output_csv_path}'...")
    df.to_csv(output_csv_path, index=False)
    
    print("\n--- ✅ Process Complete! ---")
    print("You can now proceed to the 'Clustering with K-Means' step.")
    print("\nTwo files were created:")
    print(f"1. {embeddings_output_path} - Contains the numerical vectors.")
    print(f"2. {output_csv_path} - Your data with a new 'embedding_id' column.")

# --- Run the script ---
if __name__ == "__main__":
    main()
