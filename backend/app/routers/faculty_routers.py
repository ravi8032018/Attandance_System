# faculty_routers.py
from fastapi import APIRouter, HTTPException, Path, Depends, status
from backend.app.db import db
from secrets import token_urlsafe
from datetime import timedelta, datetime
from backend.app.schemas.faculty_schema import FacultyCreateRequest, FacultyProfileUpdateRequest, FacultySelfUpdateRequest, ChangePasswordRequest, FacultyFilterParamsRequest, SortOrder, FacultyProfileUpdateByAdmin
from backend.app.schemas.faculty_schema import FacultyAdminResponse, FacultyFullProfileResponse, FacultyPaginatedResponse, FacultyListResponse
from backend.app.utils.dates_normalizer_to_datetime import normalize_dates_for_mongo
from backend.app.utils.hash import hash_password, varify_hash
from backend.app.utils.placeholder_cleaner import clean_placeholders
from backend.app.utils.smtp import send_email_with_link
from backend.app.utils.dependencies import admin_or_hod_required, admin_required, get_current_user, faculty_required
from backend.app.utils.unique_faculty_id import generate_unique_faculty_id
from backend.my_logger import log_event
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from pymongo import ASCENDING, DESCENDING
from pymongo.collation import Collation
import json, os

BACKEND_HOST= os.getenv("BACKEND_HOST")

router = APIRouter(prefix="/faculty", tags=["Faculty"])

@router.post("/create", status_code=status.HTTP_201_CREATED)
async def faculty_create(
        faculty: FacultyCreateRequest,
        current_admin: dict = Depends(admin_required)
):
    faculty_dict = faculty.dict()
    now = datetime.utcnow()

    unique_faculty_id = await generate_unique_faculty_id(faculty.department)

    faculty_dict["faculty_id"] = unique_faculty_id
    faculty_dict["designation"] = faculty.designation.upper()
    faculty_dict["email"] = faculty.email or None
    faculty_dict["department"] = faculty.department.upper() or None
    faculty_dict["created_by"] = current_admin["name"] or current_admin["email"]
    faculty_dict["status"] = "inactive"
    faculty_dict["role"] = ["faculty"]
    faculty_dict["created_at"] = now
    faculty_dict['profile_complete'] = False

    created=[]
    try:
        res = await db['Faculty'].insert_one(faculty_dict)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail=f"Faculty with email {faculty.email} already exists.")

    token = token_urlsafe(32)
    expiry = now + timedelta(hours=48)
    await db["PasswordResetDB"].insert_one({
        "user_id": str(res.inserted_id),
        "token": token,
        "user_type": "faculty",
        "type": "set_password",
        "expires_at": expiry,
        "is_used": False
    })
    # 3. Email the Student with a link to set/reset password
    link = f"{BACKEND_HOST}/reset-fac-password?token={token}"

    email_data = {
        "email_to": faculty.email,
        "faculty_id": unique_faculty_id,
        "link": link,
        "created_at": now.isoformat(),
        "is_sent": False
    }
    created.append(email_data)
    # Write entire batch to file at end of creation
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".."))
    email_cache_dirr_path = os.path.join(PROJECT_ROOT, "cache_local")

    with open(f"{email_cache_dirr_path}/faculty_to_email.json", "r+") as f:
        try:
            data = json.load(f)   # Read existing content
        except json.decoder.JSONDecodeError:
            data = []  # If file is empty or corrupt, start with an empty list

        for dicts in created:
            data.append(dicts)
        f.seek(0)  # Go back to the beginning
        json.dump(data, f, indent=2)  # Write ALL data back, including new item
        f.truncate()

    try:
        send_email_with_link(f"{email_cache_dirr_path}/faculty_to_email.json")
    except Exception as e:
        print("Error sending email:", e)

    log_event("create faculty", user_email=faculty_dict["email"], user_id=faculty_dict["faculty_id"], user_role="faculty", details=f"created by {current_admin['name']}")

    return {
        "message": f"Faculty account created successfully for {faculty_dict['email']} [{faculty_dict['faculty_id']}]"}

