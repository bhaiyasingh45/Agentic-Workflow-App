from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from database import get_db
from models.agent import Agent
from schemas.agent_schema import (
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    AgentListResponse,
)

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.post("", response_model=AgentResponse)
def create_agent(agent: AgentCreate, db: Session = Depends(get_db)):
    """Create a new agent."""
    db_agent = Agent(
        name=agent.name,
        description=agent.description,
        system_prompt=agent.system_prompt,
        llm_provider=agent.llm_provider,
        llm_model=agent.llm_model,
        temperature=agent.temperature,
        max_tokens=agent.max_tokens,
        tools=agent.tools,
        tags=agent.tags,
    )
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    return db_agent


@router.get("", response_model=AgentListResponse)
def list_agents(
    search: Optional[str] = None,
    llm_provider: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List all agents with optional filtering."""
    query = db.query(Agent)

    if search:
        query = query.filter(Agent.name.ilike(f"%{search}%"))

    if llm_provider:
        query = query.filter(Agent.llm_provider == llm_provider)

    total = query.count()
    agents = query.offset(skip).limit(limit).all()

    return AgentListResponse(agents=agents, total=total)


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: UUID, db: Session = Depends(get_db)):
    """Get a single agent by ID."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.put("/{agent_id}", response_model=AgentResponse)
def update_agent(agent_id: UUID, agent_update: AgentUpdate, db: Session = Depends(get_db)):
    """Update an existing agent."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    update_data = agent_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agent, field, value)

    db.commit()
    db.refresh(agent)
    return agent


@router.delete("/{agent_id}")
def delete_agent(agent_id: UUID, db: Session = Depends(get_db)):
    """Delete an agent."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    db.delete(agent)
    db.commit()
    return {"message": "Agent deleted successfully"}
