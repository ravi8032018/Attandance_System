from backend.app.db import db
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from backend.app.schemas.curriculum_schema import CurriculumListResponse, CurriculumItem, SubjectItem
from backend.app.utils.dependencies import get_current_user
from bson import ObjectId
from datetime import datetime, timedelta, timezone
router = APIRouter(prefix="/curriculum", tags=["curriculum"])

@router.get("/", response_model=CurriculumListResponse)
async def list_curriculum(
    department: Optional[str] = Query(None, description="Filter by department, e.g. CS"),
    semester: Optional[str] = Query(None, description="Filter by semester, e.g. 1"),
    current_user: dict = Depends(get_current_user),
):
    # print("--> Curriculum request by user:", current_user)
    # Optional: restrict to admin/faculty only
    if "admin" not in current_user["role"]:
        if "faculty" not in current_user.get("role", []):
            if "student" in current_user.get("role", []):
                # Students can only see curriculum for their own department and semester
                student = await db.Students.find_one({"_id": ObjectId(current_user["id"])})
                # student = await student_cursor.to_list(None) 
                # print(f"student: {student}")
                if not student:
                    raise HTTPException(status_code=403, detail="Access denied. Only admins, faculties and Student can see his Student reports.")
                student_dept = student.get("department")
                student_sem = student.get("semester")
                # print(f"Student dept: {student_dept}, sem: {student_sem}")
                if (department and department != student_dept) or (semester and semester != student_sem):
                    raise HTTPException(status_code=403, detail="Access denied.")

    # Build Mongo filter
    query_filter: dict = {}
    if department:
        query_filter["department"] = department
    if semester:
        query_filter["semester"] = semester

    # Build faculty lookup map (active faculty only)
    faculty_map = {}
    async for fac in db.Faculty.find({"status": "active"}, {"faculty_id": 1, "first_name": 1, "last_name": 1, "_id": 0}):
        fid = fac.get("faculty_id")
        if fid:
            fn = fac.get("first_name", "").strip()
            ln = fac.get("last_name", "").strip()
            raw_name = f"{fn} {ln}".strip()
            if raw_name:
                fname = raw_name if raw_name.lower().startswith("dr") else f"Dr. {raw_name}"
            else:
                fname = fid
            faculty_map[fid] = fname

    # Build attendance sessions count lookup map (non-rejected sessions only)
    sessions_count_map = {}
    async for att in db.Attendance.find({"status": {"$nin": ["rejected", "cancelled"]}}, {"subject_code": 1, "_id": 0}):
        scode = att.get("subject_code")
        if scode:
            sessions_count_map[scode] = sessions_count_map.get(scode, 0) + 1

    cursor = db["Curriculum"].find(query_filter)

    items = []
    async for doc in cursor:
        subjs = []
        for s in doc.get("subjects", []):
            fid = s.get("faculty_id")
            fname = faculty_map.get(fid) if fid else None
            scode = s.get("subject_code")
            t_sess = sessions_count_map.get(scode, 0)

            subjs.append(
                SubjectItem(
                    subject_code=scode,
                    subject_name=s.get("subject_name", scode),
                    credits=s.get("credits", 3),
                    type=s.get("type", "Theory"),
                    faculty_id=fid,
                    faculty_name=fname,
                    total_sessions=t_sess,
                )
            )
        items.append(
            CurriculumItem(
                department=doc.get("department", department),
                semester=doc.get("semester", semester),
                subjects=subjs,
            )
        )
    # print("--> subject list returned from /curriculum : ", items)
    return CurriculumListResponse(data=items)

from pydantic import BaseModel
from backend.app.utils.dependencies import get_current_user, admin_or_hod_required
from backend.my_logger import log_event

class AddSubjectRequest(BaseModel):
    department: str
    semester: str
    subject_code: str
    subject_name: str
    credits: Optional[int] = 3
    type: Optional[str] = "Theory"
    faculty_id: Optional[str] = None

class UpdateSubjectRequest(BaseModel):
    department: str
    semester: str
    subject_code: str
    new_subject_name: Optional[str] = None
    new_subject_code: Optional[str] = None
    credits: Optional[int] = None
    type: Optional[str] = None
    faculty_id: Optional[str] = None

class AssignSubjectRequest(BaseModel):
    faculty_id: str
    subject_code: str
    override: Optional[bool] = False

