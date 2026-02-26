# In app/routers/attendance_router.py
from enum import Enum
import secrets
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

# some required helpers for handling
async def _single_subject_report(payload: SubjectAttendanceReportFilter) -> MultiSubjectReportResponse:
    pipeline = [
        {
            "$match": {
                "subject_code": payload.subject_code,
                "status": {"$in": ["approved", "marked_by_faculty"]},
                "attendance_records.registration_no": payload.registration_no,
            }
        },
        {"$unwind": "$attendance_records"},
        {
            "$match": {
                "attendance_records.registration_no": payload.registration_no
            }
        },
        {
            "$group": {
                "_id": {
                    "reg_no": "$attendance_records.registration_no",
                    "subject_code": "$subject_code",
                },
                "present_count": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$attendance_records.status", "present"]},
                            1,
                            0,
                        ]
                    }
                },
                "absent_count": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$attendance_records.status", "absent"]},
                            1,
                            0,
                        ]
                    }
                },
                "excused_count": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$attendance_records.status", "excused"]},
                            1,
                            0,
                        ]
                    }
                },
                "daily_records": {
                    "$push": {
                        "date": "$date",
                        "status": "$attendance_records.status",
                    }
                },
            }
        },
    ]

    result = await db.Attendance.aggregate(pipeline).to_list(1)
    print("--> Aggregation result for single subject report:", result)
    
    if not result:
        return MultiSubjectReportResponse(reports=[])

    report_data = result[0]
    present = report_data["present_count"]
    absent = report_data["absent_count"]
    excused = report_data["excused_count"]
    total_classes = present + absent + excused

    attendance_percentage = (
        round((present / total_classes) * 100, 2) if total_classes > 0 else 0.0
    )

    return MultiSubjectReportResponse(    
        reports=[   
                 StudentSubjectReportResponse(
                    subject_code=report_data["_id"]["subject_code"],
                    total_classes=total_classes,
                    present_count=present,
                    absent_count=absent,
                    excused_count=excused,
                    attendance_percentage=attendance_percentage,
                    daily_records=report_data["daily_records"],
        )])

async def _all_subjects_report(payload: SubjectAttendanceReportFilter) -> MultiSubjectReportResponse:
    pipeline = [
        {
            "$match": {
                "status": {"$in": ["approved", "marked_by_faculty"]},
                "attendance_records.registration_no": payload.registration_no,
            }
        },
        {"$unwind": "$attendance_records"},
        {
            "$match": {
                "attendance_records.registration_no": payload.registration_no
            }
        },
        {
            "$group": {
                "_id": {
                    "reg_no": "$attendance_records.registration_no",
                    "subject_code": "$subject_code",
                },
                "present_count": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$attendance_records.status", "present"]},
                            1,
                            0,
                        ]
                    }
                },
                "absent_count": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$attendance_records.status", "absent"]},
                            1,
                            0,
                        ]
                    }
                },
                "excused_count": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$attendance_records.status", "excused"]},
                            1,
                            0,
                        ]
                    }
                },
                "daily_records": {
                    "$push": {
                        "date": "$date",
                        "status": "$attendance_records.status",
                    }
                },
            }
        },
    ]

    result = await db.Attendance.aggregate(pipeline).to_list(None)
    print("--> Aggregation result for multi-subject report:", result)
    
    if not result:
        return MultiSubjectReportResponse(reports=[])

    reports: list[StudentSubjectReportResponse] = []
    for doc in result:
        present = doc["present_count"]
        absent = doc["absent_count"]
        excused = doc["excused_count"]
        total_classes = present + absent + excused
        attendance_percentage = (
            round((present / total_classes) * 100, 2) if total_classes > 0 else 0.0
        )

        reports.append(
            StudentSubjectReportResponse(
                subject_code=doc["_id"]["subject_code"],
                total_classes=total_classes,
                present_count=present,
                absent_count=absent,
                excused_count=excused,
                attendance_percentage=attendance_percentage,
                daily_records=doc["daily_records"],
            )
        )

    return MultiSubjectReportResponse(reports=reports)


