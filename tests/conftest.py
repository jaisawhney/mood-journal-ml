import sys

from pathlib import Path
from dotenv import load_dotenv

root_dir = Path(__file__).resolve().parents[1]
sys.path.append(str(root_dir))

load_dotenv(".env.test")
