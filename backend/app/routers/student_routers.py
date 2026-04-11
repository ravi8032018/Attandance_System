# student_router.py
from fastapi import APIRouter, HTTPException, Path, Query, Depends, status
from backend.app.db import db
from backend.app.schemas.student_schema import StudentCreateRequest, StudentBulkCreateResponse, \
    StudentProfileUpdateRequest, StudentFullProfileResponse, StudentSelfUpdateRequest, ChangePasswordRequest, SortOrder, \
    StudentFilterParamsRequest, StudentProfileUpdateByAdmin
from backend.app.schemas.student_schema import  StudentOutResponse, StudentAdminResponse, StudentListResponse, StudentPaginatedResponse
from secrets import token_urlsafe
from datetime import datetime, timedelta, timezone
from backend.app.utils.dates_normalizer_to_datetime import normalize_dates_for_mongo
from backend.app.utils.get_subjects_for_faculty import get_faculty_subject_codes_for_dept_sem
from backend.app.utils.hash import hash_password, varify_hash
from backend.app.utils.placeholder_cleaner import clean_placeholders
from backend.app.utils.smtp import send_email_with_link
from backend.app.utils.dependencies import admin_required, cr_required, get_current_user, student_required
from backend.app.utils.unique_student_id import generate_unique_student_id
from backend.app.schemas.student_schema import StudentBulkCreateRequest
from backend.my_logger import log_event
from bson import ObjectId
import json, os
from pymongo.errors import DuplicateKeyError
from pymongo import ASCENDING, DESCENDING
from pymongo.collation import Collation

BACKEND_HOST= os.getenv("BACKEND_HOST")

router = APIRouter(prefix="/student", tags=["Student"])

@router.post("/create", response_model=StudentOutResponse)
async def student_create(
        student: StudentCreateRequest,
        current_admin: dict = Depends(admin_required)
):
    student_dict = student.dict()
    # print(student_dict)
    # this gets the subjects from Curriculam DB
    payload = {
        'department': student_dict['department'],
        'semester': student_dict['semester'],
        'course': student_dict['course'],
    }
    docs = await db.Curriculum.find_one(payload)
    print("--> docs: ", docs)
    data = docs["subjects"] if docs else None 
    print("--> data: ", data)
    subjects_doc = {
        "subjects": {
            subject["subject_code"]: subject["subject_name"]
            for subject in data if data is not None
        }
    }
    now = datetime.utcnow()
    unique_student_id = await generate_unique_student_id(student.course, student.registration_year, student.department)
    print("Your Unique_Student_ID is ", unique_student_id, " --> ", student.email)

    student_dict["registration_no"] = unique_student_id
    student_dict["created_by"] = current_admin["name"]
    student_dict["status"] = "inactive"
    student_dict["role"] = ["student"]  
    student_dict["created_at"] = datetime.utcnow()
    student_dict['profile_complete']= False
    student_dict['updated_at']= datetime.utcnow()
    student_dict['updated_by']= None
    student_dict['subjects']= subjects_doc['subjects'] if subjects_doc else {}

    print("--> Subject_doc: ",subjects_doc)
    created=[]
    try:
        res = await db['Students'].insert_one(student_dict)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Student already exists")

    result = await db['Students'].find_one({"_id": res.inserted_id})

    if not result:
        raise HTTPException(status_code=500, detail=f"Student account creation failed for {student_dict['email']}[{student_dict['registration_no']}]")

    # 2. Generate a one-time-use password-set token (valid 48h)
    token = token_urlsafe(32)

    expiry = now + timedelta(hours=48)
    await db["PasswordResetDB"].insert_one({
        "student_id": str(res.inserted_id),
        "token": token,
        "user_type": "Student",
        "type": "set_password",
        "expires_at": expiry,
        "is_used": False
    })

    # 3. Email the Student with a link to set/reset password
    link = f"{BACKEND_HOST}/reset-password?token={token}"

    email_data = {
        "email_to": student.email,
        "registration_no": unique_student_id,
        "link": link,
        "created_at": now.isoformat(),
        "is_sent": False
    }
    created.append(email_data)
    # Write entire batch to file at end of creation
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".."))
    email_cache_dirr_path = os.path.join(PROJECT_ROOT, "cache_local")

    with open(f"{email_cache_dirr_path}/students_to_email.json", "r+") as f:
        try:
            data = json.load(f)   # Read existing content
        except json.decoder.JSONDecodeError:
            data = []  # If file is empty or corrupt, start with an empty list

        for dicts in created:
            data.append(dicts)
        f.seek(0)  # Go back to the beginning
        json.dump(data, f, indent=2)  # Write ALL data back, including new item
        f.truncate()

    send_email_with_link(f"{email_cache_dirr_path}/students_to_email.json")

    log_event("create Student", user_email=student_dict["email"], user_name=student_dict["name"] if 'name' in student_dict else None, user_id=student_dict["registration_no"], user_role="admin", details=f"created by {current_admin['name']}")

    try:
        return StudentOutResponse(
            message=f"Student account created successfully {student_dict['email']}[{student_dict['registration_no']}]"
        )
    except Exception as e:
        print("ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/bulk-create", response_model=StudentBulkCreateResponse)