class UnassignSubjectRequest(BaseModel):
    faculty_id: str
    subject_code: str

@router.post("/add-subject")
async def add_subject_to_curriculum(
    body: AddSubjectRequest,
    current_user: dict = Depends(admin_or_hod_required)
):
    dept = body.department.strip().upper()
    sem = str(body.semester).strip()
    scode = body.subject_code.strip().upper()
    sname = body.subject_name.strip()
    fid = body.faculty_id.strip().upper() if body.faculty_id else None

    # Verify if subject_code already exists anywhere in Curriculum
    existing_curr = await db.Curriculum.find_one({"subjects.subject_code": {"$regex": f"^{scode}$", "$options": "i"}})
    if existing_curr:
        raise HTTPException(status_code=400, detail=f"Subject code '{scode}' already exists in Curriculum catalog.")

    new_sub = {
        "subject_code": scode,
        "subject_name": sname,
        "credits": body.credits or 3,
        "type": body.type or "Theory",
        "faculty_id": fid
    }

    curr_doc = await db.Curriculum.find_one({"department": dept, "semester": sem})
    if curr_doc:
        await db.Curriculum.update_one(
            {"_id": curr_doc["_id"]},
            {"$push": {"subjects": new_sub}}
        )
    else:
        new_curr = {
            "department": dept,
            "semester": sem,
            "course": "B.Tech",
            "subjects": [new_sub]
        }
        await db.Curriculum.insert_one(new_curr)

    log_event("add subject to curriculum", user_email=current_user.get("email"), details=f"Added subject {scode} ({sname}) to {dept} Sem {sem}")

    return {"message": f"Successfully added subject {scode} ({sname}) to {dept} Sem {sem}."}

@router.put("/update-subject")
async def update_subject_in_curriculum(
    body: UpdateSubjectRequest,
    current_user: dict = Depends(admin_or_hod_required)
):
    dept = body.department.strip().upper()
    sem = str(body.semester).strip()
    scode = body.subject_code.strip().upper()

    curr_doc = await db.Curriculum.find_one({"department": dept, "semester": sem, "subjects.subject_code": {"$regex": f"^{scode}$", "$options": "i"}})
    if not curr_doc:
        raise HTTPException(status_code=404, detail=f"Subject '{scode}' not found in {dept} Sem {sem}.")

    subjects = curr_doc.get("subjects", [])
    updated = False
    new_code = body.new_subject_code.strip().upper() if body.new_subject_code else scode
    new_name = body.new_subject_name.strip() if body.new_subject_name else None

    for s in subjects:
        if str(s.get("subject_code", "")).upper() == scode:
            if new_code:
                s["subject_code"] = new_code
            if new_name:
                s["subject_name"] = new_name
            if body.credits is not None:
                s["credits"] = body.credits
            if body.type is not None:
                s["type"] = body.type
            if body.faculty_id is not None:
                s["faculty_id"] = body.faculty_id.strip().upper() if body.faculty_id else None
            updated = True
            break

    if updated:
        await db.Curriculum.update_one({"_id": curr_doc["_id"]}, {"$set": {"subjects": subjects}})

    log_event("update subject in curriculum", user_email=current_user.get("email"), details=f"Updated subject {scode} to {new_code}")

    return {"message": f"Successfully updated subject {scode}."}

class DeleteSubjectRequest(BaseModel):
    department: str
    semester: str
    subject_code: str

@router.delete("/delete-subject")
async def delete_subject_from_curriculum(
    body: DeleteSubjectRequest,
    current_user: dict = Depends(admin_or_hod_required)
):
    dept = body.department.strip().upper()
    sem = str(body.semester).strip()
    scode = body.subject_code.strip().upper()

    curr_doc = await db.Curriculum.find_one({"department": dept, "semester": sem, "subjects.subject_code": {"$regex": f"^{scode}$", "$options": "i"}})
    if not curr_doc:
        raise HTTPException(status_code=404, detail=f"Subject '{scode}' not found in {dept} Sem {sem}.")

    active_sessions_count = await db.Attendance.count_documents({"subject_code": {"$regex": f"^{scode}$", "$options": "i"}})
    if active_sessions_count > 0:
        raise HTTPException(status_code=409, detail=f"Cannot delete subject '{scode}'. It has {active_sessions_count} recorded attendance sessions in the database.")

    await db.Curriculum.update_one(
        {"_id": curr_doc["_id"]},
        {"$pull": {"subjects": {"subject_code": {"$regex": f"^{scode}$", "$options": "i"}}}}
    )

    log_event("delete subject from curriculum", user_email=current_user.get("email"), details=f"Deleted subject {scode} from {dept} Sem {sem}", severity="CRITICAL")

    return {"message": f"Successfully deleted subject {scode} from {dept} Sem {sem}."}

