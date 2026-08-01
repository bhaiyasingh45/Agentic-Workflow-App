from langchain_core.tools import tool


@tool
def read_file(file_path: str) -> str:
    """Read contents of a file."""
    try:
        with open(file_path, "r") as f:
            return f.read()
    except FileNotFoundError:
        return f"Error: File '{file_path}' not found."
    except Exception as e:
        return f"Error reading file: {str(e)}"


@tool
def write_file(file_path: str, content: str) -> str:
    """Write content to a file."""
    try:
        with open(file_path, "w") as f:
            f.write(content)
        return f"Successfully wrote to '{file_path}'"
    except Exception as e:
        return f"Error writing file: {str(e)}"


@tool
def list_directory(directory: str = ".") -> str:
    """List files in a directory."""
    import os
    try:
        files = os.listdir(directory)
        return "\n".join(files) if files else "Directory is empty."
    except FileNotFoundError:
        return f"Error: Directory '{directory}' not found."
    except Exception as e:
        return f"Error listing directory: {str(e)}"
