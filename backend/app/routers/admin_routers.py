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
from backend.app.utils.notifications import save_notification
from backend.app.utils.smtp import send_single_email
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

class AdminResetUserPasswordRequest(BaseModel):
    target_type: str
    user_id: str
    new_password: str

class AdminToggleUserStatusRequest(BaseModel):
    target_type: str
    user_id: str
    status: str

class AdminFreezeUserRequest(BaseModel):
    target_type: str
    user_id: str
    action: str
    reason: Optional[str] = None

class AdminTransferHodRequest(BaseModel):
    department: str
    new_hod_faculty_id: str

class AdminPromoteCohortRequest(BaseModel):
    department: str
    current_semester: str
    target_semester: str

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
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    startDate: Optional[str] = Query(None),
    endDate: Optional[str] = Query(None),
    severityLevel: Optional[str] = Query(None),
    actorRole: Optional[str] = Query(None),
    current_admin: dict = Depends(admin_required)
):
    query: dict = {}

    if severityLevel and severityLevel.upper() != "ALL":
        sev_target = severityLevel.upper()
        if sev_target in ["MODIFY", "MODIFICATION"]:
            query["severity"] = {"$in": ["MODIFY", "MODIFICATION"]}
        else:
            query["severity"] = sev_target


    if actorRole and actorRole.lower() != "all":
        query["user_role"] = {"$regex": f"^{actorRole}$", "$options": "i"}

    if startDate or endDate:
        ts_query = {}
        if startDate:
            ts_query["$gte"] = startDate if "T" in startDate else f"{startDate}T00:00:00Z"
        if endDate:
            ts_query["$lte"] = endDate if "T" in endDate else f"{endDate}T23:59:59Z"
        query["timestamp"] = ts_query

    if search and search.strip():
        term = search.strip()
        regex_pattern = {"$regex": term, "$options": "i"}
        query["$or"] = [
            {"action": regex_pattern},
            {"user_email": regex_pattern},
            {"user_name": regex_pattern},
            {"user_id": regex_pattern},
            {"user_role": regex_pattern},
            {"details": regex_pattern},
            {"ip_address": regex_pattern},
            {"user_agent": regex_pattern},
        ]

    db_logs = []
    total_count = 0
    try:
        total_count = await db.AuditLogs.count_documents(query)
        cursor = db.AuditLogs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit)
        db_logs = await cursor.to_list(length=limit)
    except Exception:
        db_logs = []

    # If DB logs found, return them
    if db_logs or total_count > 0:
        return {"logs": db_logs, "total": total_count}

    # Fallback to local JSON file parsing if AuditLogs collection is not populated yet
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".."))
    cache_path = os.path.join(PROJECT_ROOT, "cache_local", "backend_logs.json")

    file_logs = []
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                for line in f:
                    line_str = line.strip()
                    if not line_str:
                        continue
                    try:
                        parsed = json.loads(line_str)
                        if "severity" not in parsed:
                            act = (parsed.get("action") or "").lower()
                            if any(k in act for k in ["login", "signup", "delete", "promote", "revoke", "password", "role"]):
                                parsed["severity"] = "CRITICAL"
                            elif any(k in act for k in ["create", "update", "add", "assign", "unassign", "edit", "save"]):
                                parsed["severity"] = "MODIFICATION"
                            else:
                                parsed["severity"] = "INFO"
                        file_logs.append(parsed)
                    except Exception:
                        pass
        except Exception:
            file_logs = []

    file_logs.reverse()

    filtered = []
    for entry in file_logs:
        if severityLevel and severityLevel.upper() != "ALL":
            if entry.get("severity") != severityLevel.upper():
                continue
        if actorRole and actorRole.lower() != "all":
            if (entry.get("user_role") or "").lower() != actorRole.lower():
                continue
        if startDate:
            s_cmp = startDate if "T" in startDate else f"{startDate}T00:00:00Z"
            if (entry.get("timestamp") or "") < s_cmp:
                continue
        if endDate:
            e_cmp = endDate if "T" in endDate else f"{endDate}T23:59:59Z"
            if (entry.get("timestamp") or "") > e_cmp:
                continue
        if search and search.strip():
            term = search.strip().lower()
            concat_str = f"{entry.get('action','')} {entry.get('user_email','')} {entry.get('user_name','')} {entry.get('user_id','')} {entry.get('details','')} {entry.get('ip_address','')} {entry.get('user_agent','')}".lower()
            if term not in concat_str:
                continue
        filtered.append(entry)

    sliced = filtered[skip : skip + limit]
    return {"logs": sliced, "total": len(filtered)}


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

