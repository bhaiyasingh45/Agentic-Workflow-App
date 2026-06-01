from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import agents_router, workflows_router, execution_router, chat_router
from tools.tool_registry import get_all_tool_names

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Agent Workflow Builder",
    description="Build and run AI agent workflows visually",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents_router)
app.include_router(workflows_router)
app.include_router(execution_router)
app.include_router(chat_router)


@app.get("/")
def root():
    return {
        "message": "AI Agent Workflow Builder API",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/api/tools")
def list_available_tools():
    """List all available tools that can be assigned to agents."""
    return {
        "tools": get_all_tool_names(),
        "categories": {
            "web_search": ["web_search", "get_current_time"],
            "calculator": ["add", "subtract", "multiply", "divide", "calculate"],
            "code_executor": ["code_executor"],
            "file_reader": ["file_reader", "list_directory"],
            "file_writer": ["file_writer"],
        },
    }


@app.get("/api/llm-models")
def list_llm_models():
    """List available LLM models."""
    return {
        "providers": {
            "anthropic": [
                {"id": "us.anthropic.claude-sonnet-4-6", "name": "Claude Sonnet 4.6"},
                {"id": "us.anthropic.claude-opus-4-5", "name": "Claude Opus 4.5"},
                {"id": "us.anthropic.claude-haiku-4-5", "name": "Claude Haiku 4.5"},
            ],
        }
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
