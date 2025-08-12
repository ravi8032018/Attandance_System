import pymongo
from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.auth_schema import SignInResponse, StudentSignUpRequest, StudentSignInRequest
from backend.app.utils.hash import varify_hash, hash_password
from backend.app.utils.jwt import create_access_token
from backend.app.db import db
from backend.app.utils.roles import has_role
from fastapi.responses import JSONResponse
from datetime import datetime
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
    # print(existing_students)

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




