from langgraph.checkpoint.memory import InMemorySaver

_memory_saver = None


def get_memory_saver() -> InMemorySaver:
    """Get singleton memory saver instance."""
    global _memory_saver
    if _memory_saver is None:
        _memory_saver = InMemorySaver()
    return _memory_saver


def create_new_memory_saver() -> InMemorySaver:
    """Create a new memory saver instance."""
    return InMemorySaver()
