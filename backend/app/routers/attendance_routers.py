# In app/routers/attendance_router.py
from enum import Enum
import secrets, os
from time import process_time_ns
from typing import Optional, Annotated, List
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Path, Depends, status, Query
from backend.app.db import db
from datetime import timedelta, datetime, time, timezone
from backend.app.schemas.attendence_schema import AttendanceSessionResponse, AttendanceStatus, MarkAttendanceByFacultyRequest, MultiSubjectReportResponse, SessionStatus, StudentAttendanceRecord, \
    StudentSubjectReportResponse, SubjectAttendanceReportFilter, \
    MarkAttendanceByCRRequest, FacultyToCRRequest, ApprovalUpdateRequest, StudentStatusUpdateRequest, \
    ApprovalsFilterParamsRequest, compute_period_range
from backend.app.utils.connection_manager import manager
from backend.app.utils.dates_normalizer_to_datetime import normalize_dates_for_mongo
from backend.app.utils.notifications import save_notification
from backend.app.utils.session_aggregator import _compute_aggregates
from backend.app.utils.dependencies import admin_required, get_current_user, faculty_required, cr_required

BACKEND_HOST= os.getenv("BACKEND_HOST")

# some required helpers for handling
async def _single_subject_report(payload: SubjectAttendanceReportFilter) -> MultiSubjectReportResponse:
    reg_no = payload.registration_no
    subj_code = payload.subject_code

    # 1. Fetch student info
    st = await db.Students.find_one({"registration_no": reg_no})

    # 2. Build session query (exclude rejected & cancelled sessions)
    session_query = {
        "subject_code": {"$regex": f"^{subj_code}$", "$options": "i"},
        "status": {"$nin": ["rejected", "cancelled"]}
    }

    start_dt = getattr(payload, "start_date", None)
    end_dt = getattr(payload, "end_date", None)
    if start_dt or end_dt:
        date_cond = {}
        if start_dt:
            date_cond["$gte"] = start_dt
        if end_dt:
            date_cond["$lte"] = end_dt
        session_query["date"] = date_cond

    sessions_cursor = db.Attendance.find(session_query).sort("date", 1)
    sessions = await sessions_cursor.to_list(None)

    if not sessions:
        return MultiSubjectReportResponse(reports=[])

    # Fetch curriculum lookup map for missing subject names
    curriculum_docs = await db.Curriculum.find({}).to_list(None)
    curr_map = {
        subj["subject_code"]: subj["subject_name"]
        for cdoc in curriculum_docs
        for subj in cdoc.get("subjects", [])
        if "subject_code" in subj and "subject_name" in subj
    }

    present = 0
    absent = 0
    excused = 0
    daily_records = []
    subj_name = None

    for sess in sessions:
        if not subj_name and sess.get("subject_name"):
            subj_name = sess.get("subject_name")
        
        # Check student in attendance_records
        records = sess.get("attendance_records", [])
        st_record = next((r for r in records if r.get("registration_no") == reg_no), None)
        
        raw_status = st_record.get("status") if st_record else None
        if raw_status == "present" or (st_record and not raw_status):
            st_status = "present"
            present += 1
        elif raw_status == "excused":
            st_status = "excused"
            excused += 1
        else:
            st_status = "absent"
            absent += 1
            
        daily_records.append({
            "date": sess.get("date"),
            "status": st_status
        })

    total_classes = len(sessions)
    attendance_percentage = (
        round((present / total_classes) * 100, 2) if total_classes > 0 else 0.0
    )
    subj_name = subj_name or curr_map.get(subj_code, f"Subject {subj_code}")

    return MultiSubjectReportResponse(
        reports=[
            StudentSubjectReportResponse(
                subject_code=subj_code,
                subject_name=subj_name,
                total_classes=total_classes,
                present_count=present,
                absent_count=absent,
                excused_count=excused,
                attendance_percentage=attendance_percentage,
                daily_records=daily_records,
            )
        ]
    )

