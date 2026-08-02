import asyncio
import os
import sys

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from backend.app.db import db

RAW_CURRICULUM_DATA = [
    {
      "semester": 1,
      "courses": [
        {
          "course_id": "CSDSC101",
          "course_name": "Programming in C",
          "course_type": "Theory",
          "credits": 3
        },
        {
          "course_id": "CSDSC102",
          "course_name": "Digital Logic and Switching Theory",
          "course_type": "Theory",
          "credits": 3
        },
        {
          "course_id": "CSDSM101",
          "course_name": "Mathematics-I",
          "course_type": "Theory",
          "credits": 3
        },
        {
          "course_id": "CSIDC101",
          "course_name": "Fundamentals of Computer and Applications",
          "course_type": "Theory",
          "credits": 3
        },
        {
          "course_id": "CSAEC101",
          "course_name": "MIL-I",
          "course_type": "Theory",
          "credits": 2
        },
        {
          "course_id": "CSSEC101",
          "course_name": "Lab on Programming in C & Digital logic and Switching Theory",
          "course_type": "Practical",
          "credits": 3
        }
      ]
    },
    {
      "semester": 2,
      "courses": [
        {
          "course_id": "CSDSC151",
          "course_name": "Python Programming",
          "course_type": "Theory",
          "credits": 3
        },
        {
          "course_id": "CSDSC152",
          "course_name": "Numerical Methods",
          "course_type": "Theory",
          "credits": 3
        },
        {
          "course_id": "CSDSM151",
          "course_name": "Mathematics-II",
          "course_type": "Theory",
          "credits": 3
        },
        {
          "course_id": "CSIDC151",
          "course_name": "Introduction to Internet Technology",
          "course_type": "Theory",
          "credits": 3
        },
        {
          "course_id": "CSAEC151",
          "course_name": "English-I",
          "course_type": "Theory",
          "credits": 2
        },
        {
          "course_id": "CSSEC151",
          "course_name": "Lab on Python Programming & Numerical Methods",
          "course_type": "Practical",
          "credits": 3
        },
        {
          "course_id": "CSVAC151",
          "course_name": "EVS",
          "course_type": "Theory",
          "credits": 3
        }
      ]
    },
    {
      "semester": 3,
      "courses": [
        {
          "course_id": "CSDSC201",
          "course_name": "Data Structure",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSC202",
          "course_name": "Computer Architecture",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSM201",
          "course_name": "Introduction to Probability & Statistics",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSIDC201",
          "course_name": "Cyber Security",
          "course_type": "Theory",
          "credits": 3
        },
        {
          "course_id": "CSAEC201",
          "course_name": "MIL-II",
          "course_type": "Theory",
          "credits": 2
        },
        {
          "course_id": "CSSEC201",
          "course_name": "Lab on Data Structure",
          "course_type": "Practical",
          "credits": 3
        }
      ]
    },
    {
      "semester": 4,
      "courses": [
        {
          "course_id": "CSDSC251",
          "course_name": "Database Management System",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSC252",
          "course_name": "Microprocessor",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSC253",
          "course_name": "Discrete Mathematics",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSM251",
          "course_name": "Lab on Database Management System & Microprocessor",
          "course_type": "Practical",
          "credits": 3
        },
        {
          "course_id": "CSDSM252",
          "course_name": "Data Communication & Computer Networks",
          "course_type": "Theory",
          "credits": 3
        },
        {
          "course_id": "CSAEC251",
          "course_name": "English-II",
          "course_type": "Theory",
          "credits": 2
        }
      ]
    },
    {
      "semester": 5,
      "courses": [
        {
          "course_id": "CSDSC301",
          "course_name": "Operating System",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSC303",
          "course_name": "System Software",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSC302",
          "course_name": "Computer Graphics",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSM301",
          "course_name": "Lab on Operating System & Computer Graphics",
          "course_type": "Practical",
          "credits": 3
        },
        {
          "course_id": "CSDSM302",
          "course_name": "Simulation & Modeling",
          "course_type": "Theory",
          "credits": 3
        },
        {
          "course_id": "CSSEC301",
          "course_name": "Internship/Community Engagement/Field Study",
          "course_type": "Practical",
          "credits": 2
        }
      ]
    },
    {
      "semester": 6,
      "courses": [
        {
          "course_id": "CSDSC351",
          "course_name": "Object Oriented Programming with C++",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSC352",
          "course_name": "Programming in JAVA",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSC353",
          "course_name": "Wireless & Mobile Computing",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSC354",
          "course_name": "System Analysis & Design",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSM351",
          "course_name": "Lab on Object Oriented Programming with C++ & Programming in JAVA",
          "course_type": "Practical",
          "credits": 4
        }
      ]
    },
    {
      "semester": 7,
      "courses": [
        {
          "course_id": "CSDSC401",
          "course_name": "Design & Analysis of Computer Algorithms",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSC402",
          "course_name": "Theory of Computation",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSC403",
          "course_name": "Artificial Intelligence",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSC404",
          "course_name": "Machine Learning",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSM401",
          "course_name": "Lab on Design & Analysis of Computer Algorithms & Artificial Intelligence",
          "course_type": "Practical",
          "credits": 4
        }
      ]
    },
    {
      "semester": 8,
      "courses": [
        {
          "course_id": "CSDSC451",
          "course_name": "Principles of Compiler Design",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSM451",
          "course_name": "Data Science & Research Methodology",
          "course_type": "Theory",
          "credits": 4
        },
        {
          "course_id": "CSDSC452",
          "course_name": "Research Project/Dissertation",
          "course_type": "Practical",
          "credits": 12
        }
      ]
    }
]

async def seed_curriculum():
    print("[INFO] Starting Fresh Curriculum Seed Process...")

    # 1. Clear out existing CS curriculum documents
    delete_result = await db.Curriculum.delete_many({"department": "CS"})
    print(f"[CLEAR] Cleared {delete_result.deleted_count} old CS curriculum records.")

    inserted_count = 0
    total_subjects_count = 0

    for sem_data in RAW_CURRICULUM_DATA:
        sem_num = str(sem_data["semester"])
        subjects_list = []

        for c in sem_data["courses"]:
            scode = c["course_id"].strip().upper()
            sname = c["course_name"].strip()
            ctype = c["course_type"].strip()
            credits_val = int(c["credits"])

            subjects_list.append({
                "subject_code": scode,
                "subject_name": sname,
                "type": ctype,
                "credits": credits_val,
                "faculty_id": None
            })
            total_subjects_count += 1

        curr_doc = {
            "department": "CS",
            "semester": sem_num,
            "course": "BSC",
            "subjects": subjects_list
        }

        await db.Curriculum.insert_one(curr_doc)
        inserted_count += 1
        print(f"  [OK] Inserted Semester {sem_num}: {len(subjects_list)} subjects.")

    print(f"\n[SUCCESS] Successfully seeded {inserted_count} semester documents with {total_subjects_count} subjects into MongoDB Curriculum collection!")

if __name__ == "__main__":
    asyncio.run(seed_curriculum())
