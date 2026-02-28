# routers/notification/notifications_router.py
from typing import Literal
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from websockets import WebSocketException
from backend.app.utils.ws_dependancies import get_current_user_from_ws
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from backend.app.utils.connection_manager import manager
from backend.app.utils.dependencies import get_current_user  
from backend.app.db import db  
from bson import ObjectId


router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/")
async def list_notifications(
    status: Literal["read", "unread", "archived"] = "unread",
    current_user = Depends(get_current_user),
):
    '''Endpoint to list notifications for the authenticated user, with optional status filter.'''
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

@router.patch("/{notification_id}/mark-read")
async def mark_notification_as_read(
    notification_id: str, 
    current_user = Depends(get_current_user)
):
    '''Endpoint to mark a specific notification as read.'''
    try:
        result = await db.Notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user["id"]},
        {"$set": {"status": "read"}}
        )
        if result.modified_count == 0:
            return {"message": "Notification not found or already read."}
        return {"message": "Notification marked as read."}
    except Exception as e:
        return {"message": f"Error marking notification as read: {str(e)}"}
     
@router.delete("/{notification_id}")
async def mark_notification_as_delete(
    notification_id: str, 
    current_user = Depends(get_current_user)
):
    '''Endpoint to mark a specific notification as archived.'''
    try:
        result = await db.Notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user["id"]},
        {"$set": {"status": "archived"}}
        )
        if result.modified_count == 0:
            return {"message": "Notification not found or already deleted."}
        return {"message": "Notification marked as read."}
    except Exception as e:
        return {"message": f"Error marking notification as delete: {str(e)}"}
   
@router.delete("/")
async def delete_all_notifications(
    current_user = Depends(get_current_user),
):
    """
    Endpoint to mark all active (non-expired) notifications
    for the authenticated user as archived.
    """
    try:
        now = datetime.now(timezone.utc)
        query = {
            "user_id": current_user["id"],
            "status": {"$ne": "archived"},
            "$or": [
                {"expires_at": None},
                {"expires_at": {"$gt": now}},
            ],
        }

        result = await db.Notifications.update_many(
            query,
            {"$set": {"status": "archived"}}
        )

        return {
            "message": "Notifications marked as deleted.",
            "matched": result.matched_count,
            "modified": result.modified_count,
        }
    except Exception as e:
        return {"message": f"Error marking notifications as delete: {str(e)}"}
   
