from typing import TypedDict, Annotated, Union
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
import operator


class AgentState(TypedDict):
    """State schema for all workflow types."""
    messages: Annotated[list[BaseMessage], add_messages]
    input: str
    output: Union[str, None]
    retries: int
    feedback: str
    quality_passed: bool
    parallel_results: Annotated[list[str], operator.add]
    route_decision: str
    current_node: str
    remaining_steps: int
    conversation_context: list[dict]
