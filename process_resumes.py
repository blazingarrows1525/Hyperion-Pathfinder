# ==============================================================================
#  Phase 1, Task 1: PDF to Text Conversion
# ==============================================================================
#
#  **Objective:**
#  This script processes a folder of PDF resumes, extracts the raw text from
#  each file, and saves the output to a structured CSV file.
#
#  **Instructions:**
#  1. Place this script in your 'Placement-Project' root folder.
#  2. Your resumes should be inside a subfolder named 'Resumes'.
#  3. Install the required libraries by running this in your terminal:
#     pip install pandas pypdf tqdm
#  4. Run this script. It will create a 'processed_data' folder with the output.
#
# ==============================================================================

import os
import pandas as pd
from pypdf import PdfReader
from tqdm import tqdm

# --- Configuration ---
# Updated path to match your project structure.
resumes_folder_path = 'Resumes'
# The output file will be saved in a new 'processed_data' folder.
output_csv_path = os.path.join('processed_data', 'resume_text_data.csv')
# ---------------------

def extract_text_from_pdf(pdf_path):
    """
    Extracts all text from a single PDF file.
    Handles potential errors with corrupted or unreadable PDFs.
    """
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        # Return None if no text could be extracted, otherwise return the text
        return text if text else None
    except Exception as e:
        # This block catches errors, prints a message, and allows the script to continue.
        print(f"\n   - Could not read file: {os.path.basename(pdf_path)}. Reason: {e}")
        return None

def process_all_resumes(folder_path, csv_path):
    """
    Processes all PDF files in a given folder, extracts their text,
    and saves the results to a CSV file.
    """
    print(f"--- Starting PDF to Text Conversion ---")
    print(f"Scanning for PDF files in: '{folder_path}'")

    if not os.path.isdir(folder_path):
        print(f"❌ Error: The directory '{folder_path}' does not exist.")
        print("Please ensure your resumes are in a folder named 'Resumes' inside your project.")
        return

    # Adjusted to handle both .pdf and .doc.pdf files seen in your screenshot
    pdf_files = [f for f in os.listdir(folder_path) if f.lower().endswith('.pdf')]
    
    if not pdf_files:
        print(f"❌ Error: No PDF files found in '{folder_path}'.")
        return

    print(f"Found {len(pdf_files)} PDF files to process.")

    resume_data = []

    # Use tqdm for a progress bar. Note: error messages will print above the bar.
    for file_name in tqdm(pdf_files, desc="Processing Resumes"):
        file_path = os.path.join(folder_path, file_name)
        extracted_text = extract_text_from_pdf(file_path)

        # Only add the resume if text was successfully extracted
        if extracted_text:
            resume_data.append({
                'file_name': file_name,
                'file_path': file_path,
                'extracted_text': extracted_text
            })

    if not resume_data:
        print("❌ Error: Failed to extract text from any of the PDF files.")
        return

    print(f"\nSuccessfully extracted text from {len(resume_data)} out of {len(pdf_files)} resumes.")

    df = pd.DataFrame(resume_data)

    print(f"Saving extracted text to '{csv_path}'...")
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    df.to_csv(csv_path, index=False)

    print("\n--- ✅ Process Complete! ---")
    print("You can now proceed to the 'Text Cleaning' step.")


# --- Run the script ---
if __name__ == "__main__":
    process_all_resumes(resumes_folder_path, output_csv_path)