async def _all_subjects_report(payload: SubjectAttendanceReportFilter) -> MultiSubjectReportResponse:
    reg_no = payload.registration_no

    # 1. Fetch student record to determine candidate subject codes
    st = await db.Students.find_one({"registration_no": reg_no})
    dept = st.get("department", "") if st else ""
    sem = st.get("semester", "") if st else ""
    st_subjects = st.get("subjects", {}) if st else {}

    # Candidate subject codes for this student:
    subject_codes_set = set()
    if st_subjects:
        subject_codes_set.update(st_subjects.keys())

    # Check Curriculum for subjects matching department & semester
    if dept and sem:
        sem_list = [sem]
        if isinstance(sem, int) or (isinstance(sem, str) and str(sem).isdigit()):
            sem_list = [int(sem), str(sem)]
        curr_docs = await db.Curriculum.find({
            "department": {"$regex": f"^{dept}$", "$options": "i"},
            "semester": {"$in": sem_list}
        }).to_list(None)
        for cdoc in curr_docs:
            for s in cdoc.get("subjects", []):
                if s.get("subject_code"):
                    subject_codes_set.add(s.get("subject_code"))

    # Also check Attendance for any session where student is in attendance_records
    att_subjects = await db.Attendance.distinct("subject_code", {
        "attendance_records.registration_no": reg_no,
        "status": {"$nin": ["rejected", "cancelled"]}
    })
    if att_subjects:
        subject_codes_set.update(att_subjects)

    if not subject_codes_set:
        return MultiSubjectReportResponse(reports=[])

    # Fetch curriculum lookup map for missing subject names
    curriculum_docs = await db.Curriculum.find({}).to_list(None)
    curr_map = {}
    for cdoc in curriculum_docs:
        for s in cdoc.get("subjects", []):
            if "subject_code" in s and "subject_name" in s:
                curr_map[s["subject_code"]] = s["subject_name"]

    reports: list[StudentSubjectReportResponse] = []

    # Process each subject code independently so EVERY student in this subject gets the exact total classes held!
    for scode in sorted(list(subject_codes_set)):
        session_query = {
            "subject_code": {"$regex": f"^{scode}$", "$options": "i"},
            "status": {"$nin": ["rejected", "cancelled"]}
        }

        start_dt = getattr(payload, "start_date", None)
        end_dt = getattr(payload, "end_date", None)
        if start_dt or end_dt:
            date_cond = {}
            if start_dt:
                date_cond["$gte"] = start_dt
            if end_dt:
                date_cond["$lte"] = end_dt
            session_query["date"] = date_cond

        sessions = await db.Attendance.find(session_query).sort("date", 1).to_list(None)
        if not sessions:
            continue

        present = 0
        absent = 0
        excused = 0
        daily_records = []
        subj_name = None

        for sess in sessions:
            if not subj_name and sess.get("subject_name"):
                subj_name = sess.get("subject_name")

            records = sess.get("attendance_records", [])
            st_record = next((r for r in records if r.get("registration_no") == reg_no), None)

            raw_status = st_record.get("status") if st_record else None
            if raw_status == "present" or (st_record and not raw_status):
                st_status = "present"
                present += 1
            elif raw_status == "excused":
                st_status = "excused"
                excused += 1
            else:
                st_status = "absent"
                absent += 1

            daily_records.append({
                "date": sess.get("date"),
                "status": st_status
            })

        total_classes = len(sessions)
        attendance_percentage = (
            round((present / total_classes) * 100, 2) if total_classes > 0 else 0.0
        )
        subj_name = subj_name or curr_map.get(scode, f"Subject {scode}")

        reports.append(
            StudentSubjectReportResponse(
                subject_code=scode,
                subject_name=subj_name,
                total_classes=total_classes,
                present_count=present,
                absent_count=absent,
                excused_count=excused,
                attendance_percentage=attendance_percentage,
                daily_records=daily_records,
            )
        )

    return MultiSubjectReportResponse(reports=reports)


router = APIRouter(prefix="/attendance", tags=["Attendance Management"])

