from langgraph.prebuilt import create_react_agent
from langgraph_supervisor import create_supervisor
from langgraph_engine.agent_factory import create_llm, sanitize_name
from langgraph_engine.memory import get_memory_saver
from tools import get_tools_by_names


async def build_hierarchy_graph(workflow_config: dict, agents_data: dict, conversation_id: str, conversation_context: list = None):
    """
    Build an orchestrator-worker (hierarchical) graph.
    A supervisor agent dynamically decides which worker agents to call.
    Workers report back to supervisor.
    """
    nodes = workflow_config.get("nodes", [])
    edges = workflow_config.get("edges", [])

    supervisor_node = None
    worker_nodes = []

    for node in nodes:
        role = node.get("role", "")
        if role in ["supervisor", "orchestrator"]:
            supervisor_node = node
        elif node.get("type") == "agent":
            worker_nodes.append(node)

    if not supervisor_node:
        root_node_id = workflow_config.get("root_node")
        if root_node_id:
            supervisor_node = next((n for n in nodes if n["id"] == root_node_id), None)

    if not supervisor_node:
        for edge in edges:
            if edge["source"] == "start":
                supervisor_node = next((n for n in nodes if n["id"] == edge["target"]), None)
                break

    if not supervisor_node:
        raise ValueError("Hierarchy workflow requires a supervisor node")

    supervisor_edges = [e for e in edges if e["source"] == supervisor_node["id"]]
    worker_nodes = []
    for edge in supervisor_edges:
        if edge["target"] in ["end", "start"]:
            continue
        worker = next((n for n in nodes if n["id"] == edge["target"]), None)
        if worker and worker.get("type") == "agent":
            worker_nodes.append(worker)

    if len(worker_nodes) < 1:
        raise ValueError("Hierarchy workflow requires at least 1 worker agent")

    supervisor_agent_id = supervisor_node.get("agent_id")
    supervisor_data = agents_data.get(supervisor_agent_id, {})

    supervisor_llm = create_llm(
        supervisor_data.get("llm_model", "us.anthropic.claude-sonnet-4-6"),
        supervisor_data.get("temperature", 0.0),
        supervisor_data.get("max_tokens", 4096),
    )

    worker_agents = []
    worker_descriptions = []

    for worker_node in worker_nodes:
        worker_agent_id = worker_node.get("agent_id")
        worker_data = agents_data.get(worker_agent_id, {})
        worker_name = sanitize_name(worker_node.get("agent_name", "worker"))

        worker_llm = create_llm(
            worker_data.get("llm_model", "us.anthropic.claude-sonnet-4-6"),
            worker_data.get("temperature", 0.7),
            worker_data.get("max_tokens", 4096),
        )

        tools = get_tools_by_names(worker_data.get("tools", []))
        system_prompt = worker_data.get("system_prompt", "You are a helpful assistant.")

        worker_agent = create_react_agent(
            model=worker_llm,
            tools=tools,
            name=worker_name,
            prompt=system_prompt,
        )

        worker_agents.append(worker_agent)
        description = worker_data.get("description", f"Agent: {worker_name}")
        worker_descriptions.append(f"- {worker_name}: {description}")

    supervisor_system_prompt = supervisor_data.get("system_prompt", "")
    if not supervisor_system_prompt:
        worker_list = "\n".join(worker_descriptions)
        supervisor_system_prompt = f"""You are a team supervisor managing specialized agents.

Your team members:
{worker_list}

Your job is to:
- Analyze the user's request
- Delegate tasks to the appropriate agent(s)
- Combine results if multiple agents are needed
- Provide a clear, helpful final response

Always delegate to the most appropriate agent. Do not try to answer questions yourself if an agent can handle it better."""

    workflow = create_supervisor(
        agents=worker_agents,
        model=supervisor_llm,
        prompt=supervisor_system_prompt,
        output_mode="full_history",
    )

    checkpointer = get_memory_saver()
    graph = workflow.compile(checkpointer=checkpointer)

    return graph, {"configurable": {"thread_id": conversation_id}}
