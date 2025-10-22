from typing import TypedDict, List, Optional

class GraphState(TypedDict):
    """
    Represents the state of our graph (Stateless Version).

    Attributes:
        userId: Kept structurally but not used for persistence.
        job_description: The job description provided by the user.
        file_bytes: The raw bytes of the uploaded PDF file (transient).
        resume_text: The text extracted from the PDF.
        target_archetype: The career archetype identified for the job description.
        alumni_examples: Relevant text snippets from alumni resumes.
        feedback: The generated feedback for the current resume.
        error_message: Any error message encountered during the process.
    """
    userId: Optional[str] # No longer used for storage
    job_description: str
    file_bytes: Optional[bytes] # Removed after extraction
    resume_text: Optional[str]
    target_archetype: Optional[str]
    alumni_examples: Optional[str]
    feedback: Optional[str]
    error_message: Optional[str]
    # Removed: previous_resume_text, previous_feedback, comparison_report, save_error

