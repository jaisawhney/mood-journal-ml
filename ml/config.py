import os
import yaml

CONFIG_DIR = "ml/configs"

def load_config():
    config_name = os.getenv("MODEL_CONFIG")
    if not config_name:
        raise RuntimeError(
            "MODEL_CONFIG is not set. "
            "Example: MODEL_CONFIG=distilbert.yaml"
        )

    config_path = os.path.join(CONFIG_DIR, config_name)

    # stop people from breaking out of the configs directory...
    if os.path.commonpath([CONFIG_DIR, config_path]) != CONFIG_DIR:
        raise RuntimeError("Invalid MODEL_CONFIG path")
    
    if not os.path.exists(config_path):
        raise RuntimeError(f"Config not found: {config_path}")

    try:
        with open(config_path, "r") as f:
            return yaml.safe_load(f)
    except (OSError, UnicodeError, yaml.YAMLError) as e:
        raise RuntimeError(f"Failed to load config '{config_path}': {e}") from e