@router.get("/subjects")
async def get_subjects_pool(
    department: Optional[str] = Query(None, description="Filter by department, e.g. CS"),
    semester: Optional[str] = Query(None, description="Filter by semester, e.g. 4"),
    current_user: dict = Depends(get_current_user),
):
    '''Returns pool of subjects for a given department and semester.'''
    query_filter: dict = {}
    if department:
        query_filter["department"] = str(department)
    if semester:
        query_filter["semester"] = str(semester)

    # Build faculty lookup map
    faculty_map = {}
    async for fac in db.Faculty.find({"status": "active"}, {"faculty_id": 1, "first_name": 1, "last_name": 1, "_id": 0}):
        fid = fac.get("faculty_id")
        if fid:
            fn = fac.get("first_name", "").strip()
            ln = fac.get("last_name", "").strip()
            raw_name = f"{fn} {ln}".strip()
            faculty_map[fid] = raw_name if raw_name else fid

    cursor = db["Curriculum"].find(query_filter)
    subjects_list = []
    async for doc in cursor:
        for s in doc.get("subjects", []):
            fid = s.get("faculty_id")
            fname = faculty_map.get(fid) if fid else None
            subjects_list.append(
                {
                    "subject_code": s.get("subject_code"),
                    "subject_name": s.get("subject_name", s.get("subject_code")),
                    "credits": s.get("credits", 3),
                    "type": s.get("type", "Theory"),
                    "faculty_id": fid,
                    "faculty_name": fname,
                }
            )
    return {"data": subjects_list}

@router.post("/assign-subject")
async def assign_subject_to_faculty(
    body: AssignSubjectRequest,
    current_user: dict = Depends(admin_or_hod_required)
):
    fid = body.faculty_id.strip().upper()
    scode = body.subject_code.strip().upper()

    # 1. Verify target faculty exists
    fac = await db.Faculty.find_one({"faculty_id": fid})
    if not fac:
        fac = await db.Faculty.find_one({"$or": [{"faculty_id": fid}, {"email": fid.lower()}]})
    if not fac:
        raise HTTPException(status_code=404, detail=f"Faculty with ID '{fid}' not found in database.")

    fn = fac.get("first_name", "").strip()
    ln = fac.get("last_name", "").strip()
    target_fac_name = f"{fn} {ln}".strip() or fid

    # 2. Find subject in Curriculum
    curr_doc = await db.Curriculum.find_one({"subjects.subject_code": {"$regex": f"^{scode}$", "$options": "i"}})
    if not curr_doc:
        raise HTTPException(status_code=404, detail=f"Subject '{scode}' not found in curriculum database.")

    current_assigned_fid = None
    target_subject = None
    for s in curr_doc.get("subjects", []):
        if str(s.get("subject_code", "")).upper() == scode:
            current_assigned_fid = s.get("faculty_id")
            target_subject = s
            break

    # 3. Conflict Check: Is it already assigned to another faculty?
    if current_assigned_fid and str(current_assigned_fid).upper() != fid and not body.override:
        prev_fac = await db.Faculty.find_one({"faculty_id": str(current_assigned_fid).upper()})
        prev_name = str(current_assigned_fid)
        if prev_fac:
            p_fn = prev_fac.get("first_name", "").strip()
            p_ln = prev_fac.get("last_name", "").strip()
            prev_name = f"{p_fn} {p_ln}".strip() or str(current_assigned_fid)

        raise HTTPException(
            status_code=409,
            detail=f"Subject '{scode}' ({target_subject.get('subject_name', scode) if target_subject else scode}) is currently assigned to {prev_name} ({current_assigned_fid}). Reassignment required."
        )

    # 4. Perform update in Curriculum collection
    res = await db.Curriculum.update_one(
        {"subjects.subject_code": {"$regex": f"^{scode}$", "$options": "i"}},
        {"$set": {"subjects.$.faculty_id": fid}}
    )

    log_event(
        "assign subject to faculty",
        user_email=current_user["email"],
        user_id=current_user["id"],
        user_role=current_user["role"],
        details=f"Assigned subject {scode} to faculty {fid} ({target_fac_name})"
    )

    return {
        "message": f"Successfully assigned subject {scode} to {target_fac_name} ({fid}).",
        "faculty_id": fid,
        "faculty_name": target_fac_name,
        "subject_code": scode
    }

