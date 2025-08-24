# In app/routers/attendance_router.py
from fastapi import APIRouter, HTTPException, Path, Depends, status, Query
from backend.app.db import db
from secrets import token_urlsafe
from datetime import timedelta, datetime, time

from backend.app.schemas.attendence_schema import AttendanceSessionResponse, MarkAttendanceByFacultyRequest, \
    StudentSubjectReportResponse, AttendanceReportFilters, GroupByOption, SortOrder, SubjectAttendanceReportFilter
from backend.app.utils.dates_normalizer_to_datetime import normalize_dates_for_mongo
from backend.app.utils.hash import hash_password, varify_hash
from backend.app.utils.placeholder_cleaner import clean_placeholders
from backend.app.utils.smtp import send_email_with_link
from backend.app.utils.dependencies import admin_required, get_current_user, faculty_required
from backend.app.utils.unique_faculty_id import generate_unique_faculty_id
from backend.my_logger import log_event
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from pymongo import ASCENDING, DESCENDING
from pymongo.collation import Collation
import json, os

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
    # print("--> absent student records: ", absent_students_cursor)

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
    pipeline = [
        # 1. Match only the relevant class sessions
        {
            "$match": {
                "subject_code": payload.subject_code,
                "status": {"$in": ["approved", "marked_by_faculty"]},
                "attendance_records.registration_no": payload.registration_no
            }
        },
        # 2. Unwind the attendance_records array to process each student record individually
        {
            "$unwind": "$attendance_records"
        },
        # 3. Match again to isolate the records for the specific student we want
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





