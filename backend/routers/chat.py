from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

from database import get_db
from models.chat import ChatSession, ChatMessage
from models.workflow import Workflow

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatSessionCreate(BaseModel):
    workflow_id: str
    name: Optional[str] = "New Chat"


class ChatMessageCreate(BaseModel):
    role: str
    content: str
    agent_name: Optional[str] = None
    is_intermediate: bool = False


class ChatSessionResponse(BaseModel):
    id: UUID
    workflow_id: UUID
    name: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    agent_name: Optional[str]
    is_intermediate: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/sessions", response_model=ChatSessionResponse)
def create_session(data: ChatSessionCreate, db: Session = Depends(get_db)):
    """Create a new chat session for a workflow."""
    workflow = db.query(Workflow).filter(Workflow.id == data.workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    session = ChatSession(
        workflow_id=data.workflow_id,
        name=data.name,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return ChatSessionResponse(
        id=session.id,
        workflow_id=session.workflow_id,
        name=session.name,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=0,
    )


@router.get("/sessions/workflow/{workflow_id}")
def list_sessions(workflow_id: str, db: Session = Depends(get_db)):
    """List all chat sessions for a workflow."""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.workflow_id == workflow_id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )

    result = []
    for session in sessions:
        msg_count = db.query(ChatMessage).filter(
            ChatMessage.session_id == session.id,
            ChatMessage.is_intermediate == 0
        ).count()
        result.append({
            "id": session.id,
            "workflow_id": session.workflow_id,
            "name": session.name,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "message_count": msg_count,
        })

    return {"sessions": result}


@router.get("/sessions/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get a chat session with all messages."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )

    return {
        "session": {
            "id": session.id,
            "workflow_id": session.workflow_id,
            "name": session.name,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
        },
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "agent_name": m.agent_name,
                "is_intermediate": bool(m.is_intermediate),
                "created_at": m.created_at,
            }
            for m in messages
        ],
    }


@router.post("/sessions/{session_id}/messages")
def add_message(session_id: str, data: ChatMessageCreate, db: Session = Depends(get_db)):
    """Add a message to a chat session."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    message = ChatMessage(
        session_id=session_id,
        role=data.role,
        content=data.content,
        agent_name=data.agent_name,
        is_intermediate=1 if data.is_intermediate else 0,
    )
    db.add(message)

    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(message)

    return {
        "id": message.id,
        "role": message.role,
        "content": message.content,
        "agent_name": message.agent_name,
        "is_intermediate": bool(message.is_intermediate),
        "created_at": message.created_at,
    }


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a chat session and all its messages."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.delete(session)
    db.commit()

    return {"message": "Session deleted"}


@router.get("/sessions/{session_id}/context")
def get_conversation_context(session_id: str, limit: int = 2, db: Session = Depends(get_db)):
    """Get the last N conversation pairs for context (short-term memory)."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.session_id == session_id,
            ChatMessage.is_intermediate == 0,
            ChatMessage.role.in_(["user", "assistant"])
        )
        .order_by(ChatMessage.created_at.desc())
        .limit(limit * 2)
        .all()
    )

    messages.reverse()

    return {
        "context": [
            {"role": m.role, "content": m.content}
            for m in messages
        ]
    }


@router.put("/sessions/{session_id}/name")
def update_session_name(session_id: str, name: str, db: Session = Depends(get_db)):
    """Update the session name."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.name = name
    session.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Session name updated", "name": name}