@router.delete("/unassign-subject")
async def unassign_subject_from_faculty(
    body: UnassignSubjectRequest,
    current_user: dict = Depends(admin_or_hod_required)
):
    fid = body.faculty_id.strip().upper()
    scode = body.subject_code.strip().upper()

    res = await db.Curriculum.update_one(
        {"subjects.subject_code": {"$regex": f"^{scode}$", "$options": "i"}},
        {"$set": {"subjects.$.faculty_id": None}}
    )

    log_event(
        "unassign subject from faculty",
        user_email=current_user["email"],
        user_id=current_user["id"],
        user_role=current_user["role"],
        details=f"Unassigned subject {scode} from faculty {fid}"
    )

    return {
        "message": f"Successfully removed subject {scode} assignment from {fid}.",
        "faculty_id": fid,
        "subject_code": scode
    }

@router.get("/subject-details/{subject_code}")
async def get_subject_details(
    subject_code: str,
    current_user: dict = Depends(get_current_user),
):
    '''Returns 100% real database analytics for a subject: metadata, assigned faculty, total classes held, weekly & monthly attendance stats, recent attendance sessions, and student roster attendance rates.'''
    # 1. Flexible Curriculum Lookup
    curr_doc = await db.Curriculum.find_one({"subjects.subject_code": {"$regex": f"^{subject_code}$", "$options": "i"}})
    subj_data = {}
    dept = ""
    sem = ""

    if not curr_doc:
        # Fallback search through all curriculum docs
        all_curr = await db.Curriculum.find({}).to_list(None)
        for cdoc in all_curr:
            for s in cdoc.get("subjects", []):
                if s.get("subject_code", "").upper() == subject_code.upper():
                    curr_doc = cdoc
                    subj_data = s
                    break
            if curr_doc:
                break
    else:
        dept = curr_doc.get("department", "")
        sem = curr_doc.get("semester", "")
        for s in curr_doc.get("subjects", []):
            if s.get("subject_code", "").upper() == subject_code.upper():
                subj_data = s
                break

    if curr_doc:
        dept = curr_doc.get("department", dept)
        sem = curr_doc.get("semester", sem)

    faculty_info = None
    fac_id = subj_data.get("faculty_id")
    if fac_id:
        fac = await db.Faculty.find_one({"faculty_id": fac_id, "status": "active"})
        if fac:
            fn = fac.get("first_name", "").strip()
            ln = fac.get("last_name", "").strip()
            raw_name = f"{fn} {ln}".strip()
            fac_name = raw_name if raw_name.lower().startswith("dr") else f"Dr. {raw_name}" if raw_name else fac_id
            faculty_info = {
                "faculty_id": fac_id,
                "name": fac_name,
                "email": fac.get("email", ""),
                "department": fac.get("department", dept),
                "photo_url": fac.get("photo_url") or fac.get("profile_image") or fac.get("avatar") or None
            }

    now = datetime.now(timezone.utc)
    date_7_days_ago = now - timedelta(days=7)
    date_30_days_ago = now - timedelta(days=30)

    # 2. Attendance Sessions Query (case-insensitive subject_code, excluding rejected & cancelled sessions)
    session_query = {
        "subject_code": {"$regex": f"^{subject_code}$", "$options": "i"},
        "status": {"$nin": ["rejected", "cancelled"]}
    }

    sessions = []
    total_present = 0
    total_records = 0

    weekly_present = 0
    weekly_records = 0
    weekly_classes = 0

    monthly_present = 0
    # 3. Build Student Roster specifically enrolled in this Subject
    att_reg_nos = set()
    async for att_doc in db.Attendance.find(session_query, {"attendance_records.registration_no": 1}):
        for rec in att_doc.get("attendance_records", []):
            reg = rec.get("registration_no")
            if reg:
                att_reg_nos.add(reg)

    enrolled_students_map = {}

    sem_list = []
    if sem:
        sem_list = [sem]
        if isinstance(sem, int) or (isinstance(sem, str) and str(sem).isdigit()):
            sem_list = [int(sem), str(sem)]

    # Query active students belonging to this semester and department
    student_query = {
        "status": "active"
    }
    if dept:
        student_query["department"] = {"$regex": f"^{dept}$", "$options": "i"}
    if sem_list:
        student_query["semester"] = {"$in": sem_list}

    student_cursor = db.Students.find(student_query, {"registration_no": 1, "first_name": 1, "last_name": 1, "semester": 1, "department": 1, "_id": 0})
    async for st in student_cursor:
        reg = st.get("registration_no")
        if reg:
            enrolled_students_map[reg] = st

    # Also check att_reg_nos if any student is explicitly marked, but MUST strictly match semester and department
    if att_reg_nos:
        extra_query = {
            "registration_no": {"$in": list(att_reg_nos)},
            "status": "active"
        }
        if dept:
            extra_query["department"] = {"$regex": f"^{dept}$", "$options": "i"}
        if sem_list:
            extra_query["semester"] = {"$in": sem_list}

        extra_cursor = db.Students.find(
            extra_query,
            {"registration_no": 1, "first_name": 1, "last_name": 1, "semester": 1, "department": 1, "_id": 0}
        )
        async for st in extra_cursor:
            reg = st.get("registration_no")
            if reg:
                enrolled_students_map[reg] = st

    enrolled_students = list(enrolled_students_map.values())
    enrolled_count = len(enrolled_students)

    sessions_cursor = db.Attendance.find(session_query).sort("date", -1)

    total_present = 0
    total_records = 0
    weekly_present = 0
    weekly_records = 0
    weekly_classes = 0
    monthly_present = 0
    monthly_records = 0
    monthly_classes = 0

    student_present_counts = {}
    total_session_count = 0

    async for sess in sessions_cursor:
        total_session_count += 1
        recs = sess.get("attendance_records", [])
        p_count = 0

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

        for r in recs:
            reg = r.get("registration_no")
            st = r.get("status")
            if st == "present" or st is None or st == "":
                p_count += 1
                total_present += 1
                if reg:
                    student_present_counts[reg] = student_present_counts.get(reg, 0) + 1
                if is_weekly:
                    weekly_present += 1
                if is_monthly:
                    monthly_present += 1

        # Real session class size is enrolled_count (fallback to len(recs) if 0)
        real_class_size = enrolled_count if enrolled_count > 0 else max(len(recs), p_count)
        real_absent_count = max(real_class_size - p_count, 0)

        total_records += real_class_size
        if is_weekly:
            weekly_records += real_class_size
        if is_monthly:
            monthly_records += real_class_size

        sessions.append({
            "session_id": sess.get("session_id", ""),
            "date": dt_str,
            "status": sess.get("status", "completed"),
            "submitted_by": sess.get("submission_details", "faculty"),
            "present_count": p_count,
            "absent_count": real_absent_count,
            "class_size": real_class_size
        })

    avg_attendance_pct = round((total_present / total_records * 100), 1) if total_records > 0 else 0.0
    weekly_attendance_pct = round((weekly_present / weekly_records * 100), 1) if weekly_records > 0 else 0.0
    monthly_attendance_pct = round((monthly_present / monthly_records * 100), 1) if monthly_records > 0 else 0.0

    student_roster = []
    for st in enrolled_students:
        reg = st.get("registration_no")
        fn = st.get("first_name", "")
        ln = st.get("last_name", "")
        full_name = f"{fn} {ln}".strip() or reg

        p_attended = student_present_counts.get(reg, 0)
        pct = round((p_attended / total_session_count * 100), 1) if total_session_count > 0 else 0.0

        student_roster.append({
            "registration_no": reg,
            "student_name": full_name,
            "attended_classes": p_attended,
            "total_classes": total_session_count,
            "attendance_pct": pct,
            "is_at_risk": pct < 75.0 and total_session_count > 0
        })

    student_roster.sort(key=lambda x: x["attendance_pct"])

    distribution = {
        "tier1_above_75": sum(1 for s in student_roster if s["attendance_pct"] >= 75.0),
        "tier2_above_60": sum(1 for s in student_roster if 60.0 <= s["attendance_pct"] < 75.0),
        "tier3_above_40": sum(1 for s in student_roster if 40.0 <= s["attendance_pct"] < 60.0),
        "tier4_below_40": sum(1 for s in student_roster if s["attendance_pct"] < 40.0),
        "excellent": sum(1 for s in student_roster if s["attendance_pct"] >= 75.0),
        "good": sum(1 for s in student_roster if 60.0 <= s["attendance_pct"] < 75.0),
        "warning": sum(1 for s in student_roster if 40.0 <= s["attendance_pct"] < 60.0),
        "critical": sum(1 for s in student_roster if s["attendance_pct"] < 40.0),
    }

    trend_chart_data = []
    for s in reversed(sessions):
        c_size = s["class_size"]
        p_cnt = s["present_count"]
        pct = round((p_cnt / c_size * 100), 1) if c_size > 0 else 0.0
        trend_chart_data.append({
            "session_id": s["session_id"],
            "date": s["date"],
            "present_pct": pct,
            "present_count": p_cnt,
            "absent_count": s["absent_count"],
            "class_size": c_size,
        })
    return {
        "subject_code": subject_code,
        "subject_name": subj_data.get("subject_name", subject_code),
        "department": dept,
        "semester": sem,
        "faculty": faculty_info,
        "stats": {
            "total_classes": total_session_count,
            "classes_last_7_days": weekly_classes,
            "classes_last_30_days": monthly_classes,
            "avg_attendance_pct": avg_attendance_pct,
            "weekly_attendance_pct": weekly_attendance_pct,
            "monthly_attendance_pct": monthly_attendance_pct,
            "total_records_marked": total_records,
            "enrolled_students_count": len(student_roster)
        },
        "distribution": distribution,
        "trend_chart_data": trend_chart_data,
        "sessions": sessions,
        "student_roster": student_roster
    }

