from langchain_core.tools import tool
import sys
from io import StringIO


@tool
def execute_python(code: str) -> str:
    """Execute Python code and return the output. Use with caution."""
    old_stdout = sys.stdout
    redirected_output = sys.stdout = StringIO()

    try:
        exec(code, {"__builtins__": __builtins__})
        output = redirected_output.getvalue()
        return output if output else "Code executed successfully with no output."
    except Exception as e:
        return f"Error executing code: {str(e)}"
    finally:
        sys.stdout = old_stdout
