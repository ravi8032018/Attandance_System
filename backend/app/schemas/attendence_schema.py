# In app/schemas/attendance_schema.py

from pydantic import BaseModel, Field, validator
from fastapi import Query
from typing import List, Optional, Literal
from datetime import datetime, date
from enum import Enum
import pendulum

Period = Literal["today", "yesterday", "week", "month", "sem"]

class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LEAVE = "leave"

class GroupByOption(str, Enum):
    STUDENT = "Student"
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
    MARKED_BY_CR = "marked_by_cr"

class SubjectCode(str, Enum):
    CSDSC101 = "CSDSC101"
    CSDSC102 = "CSDSC102"
    CSDSC103 = "CSDSC103"
    CSDSC104 = "CSDSC104"

class StudentAttendanceRecord(BaseModel):
    registration_no: str = Field(..., description="The unique registration number of the Student.")
    status: AttendanceStatus = Field(..., description="Attendance status of the Student.")


# ------------------------- Request --------------------------

class MarkAttendanceByFacultyRequest(BaseModel):
    subject_code: str = Field(..., description="The unique code for the subject/paper.")
    subject_name: str = Field(..., description="The name for the subject/paper.")
    department: str
    sem: str
    class_date: datetime = Field(..., description="The date and time the class was held.")
    attendance_data: List[StudentAttendanceRecord] = Field(..., description="List of students and their attendance status.")

    @validator('subject_code', pre=True)
    def subject_code_validator(cls, value):
        scode= value.replace(' ','').replace('-','').upper().strip()
        return scode
    @validator('department', pre=True)
    def dept_validator(cls, value):
        dept= value.replace(' ','').replace('-','').upper().strip()
        return dept

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
    group_by: Optional[str] = None  # e.g., "Student", "subject"

class SubjectAttendanceReportFilter(BaseModel):
    registration_no: str
    subject_code: str

class MarkAttendanceByCRRequest(BaseModel):
    attendance_token: str
    attendance_data: List[StudentAttendanceRecord] = Field(..., description="List of students who were present (or on leave).")

class FacultyToCRRequest(BaseModel):
    subject_code: str = Field(..., description="The unique code for the subject/paper.")
    subject_name: str = Field(..., description="The name for the subject/paper.")
    department: str
    sem: str
    class_date: datetime = Field(..., description="The date and time the class was held.")

    @validator('subject_code', pre=True)
    def subject_code_validator(cls, value):
        scode= value.replace(' ','').replace('-','').upper().strip()
        return scode
    @validator('department', pre=True)
    def dept_validator(cls, value):
        dept= value.replace(' ','').replace('-','').upper().strip()
        return dept

class ApprovalUpdateRequest(BaseModel):
    status: str = Field(..., description="approved | rejected")
    reason: str | None = Field(None, description="Optional reason for rejection/notes")

class StudentStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="present | absent | leave")

class ApprovalsFilterParamsRequest(BaseModel):
    page: int = Field(1, ge=1, description="Page number"),
    size: int = Field(10, ge=1, le=100, description="Page size"),
    subject_code: Optional[str] = Field(None),
    period: Optional[str] = Field("month"),
    sort: str = Field("-created_at", description="Sort field, prefix with '-' for desc"),




# ------------------------- Response ------------------------

class AttendanceSessionResponse(BaseModel):
    id: str = Field(..., alias="_id")
    session_id: str
    faculty_id: str
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
    student_id: Optional[str] = Field(None, description="Filter by a single Student's registration_no.")
    subject_id: Optional[str] = Field(None, description="Filter by a single subject's code.")
    faculty_id: Optional[str] = Field(None, description="Filter by the faculty member who took the class.")
    department: Optional[str] = Field(None, description="Filter by academic department.")
    semester: Optional[str] = Field(None, description="Filter by semester.")

    # --- When ---
    start_date: Optional[date] = Field(None, description="Report start date (inclusive).")
    end_date: Optional[date] = Field(None, description="Report end date (inclusive).")

    # --- How to Shape the Data ---
    group_by: Optional[GroupByOption] = Field(None, description="Group results by Student, subject, faculty, or date.")
    sort_by: Optional[str] = Field("date", description="Field to sort the results by.")
    sort_order: SortOrder = Field(SortOrder.DESC, description="Sort order: 'asc' or 'desc'.")

    # --- Pagination ---
    page: int = Field(1, ge=1, description="Page number for pagination.")
    limit: int = Field(10, ge=1, le=100, description="Number of items per page.")



# ---------------------------- functions ----------------------------
def compute_period_range(
    period: Optional[Period],
    tz: str = "Asia/Kolkata",
    now: Optional[pendulum.DateTime] = None,
):
    if not period:
        return None, None
    now = now or pendulum.now(tz)

    if period == "today":
        start = now.start_of("day")
        end = now.end_of("day").add(microseconds=1)
    elif period == "yesterday":
        y = now.subtract(days=1)
        start = y.start_of("day")
        end = y.end_of("day").add(microseconds=1)
    elif period == "week":
        # ISO week: Monday start, Sunday end in Pendulum
        start = now.start_of("week")
        end = now.end_of("week").add(microseconds=1)
    elif period == "month":
        start = now.start_of("month")
        end = now.end_of("month").add(microseconds=1)
    elif period == "sem":
        # example: last 6 months window
        start = now.start_of("day").subtract(months=6)
        end = now.end_of("day").add(microseconds=1)
    else:
        return None, None
    # Convert to UTC-aware datetimes for MongoDB
    return start.in_timezone("UTC"), end.in_timezone("UTC")


