# AI Agent Workflow Builder

A full-stack application for visually creating, connecting, and running AI agents using different workflow patterns inspired by LangGraph.

## Features

- **Agent Management**: Create and manage AI agents with custom system prompts, LLM configurations, and tools
- **Visual Workflow Builder**: Drag-and-drop canvas powered by React Flow
- **5 Workflow Patterns**:
  - Prompt Chaining (Sequential)
  - Routing
  - Parallelisation
  - Orchestrator-Worker (Hierarchical)
  - Evaluator-Optimiser
- **Real-time Streaming**: See execution output as it happens
- **Persistence**: Save and load workflows

## Tech Stack

### Backend
- FastAPI (Python)
- PostgreSQL with SQLAlchemy
- LangGraph + LangChain
- AWS Bedrock (Claude models)

### Frontend
- React + TypeScript
- Tailwind CSS
- React Flow (@xyflow/react)
- Zustand (state management)
- Axios

## Project Structure

```
agent-workflow-builder/
├── backend/
│   ├── main.py                 # FastAPI entry point
│   ├── database.py             # SQLAlchemy setup
│   ├── models/                 # Database models
│   ├── schemas/                # Pydantic schemas
│   ├── routers/                # API endpoints
│   ├── langgraph_engine/       # Workflow builders
│   │   ├── sequence_builder.py
│   │   ├── routing_builder.py
│   │   ├── parallel_builder.py
│   │   ├── hierarchy_builder.py
│   │   └── evaluator_builder.py
│   └── tools/                  # Available tools
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── agents/         # Agent CRUD components
    │   │   ├── workflows/      # Workflow management
    │   │   ├── canvas/         # React Flow canvas
    │   │   └── common/         # Shared UI components
    │   ├── pages/
    │   ├── stores/             # Zustand stores
    │   ├── api/                # API client
    │   └── types/              # TypeScript types
    └── package.json
```

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL
- AWS credentials configured for Bedrock

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file and configure
cp .env.example .env
# Edit .env with your database URL and AWS credentials

# Run the server
uvicorn main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

## API Endpoints

### Agents
- `POST /api/agents` - Create agent
- `GET /api/agents` - List agents
- `GET /api/agents/{id}` - Get agent
- `PUT /api/agents/{id}` - Update agent
- `DELETE /api/agents/{id}` - Delete agent

### Workflows
- `POST /api/workflows` - Create workflow
- `GET /api/workflows` - List workflows
- `GET /api/workflows/{id}` - Get workflow
- `PUT /api/workflows/{id}` - Update workflow
- `DELETE /api/workflows/{id}` - Delete workflow
- `POST /api/workflows/{id}/run` - Run workflow (SSE stream)

### Executions
- `GET /api/workflows/{id}/executions` - List executions
- `GET /api/executions/{id}` - Get execution details

## LLM Configuration

The application uses AWS Bedrock with Claude models:

```python
from langchain_aws import ChatBedrockConverse

llm = ChatBedrockConverse(
    model="us.anthropic.claude-sonnet-4-6",
    temperature=0.7,
)
```

## Workflow Types

### 1. Sequence (Prompt Chaining)
Agents run one after another, output of one becomes input of next.

### 2. Routing
A router agent decides which downstream agent to call based on input.

### 3. Parallelisation
Multiple agents run simultaneously on the same input, results aggregated.

### 4. Hierarchy (Orchestrator-Worker)
A supervisor agent dynamically delegates to worker agents.

### 5. Evaluator-Optimiser
Generator produces output, evaluator scores it, loops until quality threshold met.

## License

MIT
