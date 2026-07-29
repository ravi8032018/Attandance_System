from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Optional, List, Any
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from bson import ObjectId
from backend.app.db import db
from backend.app.utils.dependencies import get_current_user
from backend.app.utils.session_aggregator import get_enrolled_class_size
from backend.app.utils.notifications import save_notification

router = APIRouter(prefix="/reports", tags=["reports"])

def is_session_in_duration(dt_obj: Optional[datetime], duration: Any, now: datetime) -> bool:
    if not duration or not isinstance(duration, str) or duration.lower() in ["semester", "all"]:
        return True
    if not dt_obj:
        return False
    if dt_obj.tzinfo is None:
        dt_obj = dt_obj.replace(tzinfo=timezone.utc)
    
    start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    d_lower = duration.lower()
    if d_lower == "today":
        return dt_obj >= start_today
    elif d_lower == "yesterday":
        start_yesterday = start_today - timedelta(days=1)
        return start_yesterday <= dt_obj < start_today
    elif d_lower == "week":
        return dt_obj >= (now - timedelta(days=7))
    elif d_lower == "month":
        return dt_obj >= (now - timedelta(days=30))
    return True

async def get_matching_subjects(
    dept_filter: Optional[str],
    semester: Optional[str],
    subject_code: Optional[str],
    faculty_id: Optional[str] = None
) -> set:
    matching_subjects = set()
    if subject_code and subject_code.lower() != "all":
        s_target = subject_code.strip().upper()
        matching_subjects.add(s_target)
        async for cdoc in db.Curriculum.find({}):
            for s in cdoc.get("subjects", []):
                scode = str(s.get("subject_code", "")).strip().upper()
                if scode and (scode == s_target or scode.endswith(s_target) or s_target.endswith(scode)):
                    matching_subjects.add(scode)
    elif faculty_id:
        f_target = faculty_id.strip().upper()
        async for cdoc in db.Curriculum.find({}):
            c_dept = cdoc.get("department", "")
            c_sem = str(cdoc.get("semester", ""))
            dept_match = not dept_filter or c_dept.upper() == dept_filter.upper()
            sem_match = not semester or not isinstance(semester, str) or semester.lower() == "all" or c_sem == str(semester)
            if dept_match and sem_match:
                for s in cdoc.get("subjects", []):
                    fid = str(s.get("faculty_id", "")).strip().upper()
                    if fid == f_target:
                        scode = s.get("subject_code")
                        if scode:
                            matching_subjects.add(scode.strip().upper())
    else:
        async for cdoc in db.Curriculum.find({}):
            c_dept = cdoc.get("department", "")
            c_sem = str(cdoc.get("semester", ""))
            dept_match = not dept_filter or c_dept.upper() == dept_filter.upper()
            sem_match = not semester or not isinstance(semester, str) or semester.lower() == "all" or c_sem == str(semester)
            if dept_match and sem_match:
                for s in cdoc.get("subjects", []):
                    scode = s.get("subject_code")
                    if scode:
                        matching_subjects.add(scode.strip().upper())
    return matching_subjects