@router.get("/faculty-id/{faculty_id}", response_model=FacultyAdminResponse)
async def get_faculty_by_id(
        faculty_id: str = Path(..., description="The unique ID of the faculty member"),
        current_user: dict = Depends(admin_or_hod_required)
):
    faculty = await db['Faculty'].find_one({"faculty_id": faculty_id})
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty member not found")

    log_event("fetch faculty profile", user_email=current_user["email"], user_id=current_user["id"], user_role=current_user['role'], details=f"Admin fetched faculty profile")

    return faculty

@router.post("/complete-profile/{faculty_id}")
async def complete_profile(
        update_data: FacultyProfileUpdateRequest,
        faculty_id: str = Path(..., description="The unique ID of the faculty member"),
        current_user: dict = Depends(get_current_user)
):
    now= datetime.utcnow()
    faculty = await db["Faculty"].find_one({"faculty_id": faculty_id, "status": "active"})
    # print("\nStudent", Student)

    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    # Step 2: Authorization check
    if "admin" not in current_user["role"]:
        if ObjectId(current_user["id"]) != faculty.get("_id"):
            # print(ObjectId(current_user["id"]))
            # print(Student.get("_id"))
            raise HTTPException(status_code=403, detail="Not authorized to update this profile")

    clean_update= clean_placeholders(update_data.dict())

    required_fields = ["first_name", "last_name", "dob", "gender", "contact_number"]
    if not faculty.get("profile_complete", False):
        for field in required_fields:
            if field not in clean_update or not clean_update[field]:
                raise HTTPException(status_code=400, detail=f"{field} is required for profile completion")

    clean_update.update({
        "profile_complete": True,
        "updated_at": now,
        "updated_by": current_user["name"] or current_user["email"],
    })
    # print("\nupdate_dict", clean_update)
    print(clean_update)
    clean_update= normalize_dates_for_mongo(clean_update)
    print("\n\n",clean_update)
    # Step 6: Update in DB
    result = await db["Faculty"].update_one(
        {"faculty_id": faculty_id, "status": "active"},
        {"$set": clean_update}
    )


    log_event("Faculty Profile Update", user_email=current_user["email"], user_name=current_user["name"] if (current_user['name'] is not None) else None, user_id=current_user["id"], user_role=current_user["role"])

    return {"message": "Profile updated successfully"}

@router.get("/me", response_model=FacultyFullProfileResponse)
async def get_current_faculty_profile(
    current_user: dict = Depends(faculty_required)
):
    # print("Starting current_user--> ", current_user)
    # if "faculty" not in current_user.get("role", []):
    #     raise HTTPException(status_code=403, detail="Access denied. Only faculties can view their own profile.")

    faculty_id = current_user.get("id")

    if not faculty_id:
        raise HTTPException(status_code=400, detail="Invalid user session.")

    try:
        faculty = await db["Faculty"].find_one({"_id": ObjectId(faculty_id), "status": "active"})
        print("faculty--> ", faculty)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Cannot find faculty.") from e
    # print("Student--> ", Student)

    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty profile not found.")

    log_event("read own faculty profile", user_email=current_user["email"], user_id=current_user["id"], user_role=current_user['role'], details="accessed own faculty profile")

    return FacultyFullProfileResponse(**faculty)

