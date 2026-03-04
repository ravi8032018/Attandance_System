import os
from pathlib import Path
from dotenv import load_dotenv

# Switch between env files here only
ENVIRONMENT = "development"   # or "production"
# ENVIRONMENT = "production"   

base_dir = Path(__file__).resolve().parent.parent
# print("--> env addr: ",base_dir)

env_file = base_dir / (".env.local" if ENVIRONMENT == "development" else ".env.production")
# print("--> env addr: ",env_file)
load_dotenv(dotenv_path=env_file)

# Define settings once
BACKEND_HOST = os.getenv("BACKEND_HOST")
MONGODB_URI = os.getenv("MONGODB_URI")
PORT = int(os.getenv("PORT", 8000))
DB_NAME = os.getenv("db_name")

if not BACKEND_HOST:
    raise ValueError("BACKEND_HOST is not set")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI is not set")
