# utils/notifications.py
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, List

from backend.app.db import db               # your Motor client wrapper
from backend.app.utils.connection_manager import manager

async def save_notification(
    *,
    user_id: str,
    type: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    audience_role: Optional[List[str]] = None,
    ttl_minutes: Optional[int] = None,
    send_ws: bool = True,
) -> str:
    """
    Create a notification in DB and optionally push via WebSocket.
    Returns the inserted notification id (as string).
    """

    now = datetime.now(timezone.utc)
    expires_at = None
    if ttl_minutes is not None:
        expires_at = now + timedelta(minutes=ttl_minutes)

    notif_doc = {
        "user_id": user_id,
        "audience_role": audience_role,
        "type": type,
        "title": title,
        "body": body,
        "data": data or {},
        "status": "unread",
        "is_delivered": False,
        "created_at": now,
        "updated_at": now,
        "expires_at": expires_at,
    }

    result = await db.Notifications.insert_one(notif_doc)
    notif_id = result.inserted_id

    # Try WebSocket push (optional)
    if send_ws:
        try:
            await manager.send_personal_message(
                {
                    "id": str(notif_id),
                    "type": type,
                    "title": title,
                    "body": body,
                    "data": data or {},
                    "timestamp": now.isoformat(),
                },
                user_id=user_id,
            )
            await db.Notifications.update_one(
                {"_id": notif_id},
                {"$set": {"is_delivered": True, "updated_at": datetime.now(timezone.utc)}},
            )
        except Exception:
            # WS delivery failed; DB row still exists for later pull
            pass

    return str(notif_id)
