from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
from uuid import UUID
from models.workflow import WorkflowType, ExecutionStatus


class NodeConfig(BaseModel):
    id: str
    type: str
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None
    role: Optional[str] = None
    position: dict[str, float]


class EdgeConfig(BaseModel):
    id: str
    source: str
    target: str
    condition: Optional[str] = None


class WorkflowSettings(BaseModel):
    max_retries: int = 3
    evaluator_node_id: Optional[str] = None
    generator_node_id: Optional[str] = None
    quality_threshold_prompt: Optional[str] = None


class GraphConfig(BaseModel):
    workflow_type: WorkflowType
    root_node: Optional[str] = None
    nodes: list[NodeConfig]
    edges: list[EdgeConfig]
    settings: WorkflowSettings = Field(default_factory=WorkflowSettings)


class WorkflowBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    workflow_type: WorkflowType
    graph_config: GraphConfig


class WorkflowCreate(WorkflowBase):
    pass


class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    workflow_type: Optional[WorkflowType] = None
    graph_config: Optional[GraphConfig] = None


class WorkflowResponse(WorkflowBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkflowListResponse(BaseModel):
    workflows: list[WorkflowResponse]
    total: int


class ConversationMessage(BaseModel):
    role: str
    content: str


class RunRequest(BaseModel):
    input: str = Field(..., min_length=1)
    conversation_id: Optional[str] = None
    session_id: Optional[str] = None
    conversation_context: Optional[list[ConversationMessage]] = None


class NodeOutput(BaseModel):
    node: str
    output: str
    status: str
    timestamp: datetime


class ExecutionResponse(BaseModel):
    id: UUID
    workflow_id: UUID
    conversation_id: str
    input_text: str
    output_text: Optional[str]
    status: ExecutionStatus
    node_outputs: dict[str, Any]
    duration_ms: Optional[int]
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True