router = APIRouter(prefix="/attendance", tags=["Attendance Management"])

@router.post("/mark-by-faculty",response_model=AttendanceSessionResponse, status_code=status.HTTP_201_CREATED)
async def mark_attendance_by_faculty(
    request_data: MarkAttendanceByFacultyRequest,
    current_user: dict = Depends(faculty_required),
):
    print("\ncurrent user : ", current_user)
    f_id = current_user.get("id")
    print("Faculty ID:", f_id)

    # 1) Compute list of present students (from payload)
    present_student_ids = [
        str(record.registration_no) for record in request_data.attendance_data
    ]
    print("\n--> present_student_ids: ", present_student_ids)

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
    print("--> absent Student records: ", absent_students)

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

    print("\n--> Final attendance list (Pydantic): ", final_attendance_records)

    # 4) Build session id
    session_id = f"{request_data.subject_code}-{request_data.class_date.strftime('%d%m%Y')}"
    print("--> Session id:", session_id)

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
    print("--> New session document prepared:", new_session_doc)

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
        print("--> Inserted session_id:", session_id)
    except Exception as e:
        print("--> Insert failed for session_id:", session_id, "error:", e)
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
    print("--> \nCreated session", created_session)

    return AttendanceSessionResponse(**created_session)

@router.get("/report/student-subject", response_model=MultiSubjectReportResponse, status_code=status.HTTP_200_OK)
async def get_student_subject_attendance_report(
        payload: SubjectAttendanceReportFilter = Depends(),
        current_user: dict = Depends(get_current_user)
):
    print("--> Report request by user:", current_user)
    if "admin" not in current_user["role"]:
        if "faculty" not in current_user.get("role", []):
            try:
                student_cursor = await db.Students.find_one({"_id": ObjectId(current_user["id"])})
                print("--> Student cursor for report access check:", student_cursor)
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
    print("--> Initiate attendance for CR request received:", initiate_request)
    try:
        cr_user = await db.Students.find_one({
            "department": initiate_request.department,
            "semester": initiate_request.semester,
            "role": "cr",
            "status": "active"
        })
        print("--> CR user found for request:", cr_user)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"CR for semester {initiate_request.semester} not found.") from e
    # print("--> cr_user: {}".format(cr_user))
    cr_user_id = str(cr_user["_id"])

    # 1. Generate a secure token and set expiration
    token = secrets.token_hex(20)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=15)


    # 2. Save the token to the database
    token_doc = {
        "attendance_token": token,
        "subject_code": initiate_request.subject_code,
        "department": initiate_request.department,
        "semester": initiate_request.semester,
        "faculty_id": current_user["id"],
        "cr_id": cr_user_id,
        "cr_registration_no": cr_user["registration_no"],
        "date": initiate_request.class_date,
        "created_at": now,
        "expires_at": expires,
        "is_used": False,
    }
    try:
        await db.AttendanceTokens.insert_one(token_doc)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Cannot request CR at the moment, Please try again") from e
    # 3. Construct the "Magic Link"
    base_url = "http://localhost:8000/student/cr/"
    magic_link = f"{base_url}/{token}/take-attendance"

    # 4. Save notification to db and Send the real-time notification to the CR
    print("--> Sending notification to CR (user_id: {})".format(cr_user['registration_no']))
    
    notif_id= await save_notification(
        user_id=cr_user_id,
        type="cr_attendance_session_started",
        title=f"Attendance Request for {initiate_request.subject_code} - {cr_user['subjects'][initiate_request.subject_code]}",
        body="Please take attendance. You have 15 minutes.",
        data={"token": token},
        audience_role= ["cr"],
        ttl_minutes=15,
        send_ws=True,
    )
    return {"message": "Attendance initiated. CR has been notified."}

