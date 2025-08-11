# mylogger.py
import json
from datetime import datetime
import os
from textwrap import indent


def log_event(action, user_email=None, user_name=None, user_id: str=None, user_role=None, details= None):
    entry = {
        "action": action,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    # Only include fields if provided (minimize arguments!)
    if user_email is not None:
        entry["user_email"] = user_email
    if user_name is not None:
        entry["user_name"] = user_name
    if user_id is not None:
        entry["user_id"] = user_id
    if user_role is not None:
        entry["user_role"] = user_role
    if details is not None:
        entry["details"] = json.dumps(details)

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
    cache_path = os.path.join(PROJECT_ROOT, "cache_local", "backend_logs.json")

    with open(cache_path, "a") as f:
        json_str = json.dumps(entry, indent=2)
        f.write(json_str+"\n")
        # print("Logging at", cache_path)

