SRM Career Catalyst - Resume Analyzer

This project provides a web-based tool for SRMIST students to analyze their resumes against job descriptions, leveraging AI and data derived from successful alumni placements.

Note: This version is stateless. It does not store user history between sessions. Each analysis is independent.

Project Structure

Placement-Project/
│
├── data/
│   └── raw_resumes/        # Folder containing original alumni resume PDFs (Used by pre-processing)
│
├── processed_data/         # Folder containing outputs from pre-processing scripts
│   ├── resume_text_data.csv
│   ├── resume_cleaned_data.csv
│   ├── resume_embedded_data.csv
│   ├── resume_embeddings.npy
│   └── resume_clustered_data.csv
│
├── vector_store/           # Folder containing the final FAISS index and metadata
│   ├── srm_resumes.index
│   └── srm_resumes.pkl
│
├── .env                    # Stores your Google API Key (ignored by git)
├── requirements.txt        # Python dependencies
├── process_resumes.py      # Script 1: PDF to Text
├── clean_text.py           # Script 2: Text Cleaning
├── vectorize_resumes.py    # Script 3: Text to Embeddings
├── cluster_and_visualize.py # Script 4: Clustering & Visualization
├── label_clusters.py       # Script 5: Cluster Interpretation
├── build_vector_store.py   # Script 6: Create FAISS Index
├── models.py               # Pydantic models (GraphState)
├── services.py             # Core logic functions (LLM calls, RAG, etc.)
├── graph.py                # LangGraph workflow definition
├── main.py                 # FastAPI backend server
└── index.html              # Frontend HTML/JS chatbot interface


Setup

Clone the Repository:

git clone <your-repo-url>
cd Placement-Project


Create Virtual Environment:

python -m venv .venv
# Activate (Windows PowerShell):
.\.venv\Scripts\Activate.ps1
# Activate (Mac/Linux):
# source .venv/bin/activate


Install Dependencies:

pip install -r requirements.txt


Set Up API Key:

Get a Google AI (Gemini) API key from Google AI Studio.

Create a file named .env in the Placement-Project root folder.

Add your API key to the .env file:

GOOGLE_API_KEY=YOUR_API_KEY_HERE


Pre-processing (If not done already):

Place all alumni resume PDFs into the data/raw_resumes/ folder.

Run the pre-processing scripts in order (1-6):

python process_resumes.py
python clean_text.py
python vectorize_resumes.py
# Run cluster_and_visualize.py once to generate elbow plot
python cluster_and_visualize.py
# --- Examine elbow_plot.png, choose OPTIMAL_K, edit the script ---
# Run again with OPTIMAL_K set
python cluster_and_visualize.py
python label_clusters.py
# --- Examine keywords, edit ARCHETYPE_MAP in build_vector_store.py ---
python build_vector_store.py


Running the Application

Start the Backend Server:

Make sure your virtual environment is active.

Run the FastAPI server from the Placement-Project root folder:

python -m uvicorn main:app --reload


The server will start, typically on http://127.0.0.1:8000. Keep this terminal running.

Open the Frontend:

In your file explorer, navigate to the Placement-Project folder.

Double-click the index.html file. This will open the chatbot interface in your default web browser.

Use the Application:

Paste a job description into the text area.

Upload your resume PDF.

Click "Analyze Resume".