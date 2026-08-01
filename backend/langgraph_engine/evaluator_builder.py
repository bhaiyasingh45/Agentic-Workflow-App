from langgraph.graph import StateGraph, START, END
from langgraph_engine.state import AgentState
from langgraph_engine.agent_factory import create_llm, sanitize_name
from langgraph_engine.memory import get_memory_saver
from langchain_core.messages import HumanMessage, AIMessage


async def build_evaluator_graph(workflow_config: dict, agents_data: dict, conversation_id: str, conversation_context: list = None):
    """
    Build an evaluator-optimizer graph based on edge conditions.

    Edge conditions control routing:
    - Edge with condition "REJECT" from evaluator to generator = loop back on rejection
    - Edge with condition "ACCEPT" from evaluator to END = finish on acceptance
    - No condition = unconditional edge

    The evaluator agent's response is checked for these keywords to determine routing.
    """
    nodes = workflow_config.get("nodes", [])
    edges = workflow_config.get("edges", [])
    settings = workflow_config.get("settings", {})

    max_retries = settings.get("max_retries", 3)

    builder = StateGraph(AgentState)

    node_id_to_name = {}
    node_id_to_data = {}

    # Create all agent nodes
    for node in nodes:
        if node.get("type") == "agent":
            agent_id = node.get("agent_id")
            agent_data = agents_data.get(agent_id, {})
            node_name = sanitize_name(node.get("agent_name", f"agent_{node['id']}"))
            node_id_to_name[node["id"]] = node_name
            node_id_to_data[node["id"]] = agent_data

            # Create agent node function
            def make_agent_node(config, name):
                llm = create_llm(
                    config.get("llm_model", "us.anthropic.claude-sonnet-4-6"),
                    config.get("temperature", 0.7),
                    config.get("max_tokens", 4096),
                )
                system_prompt = config.get("system_prompt", "You are a helpful assistant.")

                def agent_fn(state: AgentState) -> dict:
                    user_input = state.get("input", "")
                    previous_output = state.get("output", "")
                    feedback = state.get("feedback", "")
                    retries = state.get("retries", 0)
                    ctx = state.get("conversation_context", [])

                    context_str = ""
                    if ctx:
                        context_lines = [f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('content', '')}" for m in ctx]
                        context_str = "\n".join(context_lines)

                    # If there's feedback from a rejection, include it
                    if feedback and retries > 0:
                        prompt = f"""{system_prompt}

{f"Previous conversation:{chr(10)}{context_str}{chr(10)}" if context_str else ""}
Original request: {user_input}

Your previous output was REJECTED with this feedback:
{feedback}

Previous output:
{previous_output}

Please improve your response based on the feedback. This is retry {retries}."""
                    elif previous_output:
                        prompt = f"""{system_prompt}

{f"Previous conversation:{chr(10)}{context_str}{chr(10)}" if context_str else ""}
Previous output from earlier step:
{previous_output}

User's request: {user_input}

Continue based on the context above."""
                    else:
                        prompt = f"""{system_prompt}

{f"Previous conversation:{chr(10)}{context_str}{chr(10)}" if context_str else ""}User request: {user_input}"""

                    response = llm.invoke([HumanMessage(content=prompt)])

                    return {
                        "messages": [AIMessage(content=response.content, name=name)],
                        "output": response.content,
                        "current_node": name,
                    }

                return agent_fn

            builder.add_node(node_name, make_agent_node(agent_data, node_name))

    if len(node_id_to_name) < 1:
        raise ValueError("Evaluator workflow requires at least 1 agent")

    # Find nodes with conditional outgoing edges (these are evaluator nodes)
    conditional_sources = set()
    for edge in edges:
        if edge.get("condition"):
            conditional_sources.add(edge["source"])

    # Process edges
    processed_conditional_nodes = set()

    for edge in edges:
        source_id = edge["source"]
        target_id = edge["target"]

        # Handle START edges
        if source_id == "start":
            target_node = node_id_to_name.get(target_id)
            if target_node:
                builder.add_edge(START, target_node)
            continue

        # Skip if source is a conditional node (handled separately)
        if source_id in conditional_sources:
            continue

        # Handle regular edges
        source_node = node_id_to_name.get(source_id)
        if target_id == "end":
            if source_node:
                builder.add_edge(source_node, END)
        else:
            target_node = node_id_to_name.get(target_id)
            if source_node and target_node:
                builder.add_edge(source_node, target_node)

    # Handle conditional edges (evaluator pattern)
    for source_id in conditional_sources:
        if source_id in processed_conditional_nodes:
            continue
        processed_conditional_nodes.add(source_id)

        source_node = node_id_to_name.get(source_id)
        if not source_node:
            continue

        # Gather all edges from this conditional source
        source_edges = [e for e in edges if e["source"] == source_id]

        route_map = {}
        conditions = []

        for edge in source_edges:
            condition = (edge.get("condition") or "").strip().upper()
            target_id = edge["target"]

            if target_id == "end":
                key = condition if condition else "DEFAULT"
                route_map[key] = END
            else:
                target_node = node_id_to_name.get(target_id)
                if target_node:
                    key = condition if condition else "DEFAULT"
                    route_map[key] = target_node

            if condition:
                conditions.append(condition)

        if not route_map:
            continue

        # Create conditional routing function
        def make_condition_router(conds, mapping, max_retry):
            def route_fn(state: AgentState) -> str:
                output = state.get("output", "").upper()
                retries = state.get("retries", 0)

                # If max retries exceeded, go to ACCEPT path or first available
                if retries >= max_retry:
                    if "ACCEPT" in mapping:
                        return mapping["ACCEPT"]
                    return list(mapping.values())[0]

                # Check conditions in output
                for cond in conds:
                    if cond in output:
                        return mapping.get(cond, mapping.get("DEFAULT", list(mapping.values())[0]))

                # Default fallback
                return mapping.get("DEFAULT", list(mapping.values())[0])

            return route_fn

        # Wrapper to capture feedback when routing to rejection path
        def make_feedback_wrapper(original_node_fn, conditions_list):
            def wrapper_fn(state: AgentState) -> dict:
                result = original_node_fn(state)
                output = result.get("output", "")

                # Extract feedback if this is a rejection
                upper_output = output.upper()
                for cond in conditions_list:
                    if "REJECT" in cond and cond in upper_output:
                        # Extract feedback after REJECT keyword
                        feedback = output
                        if "REJECT" in output.upper():
                            idx = output.upper().find("REJECT")
                            feedback = output[idx:].strip()
                        result["feedback"] = feedback
                        result["retries"] = state.get("retries", 0) + 1
                        break

                return result
            return wrapper_fn

        # Wrap the evaluator node to extract feedback
        original_fn = builder.nodes.get(source_node)
        if original_fn:
            builder.nodes[source_node] = make_feedback_wrapper(original_fn, conditions)

        builder.add_conditional_edges(
            source_node,
            make_condition_router(conditions, route_map, max_retries),
            route_map
        )

    checkpointer = get_memory_saver()
    graph = builder.compile(checkpointer=checkpointer)

    return graph, {"configurable": {"thread_id": conversation_id}}
