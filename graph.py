from langgraph.graph import StateGraph, END
from models import GraphState
import services

def get_graph():
    """Builds and compiles the simplified, stateless LangGraph workflow."""
    print("Building LangGraph workflow...")
    workflow = StateGraph(GraphState)

    # --- Define Nodes ---
    workflow.add_node("extract_text", services.extract_text)
    # Removed load_history node
    workflow.add_node("find_relevant_resumes", services.find_relevant_resumes)
    workflow.add_node("generate_feedback", services.generate_feedback)
    # Removed generate_comparison node
    # Removed save_history node

    # --- Define Edges ---
    workflow.set_entry_point("extract_text")

    # Conditional edge after text extraction
    workflow.add_conditional_edges(
        "extract_text",
        services.did_process_fail, # Check for errors
        {
            "yes": END, # Stop if extraction failed
            "no": "find_relevant_resumes" # Continue if extraction succeeded
        }
    )

    # Conditional edge after finding relevant resumes
    workflow.add_conditional_edges(
        "find_relevant_resumes",
         services.did_process_fail, # Check if RAG failed
         {
             "yes": END, # Stop if RAG failed
             "no": "generate_feedback" # Proceed directly to feedback if RAG succeeded
         }
    )

    # Final edge after generating feedback (or if generation fails)
    workflow.add_conditional_edges(
         "generate_feedback",
         services.did_process_fail,
         {
             "yes": END, # Stop if feedback generation failed
             "no": END # End successfully after feedback generation
         }
    )

    # --- Compile the graph ---
    app_graph = workflow.compile()
    print("LangGraph workflow compiled.")
    return app_graph

