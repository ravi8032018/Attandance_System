from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
import json
import os
from bson import ObjectId

from backend.app.db import db
from backend.app.utils.dependencies import admin_required
from backend.app.utils.hash import hash_password
from backend.my_logger import log_event

router = APIRouter(prefix="/admin", tags=["admin-management"])

# Pydantic Schemas
class CreateFacultyAdminRequest(BaseModel):
    faculty_id: str
    first_name: str
    last_name: Optional[str] = ""
    email: EmailStr
    password: str
    department: str
    designation: Optional[str] = "Assistant Professor"
    is_hod: Optional[bool] = False

class UpdateFacultyAdminRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    status: Optional[str] = None
    office_location: Optional[str] = None
    contact_number: Optional[str] = None
    qualification: Optional[str] = None

class CreateStudentAdminRequest(BaseModel):
    registration_no: str
    first_name: str
    last_name: Optional[str] = ""
    email: EmailStr
    password: str
    department: str
    semester: str
    is_cr: Optional[bool] = False

class UpdateStudentAdminRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    semester: Optional[str] = None
    status: Optional[str] = None
    phone_number: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None

# --- Admin System Overview Stats ---
@router.get("/stats")
async def get_admin_system_stats(current_admin: dict = Depends(admin_required)):
    faculty_count = await db.Faculty.count_documents({"status": "active"})
    total_faculty_count = await db.Faculty.count_documents({})
    student_count = await db.Students.count_documents({"status": "active"})
    total_student_count = await db.Students.count_documents({})
    attendance_sessions_count = await db.Attendance.count_documents({})
    curriculum_count = await db.Curriculum.count_documents({})

    departments = await db.Faculty.distinct("department") or ["CS"]

    return {
        "active_faculty_count": faculty_count,
        "total_faculty_count": total_faculty_count,
        "active_student_count": student_count,
        "total_student_count": total_student_count,
        "attendance_sessions_count": attendance_sessions_count,
        "curriculum_count": curriculum_count,
        "departments": departments,
        "system_status": "Operational 100% OK"
    }

# --- System Audit Logs ---
@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    current_admin: dict = Depends(admin_required)
):
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".."))
    cache_path = os.path.join(PROJECT_ROOT, "cache_local", "backend_logs.json")

    logs = []
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r") as f:
                content = f.read()
                raw_entries = content.split("}\n{")
                for raw in raw_entries:
                    cleaned = raw.strip()
                    if not cleaned.startswith("{"):
                        cleaned = "{" + cleaned
                    if not cleaned.endswith("}"):
                        cleaned = cleaned + "}"
                    try:
                        parsed = json.loads(cleaned)
                        logs.append(parsed)
                    except Exception:
                        pass
        except Exception:
            logs = []

    logs.reverse()
    return {"logs": logs[:limit]}

# --- Faculty CRUD ---
@router.post("/faculty")
async def create_faculty(
    body: CreateFacultyAdminRequest,
    current_admin: dict = Depends(admin_required)
):
    fid = body.faculty_id.strip().upper()
    email_lower = body.email.strip().lower()

    existing = await db.Faculty.find_one({"$or": [{"faculty_id": fid}, {"email": email_lower}]})
    if existing:
        raise HTTPException(status_code=400, detail="Faculty ID or Email already registered.")

    hashed = await hash_password(body.password)
    roles = ["faculty"]
    if body.is_hod:
        roles.append("hod")

    doc = {
        "faculty_id": fid,
        "first_name": body.first_name.strip(),
        "last_name": body.last_name.strip(),
        "email": email_lower,
        "password": hashed,
        "department": body.department.strip().upper(),
        "designation": body.designation.strip(),
        "role": roles,
        "status": "active",
        "created_at": datetime.now(timezone.utc)
    }

    res = await db.Faculty.insert_one(doc)

    log_event("admin create faculty", user_email=current_admin["email"], details=f"Created faculty {fid} ({body.first_name} {body.last_name})")

    return {"message": f"Successfully created faculty {fid}.", "id": str(res.inserted_id)}

@router.put("/faculty/{faculty_id}")
async def update_faculty(
    faculty_id: str,
    body: UpdateFacultyAdminRequest,
    current_admin: dict = Depends(admin_required)
):
    fid = faculty_id.strip().upper()
    fac = await db.Faculty.find_one({"faculty_id": fid})
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty member not found.")

    update_fields = {}
    if body.first_name is not None:
        update_fields["first_name"] = body.first_name.strip()
    if body.last_name is not None:
        update_fields["last_name"] = body.last_name.strip()
    if body.email is not None:
        update_fields["email"] = body.email.strip().lower()
    if body.department is not None:
        update_fields["department"] = body.department.strip().upper()
    if body.designation is not None:
        update_fields["designation"] = body.designation.strip()
    if body.status is not None:
        update_fields["status"] = body.status.strip().lower()
    if body.office_location is not None:
        update_fields["office_location"] = body.office_location.strip()
    if body.contact_number is not None:
        update_fields["contact_number"] = body.contact_number.strip()
    if body.qualification is not None:
        update_fields["qualification"] = body.qualification.strip()

    if update_fields:
        await db.Faculty.update_one({"faculty_id": fid}, {"$set": update_fields})

    log_event("admin update faculty", user_email=current_admin["email"], details=f"Updated faculty {fid}")

    return {"message": f"Successfully updated faculty member {fid}."}

