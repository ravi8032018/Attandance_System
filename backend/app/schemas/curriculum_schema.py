from typing import Optional, List
from pydantic import BaseModel

class SubjectItem(BaseModel):
    subject_code: str
    subject_name: str
    credits: Optional[int] = 3
    type: Optional[str] = "Theory"
    faculty_id: Optional[str] = None
    faculty_name: Optional[str] = None
    total_sessions: Optional[int] = 0

class CurriculumItem(BaseModel):
    subjects: List[SubjectItem]
    department: Optional[str] = None
    semester: Optional[str] = None

class CurriculumListResponse(BaseModel):
    data: List[CurriculumItem]