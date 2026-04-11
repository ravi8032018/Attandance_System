from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List
from datetime import date, datetime, timedelta
from bson import ObjectId
from enum import Enum
import hashlib, secrets, os, json

from backend.app.utils.smtp import send_email_with_link

ALLOWED_GENDERS = {"male", "female", "other"}

class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"


# --------------- Requests (Incoming Data) ----------------

class StudentBase(BaseModel):
    email: EmailStr = Field(..., example="Student@email.com")
    course: str = Field(..., example="BSc")
    semester: str = Field(..., example="1")
    registration_year: str= Field(...,example="2025")
    department: str= Field(...,example='CS')
    @validator('course', pre=True)
    def course_validator(cls, value):
        course= value.upper()
        return course

    @validator('department', pre=True)
    def dept_validator(cls, value):
        dept= value.upper()
        return dept

class StudentCreateRequest(StudentBase):
    pass

class StudentBulkCreateRequest(BaseModel):
    course: str = Field(..., example="BSc")
    semester: str = Field(..., example="1")
    registration_year: str= Field(...,example="2025")
    department: str= Field(...,example='CS')
    student_emails: List[EmailStr]

    @validator('course', pre=True)
    def course_validator(cls, value):
        course= value.upper()
        return course

    @validator('department', pre=True)
    def dept_validator(cls, value):
        dept= value.upper()
        return dept

class StudentProfileUpdateRequest(BaseModel):
    # All fields optional for PATCH/PUT
    first_name: str
    last_name:str
    dob: date
    gender: str
    contact_number: str
    photo_url: Optional[str]
    roll_number: Optional[str]
    batch_id: Optional[str]
    batch_name: Optional[str]
    admission_date: Optional[date] = None
    guardian_email: Optional[EmailStr] = None
    parent_name: Optional[str]
    parent_contact: Optional[str]
    extra_fields: Optional[dict] = None

    @validator("gender", pre=True)
    def normalize_gender(cls, v):
        from ..utils.gender_normalizer import normalize_gender
        return normalize_gender(v)

class StudentSelfUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None # Or Gender (Enum)
    contact_number: Optional[str] = None
    photo_url: Optional[str] = None
    guardian_email: Optional[EmailStr] = None

    @validator("gender", pre=True)
    def normalize_gender(cls, v):
        from ..utils.gender_normalizer import normalize_gender
        return normalize_gender(v)

    class Config:
        extra = "ignore"

class StudentFilterParamsRequest(BaseModel):
    skip: int = Field(0, ge=0, description="Number of students to skip")
    limit: int = Field(10, ge=1, le=1000, description="Max number of students per page")
    registration_no: Optional[str] = Field(None, description="Filter by registration number")
    email: Optional[str] = Field(None, description="Filter by email (partial match)")
    first_name: Optional[str] = Field(None, description="Filter by first name (partial match)")
    last_name: Optional[str] = Field(None, description="Filter by last name (partial match)")
    status: Optional[str] = Field(None, description="Filter by status ('active', 'inactive')")
    sort_by: str = Field("created_at", description="Field to sort by")
    sort_order: SortOrder = Field(SortOrder.DESC, description="Sort order: 'asc' or 'desc'")
    semester: Optional[str] = Field(None, description="Filter by semester (1,2,3...)")
    department: Optional[str] = Field(None, description="Sort by department (CS, EE, ME, etc.)")
    subject_code: Optional[str] = Field(None, description="Filter by subject code (CS101, EE202, etc.)")

class StudentProfileUpdateByAdmin(StudentBase, StudentProfileUpdateRequest):
    pass



# --------------- Public Responses (Outgoing Data for all, including Student portal) --------

class StudentAdminResponse(BaseModel):
    id: str
    registration_no: str
    semester:Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    department: Optional[str]
    course: Optional[str]
    roll_number: Optional[str]
    dob: Optional[date]
    gender: Optional[str]
    contact_number: Optional[str]
    email: Optional[EmailStr]
    guardian_email: Optional[EmailStr]
    batch_name: Optional[str]
    status: Optional[str]
    photo_url: Optional[str]

class StudentBulkCreateResponse(BaseModel):
    message: Optional[str]






# --------------- Admin/Protected Responses -----------------

class StudentResponse(StudentBase):
    id: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

class StudentOutResponse(BaseModel):
    message: str

class UpdateResponse(BaseModel):
    student: StudentResponse

class StudentFullProfileResponse(BaseModel):
    registration_no: str = Field(..., description="Unique registration number for the Student")
    email: EmailStr = Field(..., description="Student's email address")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None  # Use date for DOB
    gender: Optional[str] = None # Or Gender (Enum) if you use it
    contact_number: Optional[str] = None
    photo_url: Optional[str] = None
    profile_complete: bool = False # Indicates if mandatory profile fields are filled
    semester: Optional[str] = None
    registration_year: Optional[int] = None
    department: Optional[str] = None
    course: Optional[str] = None
    batch_id: Optional[str] = None # ID of the batch
    batch_name: Optional[str] = None # Name of the batch for display
    admission_date: Optional[date] = None # Use date for admission_date
    role: List[str] = []
    status: str = "inactive" # e.g., active, inactive, suspended
    created_at: datetime
    created_by: Optional[str] = None
    updated_at: datetime
    updated_by: Optional[str] = None

class StudentListResponse(BaseModel):
    _id: str
    registration_no: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    status: str
    semester: Optional[str] = None
    course: Optional[str] = None
    contact_number: Optional[str] = None
    guardian_email: Optional[EmailStr] = None
    roll_number: Optional[str] = None

    class Config:
        validate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }
        arbitrary_types_allowed = True

class StudentPaginatedResponse(BaseModel):
    data: List[StudentListResponse]
    total_count: int
    page: int
    limit: int

    class Config:
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }
        arbitrary_types_allowed = True







# --------------- Change Password --------------------
class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=6, max_length=64, description="Current password of the user.")
    new_password: str = Field(..., min_length=8, max_length=64, description="New password for the user.")
    confirm_password: str = Field(..., description="Confirmation of the new password.")

    @validator("confirm_password")
    def passwords_match(cls, v, values, **kwargs):
        if "new_password" in values and v != values["new_password"]:
            raise ValueError("new_password and confirm_password do not match")
        return v


