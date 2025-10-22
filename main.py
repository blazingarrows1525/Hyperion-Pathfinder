import os
import asyncio
from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from graph import get_graph
from models import GraphState

# Load environment variables
load_dotenv()
# --- MODIFICATION: Load GITHUB_TOKEN instead of GOOGLE_API_KEY ---
if not os.getenv("GITHUB_TOKEN"):
    raise EnvironmentError("GITHUB_TOKEN not found in .env file")
# --- END MODIFICATION ---

app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods
    allow_headers=["*"], # Allows all headers
)

@app.on_event("startup")
async def startup_event():
    """On startup, load the vector store and compile the graph."""
    print("Application startup... loading models.")
    # This will load the models via lru_cache in services.py
    from services import load_models_and_store, get_github_ai_client
    # Explicitly call to load/cache on startup
    load_models_and_store_result = load_models_and_store()
    get_github_ai_client_result = get_github_ai_client()
    if None in load_models_and_store_result or get_github_ai_client_result is None:
         # Log the specific error if possible from the loading functions
         print("FATAL: Failed to load models or initialize AI client during startup.")
         # Optionally raise an exception to prevent FastAPI from starting fully
         # raise RuntimeError("Failed to initialize critical components.")
    else:
        print("Model loading and AI client initialization successful.")


    # Compile the graph and store it in the app's state
    app.state.graph = get_graph()
    print("Models loaded. Application is ready.")

# --- ** THE FIX: Improved Streaming Logic ** ---
async def stream_graph_response(response_stream):
    """
    Consumes the graph's async stream, looking for output from specific nodes
    (feedback or error), captures the final relevant output, and yields it once at the end.
    """
    final_output = None
    accumulated_error = None # Store potential error messages

    print("Starting graph stream consumption...")
    try:
        async for chunk in response_stream:
            # LangGraph streams chunks which can be node outputs or overall state updates.
            # We look specifically for the output of our final nodes.

            # Check for output from the 'generate_feedback' node
            if "generate_feedback" in chunk:
                node_output = chunk["generate_feedback"]
                if isinstance(node_output, dict) and "feedback" in node_output:
                    print("  - Feedback found in stream chunk.")
                    final_output = node_output["feedback"]
                    # If feedback is found, clear any previous error (feedback overrides)
                    accumulated_error = None
                elif isinstance(node_output, dict) and "error_message" in node_output:
                    print(f"  - Error found in 'generate_feedback' output: {node_output['error_message']}")
                    accumulated_error = f"An error occurred during feedback generation: {node_output['error_message']}"

            # Check for a top-level error message added by conditional edges or earlier nodes
            # This handles errors from extract_text, find_relevant_resumes etc.
            if "error_message" in chunk and chunk["error_message"] is not None:
                 print(f"  - Top-level error found in stream chunk: {chunk['error_message']}")
                 accumulated_error = f"An error occurred: {chunk['error_message']}"
                 # If we hit an error, this is likely the final state we care about
                 final_output = None # Clear any potentially stale feedback

            # Keep iterating until the stream naturally ends

    except Exception as e:
        print(f"ERROR during graph stream consumption: {type(e).__name__}: {e}")
        yield f"A critical server error occurred during streaming: {e}" # Yield error immediately
        return # Stop processing

    # After the stream finishes, yield the captured final output or error
    print("Graph stream finished.")
    if final_output:
        if not isinstance(final_output, str):
             print(f"Warning: Final feedback output was not a string: {type(final_output)}. Converting.")
             final_output = str(final_output)
        print("  - Yielding final feedback.")
        yield final_output
    elif accumulated_error:
        print("  - Yielding final error message.")
        yield accumulated_error # Yield the stored error message
    else:
        # Fallback if stream ends unexpectedly without feedback or a caught error
        print("  - Stream finished but no definitive feedback or error was captured.")
        yield "Processing finished, but no response or error was clearly identified."

# --- ** END FIX ** ---


@app.post("/analyze")
async def analyze(
    # --- MODIFICATION: Removed user_id ---
    job_description: str = Query(...),
    resume_file: UploadFile = File(...)
):
    """
    The main endpoint to analyze a resume (stateless).
    Receives job description as query param and the file in the body.
    """
    try:
        # Rewind the file pointer and read bytes
        await resume_file.seek(0)
        file_bytes = await resume_file.read()

        if not file_bytes:
            raise HTTPException(status_code=400, detail="The uploaded PDF file is empty.")

        # Pass file_bytes in initial state as expected by services.extract_text
        initial_state = {"job_description": job_description, "file_bytes": file_bytes}
        # Config now only needs thread_id for potential concurrency
        # We pass file_bytes in state, not config, based on latest services.py
        config = {"configurable": {"thread_id": "stateless_thread"}}


        response_stream = app.state.graph.astream(initial_state, config=config)

        return StreamingResponse(stream_graph_response(response_stream), media_type="text/plain; charset=utf-8") # Added charset

    except Exception as e:
        print(f"Error in /analyze endpoint: {type(e).__name__}: {e}")
        # import traceback # Uncomment for detailed stack trace during debugging
        # traceback.print_exc()
        # Return a generic error to the client, details are logged server-side
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {type(e).__name__}")

