# Student Management & Attendance System

A smart, scalable web solution for managing admissions, class-student-teacher data, attendance, analytics, and reporting for educational institutions.

## 🔍 Objective

Build a campus management suite that allows office/admins and teachers to:

- Enroll/manipulate student records
- Assign/manage teachers, classes/batches, and subjects
- Mark and analyze daily/period attendance
- Export critical reports
- Control access via roles (admin, teacher)
- Enjoy fast, clean, modern web UI

## ⚙️ Core Technologies

### Backend

- **Framework:** FastAPI (Python, Async)
- **Database:** MongoDB (hosted, recommended via Atlas)
- **ODM:** Beanie (Pydantic-based, async)
- **Auth:** JWT + Hashed passwords (Bcrypt)
- **API Docs:** Automatic via Swagger/OpenAPI `/docs`
- **Deployment:** Docker-ready, supports Heroku, Render, Railway

### Frontend

- **Framework:** Next.js (React, latest, App Router)
- **Styling:** Tailwind CSS (utility-first)
- **State:** React Context/hooks or Redux Toolkit for complex flows
- **Iconography:** Heroicons/Feather/Custom SVG
- **Deployment:** Vercel or Netlify

## 🏗️ Project Directory Structure

student-attendance-system/
├── backend/
│ ├── app/
│ │ ├── main.py # FastAPI app entry point
│ │ ├── config.py # Env/config handling
│ │ ├── db.py # Mongo connection/init
│ │ ├── models/ # Pydantic+Beanie ODM models
│ │ │ ├── student.py
│ │ │ ├── teacher.py
│ │ │ ├── attendance.py
│ │ │ ├── batch.py
│ │ │ ├── subject.py
│ │ │ └── user.py
│ │ ├── schemas/ # Request/response schemas
│ │ ├── routers/ # FastAPI API routers
│ │ │ ├── auth.py
│ │ │ ├── student.py
│ │ │ ├── teacher.py
│ │ │ ├── attendance.py
│ │ │ ├── batch.py
│ │ │ └── subject.py
│ │ ├── controllers/ # Business logic/services
│ │ ├── utils/ # Hashing, JWT, email, utilities
│ ├── requirements.txt
│ └── .env # Env variables
├── frontend/
│ ├── app/ # Next.js pages/app router
│ │ ├── layout.jsx
│ │ ├── page.jsx # Landing/login
│ │ ├── admin/
│ │ │ ├── dashboard.jsx
│ │ │ ├── students.jsx
│ │ │ ├── attendance.jsx
│ │ │ ├── teachers.jsx
│ │ │ ├── batches.jsx
│ │ │ └── reports.jsx
│ │ ├── teacher/
│ │ │ ├── dashboard.jsx
│ │ │ ├── attendance.jsx
│ │ │ └── students.jsx
│ ├── components/
│ │ ├── Sidebar.jsx
│ │ ├── Navbar.jsx
│ │ ├── StudentTable.jsx
│ │ ├── AttendanceTable.jsx
│ │ ├── AttendanceMark.jsx
│ │ ├── StatsCard.jsx
│ │ ├── PieChartBlock.jsx
│ │ └── ...
│ ├── utils/
│ │ └── api.js # REST requests
│ ├── styles/
│ │ ├── globals.css
│ │ └── tailwind.config.js
│ └── public/
├── README.md
└── .env

text

## 🗂️ Key Backend Data Models

> Each is a MongoDB "collection" and represented as a Pydantic/Beanie `Document` in Python.

### Student

class Student(Document):
enrollment_no: str # Unique
first_name: str
last_name: str
date_of_birth: Optional[date]
gender: Optional[str]
contact_number: Optional[str]
email: Optional[str]
address: Optional[str]
parent_name: Optional[str]
parent_contact: Optional[str]
batch_id: Optional[str] # FK: Batch._id
admission_date: Optional[date]
status: str = "active"
photo_url: Optional[str]
created_at: datetime
updated_at: datetime

text

### Teacher

class Teacher(Document):
staff_no: str # Unique
first_name: str
last_name: str
email: str
phone: Optional[str]
subjects: list[str] # List of Subject._id
batches: list[str]
role: str = "teacher"
photo_url: Optional[str]
active: bool = True
created_at: datetime
updated_at: datetime

text

### Attendance

class Attendance(Document):
student_id: str # FK: Student._id
date: date
status: str # present/absent/late/leave
period: Optional[int]
marked_by: str # User._id
notes: Optional[str]
created_at: datetime
updated_at: datetime

