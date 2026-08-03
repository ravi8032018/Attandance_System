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
import re

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/")
async def list_notifications(
    status: Literal["read", "unread", "archived", "all"] = "unread",
    current_user = Depends(get_current_user),
):
    '''Endpoint to list notifications for the authenticated user, with optional status filter.'''
    query = {"user_id": current_user["id"]}
    if status == "all":
        query["status"] = {"$ne": "archived"}
    else:   
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


from backend.app.utils.dependencies import admin_or_hod_required
from pydantic import BaseModel
from typing import Optional

from fastapi.responses import HTMLResponse, Response
import secrets

from backend.app.utils.unique_report_id import generate_unique_report_id
import base64

class FeedbackCreateRequest(BaseModel):
    type: str = "bug"
    title: Optional[str] = None
    description: str
    attachment_name: Optional[str] = None
    attachment_data: Optional[str] = None
    system_info: Optional[dict] = None

def resolve_highest_role(raw_role) -> str:
    if not raw_role:
        return "user"
    roles = raw_role if isinstance(raw_role, list) else [str(raw_role)]
    priority = ["admin", "hod", "cr", "faculty", "student"]
    for p in priority:
        if any(p == str(r).lower() or p in str(r).lower() for r in roles):
            return p
    return str(roles[0])

@router.post("/feedback")
async def submit_feedback(
    payload: FeedbackCreateRequest,
    current_user = Depends(get_current_user)
):
    '''Endpoint for any user to submit a bug report, feature suggestion, or platform feedback.'''
    now = datetime.now(timezone.utc)
    user_name = current_user.get("full_name") or current_user.get("name") or current_user.get("email", "User")
    
    # Generate sequential, unique report_id (e.g. BUG-001, BUG-002, FDK-001, OTH-001)
    report_id = await generate_unique_report_id(payload.type)
    highest_role = resolve_highest_role(current_user.get("user_role") or current_user.get("role") or current_user.get("token_role"))

    doc = {
        "report_id": report_id,
        "user_id": current_user["id"],
        "user_name": user_name,
        "user_email": current_user.get("email"),
        "user_role": highest_role,
        "type": payload.type,
        "title": payload.title or f"{payload.type.title()} Report",
        "description": payload.description,
        "attachment_name": payload.attachment_name,
        "attachment_data": payload.attachment_data,
        "system_info": payload.system_info or {},
        "status": "open",
        "created_at": now,
    }

    res = await db.Feedback.insert_one(doc)
    return {
        "message": "Feedback submitted successfully.",
        "id": str(res.inserted_id),
        "report_id": report_id
    }

@router.get("/feedback")
async def list_feedback_reports(
    status: Optional[str] = None,
    current_user = Depends(admin_or_hod_required)
):
    '''Admin & HOD endpoint to view all submitted feedback and bug reports.'''
    query = {}
    if status and status != "all":
        query["status"] = status

    cursor = db.Feedback.find(query).sort("created_at", 1)
    items = []
    
    # Track category counters for missing/legacy report_ids to backfill sequentially (001, 002, ...)
    counters = {"BUG": 1, "FDK": 1, "PERF": 1, "OTH": 1}

    async for f in cursor:
        ftype = f.get("type", "bug").lower()
        prefix = "BUG" if ftype == "bug" else "PERF" if ftype == "performance" else "OTH" if ftype == "other" else "FDK"
        
        report_id = f.get("report_id")
        if not report_id or report_id.endswith("100") or report_id.endswith("101") or report_id.endswith("102") or len(report_id) > 10:
            seq_str = str(counters[prefix]).zfill(3)
            report_id = f"{prefix}-{seq_str}"
            counters[prefix] += 1
            # Update DB with clean sequential report_id
            await db.Feedback.update_one({"_id": f["_id"]}, {"$set": {"report_id": report_id}})
        else:
            # Sync counters if existing report_id has a sequence number
            match = re.search(r"-(\d+)$", report_id)
            if match:
                num = int(match.group(1))
                if num >= counters[prefix]:
                    counters[prefix] = num + 1

        highest_role = resolve_highest_role(f.get("user_role"))

        items.append({
            "id": str(f["_id"]),
            "report_id": report_id,
            "user_name": f.get("user_name"),
            "user_email": f.get("user_email"),
            "user_role": highest_role,
            "type": f.get("type", "bug"),
            "title": f.get("title", ""),
            "description": f.get("description", ""),
            "attachment_name": f.get("attachment_name"),
            "attachment_data": f.get("attachment_data"),
            "system_info": f.get("system_info", {}),
            "status": f.get("status", "open"),
            "created_at": f["created_at"].isoformat() if isinstance(f.get("created_at"), datetime) else str(f.get("created_at", "")),
        })

    # Return newest first for UI display
    items.reverse()
    return {"items": items, "total": len(items)}