@router.get("/overview")
async def get_reports_overview(
    department: Optional[str] = Query(None, description="Department code, e.g. CS"),
    semester: Optional[str] = Query(None, description="Semester number, e.g. 4"),
    subject_code: Optional[str] = Query(None, description="Subject code, e.g. CSDSM252"),
    faculty_id: Optional[str] = Query(None, description="Faculty ID to filter assigned subjects"),
    duration: Optional[str] = Query("semester", description="Duration vector: today, yesterday, week, month, semester"),
    current_user: dict = Depends(get_current_user),
):
    '''Returns overview metrics for department or faculty reports dashboard.'''
    user_roles = [r.lower() for r in current_user.get("role", [])]
    dept_filter = department
    if not dept_filter and ("hod" in user_roles or "faculty" in user_roles):
        dept_filter = current_user.get("department", "CS")

    matching_subjects = await get_matching_subjects(dept_filter, semester, subject_code, faculty_id)

    # Build attendance query
    att_query = {"status": {"$nin": ["rejected", "cancelled"]}}

    total_sessions = 0
    total_present = 0
    total_records = 0

    now = datetime.now(timezone.utc)
    date_7_days_ago = now - timedelta(days=7)
    date_30_days_ago = now - timedelta(days=30)
    weekly_classes = 0
    monthly_classes = 0

    async for sess in db.Attendance.find(att_query):
        scode = str(sess.get("subject_code", "")).strip().upper()
        sess_dept = str(sess.get("department", "")).strip().upper()
        sess_sem = str(sess.get("semester", "")).strip()

        if matching_subjects:
            if scode not in matching_subjects:
                continue
        else:
            if dept_filter and sess_dept and sess_dept != dept_filter.upper():
                continue
            if semester and semester.lower() != "all" and sess_sem and sess_sem != str(semester):
                continue

        raw_date = sess.get("date")
        dt_obj = None
        if isinstance(raw_date, datetime):
            dt_obj = raw_date
        elif isinstance(raw_date, str):
            try:
                dt_obj = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
            except Exception:
                dt_obj = None

        if not is_session_in_duration(dt_obj, duration or "semester", now):
            continue

        total_sessions += 1

        if dt_obj:
            if dt_obj.tzinfo is None:
                dt_obj = dt_obj.replace(tzinfo=timezone.utc)
            if dt_obj >= date_7_days_ago:
                weekly_classes += 1
            if dt_obj >= date_30_days_ago:
                monthly_classes += 1

        recs = sess.get("attendance_records", [])
        p_cnt = sum(1 for r in recs if r.get("status") == "present")

        s_dept = sess.get("department", dept_filter)
        s_sem = sess.get("semester", semester)
        real_class_size = await get_enrolled_class_size(db, subject_code=scode, department=s_dept, semester=s_sem, records_count=len(recs))

        total_present += p_cnt
        total_records += real_class_size

    dept_mean_pct = round((total_present / total_records * 100), 1) if total_records > 0 else 0.0

    # Calculate defaulters count (< 75%)
    stu_query = {"status": "active"}
    if dept_filter:
        stu_query["department"] = {"$regex": f"^{dept_filter}$", "$options": "i"}
    if semester and semester.lower() != "all":
        if str(semester).isdigit():
            stu_query["$or"] = [{"semester": str(semester)}, {"semester": int(semester)}]
        else:
            stu_query["semester"] = str(semester)

    active_students_count = await db.Students.count_documents(stu_query)

    student_stats = {}
    async for sess in db.Attendance.find(att_query):
        scode = str(sess.get("subject_code", "")).strip().upper()
        sess_dept = str(sess.get("department", "")).strip().upper()
        sess_sem = str(sess.get("semester", "")).strip()

        if matching_subjects:
            if scode not in matching_subjects:
                continue
        else:
            if dept_filter and sess_dept and sess_dept != dept_filter.upper():
                continue
            if semester and semester.lower() != "all" and sess_sem and sess_sem != str(semester):
                continue

        raw_date = sess.get("date")
        dt_obj = None
        if isinstance(raw_date, datetime):
            dt_obj = raw_date
        elif isinstance(raw_date, str):
            try:
                dt_obj = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
            except Exception:
                dt_obj = None

        if not is_session_in_duration(dt_obj, duration or "semester", now):
            continue

        for r in sess.get("attendance_records", []):
            reg = r.get("registration_no")
            st = r.get("status")
            if reg:
                if reg not in student_stats:
                    student_stats[reg] = {"present": 0, "total": 0}
                student_stats[reg]["total"] += 1
                if st == "present" or st is None or st == "":
                    student_stats[reg]["present"] += 1

    defaulters_count = 0
    async for stu in db.Students.find(stu_query, {"registration_no": 1}):
        reg = stu.get("registration_no")
        if reg and reg in student_stats:
            stat = student_stats[reg]
            pct = (stat["present"] / stat["total"] * 100) if stat["total"] > 0 else 100.0
            if pct < 75.0:
                defaulters_count += 1

    duration_str = str(duration.default) if hasattr(duration, "default") else str(duration or "semester")

    return {
        "department": dept_filter,
        "semester": semester or "all",
        "subject_code": subject_code or "all",
        "duration": duration_str,
        "mean_attendance_pct": dept_mean_pct,
        "total_sessions": total_sessions,
        "weekly_classes": weekly_classes,
        "monthly_classes": monthly_classes,
        "total_marked_records": total_records,
        "total_active_students": active_students_count,
        "defaulters_count": defaulters_count,
    }