async def bulk_students_create(
        payload: StudentBulkCreateRequest,
        current_admin: dict = Depends(admin_required)
):
    # print("\nStarting bulk creation of students\n")
    student_mails = payload.student_emails
    now = datetime.utcnow()
    created = []
    created_mails=[]

    # this gets the subjects from Curriculum DB
    pay = {
        'department': payload.department,
        'semester': payload.sem,
        'course': payload.course,
    }
    # subjects_doc = await db.Curriculum.find_one(pay)
    subjects_doc = {
        'subjects': {
            "CSDSC101": "Python Programming",
            "CSDSC102": "Data Structures",
            "CSDSC103": "Database Management Systems",
            "CSDSC104": "Computer Networks",
        }
    }

    for stu_mail in student_mails:
        # 1. Create the Student doc with inactive status)
        unique_student_id = await generate_unique_student_id(payload.course,payload.registration_year,payload.department)
        print("Your Unique_Student_ID is ",unique_student_id, "\t",stu_mail)

        default_password = token_urlsafe(10)
        hashed_default = await hash_password(default_password)
        stu_doc = {
            "email": stu_mail,
            "registration_no": unique_student_id,
            "semester": payload.sem,
            "registration_year": payload.registration_year,
            "department": payload.department,
            "course": payload.course,
            "role": ["student"],
            "status": "inactive",
            "created_by": current_admin["name"],
            "created_at": now,
            'profile_complete': False,
            'updated_at' : now,
            'updated_by' : None,
            "password": hashed_default,
            "subjects": subjects_doc['subjects']
        }
        # print(payload.department, payload.course, payload.registration_year, payload.sem, subjects_doc['subjects'])
        try:
            result = await db["Students"].insert_one(stu_doc)
        except DuplicateKeyError:
            raise HTTPException(status_code=400, detail="Student already exists")
            # handle accordingly (skip, notify, etc.)
        except Exception as e:
            print("Other error:", e)

        if not result:
            log_event("Student already exists", user_email=current_admin["email"], user_id=current_admin["id"], user_role=current_admin['role'],details=stu_doc['email'])
            break
        # 2. Generate a one-time-use password-set token (valid 48h)
        token = token_urlsafe(32)

        expiry = now + timedelta(hours=48)
        await db["PasswordResetDB"].insert_one({
            "student_id": str(result.inserted_id),
            "token": token,
            "type": "set_password",
            "expires_at": expiry,
            "is_used": False
        })

        # 3. Email the Student with a link to set/reset password
        link = f"{BACKEND_HOST}/reset-password?token={token}"

        email_data = {
            "email_to": stu_mail,
            "registration_no": unique_student_id,
            "link": link,
            "created_at": now.isoformat(),
            "is_sent": False
            # "token": token
        }
        created.append(email_data)
        created_mails.append(stu_mail)

    # Write entire batch to file at end of creation
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".."))
    email_cache_dirr_path = os.path.join(PROJECT_ROOT, "cache_local")

    with open(f"{email_cache_dirr_path}/students_to_email.json", "r+") as f:
        try:
            data = json.load(f)   # Read existing content
        except json.decoder.JSONDecodeError:
            data = []  # If file is empty or corrupt, start with an empty list

        for dicts in created:
            data.append(dicts)
        f.seek(0)  # Go back to the beginning
        json.dump(data, f, indent=2)  # Write ALL data back, including new item
        f.truncate()

    send_email_with_link(f"{email_cache_dirr_path}/students_to_email.json")

    log_event("create bulk students",details=created_mails)
    return {"message": f"Accounts created and emails sent; Total: {len(created)}" }

