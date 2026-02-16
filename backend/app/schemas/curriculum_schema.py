from typing import Optional, List
from pydantic import BaseModel

class SubjectItem(BaseModel):
    subject_code: str
    subject_name: str

class CurriculumItem(BaseModel):
    subjects: List[SubjectItem]

class CurriculumListResponse(BaseModel):
    data: List[CurriculumItem]