@router.get("/defaulters")
async def get_defaulters_list(
    department: Optional[str] = Query(None, description="Department code, e.g. CS"),
    semester: Optional[str] = Query(None, description="Semester number, e.g. 4"),
    subject_code: Optional[str] = Query(None, description="Subject code, e.g. CSDSM252"),
    faculty_id: Optional[str] = Query(None, description="Faculty ID to filter assigned subjects"),
    duration: Optional[str] = Query("semester", description="Duration vector: today, yesterday, week, month, semester"),
    threshold: float = Query(75.0, description="Attendance percentage threshold cutoff (e.g. 75.0, 60.0)"),
    current_user: dict = Depends(get_current_user),
):
    '''Returns list of students below the specified attendance threshold.'''
    user_roles = [r.lower() for r in current_user.get("role", [])]
    dept_filter = department
    if not dept_filter and ("hod" in user_roles or "faculty" in user_roles):
        dept_filter = current_user.get("department", "CS")

    stu_query = {"status": "active"}
    if dept_filter:
        stu_query["department"] = {"$regex": f"^{dept_filter}$", "$options": "i"}
    if semester and isinstance(semester, str) and semester.lower() != "all":
        if str(semester).isdigit():
            stu_query["$or"] = [{"semester": str(semester)}, {"semester": int(semester)}]
        else:
            stu_query["semester"] = str(semester)

    matching_subjects = await get_matching_subjects(dept_filter, semester, subject_code, faculty_id)

    att_query = {"status": {"$nin": ["rejected", "cancelled"]}}
    now = datetime.now(timezone.utc)

    student_present = {}
    student_total_classes = {}

    async for sess in db.Attendance.find(att_query):
        scode = str(sess.get("subject_code", "")).strip().upper()
        sess_dept = str(sess.get("department", "")).strip().upper()
        sess_sem = str(sess.get("semester", "")).strip()

        if matching_subjects:
            if scode not in matching_subjects:
                continue
        else:
            if dept_filter and sess_dept and sess_dept != dept_filter.upper():
                continue
            if semester and semester.lower() != "all" and sess_sem and sess_sem != str(semester):
                continue

        raw_date = sess.get("date")
        dt_obj = None
        if isinstance(raw_date, datetime):
            dt_obj = raw_date
        elif isinstance(raw_date, str):
            try:
                dt_obj = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
            except Exception:
                dt_obj = None

        if not is_session_in_duration(dt_obj, duration or "semester", now):
            continue

        for r in sess.get("attendance_records", []):
            reg = r.get("registration_no")
            st = r.get("status")
            if reg:
                student_total_classes[reg] = student_total_classes.get(reg, 0) + 1
                if st == "present" or st is None or st == "":
                    student_present[reg] = student_present.get(reg, 0) + 1

    threshold_val = float(threshold.default) if hasattr(threshold, "default") else float(threshold)

    sent_notices = set()
    async for n in db.Notifications.find({"type": "attendance_warning"}):
        r_no = n.get("data", {}).get("registration_no")
        if r_no:
            sent_notices.add(r_no)

    defaulters = []
    async for stu in db.Students.find(stu_query):
        reg = stu.get("registration_no")
        fn = stu.get("first_name", "")
        ln = stu.get("last_name", "")
        name = f"{fn} {ln}".strip() or reg
        s_dept = stu.get("department", "")
        s_sem = stu.get("semester", "")

        p_count = student_present.get(reg, 0)
        t_count = student_total_classes.get(reg, 0)

        pct = round((p_count / t_count * 100), 1) if t_count > 0 else 0.0
        if pct < threshold_val and t_count > 0:
            risk_tier = "critical" if pct < 40.0 else "warning" if pct < threshold_val else "healthy"
            notice_status = "Sent" if reg in sent_notices else "Pending"
            defaulters.append({
                "registration_no": reg,
                "student_name": name,
                "email": stu.get("email", ""),
                "department": s_dept,
                "semester": str(s_sem),
                "attended_classes": p_count,
                "total_classes": t_count,
                "attendance_pct": pct,
                "risk_tier": risk_tier,
                "notice_status": notice_status,
                "contact_number": stu.get("contact_number", ""),
                "guardian_email": stu.get("guardian_email", ""),
            })

    defaulters.sort(key=lambda x: x["attendance_pct"])
    return {"data": defaulters, "total_count": len(defaulters), "threshold": threshold_val}

