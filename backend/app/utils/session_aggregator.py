
def _compute_aggregates(attendance_records: list[dict]) -> dict:
    present = sum(1 for r in attendance_records if r.get("status") == "present")
    absent = sum(1 for r in attendance_records if r.get("status") == "absent")
    leave = sum(1 for r in attendance_records if r.get("status") == "leave")
    return {
        "present_count": present,
        "absent_count": absent,
        "leave_count": leave,
        "class_size": present + absent + leave
    }

async def get_enrolled_class_size(db, subject_code: str = None, department: str = None, semester: str = None, records_count: int = 0) -> int:
    dept = department
    sem = str(semester) if (semester is not None and str(semester) != "None") else None

    # Resolve department/semester from Curriculum if missing
    if subject_code and (not dept or not sem):
        try:
            curr_doc = await db.Curriculum.find_one({"subjects.subject_code": subject_code})
            if curr_doc:
                dept = dept or curr_doc.get("department")
                sem = sem or str(curr_doc.get("semester"))
        except Exception:
            pass

    if dept and sem:
        try:
            query = {
                "status": "active",
                "department": {"$regex": f"^{dept}$", "$options": "i"},
                "$or": [{"semester": sem}, {"semester": str(sem)}, {"semester": int(sem) if sem.isdigit() else sem}]
            }
            enrolled = await db.Students.count_documents(query)
            if enrolled > 0:
                return max(enrolled, records_count)
        except Exception:
            pass

    return records_count