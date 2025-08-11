# student_router.py

from fastapi import APIRouter, HTTPException, Path, Query, Depends
from backend.app.db import db
from backend.app.schemas.student_schema import StudentCreateRequest, StudentBulkCreateResponse, StudentBase
from backend.app.schemas.student_schema import  StudentOutResponse, StudentResponse
from secrets import token_urlsafe
from datetime import datetime, timedelta
from backend.app.utils.hash import hash_password
from backend.app.utils.smtp import send_email_with_link
from backend.app.utils.dependencies import admin_required
from backend.app.utils.unique_student_id import generate_unique_student_id
from backend.app.schemas.student_schema import StudentBulkCreateRequest
from backend.my_logger import log_event
from pymongo import ASCENDING, DESCENDING
from bson import ObjectId
import json, os
from pymongo.errors import DuplicateKeyError

router = APIRouter(prefix="/student", tags=["Student"])

# 🔽 CREATE PRODUCT
@router.post("/create", response_model=StudentOutResponse)
async def create_student(student: StudentCreateRequest, current_admin: dict = Depends(admin_required)):
    student_dict = student.dict()
    student_dict["created_by"] = current_admin["name"]
    student_dict["status"] = "inactive"
    student_dict["role"] = ["student"]
    student_dict["created_at"] = datetime.utcnow()

    result = await db['Students'].insert_one(student_dict)
    created = await db['Students'].find_one({"_id": result.inserted_id})

    if not created:
        raise HTTPException(status_code=500, detail=f"Student account creation failed for {student_dict['email']}[{student_dict['registration_no']}]")

    log_event("create student", user_email=student_dict["email"], user_name=student_dict["name"], user_id=student_dict["id"], user_role="admin")

    try:
        return StudentOutResponse(
            message=f"Student account created successfully {student_dict['email']}[{student_dict['registration_no']}]"
        )
    except Exception as e:
        print("ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/bulk-create", response_model=StudentBulkCreateResponse)
async def bulk_create_students(payload: StudentBulkCreateRequest, current_admin: dict = Depends(admin_required)):
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



# @router.post("/bulk-create", response_model=StudentBulkCreateResponse)
# async def bulk_create_students(payload: StudentBulkCreateRequest, current_admin: dict = Depends(admin_required)):
#     print("Starting bulk creation of students\n")
#
#     students = payload.students
#     print("students: ",students)
#
#     now = datetime.utcnow()
#     created = []
#     for stu in students:
#         # 1. Create the student doc with inactive status
#         default_password = token_urlsafe(10)
#         hashed_default = hash_password(default_password)
#         stu_doc = {
#             "email": stu["email"],
#             "registration_no": stu.get("reg_no"),
#             "semester": stu.get("semester"),
#             "created_by": current_admin["name"],
#             "role": ["student"],
#             "status": "inactive",
#             "created_at": now,
#             "password": hashed_default
#         }
#         print("stu_doc: ", stu_doc)
#         result = await db["Students"].insert_one(stu_doc)
#
#         # 2. Generate a one-time-use password-set token (valid 48h)
#         token = token_urlsafe(32)
#         expiry = now + timedelta(hours=48)
#         await db["PasswordResetDB"].insert_one({
#             "student_id": str(result.inserted_id),
#             "token": token,
#             "type": "set_password",
#             "expires_at": expiry,
#             "is_used": False
#         })
#
#         # 3. Email the student with a link to set/reset password
#         link = f"https://YOUR_FRONTEND/set-password/{token}"
#         email_body = (
#             f"Welcome to Department of Computer Science, Assam University Silchar\n\n"
#             f"Please click the link below to set your password and activate your account. "
#             f"This link is valid for 48 hours and can be used only once:\n{link}"
#         )
#         send_email_with_link(to_email=stu["email"], subject="Activate your student account", body=email_body)
#         created.append(stu["email"])
#
#     log_event("create bulk students",details=created)
#     return {"message": "Accounts created and emails sent", "count": len(created)}


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

@router.get("/{product_id}", response_model=ProductPublicResponse)
async def get_product_by_id(product_id: str = Path(..., title="Product ID")):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")

    product = await db["Products"].find_one({"_id": ObjectId(product_id)})

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product_public_model(product)


@router.put("/{product_id}", response_model=UpdateResponse)
async def update_product(product_id: str, update_data: ProductUpdateRequest,current_admin: dict = Depends(admin_required)):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")

    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    print("update_dict:", update_dict)

    if not update_dict:
        raise HTTPException(status_code=400, detail="No update data provided")

    update_dict["updated_by"] = current_admin["name"]

    result = await db["Products"].update_one(
        {"_id": ObjectId(product_id)},
        {"$set": update_dict}
    )
    print("Result:", result)
    print(result.matched_count)  # returns 1
    print(result.modified_count)  # returns 0

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    elif result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Product found but no changes made")

    updated = await db["Products"].find_one({"_id": ObjectId(product_id)})
    print("updated:", updated)
    return {
        "product": product_model(updated)
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