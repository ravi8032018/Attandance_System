import pymongo
from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.auth_schema import SignInResponse, FacultySignUpRequest, FacultySignInRequest
from backend.app.utils.hash import varify_hash, hash_password
from backend.app.utils.jwt import create_access_token
from backend.app.db import db
from backend.app.utils.roles import has_role
from fastapi.responses import JSONResponse
from datetime import datetime
from backend.my_logger import log_event

router = APIRouter(prefix="/faculty", tags=["faculty-auth"])

'''
@router.post("/signup", response_model=SignInResponse)
async def faculty_signup(faculty: FacultySignUpRequest):
    existing_faculty = await db.Faculty.find_one({"email": faculty.email})
    # print(existing_faculty)

    now= datetime.utcnow()
    if existing_faculty:
        if has_role(existing_faculty, 'faculty'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already registered as faculty, Please Login."
            )
        # Add admin role to existing user
        await db.Faculty.update_one(
            {"_id": existing_faculty["_id"]},
            {"$addToSet": {"role": "faculty"}}
        )
        user_id = str(existing_faculty["_id"])
    else:
        # Create new admin user
        new_faculty = {
            "name": faculty.name,
            "email": faculty.email,
            "password": hash_password(faculty.password),
            "role": ["faculty"],
            "created_at": now,
            "updated_at": None,
            "is_active": True,
            "status": "pending",
        }
        try:
            result =  await db.Faculty.insert_one(new_faculty)
            user_id = str(result.inserted_id)
        except pymongo.errors.DuplicateKeyError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="User already registered as faculty, Please Login.")

    # Generate token with admin role
    token_data = {"sub": user_id, "token_role": "faculty"}
    access_token = create_access_token(token_data)

    resp = JSONResponse(
        status_code=200,
        content={
            "message": "Faculty registered successfully",
            "access_token": access_token,
            "token_type": "bearer",
            "token_role": "faculty"
    }
    )
    resp.set_cookie(
        key="dept_faculty_token",
        value=access_token,
        httponly=True,
        secure=False,  # Set True if using HTTPS in production
        samesite="lax",  # or "strict"
        max_age=60 * 60 * 24 * 7  # 1 week, set as per your needs
    )

    log_event("Faculty signup", user_email=new_faculty["email"], user_name=new_faculty["name"], user_id=user_id, user_role="faculty")

    return resp
'''
@router.post("/signin", response_model=SignInResponse)
async def faculty_login(faculty: FacultySignInRequest):
    existing_faculty = await db.Faculty.find_one({"email": faculty.email})
    # print(existing_faculty)

    if not existing_faculty or not varify_hash(faculty.password, existing_faculty["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if existing_faculty["status"] == "pending":
        raise HTTPException(status_code=401, detail="Faculty account is under approval")
    if existing_faculty["status"] == "rejected":
        raise HTTPException(status_code=401, detail="Faculty account is rejected")
    if not has_role(existing_faculty, 'faculty'):
        raise HTTPException(status_code=403, detail="Not authorized as faculty")

    token_data = {"sub": str(existing_faculty["_id"]), "token_role": "faculty"}
    access_token = create_access_token(token_data)

    # --- NEW CODE: Set token as a secure HTTP-only cookie --- #
    resp = JSONResponse(
        status_code=200,
        content={
            "message": "Faculty Login successful",
            # "access_token": access_token,
            "token_type": "bearer",
            "token_role": "faculty"
        }
    )
    resp.set_cookie(
        key="dept_user_token",
        value=access_token,
        httponly=True,
        samesite="none",  # enables cross-site sending
        secure=True,  # required with SameSite=None
        path="/",
        max_age=60 * 60 * 24 * 7  # 1 week, set as per your needs
    )

    log_event("Faculty Login", user_email=existing_faculty["email"], user_name=existing_faculty["name"] if 'name' in existing_faculty else None, user_id=str(existing_faculty["_id"]), user_role="faculty")

    return resp




