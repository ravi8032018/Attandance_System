from dotenv import load_dotenv
from pymongo import DESCENDING
from backend.app.db import db
import os

load_dotenv(dotenv_path= "../../.env")

DEPARTMENT = os.getenv("DEPARTMENT")
ADDMISSION_YEAR = os.getenv("ADDMISSION_YEAR")

async def generate_unique_student_id(course, registration_year, department):
    # Find highest serial_no for this department, course, year
    # print("Starting the generation of unique student id")

    cursor = db["Students"].find(
        {"department": department, "course": course, "registration_year": registration_year}
    ).sort("registration_no", DESCENDING).limit(1)
    result_list= await cursor.to_list(None)
    # print("result_list: ",result_list)

    if result_list:    # Determine next serial number
        max_serial= int(result_list[0]["registration_no"][-3:])
        print("max_serial: ",max_serial)
        new_serial_no = max_serial + 1
    else:        # Start at 1 for first student
        new_serial_no = 1

    # Format serial (e.g. '001', '002'), then build full ID
    serial_str = str(new_serial_no).zfill(3)
    # print(serial_str)

    unique_id = f"{department}{course}{registration_year}{serial_str}"

    unique_id_clean = unique_id.replace(" ", "").replace("-", "").replace(",","")

    return unique_id_clean.strip().upper()

