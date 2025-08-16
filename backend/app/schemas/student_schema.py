from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List
from datetime import date, datetime

ALLOWED_GENDERS = {"male", "female", "other"}

# --------------- Requests (Incoming Data) ----------------

class StudentBase(BaseModel):
    email: EmailStr = Field(..., example="student@email.com")
    course: str = Field(..., example="BSc")
    sem: str = Field(..., example="1")
    registration_year: str= Field(...,example="2025")
    department: str= Field(...,example='CS')



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


# --------------- Public Responses (Outgoing Data for all, including student portal) --------

class StudentPublicResponse(BaseModel):
    id: str
    enrollment_no: str
    semester:Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    dob: Optional[date]
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
