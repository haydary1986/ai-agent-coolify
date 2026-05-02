from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
import os
from dotenv import load_dotenv

from agent import get_agent_response

load_dotenv()

app = FastAPI(title="AI Agent API", description="API for Coolify-hosted AI Agent with Auth")

# Define the request model
class ChatRequest(BaseModel):
    message: str
    password: str
    session_id: str = "default_session"

# Serve the API endpoint
@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    expected_password = os.getenv("AGENT_PASSWORD", "123456")
    if request.password != expected_password:
        raise HTTPException(status_code=401, detail="كلمة المرور غير صحيحة. يرجى التأكد من كلمة المرور.")
        
    try:
        response = get_agent_response(request.message, request.session_id)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Serve static files for the frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return FileResponse("static/index.html")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
