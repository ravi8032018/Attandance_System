from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date


class Attendance(BaseModel):
    student_id: str # FK: Student._id
    date: date
    status: str # present/absent/late/leave
    period: Optional[int]
    marked_by: str # User._id
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime