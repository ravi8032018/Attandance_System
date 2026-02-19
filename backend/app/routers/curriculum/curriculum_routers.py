from backend.app.db import db
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from backend.app.schemas.curriculum_schema import CurriculumListResponse, CurriculumItem, SubjectItem
from backend.app.utils.dependencies import get_current_user
from bson import ObjectId
router = APIRouter(prefix="/curriculum", tags=["curriculum"])

@router.get("/", response_model=CurriculumListResponse)
async def list_curriculum(
    department: Optional[str] = Query(None, description="Filter by department, e.g. CS"),
    semester: Optional[str] = Query(None, description="Filter by semester, e.g. 1"),
    current_user: dict = Depends(get_current_user),
):
    # Optional: restrict to admin/faculty only
    # print("--> Curriculum request by user:", current_user)
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
                print(f"Student dept: {student_dept}, sem: {student_sem}")
                if (department and department != student_dept) or (semester and semester != student_sem):
                    raise HTTPException(status_code=403, detail="Access denied.")

    # Build optional Mongo filter
    query_filter: dict = {}
    if department:
        query_filter["department"] = department
    if semester:
        query_filter["semester"] = semester

    # If no params are provided, query_filter stays {}, so Mongo returns all docs.[web:17]
    cursor = db["Curriculum"].find(query_filter)

    items = []
    async for doc in cursor:
        items.append(
            CurriculumItem(
                subjects=[
                    SubjectItem(
                        subject_code=s["subject_code"],
                        subject_name=s["subject_name"],
                    )
                    for s in doc.get("subjects", [])
                ],
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
    print("--> docs: ",cursor)
    # docs = await cursor.to_list(length=None)  # await here

    data = docs[0]["subjects"] if docs else None
    print("--> data: ",data)
    subject_doc = {
        "subjects": {
            subject["subject_code"]: subject["subject_name"]
            for subject in data
        }
    }
    print("--> subject_doc: ",subject_doc)
    result = await db["Students"].update_many(
        {},  # filter: all documents
        {"$set": subject_doc}
    )
    print("Matched:", result.matched_count, "Modified:", result.modified_count)

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
            print("Inserted Curriculum with id:", result)
        except Exception as e:
            print("Exception occurred while inserting data into Curriculum collection:", e)
            result = None
        print(result)
        if not result:
            print("Error!!! Cannot insert data into database")
        print("successfully inserted data into database")

'''
