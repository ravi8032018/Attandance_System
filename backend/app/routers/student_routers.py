# student_router.py

from fastapi import APIRouter, HTTPException, Path, Query, Depends
from backend.app.db import db
from backend.app.schemas.student_schema import StudentCreateRequest, StudentBulkCreateResponse, \
    StudentProfileUpdateRequest, StudentFullProfileResponse, StudentSelfUpdateRequest, ChangePasswordRequest, SortOrder
from backend.app.schemas.student_schema import  StudentOutResponse, StudentPublicResponse, StudentListResponse, StudentPaginatedResponse
from secrets import token_urlsafe
from datetime import datetime, timedelta
from backend.app.utils.dates_normalizer_to_datetime import normalize_dates_for_mongo
from backend.app.utils.hash import hash_password, varify_hash
from backend.app.utils.placeholder_cleaner import clean_placeholders
from backend.app.utils.smtp import send_email_with_link
from backend.app.utils.dependencies import admin_required, get_current_user
from backend.app.utils.unique_student_id import generate_unique_student_id
from backend.app.schemas.student_schema import StudentBulkCreateRequest
from backend.my_logger import log_event
from bson import ObjectId
import json, os
from pymongo.errors import DuplicateKeyError
from pymongo import ASCENDING, DESCENDING
from typing import List, Optional

router = APIRouter(prefix="/student", tags=["Student"])

# 🔽 CREATE PRODUCT
@router.post("/create", response_model=StudentOutResponse)
async def student_create(student: StudentCreateRequest, current_admin: dict = Depends(admin_required)):
    student_dict = student.dict()
    # print(student_dict)

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

    created=[]
    try:
        res = await db['Students'].insert_one(student_dict)
    except DuplicateKeyError:
        print("Duplicate key error: Student already exists!")

    result = await db['Students'].find_one({"_id": res.inserted_id})

    if not result:
        raise HTTPException(status_code=500, detail=f"Student account creation failed for {student_dict['email']}[{student_dict['registration_no']}]")

    # 2. Generate a one-time-use password-set token (valid 48h)
    token = token_urlsafe(32)

    expiry = now + timedelta(hours=48)
    await db["PasswordResetDB"].insert_one({
        "student_id": str(res.inserted_id),
        "token": token,
        "type": "set_password",
        "expires_at": expiry,
        "is_used": False
    })

    # 3. Email the student with a link to set/reset password
    link = f"http://localhost:8000/reset-password?token={token}"

    email_data = {
        "email_to": student.email,
        "registration_no": unique_student_id,
        "link": link,
        "created_at": now.isoformat(),
        "is_sent": False
        # "token": token
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

    log_event("create student", user_email=student_dict["email"], user_name=student_dict["name"] if 'name' in student_dict else None, user_id=student_dict["registration_no"], user_role="admin", details=f"created by {current_admin['name']}")

    try:
        return StudentOutResponse(
            message=f"Student account created successfully {student_dict['email']}[{student_dict['registration_no']}]"
        )
    except Exception as e:
        print("ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/bulk-create", response_model=StudentBulkCreateResponse)
async def bulk_students_create(payload: StudentBulkCreateRequest,   current_admin: dict = Depends(admin_required)):
    # print("\nStarting bulk creation of students\n")
    student_mails = payload.student_emails
    now = datetime.utcnow()
    created = []
    created_mails=[]

    for stu_mail in student_mails:
        # 1. Create the student doc with inactive status)
        unique_student_id = await generate_unique_student_id(payload.course,payload.registration_year,payload.department)
        print("Your Unique_Student_ID is ",unique_student_id, "\t",stu_mail)

        default_password = token_urlsafe(10)
        hashed_default = hash_password(default_password)
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
            "password": hashed_default
        }
        try:
            result = await db["Students"].insert_one(stu_doc)
        except DuplicateKeyError:
            print("Duplicate key error: Student already exists!")
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

        # 3. Email the student with a link to set/reset password
        link = f"http://localhost:8000/reset-password?token={token}"

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
async def get_student_by_id(registration_no: str = Path(..., title="registration-no")):
    student = await db['Students'].find_one({"registration_no": registration_no})
    # print("student", student)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return StudentPublicResponse(
        id=str(student["_id"]),
        enrollment_no=student["registration_no"],
        semester=student["semester"],
        first_name=student["first_name"] if "first_name" in student else None,
        last_name=student["last_name"] if "last_name" in student else None,
        dob=student.get("date_of_birth") if "dob" in student else None,
        gender=student.get("gender") if "gender" in student else None,
        contact_number=student.get("contact_number") if "contact_number" in student else None,
        email=student.get("email"),
        batch_name=student.get("batch_name") if "batch_name" in student else None,
        photo_url=student.get("photo_url") if "photo_url" in student else None,
    )