@router.get("/registration-no/{registration_no}")
async def get_student_by_id(
        registration_no: str = Path(..., title="registration-no"),
        current_user: dict = Depends(get_current_user)
):
    # print("--> testing frontend: ", current_user)
    student = await db['Students'].find_one({"registration_no": registration_no})
    # print("--> testing frontend: ", student)
    print("Student :", student)

    if "admin" not in current_user["role"]:
        if "faculty" not in (current_user["role"]):
            # print(ObjectId(current_user["id"]))
            # print(Student.get("_id"))
            raise HTTPException(status_code=403, detail="Not authorized to update this profile")

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    log_event("Admin fetched Student profile", user_email=current_user["email"], user_id=current_user["id"], user_role=current_user['role'], details=f"admin fetched Student profile")

    return StudentAdminResponse(
        id=str(student["_id"]),
        registration_no=student["registration_no"],
        semester=student["semester"] if "semester" in student else None,
        first_name=student["first_name"] if "first_name" in student else None,
        last_name=student["last_name"] if "last_name" in student else None,
        department= student["department"],
        course=student['course'],
        dob=student.get("date_of_birth") if "dob" in student else None,
        gender=student.get("gender") if "gender" in student else None,
        contact_number=student.get("contact_number") if "contact_number" in student else None,
        email=student.get("email"),
        batch_name=student.get("batch_name") if "batch_name" in student else None,
        status=student.get("status") if "status" in student else "inactive",
        photo_url=student.get("photo_url") if "photo_url" in student else None,
        roll_number=student.get("roll_number") if "roll_number" in student else None,
        guardian_email=student.get("guardian_email") if "guardian_email" in student else None,
    )

@router.post("/complete-profile/{registration_no}")
async def complete_profile(
        registration_no: str,
        update_data: StudentProfileUpdateRequest,
        current_user: dict = Depends(get_current_user)
):
    # print("\n--> registration_no:", registration_no)
    student = await db["Students"].find_one({"registration_no": registration_no, "status": "active"})
    # print("\nStudent", student)

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Step 2: Authorization check
    if "admin" not in current_user["role"]:
        if ObjectId(current_user["id"]) != student.get("_id"):
            # print(ObjectId(current_user["id"]))
            # print(Student.get("_id"))
            raise HTTPException(status_code=403, detail="Not authorized to update this profile")

    clean_update= clean_placeholders(update_data.dict())

    required_fields = ["first_name", "last_name", "dob", "gender", "contact_number"]
    if not student.get("profile_complete", False):
        for field in required_fields:
            if field not in clean_update or not clean_update[field]:
                raise HTTPException(status_code=400, detail=f"{field} is required for profile completion")

    clean_update= normalize_dates_for_mongo(clean_update)

    clean_update.update({
        "profile_complete": True,
        "updated_at": datetime.utcnow(),
        "updated_by": current_user["name"] if (current_user["name"] is not None) else current_user["email"],
    })
    # print("\nupdate_dict", clean_update)

    # Step 6: Update in DB
    result = await db["Students"].update_one(
        {"registration_no": registration_no, "status": "active"},
        {"$set": clean_update}
    )

    log_event("Student Profile Update", user_email=current_user["email"], user_name=current_user["name"] if (current_user['name'] is not None) else None, user_id=current_user["id"], user_role=current_user["role"], details=f"Student {current_user['id']} Profile complete, name {clean_update['first_name']} {clean_update['last_name']}, email {current_user['email']}")

    return {"message": "Profile updated successfully"}

@router.get("/me", response_model=StudentFullProfileResponse)
async def get_current_student_profile(
        current_user: dict = Depends(student_required)
):
    print("current_user--> ", current_user)
    student_id = current_user.get("id")

    if not student_id:
        raise HTTPException(status_code=400, detail="Invalid user session.")

    try:
        student = await db["Students"].find_one({"_id": ObjectId(student_id), "status": "active"})
    except Exception as e:
        raise HTTPException(status_code=404, detail="Cannot find Student.") from e
    # print("Student--> ", Student)

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    log_event("read own Student profile", user_email=current_user["email"], user_id=current_user["id"], user_role=current_user['role'], details="accessed own Student profile")

    return StudentFullProfileResponse(**student)

