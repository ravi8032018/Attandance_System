from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from backend.app.db import db
from backend.app.utils.dependencies import get_current_user
from backend.app.utils.session_aggregator import get_enrolled_class_size

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/overview")
async def get_reports_overview(
    department: Optional[str] = Query(None, description="Department code, e.g. CS"),
    semester: Optional[str] = Query(None, description="Semester number, e.g. 4"),
    current_user: dict = Depends(get_current_user),
):
    '''Returns overview metrics for department or faculty reports dashboard.'''
    user_roles = [r.lower() for r in current_user.get("role", [])]
    dept_filter = department
    if not dept_filter and ("hod" in user_roles or "faculty" in user_roles):
        dept_filter = current_user.get("department", "CS")

    # Build subject codes matching department / semester from Curriculum
    matching_subjects = set()
    async for cdoc in db.Curriculum.find({}):
        c_dept = cdoc.get("department", "")
        c_sem = str(cdoc.get("semester", ""))
        dept_match = not dept_filter or c_dept.upper() == dept_filter.upper()
        sem_match = not semester or semester.lower() == "all" or c_sem == str(semester)
        if dept_match and sem_match:
            for s in cdoc.get("subjects", []):
                scode = s.get("subject_code")
                if scode:
                    matching_subjects.add(scode.upper())

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
        scode = str(sess.get("subject_code", "")).upper()
        sess_dept = str(sess.get("department", "")).upper()
        
        # Check if session matches filter
        if matching_subjects and scode not in matching_subjects:
            if dept_filter and sess_dept and sess_dept != dept_filter.upper():
                continue

        total_sessions += 1
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
        scode = str(sess.get("subject_code", "")).upper()
        sess_dept = str(sess.get("department", "")).upper()
        if matching_subjects and scode not in matching_subjects:
            if dept_filter and sess_dept and sess_dept != dept_filter.upper():
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

    return {
        "department": dept_filter,
        "semester": semester or "all",
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
    if semester and semester.lower() != "all":
        if str(semester).isdigit():
            stu_query["$or"] = [{"semester": str(semester)}, {"semester": int(semester)}]
        else:
            stu_query["semester"] = str(semester)

    # Build curriculum map for matching subjects
    matching_subjects = set()
    async for cdoc in db.Curriculum.find({}):
        c_dept = cdoc.get("department", "")
        c_sem = str(cdoc.get("semester", ""))
        dept_match = not dept_filter or c_dept.upper() == dept_filter.upper()
        sem_match = not semester or semester.lower() == "all" or c_sem == str(semester)
        if dept_match and sem_match:
            for s in cdoc.get("subjects", []):
                scode = s.get("subject_code")
                if scode:
                    matching_subjects.add(scode.upper())

    att_query = {"status": {"$nin": ["rejected", "cancelled"]}}

    student_present = {}
    student_total_classes = {}

    async for sess in db.Attendance.find(att_query):
        scode = str(sess.get("subject_code", "")).upper()
        sess_dept = str(sess.get("department", "")).upper()
        if matching_subjects and scode not in matching_subjects:
            if dept_filter and sess_dept and sess_dept != dept_filter.upper():
                continue

        for r in sess.get("attendance_records", []):
            reg = r.get("registration_no")
            st = r.get("status")
            if reg:
                student_total_classes[reg] = student_total_classes.get(reg, 0) + 1
                if st == "present" or st is None or st == "":
                    student_present[reg] = student_present.get(reg, 0) + 1

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
        if pct < threshold and t_count > 0:
            risk_tier = "critical" if pct < 40.0 else "warning" if pct < 75.0 else "healthy"
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
                "contact_number": stu.get("contact_number", ""),
                "guardian_email": stu.get("guardian_email", ""),
            })

    defaulters.sort(key=lambda x: x["attendance_pct"])
    return {"data": defaulters, "total_count": len(defaulters), "threshold": threshold}

@router.get("/workload")
async def get_faculty_workload_report(
    department: Optional[str] = Query(None, description="Department code, e.g. CS"),
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
        c_sem = cdoc.get("semester", "")
        for s in cdoc.get("subjects", []):
            fid = s.get("faculty_id")
            scode = s.get("subject_code")
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
    async for sess in db.Attendance.find({"status": {"$nin": ["rejected", "cancelled"]}}):
        raw_fid = sess.get("faculty_id", "")
        raw_scode = sess.get("subject_code", "")
        target_fid = id_map.get(str(raw_fid).upper()) or id_map.get(str(raw_fid)) or id_map.get(str(raw_scode).upper())

        if target_fid:
            if target_fid not in fac_sessions:
                fac_sessions[target_fid] = {"total_classes": 0, "total_present": 0, "total_records": 0}
            fac_sessions[target_fid]["total_classes"] += 1
            recs = sess.get("attendance_records", [])
            p_cnt = sum(1 for r in recs if r.get("status") == "present")

            c_dept = sess.get("department", dept_filter)
            c_sem = sess.get("semester")
            real_size = await get_enrolled_class_size(db, subject_code=raw_scode, department=c_dept, semester=c_sem, records_count=len(recs))

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

        assigned = fac_subjects.get(fid_upper, [])
        stats = fac_sessions.get(fid_upper, {"total_classes": 0, "total_present": 0, "total_records": 0})
        avg_pct = round((stats["total_present"] / stats["total_records"] * 100), 1) if stats["total_records"] > 0 else 0.0

        workload.append({
            "faculty_id": fid,
            "faculty_name": name,
            "designation": desig,
            "department": fac.get("department", dept_filter),
            "email": fac.get("email", ""),
            "assigned_subjects_count": len(assigned),
            "assigned_subjects": assigned,
            "total_classes_conducted": stats["total_classes"],
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
        "session_history": monthly_trend,
    }
