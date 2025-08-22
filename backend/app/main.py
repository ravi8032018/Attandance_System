from fastapi import FastAPI
from backend.app.db import db
from backend.app.routers.auth.admin_auth_routers import router as admin_auth_router
from backend.app.routers.auth.faculty_auth_routers import router as faculty_auth_router
from backend.app.routers.auth.student_auth_routers import router as student_auth_router
from backend.app.routers.student_routers import router as student_router
from backend.app.routers.faculty_routers import router as faculty_router
from backend.app.routers.auth.reset_password import router as reset_password
from backend.app.routers.attendance_routers import router as attendance_router
from fastapi.middleware.cors import CORSMiddleware

fastapi_app = FastAPI()

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000'],  # or ["*"] for wide-open in dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@fastapi_app.get("/")
async def root():
    return {"message": "Student Management & Attendance System backend is running 🚀"}

@fastapi_app.on_event("startup")
async def connect():
    # Create unique index for emails (only runs at startup!)
    await db['Admins'].create_index("email", unique=True)

    await db["Students"].create_index("email", unique=True)
    await db["Students"].create_index("registration_no", unique=True)

    await db["Faculty"].create_index("email", unique=True)
    # await db["Faculty"].create_index("faculty_id", unique=True)

    await db["PasswordResetDB"].create_index("token", unique=True)
    await db["PasswordResetDB"].create_index("expires_at")

    print("✅ Connected to MongoDB successfully!")

@fastapi_app.on_event("shutdown")
async def disconnect():
    db.client.close()
    print("🛑 Disconnected from MongoDB.")


fastapi_app.include_router(admin_auth_router)
fastapi_app.include_router(faculty_auth_router)
fastapi_app.include_router(student_auth_router)
fastapi_app.include_router(student_router)
fastapi_app.include_router(reset_password)
fastapi_app.include_router(faculty_router)
fastapi_app.include_router(attendance_router)