@router.post("/mark-by-faculty",response_model=AttendanceSessionResponse, status_code=status.HTTP_201_CREATED)
async def mark_attendance_by_faculty(
    request_data: MarkAttendanceByFacultyRequest,
    current_user: dict = Depends(faculty_required),
):
    # print("\ncurrent user : ", current_user)
    f_id = current_user.get("id")
    # print("Faculty ID:", f_id)

    # 1) Compute list of present students (from payload)
    present_student_ids = [
        str(record.registration_no) for record in request_data.attendance_data
    ]
    # print("\n--> present_student_ids: ", present_student_ids)

    # 2) Find ABSENT students
    # subjects is an object like: { "CSDSC251": "DBMS", ... }
    # so we match on "subjects.<code>": { $exists: true }
    absent_students_cursor = db.Students.find(
        {
            "status": "active",
            "semester": request_data.semester,
            "department": request_data.department,
            f"subjects.{request_data.subject_code}": {"$exists": True},
            "registration_no": {"$nin": present_student_ids},
        },
        {"registration_no": 1, "_id": 0},
    )
    absent_students = await absent_students_cursor.to_list(length=None)
    # print("--> absent Student records: ", absent_students)

    # 3) Build full attendance list as Pydantic models (present + absent)
    final_attendance_records: List[StudentAttendanceRecord] = [
        record for record in request_data.attendance_data
    ]

    for student in absent_students:
        final_attendance_records.append(
            StudentAttendanceRecord(
                registration_no=student["registration_no"],
                status=AttendanceStatus.ABSENT,  # adjust if enum name differs
            )
        )

    # print("\n--> Final attendance list (Pydantic): ", final_attendance_records)

    # 4) Build session id
    session_id = f"{request_data.subject_code}-{request_data.class_date.strftime('%d%m%Y')}"
    # print("--> Session id:", session_id)

    # 5) Resolve subject_name from any one student doc (optional but needed for schema)
    #    If you have a curriculum collection, prefer that instead.
    any_student = await db.Students.find_one(
        {
            "status": "active",
            "semester": request_data.semester,
            "department": request_data.department,
            f"subjects.{request_data.subject_code}": {"$exists": True},
        },
        {f"subjects.{request_data.subject_code}": 1, "_id": 0},
    )
    subject_name = None
    if any_student:
        # subjects: { "CSDSC251": "Database Management System", ... }
        subject_name = any_student.get("subjects", {}).get(request_data.subject_code)
    if not subject_name:
        subject_name = ""  # or raise, depending on your rules

    # 6) Prepare Mongo document (convert models & enums -> plain dicts & values)
    attendance_records_doc = [
        {
            "registration_no": rec.registration_no,
            "status": rec.status.value if hasattr(rec.status, "value") else rec.status,
        }
        for rec in final_attendance_records
    ]

    new_session_doc = {
        "session_id": session_id,
        "faculty_id": f_id,
        "subject_code": request_data.subject_code,
        "subject_name": subject_name,
        "date": request_data.class_date.astimezone(timezone.utc),
        "status": SessionStatus.MARKED_BY_FACULTY.value
        if hasattr(SessionStatus.MARKED_BY_FACULTY, "value")
        else "marked_by_faculty",
        "attendance_records": attendance_records_doc,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    # print("--> New session document prepared:", new_session_doc)

    # 7) Prevent duplicate marking for same session
    existing_session = await db.Attendance.find_one({"session_id": session_id})
    if existing_session:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Attendance for this session ({session_id}) has already been marked.",
        )

    # 8) Insert
    try:
        result = await db.Attendance.insert_one(new_session_doc)
        # print("--> Inserted session_id:", session_id)
    except Exception as e:
        # print("--> Insert failed for session_id:", session_id, "error:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark attendance",
        ) from e

    # 9) Fetch created doc and adapt to response schema
    created_session = await db.Attendance.find_one({"_id": result.inserted_id})
    if not created_session:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve the attendance session.",
        )

    # Convert _id to string for the "id" alias, let Pydantic handle enums & datetime
    created_session["_id"] = str(created_session["_id"])
    # print("--> \nCreated session", created_session)

    return AttendanceSessionResponse(**created_session)

@router.get("/report/student-subject", response_model=MultiSubjectReportResponse, status_code=status.HTTP_200_OK)
async def get_student_subject_attendance_report(
        payload: SubjectAttendanceReportFilter = Depends(),
        current_user: dict = Depends(get_current_user)
):
    # print("--> Report request by user:", current_user)
    if "admin" not in current_user["role"]:
        if "faculty" not in current_user.get("role", []):
            try:
                student_cursor = await db.Students.find_one({"_id": ObjectId(current_user["id"])})
                # print("--> Student cursor for report access check:", student_cursor)
                if (student_cursor["registration_no"]) != payload.registration_no:
                    raise HTTPException(status_code=403, detail="Access denied. Only admins, faculties and Student can see his Student reports.")
            except Exception as e:
                raise HTTPException(status_code=403,detail="Something went wrong, Please try again") from e

    if payload.subject_code:
        # Single subject – use your existing pipeline (maybe slightly adapted)
        return await _single_subject_report(payload)
    else:
        # All subjects – use a pipeline grouped by subject_code
        return await _all_subjects_report(payload)
    
@router.post("/initiate-for-cr", status_code=status.HTTP_201_CREATED)
async def initiate_attendance_for_cr(
        initiate_request: FacultyToCRRequest,
        current_user: dict = Depends(faculty_required)
):
    try:
        cr_users_cursor = db.Students.find({
            "department": initiate_request.department,
            "semester": initiate_request.semester,
            "role": "cr",
            "status": "active"
        })
        cr_users = await cr_users_cursor.to_list(None)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error finding CRs for semester {initiate_request.semester}.") from e

    if not cr_users:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No active CR found for semester {initiate_request.semester} in department {initiate_request.department}.")

    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=15)
    notified_crs_count = 0

    for cr_user in cr_users:
        cr_user_id = str(cr_user["_id"])

        # 1. Generate a secure token and set expiration per CR
        token = secrets.token_hex(20)

        # 2. Save the token to the database
        token_doc = {
            "attendance_token": token,
            "subject_code": initiate_request.subject_code,
            "department": initiate_request.department,
            "semester": initiate_request.semester,
            "faculty_id": current_user["id"],
            "cr_id": cr_user_id,
            "cr_registration_no": cr_user.get("registration_no"),
            "date": initiate_request.class_date,
            "created_at": now,
            "expires_at": expires,
            "is_used": False,
        }
        try:
            await db.AttendanceTokens.insert_one(token_doc)
        except Exception:
            continue

        # Lookup subject name safely
        subject_name = cr_user.get("subjects", {}).get(initiate_request.subject_code, initiate_request.subject_code)

        # 3. Save notification and send WS to each CR
        await save_notification(
            user_id=cr_user_id,
            type="cr_attendance_session_started",
            title=f"Attendance Request for {initiate_request.subject_code} - {subject_name}",
            body="Please take attendance. You have 15 minutes.",
            data={"token": token},
            audience_role=["cr"],
            ttl_minutes=15,
            send_ws=True,
        )
        notified_crs_count += 1

    return {"message": f"Attendance initiated. {notified_crs_count} CR(s) notified."}