@router.post("/student/{registration_no}/toggle-cr")
async def toggle_cr_role(
    registration_no: str,
    current_admin: dict = Depends(admin_required)
):
    reg_no = registration_no.strip().upper()
    st = await db.Students.find_one({"registration_no": reg_no})
    if not st:
        raise HTTPException(status_code=404, detail="Student not found.")

    current_roles = [r.lower() for r in st.get("role", ["student"])]
    if "cr" in current_roles:
        new_roles = [r for r in current_roles if r != "cr"]
        msg = f"Revoked CR role from student {reg_no}."
    else:
        new_roles = current_roles + ["cr"]
        msg = f"Granted CR role to student {reg_no}."

    await db.Students.update_one({"registration_no": reg_no}, {"$set": {"role": new_roles}})

    log_event("admin toggle cr role", user_email=current_admin["email"], details=msg)

    return {"message": msg, "new_roles": new_roles}

# --- Phase 1: Security & Credentials Override ---
@router.post("/reset-user-password")
async def admin_reset_user_password(
    body: AdminResetUserPasswordRequest,
    current_admin: dict = Depends(admin_required)
):
    target_type = body.target_type.strip().lower()
    uid = body.user_id.strip().upper()
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
    
    hashed = await hash_password(body.new_password)
    
    if target_type == "faculty":
        fac = await db.Faculty.find_one({"faculty_id": uid})
        if not fac:
            raise HTTPException(status_code=404, detail=f"Faculty with ID '{uid}' not found.")
        await db.Faculty.update_one({"faculty_id": uid}, {"$set": {"password": hashed, "status": "active"}})
        msg = f"Successfully reset password for Faculty {uid}."
    elif target_type == "student":
        st = await db.Students.find_one({"registration_no": uid})
        if not st:
            raise HTTPException(status_code=404, detail=f"Student with Registration No '{uid}' not found.")
        await db.Students.update_one({"registration_no": uid}, {"$set": {"password": hashed, "status": "active"}})
        msg = f"Successfully reset password for Student {uid}."
    else:
        raise HTTPException(status_code=400, detail="Invalid target_type. Must be 'faculty' or 'student'.")
    
    log_event("admin reset user password", user_email=current_admin["email"], details=msg, severity="CRITICAL")
    return {"message": msg}

@router.post("/toggle-user-status")
async def admin_toggle_user_status(
    body: AdminToggleUserStatusRequest,
    current_admin: dict = Depends(admin_required)
):
    target_type = body.target_type.strip().lower()
    uid = body.user_id.strip().upper()
    st_val = body.status.strip().lower()
    
    if st_val not in ["active", "inactive", "suspended", "frozen"]:
        raise HTTPException(status_code=400, detail="Status must be 'active', 'inactive', 'frozen', or 'suspended'.")
    
    if target_type == "faculty":
        fac = await db.Faculty.find_one({"faculty_id": uid})
        if not fac:
            raise HTTPException(status_code=404, detail=f"Faculty with ID '{uid}' not found.")
        await db.Faculty.update_one({"faculty_id": uid}, {"$set": {"status": st_val}, "$unset": {"account_status": ""}})
        msg = f"Updated status of Faculty {uid} to '{st_val}'."
    elif target_type == "student":
        st = await db.Students.find_one({"registration_no": uid})
        if not st:
            raise HTTPException(status_code=404, detail=f"Student with Registration No '{uid}' not found.")
        await db.Students.update_one({"registration_no": uid}, {"$set": {"status": st_val}, "$unset": {"account_status": ""}})
        msg = f"Updated status of Student {uid} to '{st_val}'."
    else:
        raise HTTPException(status_code=400, detail="Invalid target_type. Must be 'faculty' or 'student'.")
    
    log_event("admin toggle user status", user_email=current_admin["email"], details=msg, severity="MODIFICATION")
    return {"message": msg, "status": st_val}