class DispatchWarningsRequest(BaseModel):
    registration_numbers: List[str]
    threshold: float = 75.0

@router.post("/dispatch-warnings")
async def dispatch_warning_notices(
    body: DispatchWarningsRequest,
    current_user: dict = Depends(get_current_user),
):
    '''Dispatches official attendance shortfall notifications to student users and persists in DB.'''
    dispatched_count = 0
    for reg_no in body.registration_numbers:
        stu = await db.Students.find_one({"registration_no": reg_no})
        if stu:
            user_id = str(stu["_id"])
            fn = stu.get("first_name", "")
            ln = stu.get("last_name", "")
            sname = f"{fn} {ln}".strip() or reg_no
            dept = stu.get("department", "CS")
            sem = stu.get("semester", "")

            title = "⚠️ Attendance Shortfall Warning"
            msg_body = f"Dear {sname}, your current attendance rate in Semester {sem} ({dept}) is below the required {body.threshold}% cutoff threshold. Please meet your Head of Department / Academic Advisor immediately."

            await save_notification(
                user_id=user_id,
                type="attendance_warning",
                title=title,
                body=msg_body,
                data={
                    "registration_no": reg_no,
                    "threshold": body.threshold,
                    "dispatched_by": current_user.get("id"),
                    "dispatched_at": datetime.now(timezone.utc).isoformat(),
                },
                audience_role=["student"],
                send_ws=True,
            )
            dispatched_count += 1

    return {"message": f"Successfully dispatched warning protocols to {dispatched_count} student units.", "dispatched_count": dispatched_count}

