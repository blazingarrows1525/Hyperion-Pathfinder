SRM Career Catalyst: Intelligent Resume Analysis Engine

SRM Career Catalyst is an advanced, data-driven backend system designed to analyze student resumes against job descriptions. Unlike standard keyword matchers, this system utilizes a "Knowledge Genome" constructed from the actual resumes of successfully placed alumni.

It combines Traditional NLP (for entity extraction), Unsupervised Machine Learning (for discovering career archetypes), and Generative AI (for reasoning and feedback) to provide specific, actionable insights on how to improve placement chances.

🏗️ System Architecture

The project is divided into two distinct computational phases, visualized below:

graph TD
    subgraph "Phase 1: Offline Data Pipeline"
        RawPDFs[Raw Alumni PDFs] --> Extract[Data Extraction]
        Extract --> NLP[Entity Recognition<br/>(spaCy)]
        Extract --> GenAI_Metrics[Achievement Analysis<br/>(GitHub AI)]
        Extract --> Vectors[Vectorization<br/>(SentenceTransformers)]
        Vectors --> Cluster[Archetype Discovery<br/>(K-Means)]
        NLP --> Store
        GenAI_Metrics --> Store
        Cluster --> Store[(Vector Store<br/>FAISS + Metadata)]
    end

    subgraph "Phase 2: Online Inference Engine"
        UserRes[Student Resume] --> NodeExtract[Extraction Node]
        UserJD[Job Description] --> NodeRAG[Retrieval Node]
        NodeRAG -->|Query| Store
        Store -->|Archetype & Examples| NodeGenAI
        NodeExtract -->|Resume Text| NodeGenAI{Reasoning Node<br/>(GenAI)}
        NodeGenAI --> Report[Feedback Report]
    end


Phase 1: The Offline Data Pipeline (Knowledge Construction)

This phase processes raw PDF data to build the intelligence layer.

Data Extraction: Converts unstructured PDF resumes into structured text using pypdf and regex.

Entity Recognition: Uses spaCy (Large Model) to extract skills, organizations, and dates.

Achievement Analysis: Uses GitHub AI (gpt-4o-mini) to extract and categorize quantifiable metrics (e.g., classifying "reduced latency by 20ms" as "Speed/Performance").

Archetype Discovery: Uses SentenceTransformers and K-Means Clustering to mathematically group alumni into career clusters (e.g., Data Science, Full Stack) without manual labeling.

Vector Store Creation: Indexes the data into FAISS for high-speed semantic retrieval.

Phase 2: The Online Inference Engine (API)

This phase runs the live analysis via a REST API.

Request Handling: FastAPI receives the Job Description and Resume.

Orchestration: LangGraph manages the workflow (Extraction -> Retrieval -> Logic).

RAG (Retrieval-Augmented Generation): The system searches the vector store for the specific Alumni Archetype matching the Job Description.

Synthesis: The GenAI model generates feedback by comparing the student's resume against the specific patterns and metrics found in the successful alumni examples.

🛠️ Technology Stack

Language: Python 3.9+

API Framework: FastAPI, Uvicorn

AI Orchestration: LangGraph, LangChain

Generative AI: GitHub AI Model Inference (openai/gpt-4o-mini) via Azure SDK

Machine Learning: Scikit-Learn (K-Means, TF-IDF), SpaCy (NER)

Vector Database: FAISS (CPU)

Embeddings: Sentence-Transformers (all-MiniLM-L6-v2)

Data Processing: Pandas, NumPy, Regex, PyPDF

📂 Project Structure

Placement-Project/
├── processed_data/           # Output storage for CSVs and analysis files
│   ├── structured_resumes.csv
│   ├── resumes_with_metrics.csv
│   ├── clustered_resumes.csv
│   ├── embeddings.npy
│   └── archetype_insights.json
├── vector_store/             # The binary "brain" of the system
│   ├── srm_resumes.index     # FAISS Vector Index
│   └── srm_resumes.pkl       # Metadata store
├── data/
│   └── raw_resumes/          # Input folder for Alumni PDFs
├── extract_resume_data.py    # Step 1: Extract Skills/Entities
├── analyze_achievements.py   # Step 2: Extract Metrics via GenAI
├── cluster_resumes.py        # Step 3: Vectorization & Clustering
├── label_archetypes.py       # Step 4: Labeling & Aggregation
├── build_vector_store.py     # Step 5: Final Index Creation
├── services.py               # Core logic (RAG, LLM calls, Extraction)
├── graph.py                  # LangGraph Workflow Definition
├── models.py                 # Data Models (GraphState)
├── main.py                   # FastAPI Server Entry Point
├── requirements.txt          # Dependencies
└── .env                      # API Keys (Git Ignored)



🚀 Setup & Installation

1. Prerequisites

Python 3.9 or higher.

A GitHub Account (to generate a Personal Access Token).

2. Environment Setup

Clone the repository and create a virtual environment:

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.\.venv\Scripts\Activate.ps1

# Activate (Mac/Linux)
source .venv/bin/activate



3. Install Dependencies

pip install -r requirements.txt



4. Download NLP Models

Download the required SpaCy model for entity extraction:

python -m spacy download en_core_web_lg



5. Configuration

Create a .env file in the root directory and add your GitHub Token. This is required for the GenAI inference.

# .env file
GITHUB_TOKEN="your_github_pat_token_here"



⚙️ Execution Guide (Building the Knowledge Base)

Run these scripts in order to process your raw data and build the AI's "brain".

Step 1: Extract Data
Parses PDFs and extracts structured entities (Skills, Orgs).

python extract_resume_data.py



Step 2: Analyze Achievements
Uses GenAI to find and categorize specific metrics in alumni resumes.

python analyze_achievements.py



Step 3: Clustering
Converts text to vectors and groups resumes.

Run 1: Generates elbow_plot.png. Check the plot to find optimal k.

Edit: Update OPTIMAL_K in the script.

Run 2: Generates clusters.

python cluster_resumes.py



Step 4: Labeling
Identifies keywords for each cluster.

Run 1: Prints keywords per cluster.

Edit: Update ARCHETYPE_LABELS in the script based on keywords.

Run 2: Saves labeled data and insights.

python label_archetypes.py



Step 5: Build Vector Store
Compiles everything into the FAISS database for the API.

python build_vector_store.py



⚡ Running the API Server

Once the knowledge base (Phase 1) is complete, you can start the inference engine.

python -m uvicorn main:app --reload
