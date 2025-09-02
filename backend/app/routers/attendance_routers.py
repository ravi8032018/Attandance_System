# In app/routers/attendance_router.py
import secrets
from time import process_time_ns
from typing import Optional, Annotated
from fastapi import APIRouter, HTTPException, Path, Depends, status, Query
from backend.app.db import db
from datetime import timedelta, datetime, time
from backend.app.schemas.attendence_schema import AttendanceSessionResponse, MarkAttendanceByFacultyRequest, \
    StudentSubjectReportResponse, SubjectAttendanceReportFilter, \
    MarkAttendanceByCRRequest, FacultyToCRRequest, ApprovalUpdateRequest, StudentStatusUpdateRequest, \
    ApprovalsFilterParamsRequest, compute_period_range
from backend.app.utils.connection_manager import manager
from backend.app.utils.session_aggregator import _compute_aggregates
from backend.app.utils.dependencies import admin_required, get_current_user, faculty_required, cr_required


router = APIRouter(prefix="/attendance", tags=["Attendance Management"])

@router.post("/mark-by-faculty", response_model=AttendanceSessionResponse, status_code=status.HTTP_201_CREATED)
async def mark_attendance_by_faculty(
        request_data: MarkAttendanceByFacultyRequest,
        current_user: dict = Depends(faculty_required)
):
    # print("\ncurrent user : ",current_user)
    f_id = current_user.get("id")
    # print(faculty_id)
    request_data= request_data.dict()

    present_student_ids = [str(attandance_data['registration_no']) for attandance_data in request_data['attendance_data']]
    # print("\n--> present_student_ids: ", present_student_ids)

    absent_students_cursor = db.Students.find(
        {
            "status": "active",
            "sem": request_data["sem"],
            "department": request_data["department"],
            "subjects": {
                "$elemMatch": {
                    "subject_code": request_data["subject_code"]
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

    final_attendance_records= [record for record in request_data["attendance_data"]]
    # print("\n--> final_attendance_records: ", final_attendance_records)

    async for student in absent_students_cursor:
        final_attendance_records.append({
            "registration_no": student["registration_no"],
            "status": "absent"
        })
    # print("\n--> Final attendance list: ",final_attendance_records)
    session_id = f"{request_data['subject_code']}-{request_data['class_date'].strftime('%Y%m%d%H%M')}"
    # print("--> Session id:", session_id)

    new_session_doc = {
        "session_id": session_id,
        "faculty_id": f_id,
        "subject_code": request_data["subject_code"],
        "subject_name": request_data["subject_name"],
        "department": request_data["department"],
        "semester": request_data["sem"],
        "date": request_data["class_date"],
        "status": "marked_by_faculty",  # Direct marking by faculty
        "submission_details": None,  # No CR submission in this case
        "attendance_records": final_attendance_records,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    # 3. Check for duplicates to prevent marking the same session twice
    existing_session = await db.Attendance.find_one({"session_id": session_id})
    if existing_session:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Attendance for this session ({session_id}) has already been marked."
        )
    # 4. Insert the new session document into the database
    try:
        result = await db.Attendance.insert_one(new_session_doc)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to mark attendance") from e
    # 5. Fetch the newly created document to return it in the response
    try:
        created_session = await db.Attendance.find_one({"_id": result.inserted_id})
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Attendance marked successfully but failed to fetch details.") from e

    if not created_session:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve the attendance session."
        )
    # print("\n created_seesion: ",created_session)
    created_session["_id"] = str(created_session["_id"])
    # print("--> \nCreated session", created_session)
    return AttendanceSessionResponse(**created_session)

@router.get("/report/student-subject", response_model=StudentSubjectReportResponse)
async def get_student_subject_attendance_report(
        payload: SubjectAttendanceReportFilter = Depends(),
        current_user: dict = Depends(get_current_user)
):
    # print("\n--> payload: ",payload)
    if "admin" not in current_user["role"]:
        if "faculty" not in current_user.get("role", []):
            try:
                student_cursor= db.Students.find_one({"_id": current_user["id"]})
                if not student_cursor:
                        raise HTTPException(status_code=403, detail="Access denied. Only admins, faculties and Student can see his Student reports.")
            except Exception as e:
                raise HTTPException(status_code=403,detail="Access denied.")

    pipeline = [
        # 1. Match only the relevant class sessions
        {
            "$match": {
                "subject_code": payload.subject_code,
                "status": {"$in": ["approved", "marked_by_faculty"]},
                "attendance_records.registration_no": payload.registration_no
            }
        },
        # 2. Unwind the attendance_records array to process each Student record individually
        {
            "$unwind": "$attendance_records"
        },
        # 3. Match again to isolate the records for the specific Student we want
        {
            "$match": {
                "attendance_records.registration_no": payload.registration_no
            }
        },
        # 4. Group the records to count statuses and collect daily records
        {
            "$group": {
                "_id": "$attendance_records.registration_no",
                "present_count": {
                    "$sum": {"$cond": [{"$eq": ["$attendance_records.status", "present"]}, 1, 0]}
                },
                "absent_count": {
                    "$sum": {"$cond": [{"$eq": ["$attendance_records.status", "absent"]}, 1, 0]}
                },
                "excused_count": {
                    "$sum": {"$cond": [{"$eq": ["$attendance_records.status", "excused"]}, 1, 0]}
                },
                "daily_records": {
                    "$push": {
                        "date": "$date",
                        "status": "$attendance_records.status"
                    }
                }
            }
        }
    ]
    try:
        result = await db.Attendance.aggregate(pipeline).to_list(1)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Cannot get data at the moment") from e

    if not result:
        # If no records are found, return a default empty report
        return StudentSubjectReportResponse(
            total_classes=0,
            present_count=0,
            absent_count=0,
            excused_count=0,
            attendance_percentage=0.0,
            daily_records=[]
        )

    report_data = result[0]
    # print("--> Report data", report_data)

    total_classes = report_data["present_count"] + report_data["absent_count"] + report_data["excused_count"]
    # print("--> Total classes", total_classes)

    attendance_percentage = 0.0
    if total_classes > 0:
        # Standard attendance percentage calculation (present / total)
        attendance_percentage = round((report_data["present_count"] / total_classes) * 100, 2)
        # print("--> Attendance percentage", attendance_percentage)

    return StudentSubjectReportResponse(
        total_classes=total_classes,
        present_count=report_data["present_count"],
        absent_count=report_data["absent_count"],
        excused_count=report_data["excused_count"],
        attendance_percentage=attendance_percentage,
        daily_records=report_data["daily_records"]
    )

@router.post("/initiate-for-cr", status_code=status.HTTP_201_CREATED)
async def initiate_attendance_for_cr(
        initiate_request: FacultyToCRRequest,
        current_user: dict = Depends(faculty_required)
):
    try:
        cr_user = await db.Students.find_one({
            "department": initiate_request.department,
            "sem": initiate_request.sem,
            "role": "cr"
        })
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"CR for sem {initiate_request.sem} not found.") from e
    # print("--> cr_user: {}".format(cr_user))
    cr_user_id = str(cr_user["_id"])

    # 1. Generate a secure token and set expiration
    token = secrets.token_hex(20)
    now = datetime.utcnow()
    expires = now + timedelta(minutes=15)

    # 2. Save the token to the database
    token_doc = {
        "attendance_token": token,
        "subject_code": initiate_request.subject_code,
        "subject_name": initiate_request.subject_name,
        "department": initiate_request.department,
        "sem": initiate_request.sem,
        "faculty_id": current_user["id"],
        "cr_id": cr_user_id,
        "cr_registration_no": cr_user["registration_no"],
        "date": initiate_request.class_date,
        "created_at": now,
        "expires_at": expires,
        "status": "pending"
    }
    try:
        await db.AttendanceTokens.insert_one(token_doc)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Cannot request CR at the moment, Please try again") from e
    # 3. Construct the "Magic Link"
    base_url = "http://localhost:8000/cr/take-attendance"
    magic_link = f"{base_url}?token={token}"

    # 4. Send the real-time notification to the CR via WebSocket
    notification_message = {
        "type": "attendance_request",
        "title": f"Attendance Request for {initiate_request.subject_code}",
        "body": "Please take attendance. You have 15 minutes.",
        "link": magic_link
    }
    await manager.send_personal_message(notification_message, cr_user_id)

    return {"message": "Attendance initiated. CR has been notified."}

@router.post("/submit-by-cr", status_code=status.HTTP_202_ACCEPTED)
async def submit_attendance_by_cr(
        request_data: MarkAttendanceByCRRequest,
        current_user: dict = Depends(cr_required)
):
    # print(current_user)
    now = datetime.utcnow()
    # print("\n--> request_data: {}".format(request_data))
    # 1. Find and validate the token from the database
    try:
        token_doc = await db.AttendanceTokens.find_one({
            "status": "pending",
            "attendance_token": str(request_data.attendance_token),
        })
    except Exception as e:
        raise HTTPException(status_code=400,detail="111111Invalid or expired session, or attendance already marked") from e
    # print("--> token_doc: {}".format(token_doc))
    if not token_doc:
        raise HTTPException(status_code=404, detail="22222Invalid or expired session, or attendance already marked.")

    if token_doc['cr_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="an unexpected error occurred")

    if now > token_doc["expires_at"]:
        await db.AttendanceTokens.update_one(
            {"_id": token_doc["_id"]},
            {"$set": {"status": "expired"}}
        )
        raise HTTPException(status_code=410, detail="This attendance link has expired.")

    # --- 2. If token is valid, proceed with your existing "auto-absent" logic ---
    # ... (Your logic to find absentees and create final_attendance_records) ...
    # ... (Your logic to create the new_session_doc with status 'pending_approval') ...
    request_data= request_data.dict()

    present_student_ids = [str(attandance_data['registration_no']) for attandance_data in request_data['attendance_data']]
    # print("\n--> present_student_ids: ", present_student_ids)

    absent_students_cursor = db.Students.find(
        {
            "status": "active",
            "sem": token_doc["sem"],
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

    final_attendance_records = [record for record in request_data['attendance_data']]
    # print("\n--> final_attendance_records: ", final_attendance_records)

    async for student in absent_students_cursor:
        final_attendance_records.append({
            "registration_no": student["registration_no"],
            "status": "absent"
        })
    # print("\n--> Final attendance list: ",final_attendance_records)
    session_id = f"{token_doc['subject_code']}-{token_doc['date'].strftime('%Y%m%d%H%M')}"
    # print("--> Session id:", session_id)

    new_session_doc = {
        "session_id": session_id,
        "faculty_id": token_doc['faculty_id'],
        "subject_code": token_doc["subject_code"],
        "subject_name": token_doc["subject_name"],
        "department": token_doc["department"],
        "semester": token_doc["sem"],
        "date": token_doc["date"],
        "status": "pending",  # waiting for approval by faculty
        "submission_details": "marked_by_cr",  # CR submission
        "attendance_records": final_attendance_records,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    # 3. Check for duplicates to prevent marking the same session twice
    existing_session = await db.Attendance.find_one({"session_id": session_id})
    if existing_session:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Attendance for this session ({session_id}) has already been marked."
        )
    # 4. Insert the new session document into the database
    try:
        result = await db.Attendance.insert_one(new_session_doc)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to mark attendance, Please try again") from e
    # --- 3. CRUCIAL: Deactivate the token so it cannot be used again ---
    notification_message = {
        "body": f"Attendance for sem {token_doc['sem']}, subject {token_doc['subject_code']}",
        "title": f"Attendance marked by CR {current_user['id']}",
        "type": "Attendance marked by CR. Requesting approval.",
    }
    await manager.send_personal_message(notification_message, token_doc['faculty_id'])

    try:
        await db.AttendanceTokens.update_one(
            {"_id": token_doc["_id"]},
            {"$set": {"status": "used"}}
        )
    except Exception as e:
        raise HTTPException(status_code=400,detail="Attendance marked succesfully.") from e

    return {'message': 'Attendance marked succesfully.'}  # Placeholder

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
        })
        .sort(sort_field, sort_dir)
        .skip((page - 1) * size)
        .limit(size)
    )

    items = [doc async for doc in cursor]
    aggregates= _compute_aggregates(items)

    return {
        "page": page,
        "size": size,
        "total": total,
        "items": items,
        "aggregates": aggregates,
    }



