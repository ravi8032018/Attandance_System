
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