import os
import pickle
import faiss
import io
# --- MODIFICATION ---
# Removed: from langchain_google_genai import ChatGoogleGenerativeAI
# Added imports for Azure SDK and GitHub AI endpoint
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
# --- END MODIFICATION ---
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
from models import GraphState
from functools import lru_cache
import json
import pandas as pd
import numpy as np

# --- REMOVED Local Storage Setup ---

# --- Model & Vector Store Loading (Cached) ---
@lru_cache(maxsize=1)
def load_models_and_store():
    """
    Loads the FAISS index, metadata, and embedding model into memory.
    Uses @lru_cache to ensure it only runs once.
    """
    try:
        print("Loading models and vector store...")
        index_path = os.path.join('vector_store', 'srm_resumes.index')
        metadata_path = os.path.join('vector_store', 'srm_resumes.pkl')
        if not os.path.exists(index_path) or not os.path.exists(metadata_path):
             raise FileNotFoundError("Vector store files not found. Please run pre-processing scripts.")

        index = faiss.read_index(index_path)
        with open(metadata_path, 'rb') as f:
            metadata = pickle.load(f)
        model = SentenceTransformer('all-MiniLM-L6-v2')
        print("Models and vector store loaded successfully.")
        return index, metadata, model
    except FileNotFoundError as e:
        print(f"FATAL ERROR: {e}")
        return None, None, None
    except Exception as e:
        print(f"FATAL ERROR loading models: {e}")
        return None, None, None

# --- ** NEW: GitHub AI Client Setup ** ---
@lru_cache(maxsize=1)
def get_github_ai_client():
    """Creates and caches the GitHub AI client."""
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        print("FATAL ERROR: GITHUB_TOKEN environment variable not set.")
        return None # Or raise an exception

    endpoint = "https://models.github.ai/inference"
    try:
        client = ChatCompletionsClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(token),
        )
        print("GitHub AI client created successfully.")
        return client
    except Exception as e:
        print(f"FATAL ERROR creating GitHub AI client: {e}")
        return None
# --- ** END NEW SETUP ** ---


# --- Graph Node Functions ---

def extract_text(state: GraphState) -> GraphState:
    """Node to extract text from the uploaded PDF."""
    print("Node: extract_text")
    file_bytes = state.get("file_bytes")

    if not file_bytes:
        error_msg = "File bytes missing in state. Cannot extract text."
        print(f"  - Error: {error_msg}")
        # Clean up file_bytes even if it was None or empty
        new_state = state.copy()
        if 'file_bytes' in new_state: del new_state['file_bytes']
        new_state['error_message'] = error_msg
        return new_state


    try:
        pdf_file_like_object = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file_like_object)

        text = ""
        if reader.is_encrypted:
             try: reader.decrypt('')
             except Exception as decrypt_error:
                 error_msg = f"PDF is encrypted: {decrypt_error}"
                 print(f"  - Error: {error_msg}")
                 new_state = state.copy()
                 if 'file_bytes' in new_state: del new_state['file_bytes']
                 new_state['error_message'] = error_msg
                 return new_state


        for page in reader.pages:
            page_text = page.extract_text()
            if page_text: text += page_text + "\n"

        if not text:
            error_msg = "Could not extract text from PDF (maybe image-based or empty)."
            print(f"  - Error: {error_msg}")
            new_state = state.copy()
            if 'file_bytes' in new_state: del new_state['file_bytes']
            new_state['error_message'] = error_msg
            return new_state


        print("  - Successfully extracted text from PDF.")
        new_state = state.copy()
        if 'file_bytes' in new_state:
            del new_state['file_bytes'] # Remove bytes after successful processing
        new_state["resume_text"] = text.strip()
        return new_state # Return the updated state

    except Exception as e:
        error_msg = f"Error reading PDF: {e}"
        print(f"  - DETAILED Error during PDF parsing: {type(e).__name__}: {e}")
        new_state = state.copy()
        if 'file_bytes' in new_state:
             del new_state['file_bytes'] # Also remove bytes on error
        new_state["error_message"] = error_msg
        return new_state # Return updated state with error


