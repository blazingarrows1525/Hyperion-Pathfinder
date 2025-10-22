# ==============================================================================
#  Phase 1, Task 2: Text Cleaning
# ==============================================================================
#
#  **Objective:**
#  This script reads the raw extracted text from the CSV, cleans it by
#  removing URLs, emails, special characters, and extra whitespace, and
#  saves the cleaned text to a new column in a new file.
#
#  **Instructions:**
#  1. Place this script in your 'Placement-Project' root folder.
#  2. Ensure the 'resume_text_data.csv' file exists in the 'processed_data' folder.
#  3. This script has no new dependencies.
#  4. Run the script. It will create a new file named 'resume_cleaned_data.csv'.
#
# ==============================================================================

import os
import pandas as pd
import re
from tqdm import tqdm

# --- Configuration ---
# Input file from the previous step.
input_csv_path = os.path.join('processed_data', 'resume_text_data.csv')
# The name of the new output file.
output_csv_path = os.path.join('processed_data', 'resume_cleaned_data.csv')
# ---------------------

def clean_resume_text(text):
    """
    Applies a series of cleaning operations to the raw resume text.
    """
    # 1. Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    
    # 2. Remove email addresses
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', text)
    
    # 3. Remove special characters, but keep some important ones for context
    # Keeps letters, numbers, and specific characters like +, #, . (for C++, C#, etc.)
    text = re.sub(r'[^\w\s\.\+#-]', '', text)
    
    # 4. Convert to lowercase
    text = text.lower()
    
    # 5. Remove extra whitespace and newlines
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def main():
    """
    Main function to run the text cleaning process.
    """
    print("--- Starting Text Cleaning Process ---")

    # Check if the input file exists
    if not os.path.exists(input_csv_path):
        print(f"❌ Error: The input file '{input_csv_path}' was not found.")
        print("Please run the 'process_resumes.py' script first.")
        return

    print(f"Reading data from '{input_csv_path}'...")
    df = pd.read_csv(input_csv_path)

    # Ensure the 'extracted_text' column exists
    if 'extracted_text' not in df.columns:
        print("❌ Error: 'extracted_text' column not found in the CSV.")
        return

    # Initialize tqdm for pandas' apply function
    tqdm.pandas(desc="Cleaning Text")

    print("Applying cleaning function to each resume...")
    # Use progress_apply to show a progress bar
    df['cleaned_text'] = df['extracted_text'].progress_apply(clean_resume_text)

    print(f"\nSaving cleaned data to '{output_csv_path}'...")
    df.to_csv(output_csv_path, index=False)

    print("\n--- ✅ Process Complete! ---")
    print("You can now proceed to the 'Vectorization (Embedding)' step.")
    print("\n--- Sample of Cleaned Data ---")
    print(df[['file_name', 'cleaned_text']].head())
    print("---------------------------------")

# --- Run the script ---
if __name__ == "__main__":
    main()
