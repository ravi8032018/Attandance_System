from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "../../.."))
env_path = os.path.join(PROJECT_ROOT, "backend", ".env")

load_dotenv(dotenv_path=env_path)
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15

def create_access_token(data: dict):
    to_encode = data.copy()
    # print("Encoding token with:", to_encode)
    if "sub" not in to_encode:
        raise ValueError("Missing 'sub' claim in token data")
    if "token_role" not in to_encode:
        raise ValueError("Missing 'token role' claim in token data")

    expire = datetime.now(timezone.utc) + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# print(create_access_token({"sub": '68ab6205e4fa38078b9044d8', "token_role": "Student"}))