@router.get("/faculty/{faculty_id}/active-courses-check")
async def check_faculty_active_courses(
    faculty_id: str,
    current_admin: dict = Depends(admin_required)
):
    fid = faculty_id.strip().upper()
    count = 0
    async for curr in db.Curriculum.find({"$or": [{"Faculty_id": fid}, {"subjects.Faculty_id": fid}]}):
        subs = curr.get("subjects", [])
        if not subs:
            if str(curr.get("Faculty_id", "")).upper() == fid:
                count += 1
        else:
            for s in subs:
                if str(s.get("Faculty_id", "")).upper() == fid:
                    count += 1
    return {"faculty_id": fid, "active_courses_count": count}

@router.post("/freeze-user")
async def admin_freeze_user(
    body: AdminFreezeUserRequest,
    current_admin: dict = Depends(admin_required)
):
    target_type = body.target_type.strip().lower()
    uid = body.user_id.strip().upper()
    act = body.action.strip().upper()
    reason = (body.reason or "").strip()
    
    if act not in ["FREEZE", "UNFREEZE"]:
        raise HTTPException(status_code=400, detail="Action must be 'FREEZE' or 'UNFREEZE'.")
    if act == "FREEZE" and not reason:
        raise HTTPException(status_code=400, detail="A reason for suspension is required.")

    now_iso = datetime.now(timezone.utc).isoformat()
    new_status = "frozen" if act == "FREEZE" else "active"
    update_doc = {
        "status": new_status,
        "status_reason": reason if act == "FREEZE" else None,
        "status_updated_at": now_iso
    }

    user_email = ""
    user_role = target_type

    if target_type in ["faculty", "hod"]:
        fac = await db.Faculty.find_one({"faculty_id": uid})
        if not fac:
            raise HTTPException(status_code=404, detail=f"Faculty member '{uid}' not found.")
        
        # Check HoD cryostasis rule
        roles = [str(r).lower() for r in fac.get("role", [])]
        if "hod" in roles and target_type != "hod":
            user_role = "hod"
        
        if "hod" in roles:
            # Enforce that only Admin can freeze an HoD
            admin_roles = [str(r).lower() for r in current_admin.get("role", ["admin"])]
            if "admin" not in admin_roles:
                raise HTTPException(status_code=403, detail="Only Super Admin / System Admin can freeze an HoD account.")

        await db.Faculty.update_one({"faculty_id": uid}, {"$set": update_doc, "$unset": {"account_status": ""}})
        user_email = fac.get("email", "")

    elif target_type == "student":
        st = await db.Students.find_one({"registration_no": uid})
        if not st:
            raise HTTPException(status_code=404, detail=f"Student '{uid}' not found.")
        await db.Students.update_one({"registration_no": uid}, {"$set": update_doc, "$unset": {"account_status": ""}})
        user_email = st.get("email", "")
    else:
        raise HTTPException(status_code=400, detail="Invalid target_type. Must be 'faculty', 'student', or 'hod'.")

    log_action = "ACCOUNT FROZEN" if act == "FREEZE" else "ACCOUNT UNFROZEN"
    log_event(
        log_action,
        user_email=user_email,
        user_id=uid,
        user_role=user_role,
        details=f"Reason: {reason}" if act == "FREEZE" else "Account unfrozen by admin",
        severity="CRITICAL"
    )

    # 1. In-App & Real-time Notification
    target_user_id = str(fac["_id"]) if (target_type in ["faculty", "hod"] and fac) else (str(st["_id"]) if (target_type == "student" and st) else uid)
    user_name = f"{fac.get('first_name', '')} {fac.get('last_name', '')}".strip() if target_type in ["faculty", "hod"] else f"{st.get('first_name', '')} {st.get('last_name', '')}".strip()
    user_name = user_name or uid

    notif_title = "Account Suspended ❄️" if act == "FREEZE" else "Account Reactivated ☀️"
    notif_body = (
        f"Your account ({user_email}) has been frozen by the System Administrator. Reason: {reason}"
        if act == "FREEZE"
        else f"Your account ({user_email}) has been reactivated by the System Administrator."
    )
    
    try:
        await save_notification(
            user_id=target_user_id,
            type="account_frozen" if act == "FREEZE" else "account_unfrozen",
            title=notif_title,
            body=notif_body,
            data={"reason": reason, "updated_at": now_iso, "status": new_status},
            send_ws=True
        )
    except Exception as e:
        print(f"[Freeze Notif Error] {e}")

    # 2. Email Dispatch via existing SMTP system
    email_subject = f"Official Notice: Account {'Suspended' if act == 'FREEZE' else 'Reactivated'} - Assam University CS Department"
    email_body = (
        f"Dear {user_name},\n\n"
        f"This is an official communication regarding your account ({user_email}) at Assam University Department of Computer Science.\n\n"
        f"STATUS UPDATE: {'SUSPENDED / FROZEN' if act == 'FREEZE' else 'REACTIVATED / ACTIVE'}\n"
        f"DATE & TIME: {now_iso}\n"
        f"REASON: {reason if act == 'FREEZE' else 'Account restored by System Administrator'}\n\n"
        f"{'If you have any questions, please contact the System Administrator or Head of Department.' if act == 'FREEZE' else 'You may now log in to access your workspace.'}\n\n"
        f"Best regards,\nAssam University CS Department Administration"
    )
    try:
        send_single_email(to_email=user_email, subject=email_subject, body=email_body)
    except Exception as e:
        print(f"[Freeze Email Error] {e}")

    msg = f"Account for {user_email or uid} successfully {'suspended' if act == 'FREEZE' else 'reactivated'}."
    return {
        "message": msg,
        "status": new_status,
        "status_reason": update_doc["status_reason"],
        "status_updated_at": now_iso
    }