@router.patch("/me")
async def update_current_faculty_profile(
        update_data: FacultySelfUpdateRequest,
        current_user: dict = Depends(faculty_required)
):
    if "faculty" not in current_user.get("role", []):
        raise HTTPException(status_code=403, detail="Access denied. Only faculty can update their own profile.")
    # print("current user--> ", current_user)

    faculty_id = current_user.get("id")
    if not faculty_id:
        raise HTTPException(status_code=400, detail="Invalid user session.")

    try:
        faculty = await db["Faculty"].find_one({"_id": ObjectId(faculty_id), "status": "active"})
        # print("current Student--> ", Student)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Cannot find faculty.") from e

    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty profile not found.")

    update_dict = update_data.dict(exclude_unset=True)
    clean_update = clean_placeholders(update_dict)
    clean_update = normalize_dates_for_mongo(clean_update)
    clean_update["updated_at"] = datetime.utcnow()
    clean_update["updated_by"] = current_user.get("name") or current_user["email"]

    result = await db["Faculty"].update_one(
        {"_id": ObjectId(faculty_id), "status": "active"},
        {"$set": clean_update}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Faculty profile not found (or no changes made).")
    if result.modified_count == 0 and clean_update:
        # This can happen if the update data is identical to current data
        pass

    updated_faculty = await db["Faculty"].find_one({"_id": ObjectId(faculty_id), "status": "active"})
    if not updated_faculty:
        raise HTTPException(status_code=500, detail="Failed to retrieve updated faculty profile.")

    log_event("update own faculty profile", user_email=current_user["email"], user_id=current_user["id"], user_role=current_user['role'], details=f"updated own profile fields: {list(clean_update.keys())}")

    return "Profile updated successfully"

@router.post("/change-password")
async def change_faculty_password(
        password_data: ChangePasswordRequest,
        current_user: dict = Depends(get_current_user)
):
    if "admin" not in current_user["role"]:
        if "faculty" not in current_user.get("role", []):
            raise HTTPException(status_code=403, detail="Access denied. Only admins and faculties can change their own password.")

    faculty_id = current_user.get("id")
    if not faculty_id:
        raise HTTPException(status_code=400, detail="Invalid user session.")

    try:
        faculty = await db["Faculty"].find_one({"_id": ObjectId(faculty_id), "status": "active"})
    except Exception as e:
        raise HTTPException(status_code=404, detail="Cannot find faculty.") from e
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty account not found.")

    stored_hashed_password = faculty.get("password")

    # Verify old password
    if not stored_hashed_password or not varify_hash(password_data.old_password, stored_hashed_password):
        raise HTTPException(status_code=400, detail="Invalid password.")

    new_hashed_password = hash_password(password_data.new_password)

    result = await db["Faculty"].update_one(
        {"_id": ObjectId(faculty_id), "status": "active"},
        {
            "$set": {
                "password": new_hashed_password,
                "updated_at": datetime.utcnow(),
                "updated_by": current_user.get("name") or current_user["email"],
            }
        }
    )

    if result.matched_count == 0 or result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Password change failed. Please try again.")

    log_event("change faculty password", user_email=current_user["email"], user_id=current_user["id"], user_role=current_user['role'], details="successfully changed faculty password")

    return {"message": "Password changed successfully."}

@router.get("/", response_model=FacultyPaginatedResponse)
async def list_faculty(
    params: FacultyFilterParamsRequest = Depends(),
    current_admin: dict = Depends(admin_or_hod_required)
):
    if params.limit < 1:
        raise HTTPException(status_code=400, detail="Limit or skip must be a positive integer.")
    print(f"DEBUG: Received sort_by = '{params.sort_by}' (type: {type(params.sort_by)})")
    print(f"DEBUG: Received sort_order = '{params.sort_order.value}' (type: {type(params.sort_order)})")

    query_filter = {}
    if params.faculty_id:  # We'll treat this as faculty_id
        query_filter["faculty_id"] = {"$regex": params.faculty_id, "$options": "i"}
    if params.email:
        query_filter["email"] = {"$regex": params.email, "$options": "i"}
    if params.first_name:
        query_filter["first_name"] = {"$regex": params.first_name, "$options": "i"}
    if params.last_name:
        query_filter["last_name"] = {"$regex": params.last_name, "$options": "i"}
    if params.status:
        query_filter["status"] = params.status.lower()

    mongo_sort_order = ASCENDING if params.sort_order == SortOrder.ASC else DESCENDING
    collation = Collation(locale='en', strength=2)
    total_count = await db["Faculty"].count_documents(query_filter)

    faculty_cursor = db["Faculty"].find(query_filter).collation(collation).sort(params.sort_by, mongo_sort_order).skip(params.skip).limit(params.limit)

    faculty_data = [FacultyListResponse(**faculty) async for faculty in faculty_cursor]

    log_event(
        "list faculty",
        user_email=current_admin["email"],
        user_id=current_admin["id"],
        user_role=current_admin['role'],
        details=f"Fetched {len(faculty_data)} faculty. Filters: {query_filter}"
    )

    return FacultyPaginatedResponse(
        data=faculty_data,
        total_count=total_count,
        page=params.skip // params.limit + 1,
        limit=params.limit
    )

@router.patch("/update/{faculty_id}", response_model=FacultyFullProfileResponse)
async def update_faculty_by_admin(
        update_payload: FacultyProfileUpdateByAdmin,
        faculty_id: str = Path(..., description="The faculty ID to update"),
        current_user: dict = Depends(admin_required)
):
    update_data = update_payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")

    update_data["updated_at"] = datetime.utcnow()
    update_data["updated_by"] = current_user.get("name") or current_user["email"]

    update_data = clean_placeholders(update_data)
    update_data = normalize_dates_for_mongo(update_data)

    updated_faculty = await db.Faculty.find_one_and_update(
        {"faculty_id": faculty_id, "status": "active"},
        {"$set": update_data},
    )

    if not updated_faculty:
        faculty_exists = await db.Faculty.find_one({"faculty_id": faculty_id})
        if not faculty_exists:
            raise HTTPException(status_code=404, detail=f"Faculty with ID {faculty_id} not found.")
        else:
            raise HTTPException(status_code=400,
                                detail=f"Faculty with ID {faculty_id} is inactive and cannot be updated.")

    return updated_faculty

@router.delete("/delete/{faculty_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_faculty(
        faculty_id: str = Path(..., description="Faculty ID"),
        current_admin: dict = Depends(admin_required)
):
    updated_faculty = await db.Faculty.find_one_and_update(
        {"faculty_id": faculty_id, "status": "active"},
        {"$set": {"status": "inactive", "updated_at": datetime.utcnow(), "updated_by": current_admin.get('name')}}
    )
@router.get("/faculty-details/{faculty_id}")
async def get_faculty_details(
    faculty_id: str,
    current_user: dict = Depends(get_current_user),
):
    '''Returns real-time workload, assigned subjects, attendance stats, and recent sessions for a specific faculty member.'''
    fac_id_upper = faculty_id.upper()
    fac = await db.Faculty.find_one({"faculty_id": fac_id_upper})
    if not fac:
        fac = await db.Faculty.find_one({"faculty_id": {"$regex": f"^{faculty_id}$", "$options": "i"}})
    
    if not fac:
        raise HTTPException(status_code=404, detail=f"Faculty with ID {faculty_id} not found.")

    fn = fac.get("first_name", "").strip()
    ln = fac.get("last_name", "").strip()
    raw_name = f"{fn} {ln}".strip()
    fac_name = raw_name if raw_name.lower().startswith("dr") else f"Dr. {raw_name}" if raw_name else fac_id_upper

    dept = fac.get("department", "")

    # 1. Fetch assigned subjects from Curriculum
    curr_docs = db.Curriculum.find({"subjects.faculty_id": fac_id_upper})
    assigned_subjects = []

    subj_session_counts = {}
    subj_present_totals = {}
    subj_record_totals = {}

    async for cdoc in curr_docs:
        c_dept = cdoc.get("department", "")
        c_sem = cdoc.get("semester", "")
        for s in cdoc.get("subjects", []):
            if s.get("faculty_id") == fac_id_upper:
                assigned_subjects.append({
                    "subject_code": s.get("subject_code"),
                    "subject_name": s.get("subject_name"),
                    "department": c_dept,
                    "semester": c_sem,
                })

    # 2. Fetch attendance sessions conducted by or for this faculty
    now = datetime.now(timezone.utc)
    date_7_days_ago = now - timedelta(days=7)
    date_30_days_ago = now - timedelta(days=30)

    att_cursor = db.Attendance.find({
        "$or": [
            {"faculty_id": fac_id_upper},
            {"faculty_id": str(fac.get("_id"))}
        ]
    }).sort("date", -1)

    sessions = []
    total_present = 0
    total_records = 0

    weekly_classes = 0
    monthly_classes = 0
    cr_delegated_count = 0
    pending_approvals_count = 0

    async for sess in att_cursor:
        scode = sess.get("subject_code")
        status_val = sess.get("status", "")
        submitted_by = sess.get("submission_details", "faculty")

        if status_val == "pending":
            pending_approvals_count += 1
        if "cr" in str(submitted_by).lower():
            cr_delegated_count += 1

        raw_date = sess.get("date")
        dt_obj = None
        if isinstance(raw_date, datetime):
            dt_obj = raw_date
        elif isinstance(raw_date, str):
            try:
                dt_obj = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
            except Exception:
                dt_obj = None

        if dt_obj:
            if dt_obj.tzinfo is None:
                dt_obj = dt_obj.replace(tzinfo=timezone.utc)
            is_weekly = dt_obj >= date_7_days_ago
            is_monthly = dt_obj >= date_30_days_ago
            dt_str = dt_obj.isoformat()
        else:
            is_weekly = False
            is_monthly = False
            dt_str = str(raw_date or "")

        if is_weekly:
            weekly_classes += 1
        if is_monthly:
            monthly_classes += 1

        recs = sess.get("attendance_records", [])
        p_count = sum(1 for r in recs if r.get("status") == "present")
        a_count = sum(1 for r in recs if r.get("status") == "absent")

        total_present += p_count
        total_records += len(recs)

        if scode:
            subj_session_counts[scode] = subj_session_counts.get(scode, 0) + 1
            subj_present_totals[scode] = subj_present_totals.get(scode, 0) + p_count
            subj_record_totals[scode] = subj_record_totals.get(scode, 0) + len(recs)

        sessions.append({
            "session_id": sess.get("session_id", ""),
            "date": dt_str,
            "subject_code": scode,
            "subject_name": sess.get("subject_name", scode),
            "status": status_val,
            "submitted_by": submitted_by,
            "present_count": p_count,
            "absent_count": a_count,
            "class_size": len(recs)
        })

    for sub in assigned_subjects:
        scode = sub["subject_code"]
        t_sess = subj_session_counts.get(scode, 0)
        p_tot = subj_present_totals.get(scode, 0)
        r_tot = subj_record_totals.get(scode, 0)
        sub["total_sessions"] = t_sess
        sub["avg_attendance_pct"] = round((p_tot / r_tot * 100), 1) if r_tot > 0 else 0.0

    avg_attendance_pct = round((total_present / total_records * 100), 1) if total_records > 0 else 0.0

    return {
        "faculty": {
            "faculty_id": fac_id_upper,
            "name": fac_name,
            "email": fac.get("email", ""),
            "department": dept,
            "designation": fac.get("designation", "Faculty"),
            "status": fac.get("status", "active"),
            "office_location": fac.get("office_location", ""),
            "contact_number": fac.get("contact_number", ""),
            "photo_url": fac.get("photo_url", "")
        },
        "stats": {
            "total_assigned_subjects": len(assigned_subjects),
            "total_classes_conducted": len(sessions),
            "classes_last_7_days": weekly_classes,
            "classes_last_30_days": monthly_classes,
            "avg_attendance_pct": avg_attendance_pct,
            "pending_approvals_count": pending_approvals_count,
            "cr_delegated_count": cr_delegated_count,
            "total_records_marked": total_records
        },
        "assigned_subjects": assigned_subjects,
        "recent_sessions": sessions[:10]
    }

