"""
app.py
Entrypoint for Hugging Face Spaces (Gradio SDK / FastAPI) and local deployments.
Mounts our full Hyperion Pathfinder FastAPI application and enables seamless
deployment on Hugging Face Free Spaces without requiring Docker or a credit card.
"""

import os
import gradio as gr
from main import app as fastapi_app

# Minimal Gradio demo block mounted at /gradio
with gr.Blocks(title="Hyperion Pathfinder") as demo:
    gr.Markdown(
        """
        # ⚡ Hyperion Pathfinder — Career Catalyst
        The interactive 3D Career Intelligence web application is running live at root.
        
        👉 **[Open Full Interactive 3D Interface](/)**
        """
    )

# Mount Gradio at /gradio so root "/" serves our full Prismatic 3D UI, Three.js Career Atlas, and API endpoints
app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
