from typing import Literal
from langgraph.graph import StateGraph, START, END
from langgraph_engine.state import AgentState
from langgraph_engine.agent_factory import create_agent_node, create_router_node, sanitize_name
from langgraph_engine.memory import get_memory_saver


async def build_routing_graph(workflow_config: dict, agents_data: dict, conversation_id: str, conversation_context: list = None):
    """
    Build a routing graph.
    A router agent decides which downstream agent to call based on input.
    Only ONE path is taken per execution.
    """
    nodes = workflow_config.get("nodes", [])
    edges = workflow_config.get("edges", [])

    router_node = None
    branch_nodes = []

    for node in nodes:
        if node.get("role") == "router" or node.get("type") == "router":
            router_node = node
        elif node.get("type") == "agent":
            branch_nodes.append(node)

    if not router_node:
        for edge in edges:
            if edge["source"] == "start":
                first_node_id = edge["target"]
                router_node = next((n for n in nodes if n["id"] == first_node_id), None)
                break

    if not router_node:
        raise ValueError("Routing workflow requires a router node")

    router_edges = [e for e in edges if e["source"] == router_node["id"]]
    branch_nodes = []
    route_conditions = {}

    for edge in router_edges:
        if edge["target"] == "end":
            continue
        target_node = next((n for n in nodes if n["id"] == edge["target"]), None)
        if target_node:
            branch_nodes.append(target_node)
            condition = edge.get("condition", sanitize_name(target_node.get("agent_name", "default")))
            route_conditions[target_node["id"]] = condition

    builder = StateGraph(AgentState)

    router_agent_id = router_node.get("agent_id")
    router_agent_data = agents_data.get(router_agent_id, {})

    route_names = [sanitize_name(n.get("agent_name", f"route_{i}")) for i, n in enumerate(branch_nodes)]

    router_func = create_router_node(router_agent_data, route_names)
    builder.add_node("router", router_func)

    node_id_to_name = {}
    for i, node_config in enumerate(branch_nodes):
        agent_id = node_config.get("agent_id")
        agent_data = agents_data.get(agent_id, {})
        node_name = route_names[i]
        node_id_to_name[node_config["id"]] = node_name

        agent_node_func = create_agent_node(agent_data)
        builder.add_node(node_name, agent_node_func)

    builder.add_edge(START, "router")

    def route_decision(state: AgentState) -> str:
        decision = state.get("route_decision", "").lower()
        for name in route_names:
            if name.lower() == decision:
                return name
        return route_names[0] if route_names else END

    route_map = {name: name for name in route_names}
    route_map["__end__"] = END

    builder.add_conditional_edges(
        "router",
        route_decision,
        route_map
    )

    for node_name in route_names:
        builder.add_edge(node_name, END)

    checkpointer = get_memory_saver()
    graph = builder.compile(checkpointer=checkpointer)

    return graph, {"configurable": {"thread_id": conversation_id}}
