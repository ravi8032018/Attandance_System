from pydantic import BaseModel, EmailStr, Field

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
    email: EmailStr = Field(..., example="student@example.com")
    password: str = Field(..., example="sstring")

class StudentSignInRequest(BaseModel):
    email: EmailStr = Field(..., example="student@example.com")
    password: str = Field(..., example="sstring")

class SetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ---------------------------- RESPONSES ---------------------------


class SignInResponse(BaseModel):
    message: str
    access_token: str
    token_type: str="bearer"
    token_role: str
