from tools.web_search import web_search, get_current_time
from tools.calculator import add, subtract, multiply, divide, calculate
from tools.code_executor import execute_python
from tools.file_tools import read_file, write_file, list_directory

AVAILABLE_TOOLS = {
    "web_search": web_search,
    "get_current_time": get_current_time,
    "add": add,
    "subtract": subtract,
    "multiply": multiply,
    "divide": divide,
    "calculate": calculate,
    "code_executor": execute_python,
    "file_reader": read_file,
    "file_writer": write_file,
    "list_directory": list_directory,
}

TOOL_CATEGORIES = {
    "web_search": ["web_search", "get_current_time"],
    "calculator": ["add", "subtract", "multiply", "divide", "calculate"],
    "code_executor": ["code_executor"],
    "file_reader": ["file_reader", "list_directory"],
    "file_writer": ["file_writer"],
    "database_query": [],
    "custom_api": [],
}


def get_tools_by_names(tool_names: list[str]) -> list:
    """Get tool instances by their names."""
    tools = []
    for name in tool_names:
        if name in AVAILABLE_TOOLS:
            tools.append(AVAILABLE_TOOLS[name])
        elif name in TOOL_CATEGORIES:
            for tool_name in TOOL_CATEGORIES[name]:
                if tool_name in AVAILABLE_TOOLS:
                    tools.append(AVAILABLE_TOOLS[tool_name])
    return tools


def get_all_tool_names() -> list[str]:
    """Get all available tool names."""
    return list(AVAILABLE_TOOLS.keys())