@router.delete("/faculty/{faculty_id}")
async def delete_faculty(
    faculty_id: str,
    current_admin: dict = Depends(admin_required)
):
    fid = faculty_id.strip().upper()
    res = await db.Faculty.delete_one({"faculty_id": fid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Faculty member not found.")

    log_event("admin delete faculty", user_email=current_admin["email"], details=f"Deleted faculty {fid}")

    return {"message": f"Successfully deleted faculty member {fid}."}

@router.post("/faculty/{faculty_id}/toggle-hod")
async def toggle_hod_role(
    faculty_id: str,
    current_admin: dict = Depends(admin_required)
):
    fid = faculty_id.strip().upper()
    fac = await db.Faculty.find_one({"faculty_id": fid})
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty member not found.")

    current_roles = [r.lower() for r in fac.get("role", ["faculty"])]
    if "hod" in current_roles:
        new_roles = [r for r in current_roles if r != "hod"]
        msg = f"Revoked HOD role from faculty {fid}."
    else:
        new_roles = current_roles + ["hod"]
        msg = f"Granted HOD role to faculty {fid}."

    await db.Faculty.update_one({"faculty_id": fid}, {"$set": {"role": new_roles}})

    log_event("admin toggle hod role", user_email=current_admin["email"], details=msg)

    return {"message": msg, "new_roles": new_roles}

# --- Student CRUD ---
@router.post("/student")
async def create_student(
    body: CreateStudentAdminRequest,
    current_admin: dict = Depends(admin_required)
):
    reg_no = body.registration_no.strip().upper()
    email_lower = body.email.strip().lower()

    existing = await db.Students.find_one({"$or": [{"registration_no": reg_no}, {"email": email_lower}]})
    if existing:
        raise HTTPException(status_code=400, detail="Student Registration No or Email already registered.")

    hashed = await hash_password(body.password)
    roles = ["student"]
    if body.is_cr:
        roles.append("cr")

    doc = {
        "registration_no": reg_no,
        "first_name": body.first_name.strip(),
        "last_name": body.last_name.strip(),
        "email": email_lower,
        "password": hashed,
        "department": body.department.strip().upper(),
        "semester": str(body.semester).strip(),
        "role": roles,
        "status": "active",
        "created_at": datetime.now(timezone.utc)
    }

    res = await db.Students.insert_one(doc)

    log_event("admin create student", user_email=current_admin["email"], details=f"Created student {reg_no} ({body.first_name} {body.last_name})")

    return {"message": f"Successfully created student {reg_no}.", "id": str(res.inserted_id)}

@router.put("/student/{registration_no}")
async def update_student(
    registration_no: str,
    body: UpdateStudentAdminRequest,
    current_admin: dict = Depends(admin_required)
):
    reg_no = registration_no.strip().upper()
    st = await db.Students.find_one({"registration_no": reg_no})
    if not st:
        raise HTTPException(status_code=404, detail="Student not found.")

    update_fields = {}
    if body.first_name is not None:
        update_fields["first_name"] = body.first_name.strip()
    if body.last_name is not None:
        update_fields["last_name"] = body.last_name.strip()
    if body.email is not None:
        update_fields["email"] = body.email.strip().lower()
    if body.department is not None:
        update_fields["department"] = body.department.strip().upper()
    if body.semester is not None:
        update_fields["semester"] = str(body.semester).strip()
    if body.status is not None:
        update_fields["status"] = body.status.strip().lower()
    if body.phone_number is not None:
        update_fields["phone_number"] = body.phone_number.strip()
    if body.guardian_name is not None:
        update_fields["guardian_name"] = body.guardian_name.strip()
    if body.guardian_phone is not None:
        update_fields["guardian_phone"] = body.guardian_phone.strip()

    if update_fields:
        await db.Students.update_one({"registration_no": reg_no}, {"$set": update_fields})

    log_event("admin update student", user_email=current_admin["email"], details=f"Updated student {reg_no}")

    return {"message": f"Successfully updated student {reg_no}."}

@router.delete("/student/{registration_no}")
async def delete_student(
    registration_no: str,
    current_admin: dict = Depends(admin_required)
):
    reg_no = registration_no.strip().upper()
    res = await db.Students.delete_one({"registration_no": reg_no})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student not found.")

    log_event("admin delete student", user_email=current_admin["email"], details=f"Deleted student {reg_no}")

    return {"message": f"Successfully deleted student {reg_no}."}