@router.patch("/me")
async def update_current_student_profile(
        update_data: StudentSelfUpdateRequest,
        current_user: dict = Depends(get_current_user)
):
    if "student" not in current_user.get("role", []):
        raise HTTPException(status_code=403, detail="Access denied. Only students can update their own profile.")
    # print("current user--> ", current_user)
    student_id = current_user.get("id")
    if not student_id:
        raise HTTPException(status_code=400, detail="Invalid user session.")

    try:
        student = await db["Students"].find_one({"_id": ObjectId(student_id), "status": "active"})
        # print("current Student--> ", Student)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Cannot find Student.") from e

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    update_dict = update_data.dict(exclude_unset=True)
    clean_update = clean_placeholders(update_dict)
    clean_update = normalize_dates_for_mongo(clean_update)
    clean_update["updated_at"] = datetime.utcnow()
    clean_update["updated_by"] = current_user.get("name") or current_user["email"]

    result = await db["Students"].update_one(
        {"_id": ObjectId(student_id), "status": "active"},
        {"$set": clean_update}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student profile not found (or no changes made).")
    if result.modified_count == 0 and clean_update:
        # This can happen if the update data is identical to current data
        pass

    updated_student = await db["Students"].find_one({"_id": ObjectId(student_id), "status": "active"})
    if not updated_student:
        raise HTTPException(status_code=500, detail="Failed to retrieve updated Student profile.")

    log_event("update own Student profile", user_email=current_user["email"], user_id=current_user["id"], user_role="Student", details=f"updated own profile fields: {list(clean_update.keys())}")

    return "Profile updated successfully"

@router.post("/change-password")
async def change_student_password(
        password_data: ChangePasswordRequest,
        current_user: dict = Depends(get_current_user)
):
    if "admin" not in current_user["role"]:
        if "Student" not in current_user.get("role", []):
            raise HTTPException(status_code=403, detail="Access denied. Only admins and students can change their own password.")

    student_id = current_user.get("id")
    if not student_id:
        raise HTTPException(status_code=400, detail="Invalid user session.")

    try:
        student = await db["Students"].find_one({"_id": ObjectId(student_id), "status": "active"})
    except Exception as e:
        raise HTTPException(status_code=404, detail="Cannot find Student.") from e
    if not student:
        raise HTTPException(status_code=404, detail="Student account not found.")

    stored_hashed_password = student.get("password")

    # Verify old password
    if not stored_hashed_password or not varify_hash(password_data.old_password, stored_hashed_password):
        raise HTTPException(status_code=400, detail="Invalid password.")

    # Hash the new password
    new_hashed_password = hash_password(password_data.new_password)

    # Update the password in the database
    result = await db["Students"].update_one(
        {"_id": ObjectId(student_id), "status": "active"},
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

    log_event("change password", user_email=current_user["email"], user_id=current_user["id"], user_role=current_user['role'], details="successfully changed password")

    return {"message": "Password changed successfully."}

@router.get("/", response_model=StudentPaginatedResponse)
async def list_students(
    params: StudentFilterParamsRequest= Depends(),
    current_user: dict = Depends(get_current_user)
):
    print("--> testing frontend : entering list_students")
    if "admin" not in current_user["role"]:
        if "faculty" not in current_user.get("role", []):
            raise HTTPException(status_code=403, detail="Access denied. Only admins and faculty can view all students.")

    # This check is redundant if `ge=1` is working, but serves as a manual safeguard
    if params.limit < 1:
        raise HTTPException(status_code=400, detail="Limit or skip must be a positive integer.")
    # print(f"DEBUG: Received sort_by = '{params.sort_by}' (type: {type(params.sort_by)})")
    # print(f"DEBUG: Received sort_order = '{params.sort_order.value}' (type: {type(params.sort_order)})")

    query_filter = {}
    expr_conditions = []

    if params.registration_no:
        query_filter["registration_no"] = {"$regex": params.registration_no, "$options": "i"}

    if params.email:
        query_filter["email"] = {"$regex": params.email, "$options": "i"}

    if params.first_name:
        query_filter["first_name"] = {"$regex": params.first_name, "$options": "i"}

    if params.last_name:
        query_filter["last_name"] = {"$regex": params.last_name, "$options": "i"}

    if params.status:
        query_filter["status"] = params.status.lower()

    if params.semester:
        query_filter["semester"] = params.semester.lower()

    if params.department:
        query_filter["department"] = {"$regex": params.department, "$options": "i"}

    if params.subject_code:
        expr_conditions.append({
            "$gt": [
                {
                    "$size": {
                        "$filter": {
                            "input": {"$objectToArray": "$subjects"},
                            "as": "subj",
                            "cond": {
                                "$regexMatch": {
                                    "input": "$$subj.k",
                                    "regex": params.subject_code,
                                    "options": "i"
                                }
                            }
                        }
                    }
                },
                0
            ]
        })

    if expr_conditions:
        query_filter["$expr"] = {"$and": expr_conditions}

    print(f"DEBUG: Final MongoDB query filter = {query_filter}")

    mongo_sort_order = ASCENDING if params.sort_order == SortOrder.ASC else DESCENDING
    ALLOWED_SORT_FIELDS = {"created_at", "first_name", "last_name", "email", "registration_no", "semester"}
    if params.sort_by not in ALLOWED_SORT_FIELDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort_by field. Allowed fields are: {', '.join(sorted(ALLOWED_SORT_FIELDS))}"
        )
    # Define collation for case-insensitive sorting on string fields
    collation = Collation(locale='en', strength=2)
    total_count = await db["Students"].count_documents(query_filter)

    students_cursor = db["Students"].find(query_filter).collation(collation).sort(params.sort_by, mongo_sort_order).skip(params.skip).limit(params.limit)

    students_data = [StudentListResponse(**student) async for student in students_cursor]

    log_event(
        "list students",
        user_email=current_user["email"],
        user_id=current_user["id"],
        user_role=current_user["role"],
        details=f"Fetched {len(students_data)} students. Filters: {query_filter}"
    )

    return StudentPaginatedResponse(
        data=students_data,
        total_count=  total_count,
        page=params.skip // params.limit + 1,
        limit=params.limit
    )

@router.get("/my", response_model=StudentPaginatedResponse)
async def list_my_students(
    params: StudentFilterParamsRequest= Depends(),
    current_user: dict = Depends(get_current_user)
):
    print("--> testing frontend : entering list_students")
    if "admin" not in current_user["role"]:
        if "faculty" not in current_user.get("role", []):
            raise HTTPException(status_code=403, detail="Access denied. Only admins and faculty can view all students.")

    # This check is redundant if `ge=1` is working, but serves as a manual safeguard
    if params.limit < 1:
        raise HTTPException(status_code=400, detail="Limit or skip must be a positive integer.")
    # print(f"DEBUG: Received sort_by = '{params.sort_by}' (type: {type(params.sort_by)})")
    # print(f"DEBUG: Received sort_order = '{params.sort_order.value}' (type: {type(params.sort_order)})")

    query_filter = {}
    expr_conditions = []

     # If faculty has subjects assigned for the given dept/sem, restrict to only those students
    if params.registration_no:
        query_filter["registration_no"] = {"$regex": params.registration_no, "$options": "i"}

    if params.email:
        query_filter["email"] = {"$regex": params.email, "$options": "i"}

    if params.first_name:
        query_filter["first_name"] = {"$regex": params.first_name, "$options": "i"}

    if params.last_name:
        query_filter["last_name"] = {"$regex": params.last_name, "$options": "i"}

    if params.status:
        query_filter["status"] = params.status.lower()

    if params.semester:
        query_filter["semester"] = params.semester.lower()

    if params.department:
        query_filter["department"] = {"$regex": params.department, "$options": "i"}

    if params.subject_code:
        expr_conditions.append({
            "$gt": [
                {
                    "$size": {
                        "$filter": {
                            "input": {"$objectToArray": "$subjects"},
                            "as": "subj",
                            "cond": {
                                "$regexMatch": {
                                    "input": "$$subj.k",
                                    "regex": params.subject_code,
                                    "options": "i"
                                }
                            }
                        }
                    }
                },
                0
            ]
        })
        
    # --- FACULTY SCOPING ---
    if "faculty" in current_user['role'] and "admin" not in current_user['role']:
        # This is a faculty (or HOD-as-faculty) view: restrict to their subjects
        faculty_id = current_user.get("unique_id")
        if not faculty_id:
            raise HTTPException(
                status_code=400,
                detail="Faculty unique_id is missing on user.",
            )
        
        # Optionally you can pass params.department/params.semester to restrict
        faculty_subject_codes = await get_faculty_subject_codes_for_dept_sem(
            unique_faculty_id=faculty_id,
            department=params.department,
            semester=params.semester,
        )
        print(f"DEBUG: Faculty subject codes: {faculty_subject_codes}")
        
        if not faculty_subject_codes:
            # Faculty has no assigned subjects → no students
            return StudentPaginatedResponse(
                data=[],
                total_count=0,
                page=params.skip // params.limit + 1,
                limit=params.limit,
            )
            
        expr_conditions.append(
            {
                "$gt": [
                    {
                        "$size": {
                            "$filter": {
                                "input": {"$objectToArray": "$subjects"},
                                "as": "subj",
                                "cond": {
                                    "$in": ["$$subj.k", faculty_subject_codes]
                                },
                            }
                        }
                    },
                    0,
                ]
            }
        )

    if expr_conditions:
        query_filter["$expr"] = {"$and": expr_conditions}

    print(f"DEBUG: Final MongoDB query filter = {query_filter}")

    mongo_sort_order = ASCENDING if params.sort_order == SortOrder.ASC else DESCENDING
    ALLOWED_SORT_FIELDS = {"created_at", "first_name", "last_name", "email", "registration_no", "semester"}
    if params.sort_by not in ALLOWED_SORT_FIELDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort_by field. Allowed fields are: {', '.join(sorted(ALLOWED_SORT_FIELDS))}"
        )
    # Define collation for case-insensitive sorting on string fields
    collation = Collation(locale='en', strength=2)
    total_count = await db["Students"].count_documents(query_filter)

    students_cursor = db["Students"].find(query_filter).collation(collation).sort(params.sort_by, mongo_sort_order).skip(params.skip).limit(params.limit)

    students_data = [StudentListResponse(**student) async for student in students_cursor]

    log_event(
        "list students",
        user_email=current_user["email"],
        user_id=current_user["id"],
        user_role=current_user["role"],
        details=f"Fetched {len(students_data)} students. Filters: {query_filter}"
    )

    return StudentPaginatedResponse(
        data=students_data,
        total_count=  total_count,
        page=params.skip // params.limit + 1,
        limit=params.limit
    )


