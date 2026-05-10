import sys
import os

# Append the project root to sys.path so we can import main.py from the parent directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

# Vercel requires the FastAPI instance to be named `app` and located in the `api` directory
# so that it can be automatically detected as a Serverless Function.