@router.get("/workload")
async def get_faculty_workload_report(
    department: Optional[str] = Query(None, description="Department code, e.g. CS"),
    semester: Optional[str] = Query(None, description="Semester number, e.g. 4"),
    subject_code: Optional[str] = Query(None, description="Subject code, e.g. CSDSM252"),
    current_user: dict = Depends(get_current_user),
):
    '''Returns teaching workload and attendance summary per faculty member.'''
    user_roles = [r.lower() for r in current_user.get("role", [])]
    dept_filter = department
    if not dept_filter and ("hod" in user_roles or "faculty" in user_roles):
        dept_filter = current_user.get("department", "CS")

    fac_query = {"status": "active"}
    if dept_filter:
        fac_query["department"] = {"$regex": f"^{dept_filter}$", "$options": "i"}

    id_map = {}
    fac_subjects = {}

    async for cdoc in db.Curriculum.find({}):
        c_dept = cdoc.get("department", "")
        c_sem = str(cdoc.get("semester", ""))
        if semester and semester.lower() != "all" and c_sem != str(semester):
            continue
        for s in cdoc.get("subjects", []):
            fid = s.get("faculty_id")
            scode = s.get("subject_code")
            if subject_code and subject_code.lower() != "all" and scode and scode.upper() != subject_code.upper():
                continue
            if fid:
                fid_upper = fid.upper()
                if fid_upper not in fac_subjects:
                    fac_subjects[fid_upper] = []
                fac_subjects[fid_upper].append({
                    "subject_code": scode,
                    "subject_name": s.get("subject_name"),
                    "department": c_dept,
                    "semester": c_sem,
                })
                if scode:
                    id_map[scode.upper()] = fid_upper

    async for fac in db.Faculty.find(fac_query):
        fid = fac.get("faculty_id")
        if fid:
            fid_upper = fid.upper()
            id_map[fid_upper] = fid_upper
            id_map[str(fac["_id"])] = fid_upper

    fac_sessions = {}
    subject_sessions = {}  # scode -> {total_classes, total_present, total_records}

    async for sess in db.Attendance.find({"status": {"$nin": ["rejected", "cancelled"]}}):
        raw_fid = sess.get("faculty_id", "")
        raw_scode = str(sess.get("subject_code", "")).upper()
        target_fid = id_map.get(str(raw_fid).upper()) or id_map.get(str(raw_fid)) or id_map.get(raw_scode)

        recs = sess.get("attendance_records", [])
        p_cnt = sum(1 for r in recs if r.get("status") == "present")
        c_dept = sess.get("department", dept_filter)
        c_sem = sess.get("semester")
        real_size = await get_enrolled_class_size(db, subject_code=raw_scode, department=c_dept, semester=c_sem, records_count=len(recs))

        # Per subject stats
        if raw_scode:
            if raw_scode not in subject_sessions:
                subject_sessions[raw_scode] = {"total_classes": 0, "total_present": 0, "total_records": 0}
            subject_sessions[raw_scode]["total_classes"] += 1
            subject_sessions[raw_scode]["total_present"] += p_cnt
            subject_sessions[raw_scode]["total_records"] += real_size

        # Per faculty stats
        if target_fid:
            if target_fid not in fac_sessions:
                fac_sessions[target_fid] = {"total_classes": 0, "total_present": 0, "total_records": 0}
            fac_sessions[target_fid]["total_classes"] += 1
            fac_sessions[target_fid]["total_present"] += p_cnt
            fac_sessions[target_fid]["total_records"] += real_size

    workload = []
    async for fac in db.Faculty.find(fac_query):
        fid = fac.get("faculty_id", "")
        fid_upper = fid.upper()
        fn = fac.get("first_name", "").strip()
        ln = fac.get("last_name", "").strip()
        raw_name = f"{fn} {ln}".strip() or fid
        name = raw_name if raw_name.lower().startswith("dr") else f"Dr. {raw_name}"
        desig = fac.get("designation", "Faculty")

        raw_assigned = fac_subjects.get(fid_upper, [])
        assigned_with_stats = []
        for sub in raw_assigned:
            scode = str(sub.get("subject_code", "")).upper()
            s_stats = subject_sessions.get(scode, {"total_classes": 0, "total_present": 0, "total_records": 0})
            s_avg = round((s_stats["total_present"] / s_stats["total_records"] * 100), 1) if s_stats["total_records"] > 0 else 0.0
            assigned_with_stats.append({
                "subject_code": sub.get("subject_code"),
                "subject_name": sub.get("subject_name"),
                "department": sub.get("department"),
                "semester": sub.get("semester"),
                "sessions_conducted": s_stats["total_classes"],
                "target_sessions": 24,
                "avg_attendance_pct": s_avg,
            })

        stats = fac_sessions.get(fid_upper, {"total_classes": 0, "total_present": 0, "total_records": 0})
        avg_pct = round((stats["total_present"] / stats["total_records"] * 100), 1) if stats["total_records"] > 0 else 0.0
        target_sessions = max(len(raw_assigned) * 24, 24)
        completion_pct = round((stats["total_classes"] / target_sessions * 100), 1) if target_sessions > 0 else 0.0

        workload.append({
            "faculty_id": fid,
            "faculty_name": name,
            "designation": desig,
            "department": fac.get("department", dept_filter),
            "email": fac.get("email", ""),
            "assigned_subjects_count": len(raw_assigned),
            "assigned_subjects": assigned_with_stats,
            "total_classes_conducted": stats["total_classes"],
            "target_sessions": target_sessions,
            "completion_pct": completion_pct,
            "avg_class_attendance_pct": avg_pct,
        })

    workload.sort(key=lambda x: x["assigned_subjects_count"], reverse=True)
    return {"data": workload, "total_count": len(workload)}

