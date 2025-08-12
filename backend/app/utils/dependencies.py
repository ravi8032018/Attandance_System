from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from bson import ObjectId
from backend.app.db import db
import os
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), "../../../.env")
load_dotenv(dotenv_path=env_path)

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"

# This must match the `tokenUrl` you expose in your `/auth` endpoints
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/signin")

# -----------------------------
# ✅ Core extractor of user info
# -----------------------------
async def get_current_user(request: Request):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Try reading the token from the HTTP-only cookie
    token = request.cookies.get("access_token")

    # 2. If not in cookie, look for Authorization header (for tools like Postman)
    if not token and "authorization" in request.headers:
        auth_header = request.headers["authorization"]
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_role: str = payload.get("token_role")  # ← This must match what you encode

        if not user_id or not token_role:
            raise credentials_exception

        if token_role == 'admin':
            user = await db.Admins.find_one({"_id": ObjectId(user_id)})
        if token_role == 'faculty' or token_role is 'hod':
            user = await db.Faculty.find_one({"_id": ObjectId(user_id)})
        if token_role == 'student':
            user = await db.Students.find_one({"_id": ObjectId(user_id)})

        if not user:
            raise credentials_exception

        return {
            "id": str(user["_id"]),
            "name": user.get("name"),
            "email": user.get("email"),
            "role": user.get("role", []),     # actual roles in DB
            "token_role": token_role          # role from token
        }

    except JWTError as e:
        print("JWT Decode Error:", str(e))
        raise credentials_exception

# -----------------------------
# ✅ Role Validators
# -----------------------------
async def faculty_required(current_user: dict = Depends(get_current_user)):
    if current_user["token_role"] != 'faculty':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faculty privileges required.",
        )
    if 'faculty' not in current_user["role"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token role does not match roles assigned to user.",
        )
    return current_user

async def admin_required(current_user: dict = Depends(get_current_user)):
    if current_user["token_role"] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required.",
        )
    if 'admin' not in current_user["role"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token role does not match roles assigned to user.",
        )
    return current_user

async def hod_required(current_user: dict = Depends(get_current_user)):
    if current_user["token_role"] != 'hod':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HOD privileges required.",
        )
    if 'hod' not in current_user["role"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token role does not match roles assigned to user.",
        )
    return current_user

async def student_required(current_user: dict = Depends(get_current_user)):
    if current_user["token_role"] != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student privileges required.",
        )
    if 'student' not in current_user["role"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token role does not match roles assigned to user.",
        )
    return current_user

