from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from database import get_db
from models.workflow import Workflow, WorkflowType
from schemas.workflow_schema import (
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowResponse,
    WorkflowListResponse,
)

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


@router.post("", response_model=WorkflowResponse)
def create_workflow(workflow: WorkflowCreate, db: Session = Depends(get_db)):
    """Create a new workflow."""
    db_workflow = Workflow(
        name=workflow.name,
        description=workflow.description,
        workflow_type=workflow.workflow_type,
        graph_config=workflow.graph_config.model_dump(),
    )
    db.add(db_workflow)
    db.commit()
    db.refresh(db_workflow)
    return db_workflow


@router.get("", response_model=WorkflowListResponse)
def list_workflows(
    workflow_type: Optional[WorkflowType] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List all workflows with optional filtering."""
    query = db.query(Workflow)

    if workflow_type:
        query = query.filter(Workflow.workflow_type == workflow_type)

    if search:
        query = query.filter(Workflow.name.ilike(f"%{search}%"))

    total = query.count()
    workflows = query.order_by(Workflow.updated_at.desc()).offset(skip).limit(limit).all()

    return WorkflowListResponse(workflows=workflows, total=total)


@router.get("/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(workflow_id: UUID, db: Session = Depends(get_db)):
    """Get a single workflow by ID."""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@router.put("/{workflow_id}", response_model=WorkflowResponse)
def update_workflow(
    workflow_id: UUID,
    workflow_update: WorkflowUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing workflow."""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    update_data = workflow_update.model_dump(exclude_unset=True)

    if "graph_config" in update_data and update_data["graph_config"]:
        update_data["graph_config"] = update_data["graph_config"].model_dump() if hasattr(update_data["graph_config"], "model_dump") else update_data["graph_config"]

    for field, value in update_data.items():
        setattr(workflow, field, value)

    db.commit()
    db.refresh(workflow)
    return workflow


@router.delete("/{workflow_id}")
def delete_workflow(workflow_id: UUID, db: Session = Depends(get_db)):
    """Delete a workflow."""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    db.delete(workflow)
    db.commit()
    return {"message": "Workflow deleted successfully"}
