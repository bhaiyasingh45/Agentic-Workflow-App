from langgraph.graph import StateGraph, START, END
from langgraph_engine.state import AgentState
from langgraph_engine.agent_factory import create_agent_node, sanitize_name
from langgraph_engine.memory import get_memory_saver


async def build_sequence_graph(workflow_config: dict, agents_data: dict, conversation_id: str, conversation_context: list = None):
    """
    Build a sequential (prompt chaining) graph.
    Agents run one after another, output of one becomes input of next.
    """
    nodes = workflow_config.get("nodes", [])
    edges = workflow_config.get("edges", [])

    agent_nodes = [n for n in nodes if n.get("type") == "agent"]

    if len(agent_nodes) < 2:
        raise ValueError("Sequence workflow requires at least 2 agents")

    edge_map = {}
    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        if source not in edge_map:
            edge_map[source] = []
        edge_map[source].append(target)

    ordered_nodes = []
    current = "start"

    while current != "end" and len(ordered_nodes) < len(agent_nodes) + 1:
        targets = edge_map.get(current, [])
        if not targets:
            break
        next_node = targets[0]
        if next_node != "end":
            node_config = next((n for n in agent_nodes if n["id"] == next_node), None)
            if node_config:
                ordered_nodes.append(node_config)
        current = next_node

    builder = StateGraph(AgentState)

    node_names = []
    for node_config in ordered_nodes:
        agent_id = node_config.get("agent_id")
        agent_data = agents_data.get(agent_id, {})
        node_name = sanitize_name(node_config.get("agent_name", f"agent_{len(node_names)}"))
        node_names.append(node_name)

        agent_node_func = create_agent_node(agent_data)
        builder.add_node(node_name, agent_node_func)

    builder.add_edge(START, node_names[0])

    for i in range(len(node_names) - 1):
        builder.add_edge(node_names[i], node_names[i + 1])

    builder.add_edge(node_names[-1], END)

    checkpointer = get_memory_saver()
    graph = builder.compile(checkpointer=checkpointer)

    return graph, {"configurable": {"thread_id": conversation_id}}
