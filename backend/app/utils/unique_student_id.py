from dotenv import load_dotenv
from pymongo import DESCENDING
from backend.app.db import db
import os

load_dotenv(dotenv_path= "../../.env")

DEPARTMENT = os.getenv("DEPARTMENT")
ADDMISSION_YEAR = os.getenv("ADDMISSION_YEAR")

async def generate_unique_student_id(course, registration_year, department, prev_reg_no=None):
    # print("Starting the generation of unique Student id")

    cursor = db["Students"].find(
        {"department": department, "course": course, "registration_year": registration_year}
    ).sort("registration_no", DESCENDING).limit(1)

    result_list= await cursor.to_list(None)
    print("\nresult_list: ",result_list)

    if result_list:    # Determine next serial number
        max_serial= int(result_list[0]["registration_no"][-3:])
        # print("max_serial: ",max_serial)
        new_serial_no = max_serial + 1
    else:        # Start at 1 for first Student
        new_serial_no = 1

    # Format serial (e.g. '001', '002'), then build full ID
    serial_str = str(new_serial_no).zfill(3)
    # print(serial_str)

    unique_id = f"{department}{course}{registration_year}{serial_str}"

    unique_id_clean = unique_id.replace(" ", "").replace("-", "").replace(",","").strip().upper()

    print("unique_id_clean: ", unique_id_clean)
    print(f"department: {department}, course: {course}, registration_year: {registration_year}")

    cursor1 = db["Students"].find(
        {"registration_no": unique_id_clean}
    ).sort("registration_no", DESCENDING).limit(1)
    result_list1 = await cursor1.to_list(None)

    if result_list1:
        return await skip_regitration_no_if_exists(unique_id_clean)
    else:
        return unique_id_clean


async def skip_regitration_no_if_exists(reg_no):
    max_serial = int(reg_no[-3:])
    new_serial_str= max_serial + 1
    reg_no = reg_no[:-3]

    print("max serial: ", max_serial)
    print("new_reg_no: ", reg_no)

    new_reg_no= str(reg_no) + str(new_serial_str).zfill(3)
    print("new_reg_no: ", new_reg_no)

    cursor = db["Students"].find(
        {"registration_no": new_reg_no}
    ).sort("registration_no", DESCENDING).limit(1)
    result_list = await cursor.to_list(None)
    print("result_list: ", result_list)

    if result_list:
        skip_regitration_no_if_exists(new_reg_no)
    else:
        return new_reg_no







