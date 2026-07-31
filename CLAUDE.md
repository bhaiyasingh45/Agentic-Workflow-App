# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project does

A visual no-code builder for multi-agent AI workflows. Users drag agents onto a canvas, connect them into a graph topology, and run the workflow against a chat input. The backend compiles the canvas into a LangGraph execution graph and streams results back via Server-Sent Events.

## Development commands

**Backend** (Python 3.10, FastAPI)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Requires a running PostgreSQL instance. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` and AWS credentials before starting.

**Frontend** (Node/Vite)
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + bundle
npm run lint
```

There is no test suite yet.

## Architecture

### Request lifecycle

1. User builds a workflow on the React Flow canvas → `canvasStore.getGraphConfig()` serialises nodes/edges into a `GraphConfig` JSON object.
2. That JSON is `POST /api/workflows` and stored in the `graph_config` JSONB column of the `workflows` table.
3. `POST /api/workflows/{id}/run` triggers `build_graph()` which compiles the stored `graph_config` into a runnable LangGraph graph and streams node-by-node output as SSE events.

### Backend (`backend/`)

| Layer | Key files |
|---|---|
| API routers | `routers/agents.py`, `routers/workflows.py`, `routers/execution.py`, `routers/chat.py` |
| Graph compilation | `langgraph_engine/graph_builder.py` → dispatches to one of five builder modules |
| Agent creation | `langgraph_engine/agent_factory.py` — wraps AWS Bedrock via `ChatBedrockConverse` |
| Shared state | `langgraph_engine/state.py` — single `AgentState` TypedDict used across all workflow types |
| Memory | `langgraph_engine/memory.py` — singleton `InMemorySaver`; **not persisted across restarts** |
| DB models | `models/workflow.py` (`Workflow`, `Execution`), `models/agent.py`, `models/chat.py` |
| Config | `config.py` — pydantic-settings, reads from `backend/.env` |

**Workflow types** — `graph_builder.py` reads `graph_config.workflow_type` and delegates to:
- `sequence_builder` — linear chain of agents, each receives the previous output
- `routing_builder` — a router agent inspects input and sets `route_decision`; conditional edges branch to the matching agent
- `parallel_builder` — fork/join: agents run concurrently, results accumulated in `AgentState.parallel_results`
- `hierarchy_builder` — supervisor agent with `create_react_agent` dispatches to worker sub-agents
- `evaluator_builder` — generator → evaluator loop; retries up to `settings.max_retries` if `quality_passed` is False

**Agent factory** — every agent, regardless of workflow type, is one of:
- `create_agent_node` — plain LLM call with prompt templating (sequence/routing/parallel)
- `create_react_agent_node` — LangGraph `create_react_agent` with tool access (hierarchy workers/supervisors)
- `create_router_node` — LLM that outputs only a route name
- `create_evaluator_node` / `create_generator_with_feedback_node` — paired for evaluator loop

All LLMs are **AWS Bedrock** only (`langchain_aws.ChatBedrockConverse`). AWS credentials must be available in the environment.

**Execution streaming** — `routers/execution.py:stream_execution` uses `graph.astream()` and yields `data: {...}\n\n` SSE events. Special sentinel nodes `__complete__` and `__error__` signal the frontend that streaming is done.

### Frontend (`frontend/src/`)

| Directory | Role |
|---|---|
| `stores/canvasStore.ts` | React Flow nodes/edges + serialisation to/from `GraphConfig` |
| `stores/workflowStore.ts` | CRUD state for saved workflows + selected workflow |
| `stores/agentStore.ts` | CRUD state for the agent library |
| `components/canvas/` | React Flow canvas, custom node types, edge, agent library sidebar |
| `components/workflows/` | Run panel (SSE consumer), chat panel, toolbar, sidebar |
| `pages/` | `WorkflowsPage`, `AgentsPage`, `ChatPage` |
| `api/` | Thin axios wrappers; `api/client.ts` sets `baseURL` to `http://localhost:8000` |
| `types/index.ts` | Shared TypeScript interfaces mirroring backend schemas |

**Canvas ↔ backend data contract** — `canvasStore.getGraphConfig()` produces the `GraphConfig` that goes to the backend. `canvasStore.loadFromConfig()` reconstructs React Flow nodes from a saved `GraphConfig`. When adding new node types or workflow settings, both functions must be updated together with the relevant `*_builder.py`.

**Custom node types** registered in `WorkflowCanvas.tsx`: `startNode`, `endNode`, `agentNode`, `forkNode`, `joinNode`. Node `role` field (`supervisor`, `worker`, `router`, `generator`, `evaluator`) determines how the backend builder wires the node into the graph.

**SSE consumption** — `RunPanel.tsx` opens a `fetch` stream to `/api/workflows/{id}/run`, parses `data:` lines, and updates per-node output state until it receives `node: "__complete__"` or `node: "__error__"`.
