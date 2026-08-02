# my_logger.py
import json
from datetime import datetime
import os
from typing import Optional, Any, Dict, List, Union
from pymongo import MongoClient

_sync_mongo_client = None

def _get_sync_db():
    global _sync_mongo_client
    if _sync_mongo_client is None:
        try:
            from backend.app.config import MONGODB_URI
            _sync_mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
        except Exception:
            return None
    try:
        return _sync_mongo_client.get_default_database()
    except Exception:
        return None

def resolve_highest_role(roles: Any) -> str:
    """
    Evaluates role arrays or strings and returns the highest role in system hierarchy:
    admin > hod > faculty > cr > student
    """
    if not roles:
        return "system"
    if isinstance(roles, str):
        roles_list = [r.strip().lower() for r in roles.split(",")]
    elif isinstance(roles, (list, tuple, set)):
        roles_list = [str(r).strip().lower() for r in roles]
    else:
        roles_list = [str(roles).strip().lower()]

    if "admin" in roles_list:
        return "admin"
    if "hod" in roles_list:
        return "hod"
    if "faculty" in roles_list:
        return "faculty"
    if "cr" in roles_list:
        return "cr"
    if "student" in roles_list:
        return "student"
    return roles_list[0] if roles_list else "system"

def log_event(
    action: str,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
    user_id: Optional[str] = None,
    user_role: Optional[Union[str, List[str]]] = None,
    details: Optional[Any] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    severity: Optional[str] = None,
    previous_state: Optional[Dict[str, Any]] = None,
    new_state: Optional[Dict[str, Any]] = None
):
    action_lower = action.lower() if action else ""
    
    # Classify severity level automatically if not explicitly provided
    if not severity:
        if any(term in action_lower for term in ["login", "signup", "delete", "promote", "revoke", "password", "role"]):
            severity = "CRITICAL"
        elif any(term in action_lower for term in ["create", "update", "add", "assign", "unassign", "edit", "save"]):
            severity = "MODIFY"
        else:
            severity = "INFO"
    elif severity.upper() == "MODIFICATION":
        severity = "MODIFY"
    else:
        severity = severity.upper()

    highest_role = resolve_highest_role(user_role) if user_role is not None else None

    entry: Dict[str, Any] = {
        "action": action,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "severity": severity,
    }

    if user_email is not None:
        entry["user_email"] = user_email
    if user_name is not None:
        entry["user_name"] = user_name
    if user_id is not None:
        entry["user_id"] = str(user_id)
    if highest_role is not None:
        entry["user_role"] = highest_role
    if ip_address is not None:
        entry["ip_address"] = ip_address
    if user_agent is not None:
        entry["user_agent"] = user_agent
    if previous_state is not None:
        entry["previous_state"] = previous_state
    if new_state is not None:
        entry["new_state"] = new_state
    if details is not None:
        if isinstance(details, (dict, list)):
            entry["details"] = json.dumps(details)
        else:
            entry["details"] = str(details)

    # 1. File persistence fallback
    try:
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
        cache_path = os.path.join(PROJECT_ROOT, "cache_local", "backend_logs.json")
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        with open(cache_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        pass

    # 2. MongoDB AuditLogs collection persistence
    try:
        db_instance = _get_sync_db()
        if db_instance is not None:
            doc_to_insert = entry.copy()
            db_instance.AuditLogs.insert_one(doc_to_insert)
    except Exception:
        pass
