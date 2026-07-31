import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, JSON, Enum, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
import enum


class WorkflowType(str, enum.Enum):
    SEQUENCE = "SEQUENCE"
    ROUTING = "ROUTING"
    PARALLEL = "PARALLEL"
    HIERARCHY = "HIERARCHY"
    EVALUATOR = "EVALUATOR"


class ExecutionStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PAUSED = "PAUSED"


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    workflow_type = Column(Enum(WorkflowType), nullable=False)
    graph_config = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    executions = relationship("Execution", back_populates="workflow")


class Execution(Base):
    __tablename__ = "executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id"), nullable=False)
    conversation_id = Column(String(255), nullable=False)
    input_text = Column(Text, nullable=False)
    output_text = Column(Text, nullable=True)
    status = Column(Enum(ExecutionStatus), default=ExecutionStatus.PENDING)
    node_outputs = Column(JSON, default=dict)
    duration_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    workflow = relationship("Workflow", back_populates="executions")
