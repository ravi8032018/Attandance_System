from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query,status, BackgroundTasks
from fastapi.params import Depends

from backend.app.schemas.auth_schema import _gen_otp, _send_reset_email, ForgotPasswordRequest, ForgotPasswordRequestVerify, SetPasswordRequest
from backend.app.utils.hash import varify_hash, hash_password
from backend.app.db import db
from datetime import datetime, timedelta, timezone

from backend.app.utils.verify_cookie import verify_cookie
from backend.my_logger import log_event

router = APIRouter(tags=["reset-password"])

@router.post("/reset-password")
async def reset_student_password(req:  SetPasswordRequest, token: str =Query(...)):
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    now = datetime.utcnow()
    # print(token)
    token_doc = await db["PasswordResetDB"].find_one({
        "token": token,
        "type": "set_password",
        "user_type": "Student",
        "expires_at": {"$gt": now},
        "is_used": False
    })

    if not token_doc:
        raise HTTPException(status_code=404, detail="Invalid or expired link.")

    hashed_pw = await hash_password(req.new_password)
    await db["Students"].update_one(
        {"_id": ObjectId(token_doc["student_id"])},
        {"$set": {"password": str(hashed_pw), "status": "active"}}
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


# for forgot password we have a single endpoint for all users - students, faculty, admin
@router.post("/forgot-password/request-otp", status_code=status.HTTP_200_OK)
async def request_password_otp(
        payload: ForgotPasswordRequest,
        background: BackgroundTasks,
):
    now= datetime.now()
    email = str(payload.email).strip().lower()
    # Do not reveal existence; proceed quietly
    user = await db.Students.find_one({"email": email, "status": "active"}, {"_id": 1, "email": 1})
    coll = "Students"
    if not user:
        user = await db.Faculty.find_one({"email": email, "status": "active"}, {"_id": 1, "email": 1})
        coll = "Faculty"
    if not user:
        user = await db.Admins.find_one({"email": email, "status": "active"}, {"_id": 1, "email": 1})
        coll = "Admins"

    print(f"--> user {user} coll {coll}")
    OTP= _gen_otp()
    expiry= now + timedelta(minutes=10)
    hash_pw= await hash_password(OTP)
    print("--> hash_pw ", hash_pw)
    await db.PasswordResetDB.delete_many({"email": email, "type": "forgot_password"})
    print("--> after hash_pw ")
    await db["PasswordResetDB"].insert_one({
        "email": email,
        "type": "forgot_password",
        "user_type": coll,
        "token": hash_pw,
        "expires_at": expiry,
        "is_used": False
    })
    background.add_task(_send_reset_email, email, OTP)  # send asynchronously [10]
    log_event("otp requested for password change", user_email=payload.email)
    # Always return generic response
    return {"message": "If the email exists, an OTP has been sent."}  # [11]

@router.post("/forgot-password/verify-otp", status_code=status.HTTP_200_OK)
async def verify_password_otp(
        payload: ForgotPasswordRequestVerify
):
    email = payload.email.lower().strip()
    now = datetime.now(timezone.utc)
    record = await db.PasswordResetDB.find_one(
        {"email": email, "is_used": False, "expires_at": {"$gt": now}},
        sort=[("created_at", -1)],
    )
    # Uniform failure message to avoid enumeration
    fail_msg = "Invalid or expired OTP."
    if not record:
        return {"message": fail_msg}
    # Check attempts
    if record.get("attempts", 0) >= 5:
        return {"message": fail_msg}
    # Verify code
    # print(f"password: {payload.new_password} \n password hashed: {record['otp']}")
    if not varify_hash(payload.otp, record['token']):
        # print("--> not varified")
        log_event("password change attempted", user_email=payload.email)
        await db.PasswordResetDB.update_one({"email": record["email"], "type": "forgot_password"}, {"$inc": {"attempts": 1}})
        return {"message": fail_msg}
    # OTP valid: update password and mark OTP used
    Coll= str(record["user_type"])
    Collection= db[Coll]
    pw_hash = await hash_password(payload.new_password)
    # Update user
    upd = await Collection.update_one(
        {
            "email": email,
         },
        {"$set": {"password": pw_hash, "password_changed_at": now}}
    )
    if upd.modified_count == 0:
        # User may not exist; keep generic
        log_event("password change attempted", user_email=payload.email)
        return {"message": fail_msg}
    # Mark OTP used
    await db.PasswordResetDB.update_one(
        {"email": record["email"]},
        {"$set": {"is_used": True}}
    )
    log_event("password changed succesfully", user_email=payload.email)
    return {"message": "Password has been reset."}






from fastapi import APIRouter
from fastapi.responses import JSONResponse

@router.post("/logout")
async def logout():
    # Build an empty/204 response
    res = JSONResponse(status_code=204, content=None)
    # print(res)
    # Primary deletion (FastAPI helper)
    res.delete_cookie(
        key="dept_user_token",
        path="/",             # match your original path; default is "/"
        # domain="localhost", # uncomment if you set a domain on login
    )
    # print("\n after delete")
    # Belt-and-suspenders overwrite with expired cookie
    res.set_cookie(
        key="dept_user_token",
        value="",
        httponly=True,
        secure=False,         # set True in production (HTTPS)
        samesite="lax",       # mirror original samesite
        max_age=0,
        expires=0,
        path="/",
        # domain="your.domain", # mirror if used
    )
    # print("\n after set")
    return res

@router.get("/verify-me")
async def get_me(session = Depends(verify_cookie)):
    # If verify_cookie_jwt didn't raise, token is valid
    return JSONResponse(
        status_code=200,
        content={"message": session['message'], "token_role": session['token_role']},
    )