@router.post("/complete-profile/{registration_no}")
async def complete_profile(
    registration_no: str,
    update_data: StudentProfileUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    # Step 1: Fetch the student document to check ownership
    # print("current user", current_user)
    # print("\nupdate_data", update_data.dict())
    student = await db["Students"].find_one({"registration_no": registration_no})
    # print("\nstudent", student)

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Step 2: Authorization check
    if "admin" not in current_user["role"]:
        if ObjectId(current_user["id"]) != student.get("_id"):
            print(ObjectId(current_user["id"]))
            print(student.get("_id"))
            raise HTTPException(status_code=403, detail="Not authorized to update this profile")

    # Step 3: Prepare clean update data (skip placeholders like "string", "", 0)
    clean_update= clean_placeholders(update_data.dict())
    # print("\nclean_update", clean_update)

    # Step 4: Enforce required fields only if profile is incomplete
    required_fields = ["first_name", "last_name", "dob", "gender", "contact_number"]
    if not student.get("profile_complete", False):
        for field in required_fields:
            if field not in clean_update or not clean_update[field]:
                raise HTTPException(status_code=400, detail=f"{field} is required for profile completion")

    clean_update= normalize_dates_for_mongo(clean_update)
    # Step 5: Add audit fields
    clean_update.update({
        "profile_complete": True,
        "updated_at": datetime.utcnow(),
        "updated_by": current_user["name"] if (current_user["name"] is not None) else current_user["email"],
    })
    # print("\nupdate_dict", clean_update)

    # Step 6: Update in DB
    result = await db["Students"].update_one(
        {"registration_no": registration_no},
        {"$set": clean_update}
    )

    log_event("Student Profile Update", user_email=current_user["email"], user_name=current_user["name"] if (current_user['name'] is not None) else None, user_id=current_user["id"], user_role=current_user["role"], details=f"Student {current_user['id']} Profile complete, name {clean_update['first_name']} {clean_update['last_name']}, email {current_user['email']}")

    return {"message": "Profile updated successfully"}

@router.get("/me", response_model=StudentFullProfileResponse)
async def get_current_student_profile(current_user: dict = Depends(get_current_user)):
    # print("current_user--> ", current_user)
    if "student" not in current_user.get("role", []):
        raise HTTPException(status_code=403, detail="Access denied. Only students can view their own profile.")

    student_id = current_user.get("id")

    if not student_id:
        raise HTTPException(status_code=400, detail="Invalid user session.")

    try:
        student = await db["Students"].find_one({"_id": ObjectId(student_id)})
    except Exception as e:
        raise HTTPException(status_code=404, detail="Cannot find student.") from e
    # print("Student--> ", student)

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    log_event("read own profile", user_email=current_user["email"], user_id=current_user["id"], user_role="student", details="accessed own profile")

    return StudentFullProfileResponse(**student)

@router.patch("/me")
async def update_current_student_profile(update_data: StudentSelfUpdateRequest, current_user: dict = Depends(get_current_user)):
    if "student" not in current_user.get("role", []):
        raise HTTPException(status_code=403, detail="Access denied. Only students can update their own profile.")
    # print("current user--> ", current_user)

    student_id = current_user.get("id")
    if not student_id:
        raise HTTPException(status_code=400, detail="Invalid user session.")

    try:
        student = await db["Students"].find_one({"_id": ObjectId(student_id)})
        # print("current student--> ", student)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Cannot find student.") from e

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    update_dict = update_data.dict(exclude_unset=True)
    clean_update = clean_placeholders(update_dict)
    clean_update = normalize_dates_for_mongo(clean_update)
    clean_update["updated_at"] = datetime.utcnow()
    clean_update["updated_by"] = current_user.get("name") or current_user["email"]

    result = await db["Students"].update_one(
        {"_id": ObjectId(student_id)},
        {"$set": clean_update}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student profile not found (or no changes made).")
    if result.modified_count == 0 and clean_update:
        # This can happen if the update data is identical to current data
        pass

    updated_student = await db["Students"].find_one({"_id": ObjectId(student_id)})
    if not updated_student:
        raise HTTPException(status_code=500, detail="Failed to retrieve updated student profile.")

    log_event("update own profile", user_email=current_user["email"], user_id=current_user["id"], user_role="student", details=f"updated own profile fields: {list(clean_update.keys())}")

    return "Profile updated successfully"

@router.post("/change-password")
async def change_student_password(password_data: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    if "student" not in current_user.get("role", []):
        raise HTTPException(status_code=403, detail="Access denied. Only students can change their own password.")

    student_id = current_user.get("id")
    if not student_id:
        raise HTTPException(status_code=400, detail="Invalid user session.")

    try:
        student = await db["Students"].find_one({"_id": ObjectId(student_id)})
    except Exception as e:
        raise HTTPException(status_code=404, detail="Cannot find student.") from e
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
        {"_id": ObjectId(student_id)},
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

    log_event("change password", user_email=current_user["email"], user_id=current_user["id"], user_role="student", details="successfully changed password")

    return {"message": "Password changed successfully."}

@router.get("/", response_model=StudentPaginatedResponse)
async def list_students(
    skip: int = Query(0, description="Number of students to skip (for pagination)"),
    limit: int = Query(10, description="Maximum number of students to return (for pagination)", le=100),
    search_query: Optional[str] = Query(None, description="Search by first name, last name, email, or registration number"),
    status: Optional[str] = Query(None, description="Filter by student status (e.g., 'active', 'inactive')"),
    sort_by: str = Query("created_at", description="Field to sort students by (e.g., 'created_at', 'first_name', 'email')"),
    sort_order: SortOrder = Query(SortOrder.DESC, description="Sort order: 'asc' for ascending, 'desc' for descending"), # Use the Enum
    current_admin: dict = Depends(admin_required)
):
    query_filter = {}
    if search_query:
        query_filter["$or"] = [
            {"first_name": {"$regex": search_query, "$options": "i"}},
            {"last_name": {"$regex": search_query, "$options": "i"}},
            {"email": {"$regex": search_query, "$options": "i"}},
            {"registration_no": {"$regex": search_query, "$options": "i"}},
        ]
    if status:
        query_filter["status"] = status.lower()
    total_count = await db["Students"].count_documents(query_filter)

    mongo_sort_order = ASCENDING if sort_order == SortOrder.ASC else DESCENDING
    ALLOWED_SORT_FIELDS = {"created_at", "first_name", "last_name", "email", "registration_no"}
    if sort_by not in ALLOWED_SORT_FIELDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort_by field. Allowed fields are: {', '.join(sorted(ALLOWED_SORT_FIELDS))}"
        )

    students_cursor = db["Students"].find(query_filter).skip(skip).limit(limit).sort(sort_by, mongo_sort_order)
    students_data = []
    async for student in students_cursor:
        students_data.append(StudentListResponse(**student))

    log_event(
        "list students",
        user_email=current_admin["email"],
        user_id=current_admin["id"],
        user_role="admin",
        details=f"fetched {len(students_data)} students (skip={skip}, limit={limit}, query='{search_query}', status='{status}')"
    )

    return StudentPaginatedResponse(
        data=students_data,
        total_count=total_count,
        page=skip // limit + 1, # Calculate current page number
        limit=limit
    )





'''
@router.get("/", response_model=PublicProductListResponse)
async def get_all_products(
    search: str = Query(None),
    category: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc")
):
    query = {}

    if search:
        query["$text"] = {"$search": search}

    if category:
        query["category"] = {"$regex": f"^{category}$", "$options": "i"}

    sort_field = sort_by if sort_by in ["name", "price", "created_at"] else "name"
    order = ASCENDING if sort_order == "asc" else DESCENDING

    total = await db["Products"].count_documents(query)

    cursor = db["Products"].find(query).sort(sort_field, order).skip(skip).limit(limit)
    products = [product_public_model(prod) async for prod in cursor]

    return {
        "message": "Products fetched successfully",
        "total": total,
        "skip": skip,
        "limit": limit,
        "products": products
    }

@router.delete("/{product_id}")
async def delete_product(product_id: str, current_admin: dict = Depends(admin_required)):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    result = await db["Products"].delete_one({"_id": ObjectId(product_id)})

    deleted_by= current_admin["name"]
    print(f"Product {product_id} deleted by {deleted_by}")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"message": "Product deleted successfully"}


@router.patch("/{product_id}/add-quantity",response_model=QtyUpdateResponse)
async def add_product_quantity(product_id: str, update: QtyUpdateRequest, current_admin: dict = Depends(admin_required)):
    product = await db["Products"].find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_quantity = product.get("quantity", 0) + update.quantity
    await db["Products"].update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"quantity": new_quantity, "qty_added_by": current_admin.get("name")}}
    )

    updated = await db["Products"].find_one({"_id": ObjectId(product_id)})
    return {
        "message": "Quantity updated successfully",
        "quantity": new_quantity,
        "qty_added_by": current_admin.get("name"),
        "product": product_model(updated)
    }

'''