@router.get("/student-summary")
async def get_student_personal_report(
    registration_no: Optional[str] = Query(None, description="Student registration number"),
    current_user: dict = Depends(get_current_user),
):
    '''Returns personal attendance summary statement for a student.'''
    reg_no = registration_no
    user_roles = [r.lower() for r in current_user.get("role", [])]

    if "student" in user_roles and not reg_no:
        stu_doc = await db.Students.find_one({"_id": ObjectId(current_user["id"])})
        if stu_doc:
            reg_no = stu_doc.get("registration_no")

    if not reg_no:
        raise HTTPException(status_code=400, detail="Student registration number is required.")

    student = await db.Students.find_one({"registration_no": reg_no})
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    dept = student.get("department", "")
    sem = str(student.get("semester", ""))

    att_cursor = db.Attendance.find({
        "attendance_records.registration_no": reg_no,
        "status": {"$nin": ["rejected", "cancelled"]}
    }).sort("date", -1)

    subject_stats = {}
    total_attended = 0
    total_classes = 0
    monthly_trend = []

    async for sess in att_cursor:
        scode = sess.get("subject_code")
        sname = sess.get("subject_name", scode)
        dt_str = sess.get("date")
        if isinstance(dt_str, datetime):
            dt_str = dt_str.isoformat()

        if scode not in subject_stats:
            subject_stats[scode] = {"subject_code": scode, "subject_name": sname, "attended": 0, "total": 0}

        subject_stats[scode]["total"] += 1
        total_classes += 1

        recs = sess.get("attendance_records", [])
        is_present = any(r.get("registration_no") == reg_no and r.get("status") in ["present", "", None] for r in recs)

        if is_present:
            subject_stats[scode]["attended"] += 1
            total_attended += 1

        monthly_trend.append({
            "session_id": sess.get("session_id", ""),
            "date": str(dt_str),
            "subject_code": scode,
            "status": "present" if is_present else "absent"
        })

    subject_list = []
    for scode, stat in subject_stats.items():
        pct = round((stat["attended"] / stat["total"] * 100), 1) if stat["total"] > 0 else 0.0
        subject_list.append({
            "subject_code": scode,
            "subject_name": stat["subject_name"],
            "attended_classes": stat["attended"],
            "total_classes": stat["total"],
            "attendance_pct": pct,
            "is_eligible": pct >= 75.0
        })

    overall_pct = round((total_attended / total_classes * 100), 1) if total_classes > 0 else 0.0
    fn = student.get("first_name", "")
    ln = student.get("last_name", "")

    return {
        "student_info": {
            "registration_no": reg_no,
            "student_name": f"{fn} {ln}".strip() or reg_no,
            "email": student.get("email", ""),
            "department": dept,
            "semester": sem,
            "course": student.get("course", "BSC"),
        },
        "overall_attended": total_attended,
        "overall_total_classes": total_classes,
        "overall_attendance_pct": overall_pct,
        "is_eligible": overall_pct >= 75.0,
        "subject_breakdown": subject_list,
        "session_history": monthly_trend[:10],
    }
