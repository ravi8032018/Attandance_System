from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, status, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.params import Depends
from pydantic import BaseModel, EmailStr
import secrets
from datetime import datetime, timedelta, timezone

from backend.app.schemas.auth_schema import _gen_otp, _send_reset_email, ForgotPasswordRequest, ForgotPasswordRequestVerify, SetPasswordRequest
from backend.app.utils.hash import varify_hash, hash_password
from backend.app.utils.jwt import create_access_token
from backend.app.utils.set_cookies import set_auth_cookie, clear_auth_cookie
from backend.app.utils.smtp import send_single_email
from backend.app.utils.notifications import save_notification
from backend.app.db import db
from backend.app.utils.verify_cookie import verify_cookie
from backend.my_logger import log_event

router = APIRouter(tags=["reset-password"])

class RequestResetLinkPayload(BaseModel):
    email: EmailStr

class ConfirmResetWithTokenPayload(BaseModel):
    token: str
    new_password: str
    confirm_password: str

@router.post("/forgot-password/request-link", status_code=status.HTTP_200_OK)
async def request_password_reset_link(payload: RequestResetLinkPayload):
    email = str(payload.email).strip().lower()
    
    user = await db.Students.find_one({"email": email})
    coll = "Students"
    if not user:
        user = await db.Faculty.find_one({"email": email})
        coll = "Faculty"
    if not user:
        user = await db.Admins.find_one({"email": email})
        coll = "Admins"

    if user:
        if str(user.get("status", "")).lower() in ["frozen", "suspended"]:
            raise HTTPException(status_code=403, detail="Account is suspended. Contact system administrator.")

        reset_token = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)
        expiry = now + timedelta(minutes=30)

        await db.PasswordResetDB.delete_many({"email": email, "type": "reset_link"})
        await db.PasswordResetDB.insert_one({
            "email": email,
            "user_id": str(user["_id"]),
            "user_type": coll,
            "type": "reset_link",
            "token": reset_token,
            "created_at": now,
            "expires_at": expiry,
            "is_used": False
        })

        reset_url = f"http://localhost:3000/reset-password?token={reset_token}"
        fn = user.get("first_name", "") or user.get("name", "User")
        
        email_subject = "Reset Your Password - Assam University CS Department"
        email_body = (
            f"Dear {fn},\n\n"
            f"We received a request to reset the password for your account ({email}) at Assam University Department of Computer Science.\n\n"
            f"Click the link below to set a new password:\n{reset_url}\n\n"
            f"This password reset link will expire in 30 minutes.\n"
            f"If you did not request a password reset, please ignore this email or contact system administration.\n\n"
            f"Best regards,\nAssam University CS Department"
        )

        send_single_email(to_email=email, subject=email_subject, body=email_body)
        log_event("password reset link requested", user_email=email)

    return {"message": "If the email is registered in our system, a password reset link has been sent to your email address."}

@router.get("/forgot-password/verify-link", status_code=status.HTTP_200_OK)
async def verify_reset_link(token: str = Query(...)):
    token = token.strip()
    now = datetime.now(timezone.utc)
    
    token_doc = await db.PasswordResetDB.find_one({
        "token": token,
        "type": "reset_link",
        "is_used": False,
        "expires_at": {"$gt": now}
    })

    if not token_doc:
        raise HTTPException(status_code=400, detail="This password reset link is invalid or has expired. Please request a new one.")

    return {"valid": True, "email": token_doc.get("email")}

