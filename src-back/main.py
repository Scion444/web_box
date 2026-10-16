import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

load_dotenv()

llm = ChatOpenAI(
    model="deepseek/deepseek-chat",
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("API"),
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",
        "http://127.0.0.1:1420",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "tauri://localhost",
        "http://tauri.localhost",
    ],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)


class ChatReply(BaseModel):
    res: str


@app.post("/message")
async def chat(request: ChatRequest) -> ChatReply:
    try:
        result = await llm.ainvoke(request.message)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM request failed: {e}")
    return ChatReply(res=str(result.content))