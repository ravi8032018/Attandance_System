from backend.app.db import db

json_data=[
  {
    "_id": "CSSEM1",
    "department": "CS",
    "sem": "1",
    "subjects": [
      { "subject_code": "CSDSC101", "subject_name": "Introduction to Programming" },
      { "subject_code": "CSDSC102", "subject_name": "Calculus I" },
      { "subject_code": "CSDSC103", "subject_name": "Engineering Physics" },
      { "subject_code": "CSDSC104", "subject_name": "Communication Skills" }
    ]
  },
  {
    "_id": "CSSEM2",
    "department": "CS",
    "sem": "2",
    "subjects": [
      { "subject_code": "CSDSC105", "subject_name": "Data Structures" },
      { "subject_code": "CSDSC106", "subject_name": "Linear Algebra" },
      { "subject_code": "CSDSC107", "subject_name": "Basic Electronics" },
      { "subject_code": "CSDSC108", "subject_name": "Object-Oriented Programming" }
    ]
  },
  {
    "_id": "CSSEM3",
    "department": "CS",
    "sem": "3",
    "subjects": [
      { "subject_code": "CSDSC201", "subject_name": "Design and Analysis of Algorithms" },
      { "subject_code": "CSDSC202", "subject_name": "Database Management Systems" },
      { "subject_code": "CSDSC203", "subject_name": "Discrete Mathematics" },
      { "subject_code": "CSDSC204", "subject_name": "Computer Organization & Architecture" }
    ]
  },
  {
    "_id": "CSSEM4",
    "department": "CS",
    "sem": "4",
    "subjects": [
        { "subject_code": "CSDSC205", "subject_name": "Operating Systems" },
        { "subject_code": "CSDSC206", "subject_name": "Software Engineering" },
        { "subject_code": "CSDSC207", "subject_name": "Theory of Computation" },
        { "subject_code": "CSDSC208", "subject_name": "Probability and Statistics" }
    ]
  }
]

async def insert_curriculum_in_DB():
    for data in json_data:
        result = await db["Curriculum"].insert_one(data)
        print(result)
        if not result:
            print("Error!!! Cannot insert data into database")
        print("successfully inserted data into database")