@router.post("/forgot-password/confirm-reset", status_code=status.HTTP_200_OK)
async def confirm_reset_with_token(payload: ConfirmResetWithTokenPayload):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    token = payload.token.strip()
    now = datetime.now(timezone.utc)

    token_doc = await db.PasswordResetDB.find_one({
        "token": token,
        "type": "reset_link",
        "is_used": False,
        "expires_at": {"$gt": now}
    })

    if not token_doc:
        raise HTTPException(status_code=400, detail="This password reset link is invalid or has expired. Please request a new one.")

    coll_name = token_doc["user_type"]
    email = token_doc["email"]
    user_id = token_doc["user_id"]

    hashed_pw = await hash_password(payload.new_password)

    await db[coll_name].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": hashed_pw, "password_changed_at": now}}
    )

    await db.PasswordResetDB.update_one(
        {"_id": token_doc["_id"]},
        {"$set": {"is_used": True}}
    )

    try:
        await save_notification(
            user_id=user_id,
            type="security_alert",
            title="Password Changed 🔒",
            body="Your account password was successfully reset via self-service email link.",
            send_ws=True
        )
    except Exception as e:
        print(f"[Notif Error] {e}")

    try:
        send_single_email(
            to_email=email,
            subject="Password Changed Successfully - Assam University CS",
            body=f"Dear User,\n\nYour password for account ({email}) has been successfully reset. If you did not perform this change, contact system administration immediately."
        )
    except Exception as e:
        print(f"[Email Error] {e}")

    log_event("self-service password reset successful", user_email=email)
    return {"message": "Your password has been successfully reset. You may now log in with your new password."}

@router.post("/reset-password")
async def reset_student_password(req:  SetPasswordRequest, token: str =Query(...)):
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    now = datetime.utcnow()
    # print(token)
    token_doc = await db["PasswordResetDB"].find_one({
        "token": token,
        "type": "set_password",
        # "user_type": "Student",
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

    token_data = {"sub": str(token_doc["student_id"]), "token_role": "student"}
    access_token = create_access_token(token_data)

    resp = JSONResponse(
        status_code=200,
        content={"message": "Password reset successful. Account activated."}
    )
    set_auth_cookie(resp, access_token)
    return resp

@router.post("/reset-fac-password")
async def reset_fac_password(req:  SetPasswordRequest, token: str =Query(...)):
    try:
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

        hashed_pw = await hash_password(req.new_password)
        await db["Faculty"].update_one(
            {"_id": ObjectId(token_doc["user_id"])},
            {"$set": {"password": hashed_pw, "status": "active"}}
        )
        await db["PasswordResetDB"].update_one(
            {"_id": token_doc["_id"]},
            {"$set": {"is_used": True}}
        )

        token_data = {"sub": str(token_doc["user_id"]), "token_role": "faculty"}
        access_token = create_access_token(token_data)

        resp = JSONResponse(
            status_code=200,
            content={"message": "Password reset successful. Account activated."}
        )
        set_auth_cookie(resp, access_token)
        return resp
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error in resetting faculty password:" + str(e))


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
    coll = "Student"
    if not user:
        user = await db.Faculty.find_one({"email": email, "status": "active"}, {"_id": 1, "email": 1})
        coll = "Faculty"
    if not user:
        user = await db.Admins.find_one({"email": email, "status": "active"}, {"_id": 1, "email": 1})
        coll = "Admin"

    # print(f"--> user {user} coll {coll}")
    OTP= _gen_otp()
    expiry= now + timedelta(minutes=10)
    hash_pw= await hash_password(OTP)
    # print("--> hash_pw ", hash_pw)
    await db.PasswordResetDB.delete_many({"email": email, "type": "forgot_password"})
    # print("--> after hash_pw ")
    await db["PasswordResetDB"].insert_one({
        "email": email,
        "type": "forgot_password",
        "user_type": coll,
        "token": hash_pw,
        "expires_at": expiry,
        "is_used": False
    })
    background.add_task(_send_reset_email, email, OTP)  # send asynchronously
    log_event("otp requested for password change", user_email=payload.email)
    # Always return generic response
    return {"message": "If the email exists, an OTP has been sent."}

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
from backend.app.utils.set_cookies import clear_auth_cookie


@router.post("/logout")
async def logout():
    # Build an empty/204 response
    res = JSONResponse(status_code=204, content=None)
    # print(res)
    # Primary deletion (FastAPI helper)
    res.delete_cookie(
        key="dept_user_token",
        path="/",             # match your original path; default is "/"
        domain="localhost", # uncomment if you set a domain on login
    )
    # print("\n after delete")
    # Belt-and-suspenders overwrite with expired cookie

    clear_auth_cookie(res)

    # print("\n after set")
    return res

@router.get("/verify-me")
async def get_me(session = Depends(verify_cookie)):
    # If verify_cookie_jwt didn't raise, token is valid
    return JSONResponse(
        status_code=200,
        content={"message": session['message'], "token_role": session['token_role']},
    )
