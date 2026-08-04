from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from backend.app.schemas.auth_schema import SignInResponse, UserSignUpRequest, UserSignInRequest
from backend.app.utils.hash import varify_hash, hash_password
from backend.app.utils.jwt import create_access_token
from backend.app.db import db
from backend.app.utils.roles import has_role
from backend.app.utils.dependencies import admin_required
from fastapi.responses import JSONResponse
from datetime import datetime
from backend.my_logger import log_event
import pymongo
from backend.app.utils.set_cookies import set_auth_cookie


router = APIRouter(prefix="/admin", tags=["admin-auth"])

'''
@router.post("/signup", response_model=SignInResponse)
async def admin_signup(admin: UserSignUpRequest):
    existing_user = await db.Admins.find_one({"email": admin.email})
    # print(existing_user)

    now= datetime.utcnow()
    if existing_user:
        if has_role(existing_user, 'admin'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already registered as admin, Please Login."
            )
        # Add admin role to existing user
        await db.Admins.update_one(
            {"_id": existing_user["_id"]},
            {"$addToSet": {"role": "admin"}}
        )
        user_id = str(existing_user["_id"])
    else:
        # Create new admin user
        passwd_hash = await hash_password(admin.password)
        new_admin = {
            "name": admin.name,
            "email": admin.email,
            "password": passwd_hash,
            "role": ["admin"],
            "created_at": now,
        }
        try:
            result =  await db.Admins.insert_one(new_admin)
            user_id = str(result.inserted_id)
        except pymongo.errors.DuplicateKeyError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="User already registered as faculty, Please Login.")

    # Generate token with admin role
    token_data = {"sub": user_id, "token_role": "admin"}
    access_token = create_access_token(token_data)

    resp = JSONResponse(
        status_code=200,
        content={
            "message": "Admin registered successfully",
            "access_token": access_token,
            "token_type": "bearer",
            "token_role": "admin"
    }
    )

    set_auth_cookie(resp, access_token)

    log_event("Admin signup", user_email=new_admin["email"], user_name=new_admin["name"], user_id=user_id, user_role="admin")

    return resp
'''

@router.post("/signin", response_model=SignInResponse)
async def admin_login(admin: UserSignInRequest):
    existing_user = await db.Admins.find_one({"email": admin.email})
    # print(existing_user["password"])

    if not existing_user or not varify_hash(admin.password, existing_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if str(existing_user.get("status", "")).lower() in ["frozen", "suspended"]:
        raise HTTPException(status_code=403, detail="Account Suspended. Contact System Administrator.")

    if not has_role(existing_user, 'admin'):
        raise HTTPException(status_code=403, detail="Not authorized as admin")

    token_data = {"sub": str(existing_user["_id"]), "token_role": "admin"}
    access_token = create_access_token(token_data)

    # --- NEW CODE: Set token as a secure HTTP-only cookie --- #
    resp = JSONResponse(
        status_code=200,
        content={
            "message": "Admin Login successful",
            # "access_token": access_token,
            "token_type": "bearer",
            "token_role": "admin"
        }
    )
    
    set_auth_cookie(resp, access_token)

    log_event("Admin Login", user_email=existing_user["email"], user_name=existing_user["name"], user_id=str(existing_user["_id"]), user_role="admin")

    return resp


@router.get("/me")
async def get_current_admin_profile(
    current_admin: dict = Depends(admin_required)
):
    admin_id = current_admin.get("id")
    if not admin_id:
        raise HTTPException(status_code=400, detail="Invalid admin session.")

    try:
        admin = await db.Admins.find_one({"_id": ObjectId(admin_id)})
    except Exception as e:
        raise HTTPException(status_code=404, detail="Cannot find admin.") from e

    if not admin:
        raise HTTPException(status_code=404, detail="Admin profile not found.")

    admin["_id"] = str(admin["_id"])
    admin.pop("password", None)

    # Ensure consistent name fields for frontend consumption
    raw_name = admin.get("name") or "System Administrator"
    name_parts = raw_name.strip().split(" ", 1)
    admin["first_name"] = admin.get("first_name") or name_parts[0]
    admin["last_name"] = admin.get("last_name") or (name_parts[1] if len(name_parts) > 1 else "")
    if "role" not in admin or not admin["role"]:
        admin["role"] = ["admin"]

    log_event("read own admin profile", user_email=current_admin["email"], user_id=current_admin["id"], user_role="admin")

    return admin





