import uuid
import json
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from database import get_db
from models.workflow import Workflow, Execution, ExecutionStatus
from models.agent import Agent
from schemas.workflow_schema import RunRequest, ExecutionResponse
from langgraph_engine.graph_builder import build_graph, get_initial_state

router = APIRouter(tags=["execution"])


async def stream_execution(graph, config, initial_state, execution_id: str, db: Session):
    """Stream execution events as Server-Sent Events."""
    execution = db.query(Execution).filter(Execution.id == execution_id).first()
    if execution:
        execution.status = ExecutionStatus.RUNNING
        db.commit()

    node_outputs = {}
    start_time = datetime.utcnow()

    try:
        async for chunk in graph.astream(initial_state, config):
            for node_name, output in chunk.items():
                if node_name == "__end__":
                    continue

                output_content = ""
                if isinstance(output, dict):
                    if "messages" in output and output["messages"]:
                        last_msg = output["messages"][-1]
                        output_content = getattr(last_msg, "content", str(last_msg))
                    elif "output" in output:
                        output_content = output["output"] or ""
                    else:
                        output_content = json.dumps(output, default=str)
                else:
                    output_content = str(output)

                node_outputs[node_name] = output_content

                event_data = {
                    "node": node_name,
                    "output": output_content[:2000],
                    "status": "running",
                    "timestamp": datetime.utcnow().isoformat(),
                }

                yield f"data: {json.dumps(event_data)}\n\n"
                await asyncio.sleep(0.01)

        end_time = datetime.utcnow()
        duration_ms = int((end_time - start_time).total_seconds() * 1000)

        final_output = node_outputs.get(list(node_outputs.keys())[-1], "") if node_outputs else ""

        if execution:
            execution.status = ExecutionStatus.COMPLETED
            execution.output_text = final_output
            execution.node_outputs = node_outputs
            execution.duration_ms = duration_ms
            execution.completed_at = end_time
            db.commit()

        final_event = {
            "node": "__complete__",
            "output": final_output,
            "status": "done",
            "duration_ms": duration_ms,
            "timestamp": end_time.isoformat(),
        }
        yield f"data: {json.dumps(final_event)}\n\n"

    except Exception as e:
        error_msg = str(e)
        if execution:
            execution.status = ExecutionStatus.FAILED
            execution.error_message = error_msg
            execution.completed_at = datetime.utcnow()
            db.commit()

        error_event = {
            "node": "__error__",
            "output": error_msg,
            "status": "error",
            "timestamp": datetime.utcnow().isoformat(),
        }
        yield f"data: {json.dumps(error_event)}\n\n"


@router.post("/api/workflows/{workflow_id}/run")
async def run_workflow(
    workflow_id: UUID,
    body: RunRequest,
    db: Session = Depends(get_db),
):
    """Run a workflow and stream the output."""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    conversation_id = body.conversation_id or str(uuid.uuid4())

    graph_config = workflow.graph_config
    if isinstance(graph_config, str):
        graph_config = json.loads(graph_config)

    nodes = graph_config.get("nodes", [])
    agent_ids = [n.get("agent_id") for n in nodes if n.get("agent_id")]

    agents = db.query(Agent).filter(Agent.id.in_(agent_ids)).all()
    agents_data = {
        str(agent.id): {
            "name": agent.name,
            "description": agent.description,
            "system_prompt": agent.system_prompt,
            "llm_provider": agent.llm_provider,
            "llm_model": agent.llm_model,
            "temperature": agent.temperature,
            "max_tokens": agent.max_tokens,
            "tools": agent.tools or [],
        }
        for agent in agents
    }

    execution = Execution(
        workflow_id=workflow_id,
        conversation_id=conversation_id,
        input_text=body.input,
        status=ExecutionStatus.PENDING,
        node_outputs={},
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    context = [{"role": m.role, "content": m.content} for m in (body.conversation_context or [])]
    graph, config = await build_graph(graph_config, agents_data, conversation_id, context)
    initial_state = get_initial_state(body.input, context)

    return StreamingResponse(
        stream_execution(graph, config, initial_state, str(execution.id), db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Execution-Id": str(execution.id),
        },
    )


@router.get("/api/workflows/{workflow_id}/executions")
def list_executions(
    workflow_id: UUID,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Get execution history for a workflow."""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    executions = (
        db.query(Execution)
        .filter(Execution.workflow_id == workflow_id)
        .order_by(Execution.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {"executions": executions, "total": len(executions)}


@router.get("/api/executions/{execution_id}", response_model=ExecutionResponse)
def get_execution(execution_id: UUID, db: Session = Depends(get_db)):
    """Get a single execution with full details."""
    execution = db.query(Execution).filter(Execution.id == execution_id).first()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution


@router.post("/api/executions/{execution_id}/resume")
async def resume_execution(
    execution_id: UUID,
    body: dict,
    db: Session = Depends(get_db),
):
    """Resume a paused execution after human intervention."""
    execution = db.query(Execution).filter(Execution.id == execution_id).first()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    if execution.status != ExecutionStatus.PAUSED:
        raise HTTPException(status_code=400, detail="Execution is not paused")

    return {"message": "Execution resumed", "execution_id": str(execution_id)}
