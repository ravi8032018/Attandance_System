from fastapi import APIRouter, HTTPException, Query, Path
from datetime import datetime
from backend.app.db import db
from backend.app.schemas.auth_schema import SetPasswordRequest
from backend.app.utils.hash import hash_password
from bson import ObjectId

router = APIRouter(tags=["reset-password"])

@router.post("/reset-password")
async def reset_password(req:  SetPasswordRequest, token: str =Query(...)):
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    now = datetime.utcnow()
    # print(token)
    token_doc = await db["PasswordResetDB"].find_one({
        "token": token,
        "type": "set_password",
        "user_type": "student",
        "expires_at": {"$gt": now},
        "is_used": False
    })

    if not token_doc:
        raise HTTPException(status_code=404, detail="Invalid or expired link invalid.")

    hashed_pw = hash_password(req.new_password)
    await db["Students"].update_one(
        {"_id": ObjectId(token_doc["student_id"])},
        {"$set": {"password": hashed_pw, "status": "active"}}
    )
    await db["PasswordResetDB"].update_one(
        {"_id": token_doc["_id"]},
        {"$set": {"is_used": True}}
    )
    return ({"message": "Password reset successful. You may now log in."})


@router.post("/reset-fac-password")
async def reset_fac_password(req:  SetPasswordRequest, token: str =Query(...)):
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    now = datetime.utcnow()
    # print(token)
    token_doc = await db["PasswordResetDB"].find_one({
        "token": token,
        "type": "set_password",
        "user_type": "faculty",
        "expires_at": {"$gt": now},
        "is_used": False
    })
    # print(token_doc)
    if not token_doc:
        raise HTTPException(status_code=404, detail="Invalid or expired link invalid.")

    hashed_pw = hash_password(req.new_password)
    await db["Faculty"].update_one(
        {"_id": ObjectId(token_doc["user_id"])},
        {"$set": {"password": hashed_pw, "status": "active"}}
    )
    await db["PasswordResetDB"].update_one(
        {"_id": token_doc["_id"]},
        {"$set": {"is_used": True}}
    )
    return {"message": "Password reset successful. You may now log in."}
