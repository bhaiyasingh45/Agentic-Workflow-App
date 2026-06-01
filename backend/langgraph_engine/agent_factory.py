from langchain_aws import ChatBedrockConverse
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.prebuilt import create_react_agent
from tools import get_tools_by_names
from langgraph_engine.state import AgentState
import re


def sanitize_name(name: str) -> str:
    """Sanitize agent name for LangGraph node naming."""
    sanitized = re.sub(r"[^a-zA-Z0-9_]", "_", name)
    sanitized = re.sub(r"_+", "_", sanitized)
    return sanitized.strip("_").lower()


def create_llm(model: str, temperature: float, max_tokens: int) -> ChatBedrockConverse:
    """Create a Bedrock LLM instance."""
    return ChatBedrockConverse(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
    )


def create_react_agent_node(
    agent_config: dict,
    llm: ChatBedrockConverse = None
):
    """Create a ReAct agent with tools."""
    if llm is None:
        llm = create_llm(
            agent_config.get("llm_model", "us.anthropic.claude-sonnet-4-6"),
            agent_config.get("temperature", 0.7),
            agent_config.get("max_tokens", 4096),
        )

    tools = get_tools_by_names(agent_config.get("tools", []))
    name = sanitize_name(agent_config.get("name", "agent"))
    system_prompt = agent_config.get("system_prompt", "You are a helpful assistant.")

    return create_react_agent(
        model=llm,
        tools=tools,
        name=name,
        prompt=system_prompt,
    )


def create_agent_node(agent_config: dict):
    """Create a simple agent node function for StateGraph."""
    llm = create_llm(
        agent_config.get("llm_model", "us.anthropic.claude-sonnet-4-6"),
        agent_config.get("temperature", 0.7),
        agent_config.get("max_tokens", 4096),
    )
    system_prompt = agent_config.get("system_prompt", "You are a helpful assistant.")
    agent_name = agent_config.get("name", "agent")

    def agent_node(state: AgentState) -> dict:
        user_input = state.get("input", "")
        previous_output = state.get("output", "")
        conversation_context = state.get("conversation_context", [])
        feedback = state.get("feedback", "")
        retries = state.get("retries", 0)

        context_str = ""
        if conversation_context:
            context_lines = []
            for msg in conversation_context:
                role = "User" if msg.get("role") == "user" else "Assistant"
                context_lines.append(f"{role}: {msg.get('content', '')}")
            context_str = "\n".join(context_lines)

        # Check if this is a retry after rejection (feedback exists)
        if feedback and retries > 0:
            prompt = f"""{system_prompt}

{"Previous conversation (for context):" + chr(10) + context_str + chr(10) if context_str else ""}
Original request: {user_input}

Your previous output was rejected. Here's the feedback:
{feedback}

Previous output that was rejected:
{previous_output}

Please improve your response based on the feedback."""
        elif previous_output:
            prompt = f"""{system_prompt}

{"Previous conversation (for context):" + chr(10) + context_str + chr(10) if context_str else ""}
Previous context/output from earlier step:
{previous_output}

User's original request: {user_input}

Continue processing based on the above context."""
        else:
            prompt = f"""{system_prompt}

{"Previous conversation (for context):" + chr(10) + context_str + chr(10) if context_str else ""}User request: {user_input}"""

        response = llm.invoke([HumanMessage(content=prompt)])

        return {
            "messages": [AIMessage(content=response.content, name=agent_name)],
            "output": response.content,
            "current_node": agent_name,
        }

    return agent_node


def create_router_node(agent_config: dict, routes: list[str]):
    """Create a router agent that decides which route to take."""
    llm = create_llm(
        agent_config.get("llm_model", "us.anthropic.claude-sonnet-4-6"),
        agent_config.get("temperature", 0.0),
        agent_config.get("max_tokens", 1024),
    )
    system_prompt = agent_config.get("system_prompt", "You are a routing assistant.")
    route_options = ", ".join(routes)

    def router_node(state: AgentState) -> dict:
        user_input = state.get("input", "")

        routing_prompt = f"""{system_prompt}

Based on the user's input, decide which route to take.
Available routes: {route_options}

User input: {user_input}

Respond with ONLY the route name, nothing else."""

        response = llm.invoke([HumanMessage(content=routing_prompt)])
        route_decision = response.content.strip().lower()

        valid_routes = [r.lower() for r in routes]
        if route_decision not in valid_routes:
            route_decision = routes[0].lower() if routes else "default"

        return {
            "route_decision": route_decision,
            "current_node": "router",
        }

    return router_node


def create_evaluator_node(agent_config: dict, quality_threshold_prompt: str):
    """Create an evaluator agent that scores output quality."""
    llm = create_llm(
        agent_config.get("llm_model", "us.anthropic.claude-sonnet-4-6"),
        agent_config.get("temperature", 0.0),
        agent_config.get("max_tokens", 256),
    )

    def evaluator_node(state: AgentState) -> dict:
        output = state.get("output", "")
        current_retries = state.get("retries", 0)

        eval_prompt = f"""You are a quality evaluator. Evaluate this output against these criteria:

Quality Criteria: {quality_threshold_prompt}

Output to evaluate:
{output}

IMPORTANT: You MUST respond with ONLY one word - either "ACCEPT" or "REJECT".
Do not include any explanation, report, or additional text.
Just respond with the single word: ACCEPT or REJECT"""

        response = llm.invoke([HumanMessage(content=eval_prompt)])
        evaluation = response.content.strip().upper()

        # Check for acceptance - look for ACCEPT anywhere or common approval indicators
        is_accepted = (
            "ACCEPT" in evaluation or
            "APPROVED" in evaluation or
            "PASS" in evaluation or
            evaluation.startswith("YES")
        )

        if is_accepted:
            return {
                "quality_passed": True,
                "feedback": "",
                "current_node": "evaluator",
            }
        else:
            return {
                "quality_passed": False,
                "feedback": "Output needs improvement",
                "retries": current_retries + 1,
                "current_node": "evaluator",
            }

    return evaluator_node


def create_generator_with_feedback_node(agent_config: dict):
    """Create a generator agent that uses feedback for improvement."""
    llm = create_llm(
        agent_config.get("llm_model", "us.anthropic.claude-sonnet-4-6"),
        agent_config.get("temperature", 0.7),
        agent_config.get("max_tokens", 4096),
    )
    system_prompt = agent_config.get("system_prompt", "You are a content generator.")
    agent_name = agent_config.get("name", "generator")

    def generator_node(state: AgentState) -> dict:
        user_input = state.get("input", "")
        feedback = state.get("feedback", "")
        previous_output = state.get("output", "")

        if feedback and previous_output:
            prompt = f"""{system_prompt}

Original request: {user_input}

Your previous attempt:
{previous_output}

Feedback for improvement:
{feedback}

Please generate an improved version based on the feedback."""
        else:
            prompt = f"""{system_prompt}

Request: {user_input}

Generate high-quality content based on this request."""

        response = llm.invoke([HumanMessage(content=prompt)])

        return {
            "messages": [AIMessage(content=response.content, name=agent_name)],
            "output": response.content,
            "current_node": agent_name,
        }

    return generator_node