@router.delete("/delete/{registration_no}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
        registration_no: str= Path(..., description="Registration number"),
        current_user: dict = Depends(admin_required)
):
    try:
        updated_student = await db.Students.find_one_and_update(
            {"registration_no": registration_no, "status": "active"},
            {"$set": {"status": "inactive"}}
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
    # print("Student ", updated_student)

    if updated_student is None:
        student_exists = await db.students.find_one({"registration_no": registration_no})
        # print(student_exists)
        if not student_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with registration number {registration_no} not found."
            )
    log_event("delete Student", user_email=current_user["email"], user_name=current_user["name"], user_id=current_user["id"], user_role=current_user["role"])
    return

@router.patch("/update/{registration_no}")
async def update_student_by_admin(
        student_data: StudentProfileUpdateByAdmin,
        registration_no: str = Path(..., description="The registration number of the Student to update"),
        current_user: dict = Depends(admin_required)
):
    update_data = student_data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")

    try:
        updated_student = await db.Students.find_one_and_update(
            {"registration_no": registration_no, "status": "active"},
            {"$set": update_data},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # This handles the case where no Student was found OR the Student was inactive
    if updated_student is None:
        # Check if a Student with that registration number even exists
        student_exists = await db.Students.find_one({"registration_no": registration_no})

        if not student_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with registration number {registration_no} not found."
            )
        else:
            # If the Student exists but was not updated, it must be because they are inactive
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student with registration number {registration_no} is inactive and cannot be updated."
            )

    return updated_student

