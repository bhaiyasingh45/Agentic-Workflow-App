from langgraph_engine.sequence_builder import build_sequence_graph
from langgraph_engine.routing_builder import build_routing_graph
from langgraph_engine.parallel_builder import build_parallel_graph
from langgraph_engine.hierarchy_builder import build_hierarchy_graph
from langgraph_engine.evaluator_builder import build_evaluator_graph


async def build_graph(workflow_config: dict, agents_data: dict, conversation_id: str, conversation_context: list = None):
    """
    Main entry point for building LangGraph workflows.
    Detects workflow type and delegates to appropriate builder.

    Args:
        workflow_config: The graph_config from the workflow containing nodes, edges, settings
        agents_data: Dictionary mapping agent_id to agent configuration
        conversation_id: Unique ID for the conversation/thread
        conversation_context: List of previous conversation messages for short-term memory

    Returns:
        Tuple of (compiled_graph, config_dict)
    """
    workflow_type = workflow_config.get("workflow_type", "SEQUENCE")
    context = conversation_context or []

    if workflow_type == "SEQUENCE":
        return await build_sequence_graph(workflow_config, agents_data, conversation_id, context)

    elif workflow_type == "ROUTING":
        return await build_routing_graph(workflow_config, agents_data, conversation_id, context)

    elif workflow_type == "PARALLEL":
        return await build_parallel_graph(workflow_config, agents_data, conversation_id, context)

    elif workflow_type == "HIERARCHY":
        return await build_hierarchy_graph(workflow_config, agents_data, conversation_id, context)

    elif workflow_type == "EVALUATOR":
        return await build_evaluator_graph(workflow_config, agents_data, conversation_id, context)

    else:
        raise ValueError(f"Unknown workflow type: {workflow_type}")


def get_initial_state(user_input: str, conversation_context: list = None) -> dict:
    """Create initial state for graph invocation."""
    from langchain_core.messages import HumanMessage, AIMessage

    messages = []
    context = conversation_context or []

    for msg in context:
        if msg.get("role") == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg.get("role") == "assistant":
            messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=user_input))

    return {
        "messages": messages,
        "input": user_input,
        "output": None,
        "retries": 0,
        "feedback": "",
        "quality_passed": False,
        "parallel_results": [],
        "route_decision": "",
        "current_node": "",
        "remaining_steps": 10,
        "conversation_context": context,
    }
