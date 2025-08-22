# In app/schemas/attendance_schema.py

from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime, date
from enum import Enum

class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LEAVE = "leave"

class GroupByOption(str, Enum):
    STUDENT = "student"
    SUBJECT = "subject"
    FACULTY = "faculty"
    DATE = "date"
    # You can add more later, e.g., "month"

class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"

class SessionStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    MARKED_BY_FACULTY = "marked_by_faculty"

class SubjectCode(str, Enum):
    CSDSC101 = "CSDSC101"
    CSDSC102 = "CSDSC102"
    CSDSC103 = "CSDSC103"
    CSDSC104 = "CSDSC104"

class StudentAttendanceRecord(BaseModel):
    registration_no: str = Field(..., description="The unique registration number of the student.")
    status: AttendanceStatus = Field(..., description="Attendance status of the student.")


# ------------------------- Request --------------------------

class MarkAttendanceByFacultyRequest(BaseModel):
    subject_code: str = Field(..., description="The unique code for the subject/paper.")
    subject_name: str = Field(..., description="The name for the subject/paper.")
    department: str
    semester: str
    class_date: datetime = Field(..., description="The date and time the class was held.")
    attendance_data: List[StudentAttendanceRecord] = Field(..., description="List of students and their attendance status.")

    @validator('subject_code', pre=True)
    def subject_code_validator(cls, value):
        scode= value.replace(' ','').replace('-','').strip()
        return scode

class AttendanceReportFiltersRequest(BaseModel):
    # --- Primary Filters ---
    student_id: Optional[str] = None
    subject_id: Optional[str] = None
    faculty_id: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[str] = None

    # --- Date & Grouping ---
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    group_by: Optional[str] = None  # e.g., "student", "subject"






# ------------------------- Response ------------------------

class AttendanceSessionResponse(BaseModel):
    id: str = Field(..., alias="_id")
    session_id: str
    f_id: str
    subject_code: str
    subject_name: str
    date: datetime
    status: SessionStatus
    attendance_records: List[StudentAttendanceRecord]

    class Config:
        validate_by_name = True
        use_enum_values = True
        json_encoders = {datetime: lambda dt: dt.isoformat()}

class StudentSubjectReportResponse(BaseModel):
    total_classes: int
    present_count: int
    absent_count: int
    excused_count: int
    attendance_percentage: float
    daily_records: List[dict] # A list of {date: "...", status: "..."}





# ------------------------- filters ------------------------
class AttendanceReportFilters(BaseModel):
    # --- Who and What ---
    student_id: Optional[str] = Field(None, description="Filter by a single student's registration_no.")
    subject_id: Optional[str] = Field(None, description="Filter by a single subject's code.")
    faculty_id: Optional[str] = Field(None, description="Filter by the faculty member who took the class.")
    department: Optional[str] = Field(None, description="Filter by academic department.")
    semester: Optional[str] = Field(None, description="Filter by semester.")

    # --- When ---
    start_date: Optional[date] = Field(None, description="Report start date (inclusive).")
    end_date: Optional[date] = Field(None, description="Report end date (inclusive).")

    # --- How to Shape the Data ---
    group_by: Optional[GroupByOption] = Field(None, description="Group results by student, subject, faculty, or date.")
    sort_by: Optional[str] = Field("date", description="Field to sort the results by.")
    sort_order: SortOrder = Field(SortOrder.DESC, description="Sort order: 'asc' or 'desc'.")

    # --- Pagination ---
    page: int = Field(1, ge=1, description="Page number for pagination.")
    limit: int = Field(10, ge=1, le=100, description="Number of items per page.")



