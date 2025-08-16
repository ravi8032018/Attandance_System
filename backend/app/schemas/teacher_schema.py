from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime, date

ALLOWED_GENDERS = {"male", "female", "other"}

class Teacher(BaseModel):
    teacher_id: str = Field(..., example="20230001")
    password: str
    first_name: str= Field(..., example="Rahul")
    last_name: str= Field(..., example="Chawda")
    gender: Optional[str] = Field(None, example= 'male')
    email: Optional[EmailStr] = Field(None)
    phone: Optional[str] = Field(None)
    subjects: list[str]                                 # List of Subject._id
    batches: list[str]
    roles: List[str] = ['hod', 'teacher', 'student', 'admin']
    photo_url: Optional[str]
    active: bool = True
    created_at: datetime
    updated_at: datetime

    @validator("gender", pre=True)
    def normalize_gender(cls, v):
        if v is None:
            return None
        s = str(v).strip().lower()
        aliases = {
            "m": "male", "male": "male",
            "f": "female", "female": "female",
            "o": "other", "other": "other",
            "non-binary": "other", "nonbinary": "other", "nb": "other",
        }
        s = aliases.get(s, s)
        if s not in ALLOWED_GENDERS:
            raise ValueError(f"gender must be one of: {', '.join(sorted(ALLOWED_GENDERS))}")
        return s