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

router = APIRouter(prefix="/student", tags=["Student-auth"])

'''
@router.post("/signup", response_model=SignInResponse)
async def students_signup(Student: StudentSignUpRequest):
    existing_student = await db.Students.find_one({"email": Student.email})
    # print(existing_students)

    now= datetime.utcnow()
    if existing_student:
        if has_role(existing_student, 'Student'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already registered as Student, Please Login."
            )
        # Add admin role to existing user
        await db.Students.update_one(
            {"_id": existing_student["_id"]},
            {"$addToSet": {"role": "Student"}}
        )
        user_id = str(existing_student["_id"])
    else:
        # Create new admin user
        new_student = {
            "name": Student.name,
            "email": Student.email,
            "password": hash_password(Student.password),
            "role": ["Student"],
            "created_at": now,
        }
        try:
            result =  await db.Students.insert_one(new_student)
            user_id = str(result.inserted_id)
        except pymongo.errors.DuplicateKeyError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="User already registered as Student, Please Login.")

    # Generate token with admin role
    token_data = {"sub": user_id, "token_role": "Student"}
    access_token = create_access_token(token_data)

    resp = JSONResponse(
        status_code=200,
        content={
            "message": "Student registered successfully",
            "access_token": access_token,
            "token_type": "bearer",
            "token_role": "Student"
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

    log_event("Student signup", user_email=new_student["email"], user_name=new_student["name"], user_id=user_id, user_role="Student")

    return resp
'''

@router.post("/signin", response_model=SignInResponse)
async def students_login(student: StudentSignInRequest):
    existing_student = await db.Students.find_one({"email": student.email})
    # print(existing_student)

    if not existing_student or not varify_hash(student.password, existing_student["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not has_role(existing_student, 'Student'):
        raise HTTPException(status_code=403, detail="Not authorized as Student")

    token_data = {"sub": str(existing_student["_id"]), "token_role": "Student"}
    access_token = create_access_token(token_data)

    # --- NEW CODE: Set token as a secure HTTP-only cookie --- #
    resp = JSONResponse(
        status_code=200,
        content={
            "message": "Student Login successful",
            "access_token": access_token,
            "token_type": "bearer",
            "token_role": "Student"
        }
    )
    resp.set_cookie(
        key="dept_user_token",
        value=access_token,
        httponly=True,
        secure=False,  # Set True if using HTTPS in production
        samesite="lax",  # or "strict"
        max_age=60 * 60 * 24 * 7  # 1 week, set as per your needs
    )

    log_event("Student Login", user_email=existing_student["email"] , user_id=str(existing_student["_id"]), user_role="Student")

    return resp



