from fastapi import Cookie, HTTPException, status, Request
from bson import ObjectId


from backend.app.db import db
from backend.app.utils.jwt import verify_token


async def verify_cookie(request: Request, dept_user_token: str | None = Cookie(default=None)):
    # print("--> dept_user_token", dept_user_token)
    # print("\n--> Cookie header:", request.headers.get("cookie"))

    if not dept_user_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    payload = verify_token(dept_user_token)
    # print("--> payload", payload)

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid subject")

    token_role = payload.get("token_role")
    if not token_role or token_role == '':
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid subject")
    user = None
    if token_role == 'student':
        user = await db.Students.find_one({"_id": ObjectId(sub)})
    if token_role == 'faculty':
        user = await db.Faculty.find_one({"_id": ObjectId(sub)})
    if token_role == 'admin':
        user = await db.Admins.find_one({"_id": ObjectId(sub)})

    # print("--> user", user)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return {
        "message": "cookie varified",
    }
