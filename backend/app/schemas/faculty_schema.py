# faculty_schema.py
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List
from datetime import date, datetime
from bson import ObjectId
from enum import Enum

ALLOWED_GENDERS = {"male", "female", "other"}

class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"
# --------------- FACULTY - Requests (Incoming Data) ----------------

class FacultyBase(BaseModel):
    email: EmailStr = Field(..., example="faculty@email.com")
    department: str = Field(..., example='CS')
    designation: str = Field(..., example="Assistant Professor")

class FacultyCreateRequest(FacultyBase):
    pass

class FacultyProfileUpdateRequest(BaseModel):
    first_name: str
    last_name: str
    dob: date
    gender: str
    contact_number: str
    photo_url: Optional[str] = None
    office_location: Optional[str] = None
    joining_date: Optional[date] = None
    extra_fields: Optional[dict] = None

    @validator("gender", pre=True)
    def normalize_gender(cls, v):
        from ..utils.gender_normalizer import normalize_gender
        return normalize_gender(v)

class FacultySelfUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    photo_url: Optional[str] = None
    office_location: Optional[str] = None

    @validator("gender", pre=True)
    def normalize_gender(cls, v):
        from ..utils.gender_normalizer import normalize_gender
        return normalize_gender(v)

    class Config:
        extra = "ignore"

class FacultyProfileUpdateByAdmin(FacultyBase, FacultyProfileUpdateRequest):
    pass

class FacultyFilterParamsRequest(BaseModel):
    skip: int = Field(0, ge=0, description="Number of faculty to skip")
    limit: int = Field(10, ge=1, le=100, description="Max number of faculty per page")
    faculty_id: Optional[str] = Field(None, description="Filter by registration number")
    email: Optional[str] = Field(None, description="Filter by email (partial match)")
    first_name: Optional[str] = Field(None, description="Filter by first name (partial match)")
    last_name: Optional[str] = Field(None, description="Filter by last name (partial match)")
    status: Optional[str] = Field(None, description="Filter by status ('active', 'inactive')")
    sort_by: str = Field("created_at", description="Field to sort by")
    sort_order: SortOrder = Field(SortOrder.DESC, description="Sort order: 'asc' or 'desc'")



# --------------- FACULTY - Public & Protected Responses -----------------

class FacultyFullProfileResponse(BaseModel):
    faculty_id: str = Field(..., description="Unique ID for the faculty member")
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    photo_url: Optional[str] = None
    profile_complete: bool = False
    department: Optional[str] = None
    designation: Optional[str] = None
    joining_date: Optional[date] = None
    role: List[str] = []
    status: str
    created_at: datetime
    created_by: Optional[str] = None
    updated_at: datetime
    updated_by: Optional[str] = None

class FacultyListResponse(BaseModel):
    _id: str
    faculty_id: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    status: str
    department: Optional[str] = None
    designation: Optional[str] = None
    contact_number: Optional[str] = None

    class Config:
        validate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda dt: dt.isoformat()}
        arbitrary_types_allowed = True

class FacultyPaginatedResponse(BaseModel):
    data: List[FacultyListResponse]
    total_count: int
    page: int
    limit: int

    class Config:
        json_encoders = {ObjectId: str, datetime: lambda dt: dt.isoformat()}
        arbitrary_types_allowed = True

class FacultyAdminResponse(BaseModel):
    _id: str
    faculty_id: str
    email: Optional[EmailStr]
    first_name: Optional[str]= Field(None)
    last_name: Optional[str]= Field(None)
    dob: Optional[date]= Field(None)
    gender: Optional[str]= Field(None)
    contact_number: Optional[str]= Field(None)
    batch_name: Optional[str] = Field(None)
    status: Optional[str]
    photo_url: Optional[str]= Field(None)



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