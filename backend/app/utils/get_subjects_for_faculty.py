from backend.app.db import db
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from backend.app.schemas.curriculum_schema import CurriculumListResponse, CurriculumItem, SubjectItem
from backend.app.utils.dependencies import get_current_user
from bson import ObjectId

async def get_faculty_subject_codes_for_dept_sem(unique_faculty_id: str, department: str | None = None, semester: str | None = None) -> list[str]:
    """
    Returns all subject_codes in Curriculum assigned to this faculty.
    If department/semester are provided, restrict to them; otherwise search all.
    """
    curriculum_filter: dict = {
        "subjects.faculty_id": unique_faculty_id
    }
    if department:
        curriculum_filter["department"] = str(department)
    if semester:
        curriculum_filter["semester"] = str(semester)
    print(f"DEBUG: Curriculum filter for faculty {unique_faculty_id}: {curriculum_filter}")
    
    cursor = db["Curriculum"].find(curriculum_filter)

    subject_codes: set[str] = set()
    async for doc in cursor:
        for s in doc.get("subjects", []):
            if s.get("faculty_id") == unique_faculty_id:
                code = s.get("subject_code")
                if code:
                    subject_codes.add(code)

    return list(subject_codes)