@router.post("/submit-by-cr", status_code=status.HTTP_202_ACCEPTED)
async def submit_attendance_by_cr(
        request_data: MarkAttendanceByCRRequest,
        current_user: dict = Depends(cr_required)
):
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
    print("--> token_doc: {}".format(token_doc))
    
    if not token_doc:
        raise HTTPException(status_code=404, detail="22222Invalid or expired session, or attendance already marked.")

    if token_doc['cr_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="an unexpected error occurred")
    
    if token_doc['subject_code'] != request_data.subject_code or token_doc['department'] != request_data.department or token_doc['semester'] != request_data.semester:
        raise HTTPException(status_code=403, detail="Session details mismatch. Please use the correct attendance link.")

    print("--> Date from token_doc: {}, Date from request: {}".format(token_doc['date'], request_data.class_date))

    now = datetime.now(timezone.utc)
    expiry = token_doc['expires_at']
    
    # If expires_at is naive, attach UTC tzinfo
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    else:
    # optionally normalize to UTC
        expiry = expiry.astimezone(timezone.utc)

    print(f"--> current time (UTC): {now}, session expires at: {expiry}, is_used: {token_doc['is_used']}")
    
    if now > expiry:
        await db.AttendanceTokens.update_one(
            {"_id": token_doc["_id"]},
            {"$set": {"is_used": True}}
        )
        raise HTTPException(status_code=410, detail="This attendance link has expired.")

    # --- 2. If token is valid, proceed with your existing "auto-absent" logic ---
    # ... (Your logic to find absentees and create final_attendance_records) ...
    # ... (Your logic to create the new_session_doc with status 'pending_approval') ...
    present_student_ids = [str(attandance_data.registration_no) for attandance_data in request_data.attendance_data]
    # print("\n--> present_student_ids: ", present_student_ids)

    absent_students_cursor = db.Students.find(
        {
            "status": "active",
            "semester": token_doc["semester"],
            "department": token_doc["department"],
            "subjects": {
                "$elemMatch": {
                    "subject_code": token_doc["subject_code"]
                }
            },
            # --- The crucial part: find students NOT IN the present list ---
            "registration_no": {"$nin": present_student_ids}
        },
        # --- Projection: We only need their registration numbers ---
        {"registration_no": 1, "_id": 0}
    )
    # absent_students =
    # print("--> absent Student records: ", absent_students_cursor)

    # 1) Start from CR‑submitted records, but convert to dicts
    final_attendance_records: list[dict] = []

    for rec in request_data.attendance_data:
        # rec is StudentAttendanceRecord
        rec_dict = rec.model_dump() if hasattr(rec, "model_dump") else rec.dict()
        # Ensure status is a plain string, not Enum
        status = rec_dict.get("status")
        if isinstance(status, Enum):
            rec_dict["status"] = status.value
        final_attendance_records.append(rec_dict)
    # print("\n--> final_attendance_records: ", final_attendance_records)

    async for student in absent_students_cursor:
        final_attendance_records.append({
            "registration_no": student["registration_no"],
            "status": "absent"
        })
    print("\n--> \n\nFinal attendance list: ",final_attendance_records)
    session_id = f"{token_doc['subject_code']}-{token_doc['date'].strftime('%Y%m%d%H%M')}"
    # print("--> Session id:", session_id)

    new_session_doc = {
        "session_id": session_id,
        "faculty_id": token_doc['faculty_id'],
        "subject_code": token_doc["subject_code"],
        "department": token_doc["department"],
        "semester": token_doc["semester"],
        "date": token_doc["date"],
        "status": "pending",  # waiting for approval by faculty
        "submission_details": "marked_by_cr",  # CR submission
        "attendance_records": final_attendance_records,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    print("\n--> \n\nNew session doc: ",new_session_doc)
    # 3. Check for duplicates to prevent marking the same session twice
    existing_session = await db.Attendance.find_one({"session_id": session_id})
    if existing_session:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Attendance for this session ({session_id}) has already been marked."
        )
    # 4. Insert the new session document into the database
    print("--> Attempting to insert new attendance session for CR submission...")
    result = await db.Attendance.insert_one(new_session_doc)
    try:
        pass
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to mark attendance, Please try again") from e
    # --- 3. CRUCIAL: Deactivate the token so it cannot be used again ---
    print("--> Marking token as used to prevent reuse...")
    notification_message = {
        "body": f"Attendance for sem {token_doc['semester']}, subject {token_doc['subject_code']}",
        "title": f"Attendance marked by CR {current_user['id']}",
        "type": "Attendance marked by CR. Requesting approval.",
    }
    await manager.send_personal_message(notification_message, token_doc['faculty_id'])

    try:
        await db.AttendanceTokens.update_one(
            {"_id": token_doc["_id"]},
            {"$set": {"is_used": True}}
        )
    except Exception as e:
        raise HTTPException(status_code=400,detail="Attendance marked succesfully.") from e

    return {'message': 'Attendance marked succesfully.', 'session_id': session_id}  # Placeholder

@router.get("/approvals/{session_id}", status_code=status.HTTP_200_OK)
async def get_session_for_approval(
    session_id: str,
    current_user: dict = Depends(faculty_required),
):
    # print("--> session_id: ",session_id)
    # print("--> current_user_id: ",session_id)
    # Fetch session owned by this faculty
    session = await db.Attendance.find_one({
        "session_id": session_id,
        "faculty_id": current_user["id"]
    })
    print("--> session: ",session)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or not accessible.")
    # Ensure it's CR-submitted and pending
    if session.get("status") == "marked_by_faculty":
        raise HTTPException(status_code=409, detail="Session is already approval, since it was marked by faculty.")
    if session.get("status") != "pending":
            raise HTTPException(status_code=409, detail="Session is not pending for approval.")

    # Compute aggregates (or read from session if you already store them)
    records = session.get("attendance_records", [])
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
async def finalize_session_approval(
    session_id: str,
    body: ApprovalUpdateRequest,
    current_user: dict = Depends(faculty_required),
):
    target = body.status.strip().lower()
    if target not in {"approved", "rejected"}:
        raise HTTPException(status_code=422, detail="Status must be updated to 'approved' or 'rejected'.")
    # 1) Ensure session is pending and owned by faculty
    filter_query = {
        "session_id": session_id,
        "faculty_id": current_user["id"],
        "status": "pending"
    }
    update_doc = {
        "$set": {
            "status": target,
            "decision_reason": body.reason,
            "approved_by": current_user["id"],
            "approved_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        "$push": {
            "audit": {
                "action": "finalize_session",
                "to_status": target,
                "reason": body.reason,
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
    status = status.strip().lower()
    status_filters= ["pending", "marked_by_faculty"]

    filters = {
        "faculty_id": current_user["id"],
    }
    if status == "marked_by_cr":
        filters["submission_details"] = status
    if status in status_filters:
        filters["status"]= status
    if subject_code:
        filters["subject_code"] = subject_code
    if period:
        start_utc, end_utc = compute_period_range(period, tz="Asia/Kolkata")
        filters["date"] = {"$gte": start_utc, "$lt": end_utc}  # half-open [start, end) [2]

    print("--> filters:", filters)
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
        })
        .sort(sort_field, sort_dir)
        .skip((page - 1) * size)
        .limit(size)
    )

    items = [doc async for doc in cursor]
    aggregates= _compute_aggregates(items)
    
    print(f"--> Returning page {page} with {len(items)} items out of total {total}. \n\nAggregates:  {aggregates}")

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
    
    print("--> token_doc for session details: {}".format(token_doc))
    return {
        "subject_code": token_doc["subject_code"],
        "department": token_doc["department"],
        "semester": token_doc["semester"],
        "class_date": token_doc["date"],
    }

@router.get("/cr/pending")
async def list_pending_cr_sessions(current_user = Depends(cr_required)):
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



