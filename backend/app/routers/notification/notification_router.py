# routers/notification/notifications_router.py
from typing import Literal

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from websockets import WebSocketException
from backend.app.utils.connection_manager import manager
from backend.app.utils.ws_dependancies import get_current_user_from_ws
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from backend.app.utils.connection_manager import manager
from backend.app.utils.dependencies import get_current_user  
from backend.app.db import db  

router = APIRouter()

@router.get("/notifications")
async def list_notifications(
    status: Literal["read", "unread", "archived"] = "unread",
    current_user = Depends(get_current_user),
):
    query = {"user_id": current_user["id"]}
    if status:
        query["status"] = status
    now = datetime.now(timezone.utc)
    query["$or"] = [
        {"expires_at": None},
        {"expires_at": {"$gt": now}},
    ]
    docs = await db.Notifications.find(query).sort("created_at", -1).to_list(20)
    return [
        {
            "id": str(d["_id"]),
            "type": d["type"],
            "title": d["title"],
            "body": d["body"],
            "data": d.get("data", {}),
            "timestamp": d["created_at"].isoformat(),
            "status": d["status"],
        }
        for d in docs
    ]


