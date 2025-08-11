from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import date, datetime

# --------------- Requests (Incoming Data) ----------------

class StudentBase(BaseModel):
    email: EmailStr = Field(..., example="student@email.com")
    registration_no: Optional[str] = Field(..., example="20230001")
    semester: str = Field(..., example="3")



    # first_name: str = Field(..., example="Aryan")
    # last_name: str = Field(..., example="Singh")
    # contact_number: str = Field(None, example="9999988888")
    # current_address: Optional[str] = Field(None)
    # parent_name: Optional[str] = Field(None, example="Puneet Singh")
    # parent_contact: Optional[str] = Field(None, example="+91-9876543210")
    # photo_url: Optional[str] = Field(None, example="https://...")
    # roll_number: Optional[str] = Field(None, example="21")

class StudentCreateRequest(StudentBase):
    pass

class StudentBulkCreateRequest(BaseModel):
    course: str = Field(..., example="BSc")
    sem: str = Field(..., example="1")
    registration_year: str= Field(...,example="2025")
    department: str= Field(...,example='CS')
    student_emails: List[EmailStr]

class StudentUpdateRequest(BaseModel):
    # All fields optional for PATCH/PUT
    first_name: Optional[str]
    last_name: Optional[str]
    date_of_birth: Optional[date]
    gender: Optional[str]
    contact_number: Optional[str]
    email: Optional[EmailStr]
    address: Optional[str]
    parent_name: Optional[str]
    parent_contact: Optional[str]
    batch_id: Optional[str]
    batch_name: Optional[str]
    admission_date: Optional[date]
    status: Optional[str]
    photo_url: Optional[str]
    guardian_email: Optional[EmailStr]
    roll_number: Optional[str]
    extra_fields: Optional[dict] = None

# --------------- Public Responses (Outgoing Data for all, including student portal) --------

class StudentPublicResponse(BaseModel):
    id: str
    enrollment_no: str
    first_name: str
    last_name: str
    date_of_birth: Optional[date]
    gender: Optional[str]
    contact_number: Optional[str]
    email: Optional[EmailStr]
    batch_name: Optional[str]
    photo_url: Optional[str]

class PublicStudentListResponse(BaseModel):
    message: str
    total: int
    skip: int
    limit: int
    students: List[StudentPublicResponse]

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

# If you ever add attendance summaries, subjects, etc., you can add fields here.
