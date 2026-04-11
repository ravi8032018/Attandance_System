// src/_hooks/hod_dashboard_api.ts
import { apiFetch } from "@/src/api_fetch";

/**
 * Fetch all students in a department with optional semester filter
 * Used for calculating student distribution, total counts, etc.
 */
export async function fetchDepartmentStudents(params: {
  department: string;
  semester?: string;
  status?: string;
  skip?: number;
  limit?: number;
}) {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!base) throw new Error("API base URL is not configured");

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });

  const url = `${base}/student?${search.toString()}`;
  console.log("fetchDepartmentStudents →", url);

  const res = await apiFetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await res.json().catch(() => ({}));
  console.log("fetchDepartmentStudents response →", data);
  if (!res.ok) {
    const msg =
      typeof data?.detail === "string"
        ? data.detail
        : data?.message || "Failed to fetch department students";
    throw new Error(msg);
  }

  return data;
}

/**
 * Fetch all faculty in a department
 * Used for faculty workload, assignments, performance metrics
 */
export async function fetchDepartmentFaculty(params: {
  department?: string;
  status?: string;
  skip?: number;
  limit?: number;
}) {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!base) throw new Error("API base URL is not configured");

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });

  const url = `${base}/faculty?${search.toString()}`;
  console.log("fetchDepartmentFaculty →", url);

  const res = await apiFetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await res.json().catch(() => ({}));
  console.log("fetchDepartmentFaculty response →", data);
  if (!res.ok) {
    const msg =
      typeof data?.detail === "string"
        ? data.detail
        : data?.message || "Failed to fetch department faculty";
    throw new Error(msg);
  }

  return data;
}

/**
 * Fetch curriculum (subjects) for a department and semester
 * Used for course statistics, subject counts
 */
export async function fetchCurriculumForDepartment(params: {
  department: string;
  semester?: string;
}) {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!base) throw new Error("API base URL is not configured");

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });

  const url = `${base}/curriculum?${search.toString()}`;
  console.log("fetchCurriculumForDepartment →", url);

  const res = await apiFetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await res.json().catch(() => ({}));
  console.log("fetchCurriculumForDepartment response →", data);
  if (!res.ok) {
    const msg =
      typeof data?.detail === "string"
        ? data.detail
        : data?.message || "Failed to fetch curriculum";
    throw new Error(msg);
  }

  return data;
}

/**
 * Fetch faculty subject assignments
 * Used for faculty workload calculation
 */
export async function fetchFacultySubjectAssignments(params: {
  department: string;
  semester?: string;
  faculty_id?: string;
}) {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!base) throw new Error("API base URL is not configured");

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });

  const url = `${base}/curriculum/my-subjects-for-sem?${search.toString()}`;
  console.log("fetchFacultySubjectAssignments →", url);

  const res = await apiFetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await res.json().catch(() => ({}));
  console.log("fetchFacultySubjectAssignments response →", data);
  
  if (!res.ok) {
    const msg =
      typeof data?.detail === "string"
        ? data.detail
        : data?.message || "Failed to fetch faculty subject assignments";
    throw new Error(msg);
  }

  return data;
}

/**
 * Fetch attendance report for a student (for low attendance alerts)
 * Returns attendance percentage per subject
 */
export async function fetchStudentAttendanceReport(registrationNo: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!base) throw new Error("API base URL is not configured");

  const search = new URLSearchParams({ registration_no: registrationNo });
  const url = `${base}/attendance/report/student-subject?${search.toString()}`;
  console.log("fetchStudentAttendanceReport →", url);

  const res = await apiFetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await res.json().catch(() => ({}));
    console.log("fetchStudentAttendanceReport response →", data);
    
  if (!res.ok) {
    const msg =
      typeof data?.detail === "string"
        ? data.detail
        : data?.message || "Failed to fetch student attendance report";
    throw new Error(msg);
  }

  return data;
}

/**
 * Aggregate dashboard statistics from fetched data
 * Calculates: total students, avg attendance, student distribution by semester, etc.
 */
export function calculateDashboardMetrics(params: {
  students: any[];
  faculty: any[];
  subjects: any[];
  studentsBysemester?: Record<string, number>;
}) {
  const { students = [], faculty = [], subjects = [] } = params;

  // Student distribution by semester
  const studentsBySemester: Record<string, number> = {};
  students.forEach((s: any) => {
    const sem = s.semester || "Unknown";
    studentsBySemester[sem] = (studentsBySemester[sem] || 0) + 1;
  });

  return {
    totalStudents: students.length,
    totalFaculty: faculty.length,
    totalSubjects: subjects.length,
    activeFaculty: faculty.filter((f: any) => f.status === "active").length,
    inactiveFaculty: faculty.filter((f: any) => f.status === "inactive").length,
    studentsBySemester,
  };
}

/**
 * Calculate faculty workload (subjects assigned per faculty)
 * Returns array of faculty with subject count
 */
export function calculateFacultyWorkload(params: {
  faculty: any[];
  assignments: any[];
}) {
  const { faculty = [], assignments = [] } = params;

  const workloadMap: Record<string, number> = {};
  assignments.forEach((a: any) => {
    const fid = a.faculty_id || a.Faculty_id;
    workloadMap[fid] = (workloadMap[fid] || 0) + 1;
  });

  return faculty.map((f: any) => ({
    ...f,
    subjects_assigned: workloadMap[f.faculty_id || f.id] || 0,
  }));
}

/**
 * Calculate students with low attendance (below threshold)
 * Need to fetch all students' attendance reports
 */
export async function calculateLowAttendanceAlerts(
  students: any[],
  threshold: number = 75
) {
  const alerts: any[] = [];

  for (const student of students) {
    try {
      const report = await fetchStudentAttendanceReport(student.registration_no);
      const reports = Array.isArray(report?.reports) ? report.reports : [];

      // Find any subject below threshold
      const lowAttendanceSubjects = reports.filter(
        (r: any) => (r.attendance_percentage ?? 0) < threshold
      );

      if (lowAttendanceSubjects.length > 0) {
        alerts.push({
          student_name: `${student.first_name} ${student.last_name}`,
          registration_no: student.registration_no,
          email: student.email,
          semester: student.semester,
          low_attendance_subjects: lowAttendanceSubjects,
          average_attendance: lowAttendanceSubjects.length > 0
            ? lowAttendanceSubjects.reduce((sum: number, r: any) => sum + (r.attendance_percentage ?? 0), 0) / lowAttendanceSubjects.length
            : 0,
        });
      }
    } catch (err) {
      console.warn(`Failed to fetch attendance for ${student.registration_no}:`, err);
    }
  }

  return alerts;
}

/**
 * Calculate average attendance across all students in department
 * Requires fetching reports for all students - use with caution (performance)
 */
export async function calculateDepartmentAverageAttendance(
  students: any[]
): Promise<number> {
  if (students.length === 0) return 0;

  let totalAttendance = 0;
  let count = 0;

  for (const student of students.slice(0, Math.min(20, students.length))) {
    // Limit to first 20 for performance
    try {
      const report = await fetchStudentAttendanceReport(student.registration_no);
      const reports = Array.isArray(report?.reports) ? report.reports : [];

      if (reports.length > 0) {
        const avg =
          reports.reduce((sum: number, r: any) => sum + (r.attendance_percentage ?? 0), 0) /
          reports.length;
        totalAttendance += avg;
        count++;
      }
    } catch (err) {
      console.warn(`Failed to fetch attendance for ${student.registration_no}:`, err);
    }
  }

  return count > 0 ? totalAttendance / count : 0;
}