@router.get("/my-subjects-for-sem", response_model=CurriculumListResponse)
async def faculty_subjects_for_sem(
    department = Query(None, description="Filter by department, e.g. CS"),
    semester = Query(None, description="Filter by semester, e.g. 1"),
    Faculty_id = Query(None, description="only use this arg if hod or admin need the faculty's subjects, e.g. CSFAC01"),
    current_user: dict = Depends(get_current_user),
):
    # print("--> Curriculum request by user:", current_user)
    # Optional: restrict to admin/faculty only
    if "admin" not in current_user["role"]:
        if "hod" not in current_user.get("role", []):
            if "faculty" not in current_user.get("role", []):
                if "student" in current_user.get("role", []):
                    raise HTTPException(status_code=403, detail="Access denied.")

    # if not department or not semester:
    #     raise HTTPException(status_code=400, detail="Department and semester are required.")
    
    fac_id_raw = current_user.get("faculty_id") or current_user.get("unique_id")
    if not fac_id_raw and "faculty" in [r.lower() for r in current_user.get("role", [])]:
        fac_doc = await db.Faculty.find_one({"_id": ObjectId(current_user["id"])}) or await db.Faculty.find_one({"email": current_user.get("email")})
        if fac_doc:
            fac_id_raw = fac_doc.get("faculty_id")
    faculty_id = str(fac_id_raw or "").upper()

    if Faculty_id:
        if "admin" not in current_user["role"] and "hod" not in current_user["role"]:
            pass  # faculty can provide their own id or leave blank to get their subjects
        else:
            faculty_id = Faculty_id.upper()
              
    # Build Mongo filter
    query_filter: dict = {}
    if department:
        query_filter["department"] = str(department)
    if semester:
        query_filter["semester"] = str(semester)
    if faculty_id:
        query_filter["subjects.faculty_id"] = faculty_id

    # If no params are provided, query_filter stays {}, so Mongo returns all docs.
    cursor = db["Curriculum"].find(query_filter)

    items: list[CurriculumItem] = []
    async for doc in cursor:
        faculty_subjects = [
            s for s in doc.get("subjects", [])
            if not faculty_id or str(s.get("faculty_id", "")).upper() == faculty_id
        ]
        if faculty_subjects:
            items.append(
                CurriculumItem(
                    department=doc.get("department", department),
                    semester=str(doc.get("semester", semester or "")),
                    subjects=[
                        SubjectItem(
                            subject_code=s["subject_code"],
                            subject_name=s["subject_name"],
                        )
                        for s in faculty_subjects
                    ]
                )
            )

    return CurriculumListResponse(data=items)










