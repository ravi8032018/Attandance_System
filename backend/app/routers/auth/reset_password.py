from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from backend.app.db import db
from backend.app.schemas.auth_schema import SetPasswordRequest
from backend.app.utils.hash import hash_password
from bson import ObjectId

router = APIRouter(tags=["reset-password"])

@router.post("/reset-password")
async def reset_password(req: SetPasswordRequest):
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    now = datetime.utcnow()

    token_doc = await db["PasswordResetDB"].find_one({
        "token": req.token,
        "type": "set_password",
        "expires_at": {"$gt": now},
        "is_used": False
    })

    # Check if token exists
    if not token_doc:
        raise HTTPException(status_code=404, detail="Invalid or expired link invalid.")

    # At this point, token is valid. Hash password, update student, and mark token as used:
    hashed_pw = hash_password(req.new_password)
    await db["Students"].update_one(
        {"_id": ObjectId(token_doc["student_id"])},
        {"$set": {"password": hashed_pw, "status": "active"}}
    )
    await db["PasswordResetDB"].update_one(
        {"_id": token_doc["_id"]},
        {"$set": {"is_used": True}}
    )
    return {"message": "Password reset successful. You may now log in."}
