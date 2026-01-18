import json
from pathlib import Path
from typing import List


def load_json_entries(path: Path) -> List[str]:
    """Load a JSON file containing a list of strings."""
    with path.open() as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("JSON file must contain a list of strings")
    return [str(x) for x in data]