@router.post("/faculty/transfer-hod")
async def admin_transfer_hod(
    body: AdminTransferHodRequest,
    current_admin: dict = Depends(admin_required)
):
    dept = body.department.strip().upper()
    target_fid = body.new_hod_faculty_id.strip().upper()
    
    # 1. Verify target faculty exists
    target_fac = await db.Faculty.find_one({"faculty_id": target_fid})
    if not target_fac:
        raise HTTPException(status_code=404, detail=f"Faculty member '{target_fid}' not found.")
    
    # 2. Revoke HOD role from any current HOD in this department
    async for prev in db.Faculty.find({"department": dept, "role": {"$in": ["hod", "HOD"]}}):
        p_roles = [r for r in prev.get("role", []) if str(r).lower() != "hod"]
        if not p_roles:
            p_roles = ["faculty"]
        await db.Faculty.update_one({"_id": prev["_id"]}, {"$set": {"role": p_roles}})
    
    # 3. Grant HOD role to target faculty
    t_roles = list(set([r.lower() for r in target_fac.get("role", ["faculty"])] + ["hod"]))
    await db.Faculty.update_one({"faculty_id": target_fid}, {"$set": {"role": t_roles, "department": dept}})
    
    fn = target_fac.get("first_name", "")
    ln = target_fac.get("last_name", "")
    msg = f"Successfully appointed Dr. {fn} {ln} ({target_fid}) as HOD for {dept} department."
    log_event("admin transfer hod role", user_email=current_admin["email"], details=msg, severity="CRITICAL")
    return {"message": msg}

# --- Phase 2: Cohort Promotion ---
@router.post("/students/promote-cohort")
async def admin_promote_cohort(
    body: AdminPromoteCohortRequest,
    current_admin: dict = Depends(admin_required)
):
    dept = body.department.strip().upper()
    curr_sem = str(body.current_semester).strip()
    target_sem = str(body.target_semester).strip()
    
    # Match students in department and current semester
    query = {"department": dept, "semester": {"$in": [curr_sem, int(curr_sem) if curr_sem.isdigit() else curr_sem]}}
    matching_count = await db.Students.count_documents(query)
    
    if matching_count == 0:
        raise HTTPException(status_code=404, detail=f"No active students found in {dept} Semester {curr_sem}.")
    
    update_data = {"semester": target_sem}
    if target_sem.lower() == "graduated":
        update_data["status"] = "graduated"
    
    res = await db.Students.update_many(query, {"$set": update_data})
    
    msg = f"Successfully promoted {res.modified_count} students in {dept} from Semester {curr_sem} to {target_sem}."
    log_event("admin promote cohort", user_email=current_admin["email"], details=msg, severity="CRITICAL")
    return {"message": msg, "promoted_count": res.modified_count}
