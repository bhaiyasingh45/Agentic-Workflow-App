from langchain_core.tools import tool


@tool
def web_search(query: str) -> str:
    """Search the web for information on a given query."""
    return f"Search results for '{query}': This is simulated search result. In production, integrate with a real search API like Tavily, SerpAPI, or Brave Search."


@tool
def get_current_time() -> str:
    """Get the current date and time."""
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