@router.get("/feedback/{feedback_id}/attachment")
async def get_feedback_attachment(feedback_id: str):
    '''Virtual route to serve and view feedback attachment (Images, PDFs, Documents).'''
    try:
        f = await db.Feedback.find_one({"_id": ObjectId(feedback_id)})
        if not f or not f.get("attachment_data"):
            return HTMLResponse(content="<h3>No attachment found for this report.</h3>", status_code=404)

        data_url = f.get("attachment_data", "")
        filename = f.get("attachment_name", "attachment")

        if data_url.startswith("data:application/pdf"):
            try:
                header, b64_str = data_url.split(",", 1)
                pdf_bytes = base64.b64decode(b64_str)
                return Response(
                    content=pdf_bytes,
                    media_type="application/pdf",
                    headers={"Content-Disposition": f"inline; filename=\"{filename}\""}
                )
            except Exception:
                html = f"""
                <!DOCTYPE html>
                <html>
                <head><title>Attachment - {f.get('report_id', feedback_id)}</title></head>
                <body style="margin:0; background:#0f172a; height:100vh;">
                  <iframe src="{data_url}" width="100%" height="100%" style="border:none;"></iframe>
                </body>
                </html>
                """
                return HTMLResponse(content=html)

        if data_url.startswith("data:image"):
            html = f"""
            <!DOCTYPE html>
            <html>
            <head><title>Attachment - {f.get('report_id', feedback_id)}</title></head>
            <body style="margin:0; background:#0f172a; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; color:white;">
              <h3 style="margin:16px;">Attachment: {filename} ({f.get('report_id', '')})</h3>
              <img src="{data_url}" style="max-width:90vw; max-height:80vh; object-fit:contain; border-radius:12px; border:1px solid #334155;" />
            </body>
            </html>
            """
            return HTMLResponse(content=html)

        if "," in data_url:
            try:
                header, b64_str = data_url.split(",", 1)
                file_bytes = base64.b64decode(b64_str)
                mime = header.split(";")[0].replace("data:", "") if "data:" in header else "application/octet-stream"
                return Response(
                    content=file_bytes,
                    media_type=mime,
                    headers={"Content-Disposition": f"inline; filename=\"{filename}\""}
                )
            except Exception:
                pass

        return HTMLResponse(content=f"<h3>Attachment: {filename}</h3>")
    except Exception as e:
        return HTMLResponse(content=f"<h3>Error loading attachment: {str(e)}</h3>", status_code=500)

@router.patch("/feedback/{feedback_id}")
async def update_feedback_status(
    feedback_id: str,
    status_update: dict,
    current_user = Depends(admin_or_hod_required)
):
    '''Admin & HOD endpoint to update feedback status (open, in_progress, resolved).'''
    try:
        new_status = status_update.get("status", "resolved")
        result = await db.Feedback.update_one(
            {"_id": ObjectId(feedback_id)},
            {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}}
        )
        if result.matched_count == 0:
            return {"message": "Feedback report not found."}
        return {"message": f"Feedback status updated to {new_status}."}
    except Exception as e:
        return {"message": f"Error updating feedback status: {str(e)}"}

   
