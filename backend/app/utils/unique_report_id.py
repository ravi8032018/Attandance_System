from pymongo import DESCENDING
from backend.app.db import db
import re

async def generate_unique_report_id(report_type: str = "bug") -> str:
    """
    Generates sequential unique report IDs starting at 001 for each category prefix
    (e.g., BUG-001, BUG-002, FDK-001, PERF-001, OTH-001).
    """
    t = (report_type or "").lower()
    if t == "bug":
        prefix = "BUG"
    elif t == "performance":
        prefix = "PERF"
    elif t == "other":
        prefix = "OTH"
    else:
        prefix = "FDK"
    
    regex_pattern = f"^{prefix}-"
    cursor = db["Feedback"].find({"report_id": {"$regex": regex_pattern}})
    result_list = await cursor.to_list(None)

    max_serial = 0
    if result_list:
        for doc in result_list:
            rid = str(doc.get("report_id", ""))
            match = re.search(r"-(\d+)$", rid)
            if match:
                try:
                    num = int(match.group(1))
                    if num > max_serial:
                        max_serial = num
                except ValueError:
                    pass

    new_serial_no = max_serial + 1
    serial_str = str(new_serial_no).zfill(3)
    return f"{prefix}-{serial_str}"
