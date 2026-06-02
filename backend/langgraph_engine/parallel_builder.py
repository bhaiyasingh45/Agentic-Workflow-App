from langgraph.graph import StateGraph, START, END
from langgraph.constants import Send
from langgraph_engine.state import AgentState
from langgraph_engine.agent_factory import create_agent_node, sanitize_name
from langgraph_engine.memory import get_memory_saver
from langchain_core.messages import AIMessage


async def build_parallel_graph(workflow_config: dict, agents_data: dict, conversation_id: str, conversation_context: list = None):
    """
    Build a parallelization graph.
    Multiple agents run simultaneously on the same input.
    Results are aggregated by a join node.
    """
    nodes = workflow_config.get("nodes", [])
    edges = workflow_config.get("edges", [])

    fork_node = next((n for n in nodes if n.get("type") == "fork"), None)
    join_node = next((n for n in nodes if n.get("type") == "join"), None)

    parallel_nodes = []
    if fork_node:
        fork_edges = [e for e in edges if e["source"] == fork_node["id"]]
        for edge in fork_edges:
            target = next((n for n in nodes if n["id"] == edge["target"]), None)
            if target and target.get("type") == "agent":
                parallel_nodes.append(target)
    else:
        for edge in edges:
            if edge["source"] == "start":
                target = next((n for n in nodes if n["id"] == edge["target"]), None)
                if target and target.get("type") == "agent":
                    parallel_nodes.append(target)

    if len(parallel_nodes) < 2:
        raise ValueError("Parallel workflow requires at least 2 parallel agents")

    aggregator_node = None
    if join_node:
        join_edges = [e for e in edges if e["source"] == join_node["id"]]
        for edge in join_edges:
            if edge["target"] != "end":
                target = next((n for n in nodes if n["id"] == edge["target"]), None)
                if target and target.get("type") == "agent":
                    aggregator_node = target
                    break

    builder = StateGraph(AgentState)

    parallel_node_names = []
    for i, node_config in enumerate(parallel_nodes):
        agent_id = node_config.get("agent_id")
        agent_data = agents_data.get(agent_id, {})
        node_name = sanitize_name(node_config.get("agent_name", f"parallel_{i}"))
        parallel_node_names.append(node_name)

        def make_parallel_node(agent_data_copy, name_copy):
            base_node = create_agent_node(agent_data_copy)

            def parallel_agent_node(state: AgentState) -> dict:
                result = base_node(state)
                output = result.get("output", "")
                return {
                    "parallel_results": [f"[{name_copy}]: {output}"],
                    "messages": result.get("messages", []),
                    "current_node": name_copy,
                }
            return parallel_agent_node

        builder.add_node(node_name, make_parallel_node(agent_data, node_name))

    def fork_node_func(state: AgentState) -> list[Send]:
        return [Send(node_name, state) for node_name in parallel_node_names]

    builder.add_node("fork", fork_node_func)

    def join_node_func(state: AgentState) -> dict:
        results = state.get("parallel_results", [])
        combined = "\n\n".join(results)
        return {
            "output": combined,
            "current_node": "join",
        }

    builder.add_node("join", join_node_func)

    if aggregator_node:
        agent_id = aggregator_node.get("agent_id")
        agent_data = agents_data.get(agent_id, {})
        aggregator_name = sanitize_name(aggregator_node.get("agent_name", "aggregator"))

        def aggregator_func(state: AgentState) -> dict:
            combined_results = state.get("output", "")
            original_input = state.get("input", "")

            system_prompt = agent_data.get("system_prompt", "You are a synthesizer agent.")
            from langgraph_engine.agent_factory import create_llm

            llm = create_llm(
                agent_data.get("llm_model", "us.anthropic.claude-sonnet-4-6"),
                agent_data.get("temperature", 0.7),
                agent_data.get("max_tokens", 4096),
            )

            prompt = f"""{system_prompt}

Original request: {original_input}

Results from parallel agents:
{combined_results}

Please synthesize these results into a coherent response."""

            response = llm.invoke([{"role": "user", "content": prompt}])

            return {
                "messages": [AIMessage(content=response.content, name=aggregator_name)],
                "output": response.content,
                "current_node": aggregator_name,
            }

        builder.add_node(aggregator_name, aggregator_func)

    builder.add_edge(START, "fork")

    for node_name in parallel_node_names:
        builder.add_edge(node_name, "join")

    if aggregator_node:
        aggregator_name = sanitize_name(aggregator_node.get("agent_name", "aggregator"))
        builder.add_edge("join", aggregator_name)
        builder.add_edge(aggregator_name, END)
    else:
        builder.add_edge("join", END)

    checkpointer = get_memory_saver()
    graph = builder.compile(checkpointer=checkpointer)

    return graph, {"configurable": {"thread_id": conversation_id}}
