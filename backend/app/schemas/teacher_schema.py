from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date


class Teacher(BaseModel):
    teacher_id: str = Field(..., example="20230001")
    password: str
    first_name: str= Field(..., example="Rahul")
    last_name: str= Field(..., example="Chawda")
    email: Optional[str] = Field(None)
    phone: Optional[str] = Field(None)
    subjects: list[str]                                 # List of Subject._id
    batches: list[str]
    roles: List[str] = ['hod', 'teacher', 'student', 'admin']
    photo_url: Optional[str]
    active: bool = True
    created_at: datetime
    updated_at: datetime