def find_relevant_resumes(state: GraphState) -> GraphState:
    """Node to perform the RAG search."""
    print("Node: find_relevant_resumes")
    index, metadata, model = load_models_and_store()
    if not index or not metadata or not model:
        error_msg = "Vector store/models not loaded. Cannot search."
        print(f"  - Error: {error_msg}")
        return {**state, "error_message": error_msg}

    try:
        query_text = state.get("job_description")
        if not query_text or not query_text.strip():
             error_msg = "Job description missing. Cannot search."
             print(f"  - Error: {error_msg}")
             return {**state, "error_message": error_msg}

        query_vector = model.encode([query_text.strip()], normalize_embeddings=True)
        query_vector_float32 = query_vector.astype(np.float32)

        if index.ntotal == 0:
             return {**state, "error_message": "FAISS index empty."}
        if index.d != query_vector_float32.shape[1]:
            return {**state, "error_message": "Dimension mismatch between query and index."}

        distances, indices = index.search(query_vector_float32, k=5)

        relevant_examples = []
        target_archetype = "General"
        found_ids = set()

        if indices is not None and len(indices[0]) > 0:
            first_valid_idx = next((int(idx) for idx in indices[0] if 0 <= int(idx) < len(metadata)), -1)

            if first_valid_idx != -1:
                 if isinstance(metadata[first_valid_idx], dict):
                      target_archetype = metadata[first_valid_idx].get('archetype', 'General')

            for idx in indices[0]:
                idx_int = int(idx)
                if idx_int != -1 and 0 <= idx_int < len(metadata) and idx_int not in found_ids:
                    meta = metadata[idx_int]
                    if isinstance(meta, dict) and meta.get('archetype') == target_archetype:
                        relevant_examples.append(f"--- ALUMNI EXAMPLE (ARCHETYPE: {meta['archetype']}) ---\n{meta.get('text', '')}\n")
                        found_ids.add(idx_int)
                    if len(relevant_examples) >= 3: break
        else:
             print("  - Warning: FAISS search returned no indices.")

        print(f"  - Found {len(relevant_examples)} examples. Target Archetype: {target_archetype}")
        return {**state, "alumni_examples": "\n".join(relevant_examples), "target_archetype": target_archetype}
    except Exception as e:
        error_msg = f"Error during RAG search: {e}"
        print(f"  - DETAILED Error during RAG search: {type(e).__name__}: {e}")
        return {**state, "error_message": error_msg}


def generate_feedback(state: GraphState) -> GraphState:
    """Node to generate the initial feedback using GitHub AI model."""
    print("Node: generate_feedback")
    if "resume_text" not in state or not state["resume_text"]:
         return {**state, "error_message": "Resume text missing."}
    if "job_description" not in state or not state["job_description"]:
         return {**state, "error_message": "Job description missing."}

    # --- ** Use GitHub AI Client ** ---
    client = get_github_ai_client()
    if not client:
        return {**state, "error_message": "GitHub AI client failed to initialize."}

    # --- ** THE FIX: Change Model Name ** ---
    github_model_name = "openai/gpt-4o-mini" # Changed from gpt-5-mini
    # --- ** END FIX ** ---

    try:
        # Construct the system and user messages for the Azure SDK
        system_message_content = f"""
        You are an expert SRM University Career Coach analyzing a student's resume.
        The target role seems to be related to '{state.get('target_archetype', 'General')}'.
        Analyze the user's resume against their target job description and these examples from successfully placed SRM alumni.

        Provide feedback in this structure ONLY (use Markdown):
        **1. Overall Score (out of 100):** [Your Score Here]
        **2. What's Good:** (2 bullet points)
        **3. Actionable Recommendations:** (3 bullet points linking to JD/Alumni)
        **4. Key Skills to Add:** (3 bullet points from JD)
        """

        user_message_content = f"""
        --- MY RESUME ---
        {state['resume_text']}

        --- TARGET JOB DESCRIPTION ---
        {state['job_description']}

        --- EXAMPLES FROM PLACED SRM ALUMNI (Similar Roles) ---
        {state.get('alumni_examples', 'No alumni examples were found.')}
        """

        messages = [
            SystemMessage(content=system_message_content),
            UserMessage(content=user_message_content)
        ]

        # Call the GitHub AI endpoint using the Azure SDK client
        response = client.complete(
            messages=messages,
            model=github_model_name
            # temperature=0.7 # Add temperature if needed/supported
        )

        # Extract the content from the response
        feedback_content = response.choices[0].message.content
        print("  - Successfully generated feedback using GitHub AI.")

        final_state = {k: v for k, v in state.items() if k != 'file_bytes'}
        final_state['feedback'] = feedback_content
        return final_state

    except Exception as e:
        error_msg = f"LLM Error (GitHub AI): {e}"
        print(f"  - DETAILED Error generating LLM feedback: {type(e).__name__}: {e}")
        final_state = {k: v for k, v in state.items() if k != 'file_bytes'}
        final_state['error_message'] = error_msg
        return final_state


# --- Graph Conditional Edges ---

def did_process_fail(state: GraphState) -> str:
    """Checks if the 'error_message' key exists after a node."""
    print("Edge: did_process_fail")
    if state.get("error_message"):
        print(f"  - Result: Yes, error found: {state['error_message']}")
        return "yes"
    else:
        print("  - Result: No, step successful.")
        return "no"

