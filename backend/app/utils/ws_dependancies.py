# utils/ws_auth.py
from bson import ObjectId
from fastapi import HTTPException, WebSocket, WebSocketException, status
from jose import JWTError, jwt  # or whatever you use
from dotenv import load_dotenv
import os
from backend.app.db import db

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "../../.."))
env_path = os.path.join(PROJECT_ROOT, "backend", ".env")

load_dotenv(dotenv_path=env_path)
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"

async def get_current_user_from_ws(websocket: WebSocket):
    """
    Extract and verify JWT from WebSocket query params and return the user.
    Raises WebSocketException if invalid.
    """
    token = websocket.cookies.get("dept_user_token")
    if not token:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Missing token"
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id= payload.get("sub")
        token_role = payload.get("token_role")  # ← This must match what you encode
        print("--> Token Role:", token_role)
        if user_id is None:
            raise WebSocketException(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Invalid token payload"
            )
    except JWTError:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Invalid token"
        )

    user= None
    if token_role == 'admin':
        user = await db.Admins.find_one({"_id": ObjectId(user_id)})
    if token_role == 'faculty' or token_role == 'hod':
        user = await db.Faculty.find_one({"_id": ObjectId(user_id)})
    if token_role == 'student' or token_role == 'cr':
        user = await db.Students.find_one({"_id": ObjectId(user_id)})
    print("--> user: ", user)
    if not user:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="User not found"
        )
    # Load user from DB; adapt to your ORM
    if not user:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="User not found"
        )

    return user