@router.post("/{registration_no}/promote-to-cr", status_code=status.HTTP_200_OK)
async def promote_student_to_cr(
        registration_no: str = Path(..., description="The registration number of the Student to promote to CR"),
        current_user: dict = Depends(admin_required)
):
    try:
        updated_student = await db.Students.find_one(
            {"registration_no": registration_no, "status": "active"}
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    if updated_student is None:
        student_exists = await db.Students.find_one({"registration_no": registration_no})
        if not student_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with registration number {registration_no} not found."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student with registration number {registration_no} is inactive and cannot be promoted."
            )

    # Check if the student is already a CR    
    if "cr" in updated_student.get("role", []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student with registration number {registration_no} is already a CR"
        )
    
    # Add "cr" to the student's role array
    try:
        await db.Students.update_one(
            {"registration_no": registration_no, "status": "active"},
            {"$addToSet": {"role": "cr"}}  # addToSet ensures "cr" is not added multiple times
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error while promoting to CR: {str(e)}")
    
    log_event("promote student to CR", user_email=current_user["email"], user_name=current_user["name"], user_id=current_user["id"], user_role=current_user["role"])

    return {"message": f"Student with registration number {registration_no} has been promoted to CR.", "status_code": status.HTTP_200_OK}

@router.get("/list-students-for-cr", response_model=StudentPaginatedResponse)
async def list_students_for_cr(
    token: str,
    params: StudentFilterParamsRequest= Depends(),
    current_user: dict = Depends(cr_required)
):
    print("--> testing frontend : entering list_students", current_user)
    print("--> params: ", params, "\n\ntoken:", token.strip())
    # 1) Load and validate session
    session = await db.AttendanceTokens.find_one({"attendance_token": token, "cr_id": current_user["id"]})
    print("--> testing frontend : session found", session)
    if not session:
        raise HTTPException(404, "Session not found")

    now = datetime.now(timezone.utc)
    expiry = session['expires_at']
    
    # If expires_at is naive, attach UTC tzinfo
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    else:
    # optionally normalize to UTC
        expiry = expiry.astimezone(timezone.utc)

    print(f"--> current time (UTC): {now}, session expires at: {expiry}, is_used: {session['is_used']}")
    
    if expiry < now or session['is_used'] != False:
        print("--> session expired or already used")
        raise HTTPException(410, "Session expired")
    
    print("--> session is valid, proceeding to list students for CR")
    # check and match the subject code, sem ....


    # This check is redundant if `ge=1` is working, but serves as a manual safeguard
    if params.limit < 1:
        raise HTTPException(status_code=400, detail="Limit or skip must be a positive integer.")
    # print(f"DEBUG: Received sort_by = '{params.sort_by}' (type: {type(params.sort_by)})")
    # print(f"DEBUG: Received sort_order = '{params.sort_order.value}' (type: {type(params.sort_order)})")

    query_filter = {}
    expr_conditions = []

    if params.registration_no:
        query_filter["registration_no"] = {"$regex": params.registration_no, "$options": "i"}

    if params.email:
        query_filter["email"] = {"$regex": params.email, "$options": "i"}

    if params.first_name:
        query_filter["first_name"] = {"$regex": params.first_name, "$options": "i"}

    if params.last_name:
        query_filter["last_name"] = {"$regex": params.last_name, "$options": "i"}

    if params.status:
        query_filter["status"] = params.status.lower()

    if params.semester:
        query_filter["semester"] = params.semester.lower()

    if params.department:
        query_filter["department"] = {"$regex": params.department, "$options": "i"}

    if params.subject_code:
        expr_conditions.append({
            "$gt": [
                {
                    "$size": {
                        "$filter": {
                            "input": {"$objectToArray": "$subjects"},
                            "as": "subj",
                            "cond": {
                                "$regexMatch": {
                                    "input": "$$subj.k",
                                    "regex": params.subject_code,
                                    "options": "i"
                                }
                            }
                        }
                    }
                },
                0
            ]
        })

    if expr_conditions:
        query_filter["$expr"] = {"$and": expr_conditions}

    print(f"DEBUG: Final MongoDB query filter = {query_filter}")

    mongo_sort_order = ASCENDING if params.sort_order == SortOrder.ASC else DESCENDING
    ALLOWED_SORT_FIELDS = {"created_at", "first_name", "last_name", "email", "registration_no", "semester"}
    if params.sort_by not in ALLOWED_SORT_FIELDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort_by field. Allowed fields are: {', '.join(sorted(ALLOWED_SORT_FIELDS))}"
        )
    # Define collation for case-insensitive sorting on string fields
    collation = Collation(locale='en', strength=2)
    total_count = await db["Students"].count_documents(query_filter)

    students_cursor = db["Students"].find(query_filter).collation(collation).sort(params.sort_by, mongo_sort_order).skip(params.skip).limit(params.limit)

    students_data = [StudentListResponse(**student) async for student in students_cursor]
    print("--> testing frontend : students_data fetched", students_data)
    
    log_event(
        "list students by cr",
        user_email=current_user["email"],
        user_id=current_user["id"],
        user_role=current_user["role"],
        details=f"Fetched {len(students_data)} students. Filters: {query_filter}"
    )

    return StudentPaginatedResponse(
        data=students_data,
        total_count=  total_count,
        page=params.skip // params.limit + 1,
        limit=params.limit
    )