@router.get("/token-details")
async def get_cr_token_details(
    token: str,
    current_user: dict = Depends(cr_required)
):
    """Endpoint for CR to check token validity, session metadata, and remaining time window."""
    token_doc = await db.AttendanceTokens.find_one({
        "attendance_token": token,
        "cr_id": current_user["id"],
    })
    if not token_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance token session not found or access denied.")

    now = datetime.now(timezone.utc)
    expiry = token_doc["expires_at"]
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    else:
        expiry = expiry.astimezone(timezone.utc)

    seconds_left = max(0, int((expiry - now).total_seconds()))
    is_expired = seconds_left <= 0 or token_doc.get("is_used", False)

    return {
        "attendance_token": token,
        "subject_code": token_doc.get("subject_code"),
        "department": token_doc.get("department"),
        "semester": token_doc.get("semester"),
        "date": token_doc.get("date").isoformat() if hasattr(token_doc.get("date"), "isoformat") else token_doc.get("date"),
        "expires_at": expiry.isoformat(),
        "is_used": token_doc.get("is_used", False),
        "is_expired": is_expired,
        "seconds_left": seconds_left,
    }

@router.post("/submit-by-cr", status_code=status.HTTP_202_ACCEPTED)
async def submit_attendance_by_cr(
        request_data: MarkAttendanceByCRRequest,
        current_user: dict = Depends(cr_required)
):
    '''CR submits attendance using the token link. The system validates the token, checks for expiry, and if valid, processes the attendance data. It then creates a new attendance session with status 'pending' for faculty approval and deactivates the token to prevent reuse.'''
    # print(current_user)
    # print("\n--> request_data: {}".format(request_data))
    # 1. Find and validate the token from the database
    try:
        token_doc = await db.AttendanceTokens.find_one({
            "attendance_token": str(request_data.attendance_token),
            "is_used": False,
        })
    except Exception as e:
        raise HTTPException(status_code=400,detail="111111Invalid or expired session, or attendance already marked") from e
    # print("--> token_doc: {}".format(token_doc))
    
    if not token_doc:
        raise HTTPException(status_code=404, detail="22222Invalid or expired session, or attendance already marked.")

    if token_doc['cr_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="an unexpected error occurred")
    
    if token_doc['subject_code'] != request_data.subject_code or token_doc['department'] != request_data.department or token_doc['semester'] != request_data.semester:
        raise HTTPException(status_code=403, detail="Session details mismatch. Please use the correct attendance link.")

    # print("--> Date from token_doc: {}, Date from request: {}".format(token_doc['date'], request_data.class_date))

    now = datetime.now(timezone.utc)
    expiry = token_doc['expires_at']
    
    # If expires_at is naive, attach UTC tzinfo
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    else:
    # optionally normalize to UTC
        expiry = expiry.astimezone(timezone.utc)

    # print(f"--> current time (UTC): {now}, session expires at: {expiry}, is_used: {token_doc['is_used']}")
    
    if now > expiry:
        await db.AttendanceTokens.update_one(
            {"_id": token_doc["_id"]},
            {"$set": {"is_used": True}}
        )
        raise HTTPException(status_code=410, detail="This attendance link has expired.")

    # --- 2. If token is valid, proceed with your existing "auto-absent" logic ---
    # ... (Your logic to find absentees and create final_attendance_records) ...
    # ... (Your logic to create the new_session_doc with status 'pending_approval') ...
    # Build submitted student IDs
    submitted_student_ids = [str(att.registration_no) for att in request_data.attendance_data if getattr(att, "registration_no", None)]

    # Fetch names for submitted students
    students_name_map = {}
    if submitted_student_ids:
        async for st in db.Students.find({"registration_no": {"$in": submitted_student_ids}}, {"registration_no": 1, "first_name": 1, "last_name": 1, "_id": 0}):
            fn = st.get("first_name") or ""
            ln = st.get("last_name") or ""
            full_n = f"{fn} {ln}".strip()
            if full_n:
                students_name_map[st["registration_no"]] = full_n

    # Query absentees in department & semester not in submitted list
    absent_students_cursor = db.Students.find(
        {
            "status": "active",
            "semester": token_doc["semester"],
            "department": token_doc["department"],
            "registration_no": {"$nin": submitted_student_ids}
        },
        {"registration_no": 1, "first_name": 1, "last_name": 1, "_id": 0}
    )

    # 1) Start from CR‑submitted records, convert to dicts and attach student_name
    final_attendance_records: list[dict] = []

    for rec in request_data.attendance_data:
        rec_dict = rec.model_dump() if hasattr(rec, "model_dump") else rec.dict()
        st_status = rec_dict.get("status")
        if isinstance(st_status, Enum):
            rec_dict["status"] = st_status.value
        reg_no = rec_dict.get("registration_no")
        if reg_no and not rec_dict.get("student_name"):
            rec_dict["student_name"] = students_name_map.get(reg_no, reg_no)
        final_attendance_records.append(rec_dict)

    async for student in absent_students_cursor:
        fn = student.get("first_name") or ""
        ln = student.get("last_name") or ""
        full_n = f"{fn} {ln}".strip() or student.get("registration_no")
        final_attendance_records.append({
            "registration_no": student["registration_no"],
            "student_name": full_n,
            "status": "absent"
        })

    session_id = f"{token_doc['subject_code']}-{token_doc['date'].strftime('%Y%m%d%H%M')}"

    # Lookup subject_name from curriculum
    subj_name = token_doc.get("subject_code")
    try:
        curr_doc = await db.Curriculum.find_one({
            "department": token_doc["department"],
            "semester": token_doc["semester"],
            "subjects.subject_code": token_doc["subject_code"]
        })
        if curr_doc and "subjects" in curr_doc:
            for s in curr_doc["subjects"]:
                if s.get("subject_code") == token_doc["subject_code"] and s.get("subject_name"):
                    subj_name = s.get("subject_name")
                    break
    except Exception:
        pass

    # Extract CR details from current_user
    cr_first_name = current_user.get("first_name") or ""
    cr_last_name = current_user.get("last_name") or ""
    cr_name = f"{cr_first_name} {cr_last_name}".strip() or current_user.get("name") or "CR Student"
    cr_reg_no = current_user.get("registration_no", "")
    cr_display_info = f"{cr_name} ({cr_reg_no})" if cr_reg_no else cr_name

    new_session_doc = {
        "session_id": session_id,
        "faculty_id": token_doc['faculty_id'],
        "subject_code": token_doc["subject_code"],
        "subject_name": subj_name,
        "department": token_doc["department"],
        "semester": token_doc["semester"],
        "date": token_doc["date"],
        "status": "pending",
        "submission_details": cr_display_info,
        "submitted_by": cr_display_info,
        "cr_name": cr_name,
        "cr_registration_no": cr_reg_no,
        "attendance_records": final_attendance_records,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    # print("\n--> \n\nNew session doc: ",new_session_doc)
    # 3. Check for duplicates to prevent marking the same session twice
    existing_session = await db.Attendance.find_one({"session_id": session_id})
    if existing_session:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Attendance for this session ({session_id}) has already been marked."
        )
    # 4. Insert the new session document into the database
    # print("--> Attempting to insert new attendance session for CR submission...")
    result = await db.Attendance.insert_one(new_session_doc)

    # --- 3. CRUCIAL: Save real Notification for Faculty & Deactivate CR Token ---
    # print("--> Saving notification for faculty and deactivating CR token...")
    cr_display_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
    if not cr_display_name:
        cr_display_name = current_user.get("registration_no", "CR Student")

    await save_notification(
        user_id=token_doc['faculty_id'],
        type="cr_attendance_submitted",
        title=f"Attendance Marked by CR ({subj_name})",
        body=f"CR {cr_display_name} has submitted attendance for {subj_name} ({token_doc['subject_code']}), Sem {token_doc['semester']}. Please review and approve.",
        data={
            "session_id": session_id,
            "subject_code": token_doc['subject_code'],
            "subject_name": subj_name,
            "department": token_doc['department'],
            "semester": token_doc['semester']
        },
        audience_role=["faculty"],
        ttl_minutes=1440,
        send_ws=True,
    )

    try:
        await db.AttendanceTokens.update_one(
            {"_id": token_doc["_id"]},
            {"$set": {"is_used": True}}
        )
        # Auto-archive CR's notification for this token so it is removed from CR's feed
        await db.Notifications.update_many(
            {"user_id": current_user["id"], "data.token": token_doc["attendance_token"]},
            {"$set": {"status": "archived", "updated_at": datetime.now(timezone.utc)}}
        )
    except Exception as e:
        raise HTTPException(status_code=400,detail="Attendance marked succesfully.") from e

    return {'message': 'Attendance marked succesfully.', 'session_id': session_id}  # Placeholder

@router.get("/approvals/{session_id}", status_code=status.HTTP_200_OK)
async def get_session_for_approval(
    session_id: str,
    current_user: dict = Depends(faculty_required),
):
    '''Faculty can view details of a CR-submitted session that is pending for their approval. This includes the attendance records and any aggregates or anomalies to help them make an informed decision.'''
    # print("--> session_id: ",session_id)
    # print("--> current_user_id: ",session_id)
    # Fetch session owned by this faculty
    session = await db.Attendance.find_one({
        "session_id": session_id,
        "faculty_id": current_user["id"]
    })
    # print("--> session: ",session)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or not accessible.")
    # Ensure it's CR-submitted and pending
    if session.get("status") == "marked_by_faculty":
        raise HTTPException(status_code=409, detail="Session is already approved, since it was marked by faculty.")
    if session.get("status") != "pending":
            raise HTTPException(status_code=409, detail="Session is not pending for approval.")

    # Compute aggregates (or read from session if you already store them)
    raw_records = session.get("attendance_records", [])
    reg_nos = [r.get("registration_no") for r in raw_records if r.get("registration_no")]
    students_map = {}
    if reg_nos:
        async for s in db.Students.find({"registration_no": {"$in": reg_nos}}, {"registration_no": 1, "first_name": 1, "last_name": 1, "_id": 0}):
            fn = s.get("first_name") or ""
            ln = s.get("last_name") or ""
            full_n = f"{fn} {ln}".strip()
            if full_n:
                students_map[s["registration_no"]] = full_n

    records = []
    for r in raw_records:
        r_dict = dict(r)
        reg = r_dict.get("registration_no")
        r_dict["student_name"] = students_map.get(reg, reg)
        records.append(r_dict)

    aggregates = _compute_aggregates(records)

    seen = set()
    duplicates = []
    for r in records:
        rn = r.get("registration_no")
        if rn in seen:
            duplicates.append(rn)
        else:
            seen.add(rn)

    return {
        "session_id": session["session_id"],
        "subject_code": session.get("subject_code"),
        "subject_name": session.get("subject_name"),
        "department": session.get("department"),
        "sem": session.get("semester"),
        "date": session.get("date"),
        "status": session.get("status"),
        "submitted_by": session.get("submission_details"),
        "attendance_records": records,
        "aggregates": aggregates,
        "anomalies": {
        "duplicates": list(set(duplicates))
        }
    }

@router.patch("/approvals/{session_id}", status_code=status.HTTP_200_OK)
async def approve_attendance_session(
    session_id: str,
    body: ApprovalUpdateRequest,
    current_user: dict = Depends(faculty_required),
):
    '''Faculty can approve or reject a pending session. Once approved, the session becomes read-only. If rejected, faculty must provide a reason and can then edit the session before resubmitting.'''
    
    # print("-->session id: ", session_id)
    # print("-->update body: ", body)
     
    target = body.status.strip().lower()
    # print("--> Target status after normalization: {}".format(target))
    if target not in {"approved", "rejected"}:
        raise HTTPException(status_code=422, detail="Status must be updated to 'approved' or 'rejected'.")
    # 1) Ensure session is pending and owned by faculty
    filter_query = {
        "session_id": session_id,
        "faculty_id": current_user["id"],
        "status": "pending"
    }
    
    if target == "approved":
        setDoc= {
                "status": target,
                "approved_by": current_user["id"],
                "approved_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
        }
    else:  # rejected
        setDoc= {
                "status": target,
                "rejection_reason": body.reason if body.reason else "",
                "rejected_by": current_user["id"],
                "rejected_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
        }
    update_doc = {
        "$set": setDoc,
        "$push": {
            "audit": {
                "action": "finalize_session",
                "to_status": target,
                "reason": body.reason if body.reason else "",
                "by": current_user["id"],
                "at": datetime.utcnow()
            }
        }
    }

    updated = await db.Attendance.find_one_and_update(
        filter_query,
        update_doc,
        return_document=True
    )
    if not updated:
        raise HTTPException(status_code=409, detail="Session not pending or not accessible.")

    return {
        "message": f"Session {session_id} marked as {target}.",
        "session_id": session_id,
        "status": target
    }

@router.patch("/approvals/{session_id}/students/{registration_no}", status_code=status.HTTP_200_OK)
async def update_attendance_session_in_pending(
    session_id: str,
    registration_no: str,
    body: StudentStatusUpdateRequest,
    current_user: dict = Depends(faculty_required),
):
    '''Faculty can update the attendance status of individual students within a pending session before approving it. This allows them to correct any errors or accommodate valid exceptions before finalizing the session. Works only if session is still pending. Once approved, the session becomes read-only.'''
    new_status = body.status.strip().lower()
    if new_status not in {"present", "absent", "leave"}:
        raise HTTPException(status_code=422, detail="Status must be 'present', 'absent', or 'leave'.")
    # 1) Ensure session is pending and owned by faculty
    session = await db.Attendance.find_one({
        "session_id": session_id,
        "faculty_id": current_user["id"],
        "status": "pending"
    })
    if not session:
        raise HTTPException(status_code=409, detail="Session not pending or not accessible.")
    # update specific Student
    result = await db.Attendance.update_one(
        {
            "session_id": session_id,
            "faculty_id": current_user["id"],
            "status": "pending",
            "attendance_records.registration_no": registration_no
        },
        {
            "$set": {
                "attendance_records.$.status": new_status,
                "updated_at": datetime.utcnow()
            },
            "$push": {
                "audit": {
                    "action": "update_student_status",
                    "registration_no": registration_no,
                    "to_status": new_status,
                    "by": current_user["id"],
                    "at": datetime.utcnow()
                }
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found in session records.")
    # 3) Return refreshed aggregates
    refreshed = await db.Attendance.find_one({
        "session_id": session_id,
        "faculty_id": current_user["id"]
    }, {"attendance_records": 1, "_id": 0})

    aggregates = _compute_aggregates(refreshed.get("attendance_records", []))
    return {
        "message": "Student status updated.",
        "registration_no": registration_no,
        "new_status": new_status,
        "aggregates": aggregates
    }

@router.get("/approvals", status_code=status.HTTP_200_OK)
async def list_approvals(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    subject_code: Optional[str] = Query(None),
    period: Optional[str] = Query("month"),
    status: Optional[str] = Query("pending"),
    sort: str = Query("-created_at", description="Sort field, prefix with '-' for desc"),
    current_user: dict = Depends(faculty_required),
):
    '''Faculty can view a paginated list of all sessions that are pending their approval. They can filter by subject, date range (e.g., last week, last month), and submission status (e.g., pending, marked_by_cr). Sorting options allow them to prioritize recent submissions or specific subjects. This helps them manage their approval workload effectively.'''
    status = status.strip().lower()
    status_filters = ["pending", "marked_by_faculty"]

    fac_id = current_user.get("faculty_id") or current_user.get("unique_id")
    user_id_str = str(current_user["id"])
    email = current_user.get("email", "").lower()

    if not fac_id:
        fac_doc = await db.Faculty.find_one({"_id": ObjectId(current_user["id"])}) or await db.Faculty.find_one({"email": email})
        if fac_doc:
            fac_id = fac_doc.get("faculty_id")

    assigned_codes = set()
    if fac_id:
        curriculum_docs = await db.Curriculum.find({"subjects.faculty_id": fac_id}).to_list(None)
        for cdoc in curriculum_docs:
            for s in cdoc.get("subjects", []):
                if str(s.get("faculty_id", "")).upper() == str(fac_id).upper() and s.get("subject_code"):
                    assigned_codes.add(s.get("subject_code"))

    fac_or: list = [
        {"faculty_id": user_id_str},
        {"created_by": user_id_str},
        {"created_by": email},
    ]
    if fac_id:
        fac_or.append({"faculty_id": fac_id})
        fac_or.append({"created_by": fac_id})
    if assigned_codes:
        fac_or.append({"subject_code": {"$in": list(assigned_codes)}})

    filters: dict = {"$or": fac_or}

    if status == "marked_by_cr":
        filters["submission_details"] = status
    if status in status_filters:
        filters["status"] = status
    if subject_code:
        filters["subject_code"] = subject_code
    if period:
        start_utc, end_utc = compute_period_range(period, tz="Asia/Kolkata")
        filters["date"] = {"$gte": start_utc, "$lt": end_utc}

    # print("--> filters:", filters)
    sort_field = sort.lstrip("-")
    sort_dir = -1 if sort.startswith("-") else 1
    # print("--> filters:", filters)

    total = await db.Attendance.count_documents(filters)

    cursor = (
        db.Attendance.find(filters, {
            "_id": 0,
            "session_id": 1,
            "subject_code": 1,
            "subject_name": 1,
            "department": 1,
            "semester": 1,
            "date": 1,
            "status": 1,
            "submission_details": 1,
            "submitted_by": 1,
            "cr_name": 1,
            "cr_registration_no": 1,
        })
        .sort(sort_field, sort_dir)
        .skip((page - 1) * size)
        .limit(size)
    )

    items = [doc async for doc in cursor]
    for item in items:
        if not item.get("subject_name") or item.get("subject_name") == item.get("subject_code"):
            try:
                curr_doc = await db.Curriculum.find_one({
                    "department": item.get("department"),
                    "semester": item.get("semester"),
                    "subjects.subject_code": item.get("subject_code")
                })
                if curr_doc and "subjects" in curr_doc:
                    for s in curr_doc["subjects"]:
                        if s.get("subject_code") == item.get("subject_code") and s.get("subject_name"):
                            item["subject_name"] = s.get("subject_name")
                            break
            except Exception:
                pass

    aggregates= _compute_aggregates(items)
    
    # print(f"--> Returning page {page} with {len(items)} items out of total {total}. \n\nAggregates:  {aggregates}")

    return {
        "page": page,
        "size": size,
        "total": total,
        "items": items,
        "aggregates": aggregates,
    }

@router.get("/session-details/{token}", status_code=status.HTTP_200_OK)
async def get_attendance_session_details(
    token: str,
    current_user: dict = Depends(cr_required),
):
    '''When a CR clicks the attendance link, the system validates the token and retrieves the session details (like subject code, department, semester, class date) to display on the attendance marking page. This endpoint ensures that only the intended CR can access the session details and proceed with marking attendance.'''
    try:
        token_doc = await db.AttendanceTokens.find_one({
            "attendance_token": token,
            "is_used": False,
        })
    except Exception as e:
        raise HTTPException(status_code=400,detail="Invalid or expired session.") from e

    if not token_doc:
        raise HTTPException(status_code=404, detail="Invalid or expired session.")

    if token_doc['cr_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="an unexpected error occurred")
    
    # print("--> token_doc for session details: {}".format(token_doc))
    return {
        "subject_code": token_doc["subject_code"],
        "department": token_doc["department"],
        "semester": token_doc["semester"],
        "class_date": token_doc["date"],
    }

@router.get("/cr/pending")
async def list_pending_cr_sessions(
    current_user = Depends(cr_required)
):
    '''CR can view a list of all pending attendance sessions that they need to mark. This includes details like subject code, department, semester, class date, and the expiration time of the marking link. This helps CRs manage their pending tasks and ensures timely marking of attendance.'''
    sessions = await db.Notifications.find(
        {
            "cr_id": current_user["id"],
            "is_used": False,
            "expires_at": {"$gt": datetime.now(timezone.utc)},
        }
    ).to_list(None)

    return [
        {
            "attendance_token": s["attendance_token"],
            "subject_code": s["subject_code"],
            "department": s["department"],
            "semester": s["semester"],
            "date": s["date"],
            "expires_at": s["expires_at"],
        }
        for s in sessions
    ]


@router.get("/my-sessions", status_code=status.HTTP_200_OK)
async def get_my_recent_sessions(
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    '''Returns recent attendance sessions conducted by or for the logged in faculty member.'''
    user_roles = [r.lower() for r in current_user.get("role", [])]
    fac_id = current_user.get("faculty_id") or current_user.get("unique_id")
    user_id_str = str(current_user["id"])
    email = current_user.get("email", "").lower()

    if not fac_id:
        fac_doc = await db.Faculty.find_one({"_id": ObjectId(current_user["id"])}) or await db.Faculty.find_one({"email": email})
        if fac_doc:
            fac_id = fac_doc.get("faculty_id")

    # Gather assigned subjects for this faculty member from Curriculum
    assigned_codes = set()
    if fac_id:
        curriculum_docs = await db.Curriculum.find({"subjects.faculty_id": fac_id}).to_list(None)
        for cdoc in curriculum_docs:
            for s in cdoc.get("subjects", []):
                if str(s.get("faculty_id", "")).upper() == str(fac_id).upper() and s.get("subject_code"):
                    assigned_codes.add(s.get("subject_code"))

    query_or: list = [
        {"faculty_id": user_id_str},
        {"created_by": user_id_str},
        {"created_by": email},
    ]
    if fac_id:
        query_or.append({"faculty_id": fac_id})
        query_or.append({"created_by": fac_id})
    if assigned_codes:
        query_or.append({"subject_code": {"$in": list(assigned_codes)}})

    query = {
        "$or": query_or,
        "status": {"$in": ["completed", "approved", "marked_by_faculty"]}
    }

    effective_limit = min(limit, 20)
    cursor = db.Attendance.find(query).sort("date", -1).limit(effective_limit)
    sessions = []
    async for doc in cursor:
        records = doc.get("attendance_records", [])
        total = len(records)
        present = sum(1 for r in records if r.get("status") in ["present", "completed"])
        dt_str = doc.get("date")
        if isinstance(dt_str, datetime):
            dt_str = dt_str.strftime("%Y-%m-%d")
        else:
            dt_str = str(dt_str or "")[:10]

        sessions.append({
            "id": doc.get("session_id", str(doc.get("_id"))),
            "subject_code": doc.get("subject_code", "N/A"),
            "date": dt_str or "N/A",
            "present_count": present,
            "total_students": total,
            "status": "completed"
        })
    return {"data": sessions}