text

### Batch/Class

class Batch(Document):
name: str # "Grade 6A"
year: int
section: Optional[str]
class_teacher_id: Optional[str] # FK: Teacher._id

text

### Subject

class Subject(Document):
name: str
code: str
teacher_id: Optional[str] # FK: Teacher._id
batch_id: Optional[str] # FK: Batch._id

text

### User/Auth

class User(Document):
username: str
password_hash: str
role: str # admin/teacher
linked_id: str # FK to Teacher/Admin records

text

## 📑 API Endpoints

- `/api/auth/login`, `/logout`, `/refresh`
- `/api/students` CRUD (+ filter/search)
- `/api/teachers` CRUD (+ assign batch/subject)
- `/api/batches` CRUD
- `/api/subjects` CRUD
- `/api/attendance/mark` (bulk) & `/api/attendance` (list/report by student/batch/date)
- `/api/reports/attendance` (aggregates/statistics)
- (All protected by JWT & role-required decorators)

## ✨ Main Pages & User Flows

**Admin/Office Panel:**
- Dashboard: cards + charts (active students, attendance %, absentees, total teachers)
- Manage students (CRUD, batch assign)
- Manage teachers (CRUD, assign batch/subject)
- Manage classes/batches/subjects
- Attendance: view all, export to CSV/XLS
- Reports: student/class attendance, downloadables

**Teacher Panel:**
- Dashboard: quick stats for their own classes
- Mark daily/period-wise attendance
- View history, edit (own classes only)
- View students in assigned batches

## 🗃️ Example API Request/Response

**Mark Bulk Attendance**
POST /api/attendance/mark
{
"batch_id": "64e4abcd...",
"date": "2025-08-06",
"attendance_list": [
{ "student_id": "64e501...", "status": "present" },
{ "student_id": "64e502...", "status": "absent" }
]
}

text
_Response:_
{ "success": true, "marked": 25 }

text

## 🔐 Auth & Security

- JWT tokens (HTTP-only if needed)
- Only admins use `/admin/*`; teachers see only their dashboards/data
- Passwords: Bcrypt hash, never stored plain

## 🛣️ Game Plan / Roadmap

1. **Backend:**  
   - Create MongoDB models, relations (by storing `_id`)
   - CRUD API for students, teachers, batches, attendance
   - Auth routes with JWT, role management
2. **Frontend:**  
   - Next.js + Tailwind (scaffold, layouts)
   - Admin/Teacher login pages, secure routing/guards
   - Build dashboard with analytics cards/charts
   - Build student/teacher/batch management UIs and attendance flows
   - Responsive design mobile–desktop
3. **Testing & Deployment:**  
   - Unit & e2e tests
   - Dockerize for local/prod; deploy API/docs and web

## 📚 Advanced Features / Scalability

- Announcements & leave management
- Real-time notifications (absentees, reminders)
- Multi-tenancy (if needed)
- Internationalization/localization ready
- Analytics: attendance charts per batch/student/teacher

## 📝 Quick Start

**Backend:**  
cd backend
pip install -r requirements.txt

set up .env with MONGO_URI, JWT_SECRET, etc.
uvicorn app.main:app --reload

text
**Frontend:**  
cd frontend
npm install
npm run dev

Set NEXT_PUBLIC_API_BASE for API URLs
text

## 👩💻 Model/Directory Cheatsheet

| Path                                       | Purpose/Description                               |
|---------------------------------------------|---------------------------------------------------|
| backend/app/models/student.py               | Student DB model/schema                           |
| backend/app/models/teacher.py               | Teacher DB model/schema                           |
| backend/app/models/attendance.py            | Attendance DB model/schema                        |
| backend/app/models/batch.py                 | Batch/Class model                                 |
| backend/app/routers/student.py              | FastAPI routers for student CRUD                  |
| backend/app/routers/attendance.py           | Attendance API routers                            |
| backend/app/routers/auth.py                 | JWT login/logout                                  |
| frontend/app/admin/dashboard.jsx            | Admin dashboard (cards, charts)                   |
| frontend/components/StudentTable.jsx        | Table for student listing/search                  |
| frontend/components/AttendanceMark.jsx      | Mark attendance UI                                |
| frontend/components/StatsCard.jsx           | Dashboard stats card (students, attendance, etc.) |
| ...                                         | ...                                               |

## 🚀 Ready to deploy! 