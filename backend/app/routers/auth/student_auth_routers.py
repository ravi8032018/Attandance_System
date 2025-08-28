import pymongo
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from fastapi.params import Depends

from backend.app.schemas.auth_schema import SignInResponse, StudentSignInRequest, _gen_otp, _send_reset_email, ForgotPasswordRequest, ForgotPasswordRequestVerify
from backend.app.utils.dependencies import get_current_user
from backend.app.utils.hash import varify_hash, hash_password
from backend.app.utils.jwt import create_access_token
from backend.app.db import db
from backend.app.utils.roles import has_role
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta, timezone
from backend.my_logger import log_event

router = APIRouter(prefix="/student", tags=["student-auth"])

'''
@router.post("/signup", response_model=SignInResponse)
async def students_signup(student: StudentSignUpRequest):
    existing_student = await db.Students.find_one({"email": student.email})
    # print(existing_students)

    now= datetime.utcnow()
    if existing_student:
        if has_role(existing_student, 'student'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already registered as student, Please login."
            )
        # Add admin role to existing user
        await db.Students.update_one(
            {"_id": existing_student["_id"]},
            {"$addToSet": {"role": "student"}}
        )
        user_id = str(existing_student["_id"])
    else:
        # Create new admin user
        new_student = {
            "name": student.name,
            "email": student.email,
            "password": hash_password(student.password),
            "role": ["student"],
            "created_at": now,
        }
        try:
            result =  await db.Students.insert_one(new_student)
            user_id = str(result.inserted_id)
        except pymongo.errors.DuplicateKeyError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="User already registered as student, Please login.")

    # Generate token with admin role
    token_data = {"sub": user_id, "token_role": "student"}
    access_token = create_access_token(token_data)

    resp = JSONResponse(
        status_code=200,
        content={
            "message": "Student registered successfully",
            "access_token": access_token,
            "token_type": "bearer",
            "token_role": "student"
    }
    )
    resp.set_cookie(
        key="dept_student_token",
        value=access_token,
        httponly=True,
        secure=False,  # Set True if using HTTPS in production
        samesite="lax",  # or "strict"
        max_age=60 * 60 * 24 * 7  # 1 week, set as per your needs
    )

    log_event("Student signup", user_email=new_student["email"], user_name=new_student["name"], user_id=user_id, user_role="student")

    return resp
'''

@router.post("/signin", response_model=SignInResponse)
async def students_login(student: StudentSignInRequest):
    existing_student = await db.Students.find_one({"email": student.email})
    print(existing_student)

    if not existing_student or not varify_hash(student.password, existing_student["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not has_role(existing_student, 'student'):
        raise HTTPException(status_code=403, detail="Not authorized as student")

    token_data = {"sub": str(existing_student["_id"]), "token_role": "student"}
    access_token = create_access_token(token_data)

    # --- NEW CODE: Set token as a secure HTTP-only cookie --- #
    resp = JSONResponse(
        status_code=200,
        content={
            "message": "Student login successful",
            "access_token": access_token,
            "token_type": "bearer",
            "token_role": "student"
        }
    )
    resp.set_cookie(
        key="dept_student_token",
        value=access_token,
        httponly=True,
        secure=False,  # Set True if using HTTPS in production
        samesite="lax",  # or "strict"
        max_age=60 * 60 * 24 * 7  # 1 week, set as per your needs
    )

    log_event("Student login", user_email=existing_student["email"] , user_id=str(existing_student["_id"]), user_role="student")

    return resp



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


