@echo off
if not exist .venv (
    python -m venv .venv
)
call .\.venv\Scripts\activate.bat
pip install -r requirements.txt
echo Starting frontend server on port 8080
start /B python -m http.server 8080
echo Starting backend server on port 8000
python -m uvicorn main:app --reload
