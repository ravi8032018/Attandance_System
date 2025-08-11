from fastapi import APIRouter, HTTPException
from datetime import datetime
from backend.app.db import db
from backend.app.utils.hash import hash_password
from backend.app.schemas.auth_schema import SetPasswordRequest
from bson.objectid import ObjectId


router = APIRouter(tags=["Student Activation"])

@router.post("/set-password")
async def set_password(req: SetPasswordRequest):
    now = datetime.utcnow()
    # 1. Validate token
    token_doc = await db["PasswordResetDB"].find_one({
        "token": req.token,
        "type": "set_password",
        "expires_at": {"$gt": now},
        "is_used": False
    })
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    # 2. Set password, activate student, mark token used
    student_id = token_doc["student_id"]
    hashed_pw = hash_password(req.new_password)

    await db["Students"].update_one(
        {"_id": ObjectId(student_id)},
        {"$set": {"password": hashed_pw, "status": "active"}}
    )
    await db["PasswordResetTokens"].update_one(
        {"_id": token_doc["_id"]},
        {"$set": {"is_used": True}}
    )
    return {"message": "Password set and account activated successfully"}