@router.get("/update_curriculum_db")
async def update_curriculum():
    pay = {
        "department": "CS",
        "semester": "4",
        "course": "BSC"
    }
    cursor =  await db["Curriculum"].find_one(pay)
    # print("--> docs: ",cursor)
    # docs = await cursor.to_list(length=None)  # await here

    data = docs[0]["subjects"] if docs else None
    # print("--> data: ",data)
    subject_doc = {
        "subjects": {
            subject["subject_code"]: subject["subject_name"]
            for subject in data
        }
    }
    # print("--> subject_doc: ",subject_doc)
    result = await db["Students"].update_many(
        {},  # filter: all documents
        {"$set": subject_doc}
    )
    # print("Matched:", result.matched_count, "Modified:", result.modified_count)


'''
json_data=[
  {
    "_id": "CSSEM1",
    "department": "CS",
    "semester": "1",
    "subjects": [
      { "subject_code": "CSDSC101", "subject_name": "Programming in C", "faculty_id": "CSFAC02" },
      { "subject_code": "CSDSC102", "subject_name": "Digital Logic and Switching Theory", "faculty_id": "CSFAC03" },
      { "subject_code": "CSDSM101", "subject_name": "Mathematics", "faculty_id": "CSFAC04" },
      { "subject_code": "CSIDC101", "subject_name": "Fundamentals of Computer and Applications", "faculty_id": "CSFAC01" },
      { "subject_code": "CSSEC101", "subject_name": "Lab", "faculty_id": "CSFAC05" }
    ]
  },
  {
    "_id": "CSSEM2",
    "department": "CS",
    "semester": "2",
    "subjects": [
      { "subject_code": "CSDSC151", "subject_name": "Python Programming", "faculty_id": "CSFAC01" },
      { "subject_code": "CSDSC152", "subject_name": "Numerical Methods", "faculty_id": "CSFAC07" },
      { "subject_code": "CSDSM151", "subject_name": "Mathematics", "faculty_id": "CSFAC04" },
      { "subject_code": "CSIDC151", "subject_name": "Introduction to Internet Technology", "faculty_id": "CSFAC02" },
      {"subject_code": "CSSEC101", "subject_name": "Lab", "faculty_id": "CSFAC05"}
    ]
  },
  {
    "_id": "CSSEM3",
    "department": "CS",
    "semester": "3",
    "subjects": [
      { "subject_code": "CSDSC201", "subject_name": "Data Structure", "faculty_id": "CSFAC02" },
      { "subject_code": "CSDSC202", "subject_name": "Computer Architecture", "faculty_id": "CSFAC06" },
      { "subject_code": "CSDSM201", "subject_name": "Introduction to Probability and Statistics", "faculty_id": "CSFAC04" },
      { "subject_code": "CSIDC201", "subject_name": "Cyber Security", "faculty_id": "CSFAC08" },
      {"subject_code": "CSSEC201", "subject_name": "Lab", "faculty_id": "CSFAC05"}
    ]
  },
  {
    "_id": "CSSEM4",
    "department": "CS",
    "semester": "4",
    "subjects": [
        {"subject_code": "CSDSC251", "subject_name": "Database Management System", "faculty_id": "CSFAC03"},
        {"subject_code": "CSDSC252", "subject_name": "Microprocessor", "faculty_id": "CSFAC06"},
        {"subject_code": "CSDSC253", "subject_name": "Discrete Mathematics", "faculty_id": "CSFAC04"},
        {"subject_code": "CSDSM252", "subject_name": "Data Communication and Computer Networks", "faculty_id": "CSFAC09"},
        {"subject_code": "CSSEC251", "subject_name": "Lab", "faculty_id": "CSFAC05"}
    ]
  }
]
async def insert_curriculum_in_DB():
    for data in json_data:
        try:
            result = await db["Curriculum"].insert_one(data)
            # print("Inserted Curriculum with id:", result)
        except Exception as e:
            # print("Exception occurred while inserting data into Curriculum collection:", e)
            result = None
        # print(result)
        if not result:
            # print("Error!!! Cannot insert data into database")
        # print("successfully inserted data into database")

'''
