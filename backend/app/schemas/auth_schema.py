import hashlib
import json
import os
import secrets
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, validator

from backend.app.utils.smtp import send_email_with_link


# ----------------------------- REQUESTS ---------------------------

class UserSignUpRequest(BaseModel):
    name: str= Field(..., example="string")
    email: EmailStr = Field(..., example="user@example.com")
    password: str = Field(..., example="string")

class UserSignInRequest(BaseModel):
    email: EmailStr = Field(..., example="user@example.com")
    password: str = Field(..., example="string")

class FacultySignUpRequest(BaseModel):
    name: str= Field(..., example="string")
    email: EmailStr = Field(..., example="faculty@example.com")
    password: str = Field(..., example="fstring")

class FacultySignInRequest(BaseModel):
    email: EmailStr = Field(..., example="faculty@example.com")
    password: str = Field(..., example="fstring")

class StudentSignUpRequest(BaseModel):
    name: str= Field(..., example="string")
    email: EmailStr = Field(..., example="Student@example.com")
    password: str = Field(..., example="sstring")

class StudentSignInRequest(BaseModel):
    email: EmailStr = Field(..., example="Student@example.com")
    password: str = Field(..., example="sstring")

class SetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=64, description="New password for the user.")
    confirm_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ForgotPasswordRequestVerify(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)
    @validator("confirm_password")
    def passwords_match(cls, v, values, **kwargs):
        if "new_password" in values and v != values["new_password"]:
            raise ValueError("Passwords do not match")
        return v

# ---------------------------- RESPONSES ---------------------------


class SignInResponse(BaseModel):
    message: str
    access_token: str
    token_type: str="bearer"
    token_role: str


# -----------------------functions -----------------
OTP_TTL_MINUTES = 10

def _gen_otp() -> str:
    # 6-digit numeric, cryptographically random
    return f"{secrets.randbelow(1_000_000):06d}"

async def _send_reset_email(email: str, OTP: str) -> None:
    now= datetime.utcnow()
    created= []
    email_data = {
        "email_to": email,
        "created_at": now.isoformat(),
        "is_sent": False
    }
    created.append(email_data)
    # Write entire batch to file at end of creation
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".."))
    email_cache_dirr_path = os.path.join(PROJECT_ROOT, "cache_local")

    with open(f"{email_cache_dirr_path}/otp_to_user.json", "r+") as f:
        try:
            data = json.load(f)   # Read existing content
        except json.decoder.JSONDecodeError:
            data = []  # If file is empty or corrupt, start with an empty list

        for dicts in created:
            data.append(dicts)
        f.seek(0)  # Go back to the beginning
        json.dump(data, f, indent=2)  # Write ALL data back, including new item
        f.truncate()

    send_email_with_link(f"{email_cache_dirr_path}/otp_to_user.json", subject="Your password reset code", Body = f"\n Welcome to Department of Computer Science, Assam University Silchar\n\nUse this code to reset your password. It expires in {OTP_TTL_MINUTES} minutes.", OTP=OTP)


