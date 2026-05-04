// app/faculty/(protected)/hod/dashboard/HODDashboardClient.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AlertCircle, Users, BookOpen, TrendingUp, Download, RefreshCw } from "lucide-react";
import {
  fetchDepartmentStudents,
  fetchDepartmentFaculty,
  fetchCurriculumForDepartment,
  fetchFacultySubjectAssignments,
  calculateDashboardMetrics,
  calculateFacultyWorkload,
  calculateDepartmentAverageAttendance,
  calculateLowAttendanceAlerts,
} from "@/src/_hooks/hod_dashboard_api";
import {
  StudentDistributionPie,
  AttendanceTrendLine,
  FacultyWorkloadBar,
  StatCard,
  AlertBanner,
  ChartSkeleton,
  attendanceStatusColor,
  DepartmentAttendanceDistributionPie,
} from "@/src/_hooks/hod_dashboards_charts";

interface DashboardState {
  students: any[];
  faculty: any[];
  subjects: any[];
  assignments: any[];
  metrics: any;
  facultyWorkload: any[];
  lowAttendanceAlerts: any[];
  avgAttendance: number;
  loading: boolean;
  error: string | null;
}

const defaultDepartments = ["CS", "CSE", "ECE", "AGRI"];
const defaultSemesters = ["1", "2", "3", "4", "5", "6", "7", "8"];

export default function HODDashboardClient() {
  const [department, setDepartment] = useState(defaultDepartments[0]);
  const [semester, setSemester] = useState("");
  const [dateRange, setDateRange] = useState("6-months"); // 1-month, 3-months, 6-months, 1-year, custom
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [searchFaculty, setSearchFaculty] = useState("");
  const [searchAlerts, setSearchAlerts] = useState("");
  const [sortFacultyBy, setSortFacultyBy] = useState("name"); // name, workload
  const [sortAlertsBy, setSortAlertsBy] = useState("attendance"); // name, attendance, subject

  const [state, setState] = useState<DashboardState>({
    students: [],
    faculty: [],
    subjects: [],
    assignments: [],
    metrics: {},
    facultyWorkload: [],
    lowAttendanceAlerts: [],
    avgAttendance: 0,
    loading: true,
    error: null,
  });

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch main data in parallel
      const [studentsRes, facultyRes, subjectsRes] = await Promise.all([
        fetchDepartmentStudents({
          department,
          semester: semester || undefined,
          status: "active",
          limit: 1000,
        }),
        fetchDepartmentFaculty({
          department,
          status: "active",
          limit: 100,
        }),
        fetchCurriculumForDepartment({
          department,
          semester: semester || undefined,
        }),
      ]);

      const students = Array.isArray(studentsRes?.data)
        ? studentsRes.data
        : studentsRes?.data || [];
      const faculty = Array.isArray(facultyRes?.data)
        ? facultyRes.data
        : facultyRes?.data || [];
      const subjects = Array.isArray(subjectsRes?.data)
        ? subjectsRes.data
        : subjectsRes?.data || [];

      // Fetch faculty assignments
      let assignments: any[] = [];
      try {
        const assignmentsRes = await fetchFacultySubjectAssignments({
          department,
          semester: semester || undefined,
        });
        assignments = Array.isArray(assignmentsRes?.data)
          ? assignmentsRes.data
          : assignmentsRes?.data || [];
      } catch (err) {
        console.warn("Failed to fetch faculty assignments:", err);
      }

      // Calculate metrics
      const metrics = calculateDashboardMetrics({
        students,
        faculty,
        subjects,
      });

      // Calculate faculty workload
      const facultyWorkload = calculateFacultyWorkload({
        faculty,
        assignments,
      });

      // Calculate average attendance (sample from first 20 students)
      const avgAttendance = await calculateDepartmentAverageAttendance(
        students.slice(0, 20)
      );

      // Calculate low attendance alerts (sample from first 30 students)
      const lowAttendanceAlerts = await calculateLowAttendanceAlerts(
        students.slice(0, 30),
        75
      );

      setState({
        students,
        faculty,
        subjects,
        assignments,
        metrics,
        facultyWorkload,
        lowAttendanceAlerts,
        avgAttendance,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Failed to load dashboard data",
      }));
    }
  }, [department, semester]);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboardData]);

  // Process data for charts
  const studentsBySemester = state.metrics?.studentsBySemester || {};
  const attendanceTrend = {
    "6 months ago": 68,
    "5 months ago": 70,
    "4 months ago": 72,
    "3 months ago": 71,
    "2 months ago": 73,
    "1 month ago": state.avgAttendance || 74,
  };

  // Filter and sort faculty
  const filteredFaculty = state.facultyWorkload
    .filter((f) =>
      `${f.first_name} ${f.last_name}`.toLowerCase().includes(searchFaculty.toLowerCase())
    )
    .sort((a, b) => {
      if (sortFacultyBy === "workload") {
        return (b.subjects_assigned || 0) - (a.subjects_assigned || 0);
      }
      return `${a.first_name} ${a.last_name}`.localeCompare(
        `${b.first_name} ${b.last_name}`
      );
    });

  // Filter and sort low attendance alerts
  const filteredAlerts = state.lowAttendanceAlerts
    .filter((a) =>
      a.student_name.toLowerCase().includes(searchAlerts.toLowerCase()) ||
      a.registration_no.toLowerCase().includes(searchAlerts.toLowerCase())
    )
    .sort((a, b) => {
      if (sortAlertsBy === "attendance") {
        return a.average_attendance - b.average_attendance;
      }
      return a.student_name.localeCompare(b.student_name);
    });

  // Export functionality
  const handleExportPDF = () => {
    // Simple implementation - in production use html2pdf or similar
    const content = `
        HOD Dashboard Report
        Department: ${department}
        Semester: ${semester || "All"}
        Generated: ${new Date().toLocaleDateString()}

        KEY METRICS
        Total Students: ${state.metrics.totalStudents}
        Total Faculty: ${state.metrics.totalFaculty}
        Active Faculty: ${state.metrics.activeFaculty}
        Total Subjects: ${state.metrics.totalSubjects}
        Average Attendance: ${state.avgAttendance.toFixed(2)}%
        Low Attendance Alerts: ${state.lowAttendanceAlerts.length}
            `;

    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hod-dashboard-${department}-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExportCSV = () => {
    // Export low attendance alerts as CSV
    const headers = [
      "Student Name",
      "Registration No",
      "Email",
      "Semester",
      "Low Subjects Count",
      "Avg Attendance",
    ];
    const rows = state.lowAttendanceAlerts.map((a) => [
      a.student_name,
      a.registration_no,
      a.email,
      a.semester,
      a.low_attendance_subjects.length,
      a.average_attendance.toFixed(2),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `low-attendance-alerts-${department}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
   <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
     <div className="mx-auto max-w-7xl">

       {/* Header */}
       <div className="mb-8">
         <div className="flex items-center justify-between">
           <div>
             <h1 className="text-3xl font-bold text-foreground">HOD Dashboard</h1>
             <p className="mt-2 text-muted-foreground">
               Overview of department activity, faculty, students, and attendance metrics.
             </p>
           </div>

           <div className="flex gap-3">
             <button
               onClick={() => setAutoRefresh(!autoRefresh)}
               className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                 autoRefresh
                   ? "bg-success/10 text-success hover:bg-success/20"
                   : "bg-muted text-foreground hover:bg-muted/80"
               }`}
             >
               <RefreshCw className="h-4 w-4" />
               {autoRefresh ? "Auto-refreshing" : "Paused"}
             </button>
             <button
               onClick={fetchDashboardData}
               disabled={state.loading}
               className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-50"
             >
               <RefreshCw className="h-4 w-4" />
               Refresh
             </button>
           </div>
         </div>
       </div>
        {/* Error Banner */}
        {state.error && (
          <div className="mb-6">
            <AlertBanner
              severity="danger"
              title="Error Loading Dashboard"
              message={state.error}
              action="Retry"
              onAction={fetchDashboardData}
            />
          </div>
        )}

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={Users}
            label="Total Students"
            value={state.metrics.totalStudents || 0}
            subtext={`In ${Object.keys(studentsBySemester).length} semesters`}
            bgColor="bg-primary/10"
            iconColor="text-primary"
            />
          <StatCard
            icon={Users}
            label="Total Faculty"
            value={state.metrics.totalFaculty || 0}
            subtext={`${state.metrics.activeFaculty || 0} active`}
            bgColor="bg-primary/10"
            iconColor="text-primary"
            />
          <StatCard
            icon={BookOpen}
            label="Total Subjects"
            value={state.metrics.totalSubjects || 0}
            subtext="Courses available"
            bgColor="bg-success/10"
            iconColor="text-success"
            />
          <StatCard
            icon={TrendingUp}
            label="Avg Attendance"
            value={`${state.avgAttendance.toFixed(1)}%`}
            subtext={
              state.avgAttendance >= 75
                ? "On track"
                : state.avgAttendance >= 60
                ? "Needs attention"
                : "Critical"
            }
            bgColor={
              state.avgAttendance >= 75
                ? "bg-success/10"
                : state.avgAttendance >= 60
                ? "bg-warning/10"
                : "bg-error/10"
            }
            iconColor={
              state.avgAttendance >= 75
                ? "text-success"
                : state.avgAttendance >= 60
                ? "text-warning"
                : "text-error"
            }
            />
          <StatCard
            icon={AlertCircle}
            label="Low Attendance Alerts"
            value={state.lowAttendanceAlerts.length}
            subtext="Students below 75%"
            bgColor="bg-error/10"
            iconColor="text-error"
            />
          <StatCard
            icon={Users}
            label="Avg Faculty Workload"
            value={
              state.facultyWorkload.length > 0
                ? (
                    state.facultyWorkload.reduce((sum, f) => sum + (f.subjects_assigned || 0), 0) /
                    state.facultyWorkload.length
                  ).toFixed(1)
                : 0
            }
            subtext="Subjects per faculty"
            bgColor="bg-primary/10"
            iconColor="text-primary"
            />
        </div>

        {/* Charts Section - Row 1 */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Student Distribution */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Student Distribution by Semester
            </h3>
            <div className="flex justify-center">
              {state.loading ? (
                <ChartSkeleton h={300} w="100%" />
              ) : Object.keys(studentsBySemester).length > 0 ? (
                <StudentDistributionPie
                  data={studentsBySemester}
                  h={300}
                  w={400}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Attendance Trend */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Average Attendance Trend (6 Months)
            </h3>
            <div className="flex justify-center">
              {state.loading ? (
                <ChartSkeleton h={300} w="100%" />
              ) : (
                <AttendanceTrendLine data={attendanceTrend} h={300} w={700} />
              )}
            </div>
          </div>
        </div>

        {/* Charts Section - Row 2 */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-xs">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Faculty Workload Distribution
          </h3>
          <div className="flex justify-center">
            {state.loading ? (
              <ChartSkeleton h={350} w="100%" />
            ) : state.facultyWorkload.length > 0 ? (
              <FacultyWorkloadBar data={state.facultyWorkload} h={350} w={800} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No faculty data available
              </div>
            )}
          </div>
        </div>

        {/* Faculty Table Section */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Faculty & Workload</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search faculty..."
                value={searchFaculty}
                onChange={(e) => setSearchFaculty(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={sortFacultyBy}
                onChange={(e) => setSortFacultyBy(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Sort by Name</option>
                <option value="workload">Sort by Workload</option>
              </select>
            </div>
          </div>

          {state.loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="px-4 py-3 text-left font-semibold text-foreground">
                      Faculty Name
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">
                      Faculty ID
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">
                      Email
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">
                      Subjects Assigned
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaculty.slice(0, 15).map((faculty, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-muted transition">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {faculty.first_name} {faculty.last_name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{faculty.faculty_id}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs truncate">
                        {faculty.email}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-semibold">
                          {faculty.subjects_assigned || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            faculty.status === "active"
                              ? "bg-success/20 text-success"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {faculty.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Attendance Alerts Section */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Low Attendance Alerts</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search students..."
                value={searchAlerts}
                onChange={(e) => setSearchAlerts(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-error"
              />
              <select
                value={sortAlertsBy}
                onChange={(e) => setSortAlertsBy(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-error"
              >
                <option value="name">Sort by Name</option>
                <option value="attendance">Sort by Attendance</option>
              </select>
            </div>
          </div>

          {state.loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-success font-medium">
              ✓ No students with low attendance
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-error/10">
                    <th className="px-4 py-3 text-left font-semibold text-error">
                      Student Name
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-error">
                      Registration No
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-error">
                      Email
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-error">
                      Semester
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-error">
                      Avg Attendance
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-error">
                      Low Subjects
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.slice(0, 15).map((alert, idx) => {
                    const statusColor = attendanceStatusColor(alert.average_attendance);
                    return (
                      <tr key={idx} className="border-b border-error/10 hover:bg-error/5 transition">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {alert.student_name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm  ">
                          {alert.registration_no}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs truncate">
                          {alert.email}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          Sem {alert.semester}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusColor.badge}`}>
                            {alert.average_attendance.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block bg-error/20 text-error px-2 py-1 rounded text-xs font-semibold">
                            {alert.low_attendance_subjects.length}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

                {/* Filters Section */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-xs">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Filters</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Department Selector */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {defaultDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Selector */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Semesters</option>
                {defaultSemesters.map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Selector */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="1-month">Last Month</option>
                <option value="3-months">Last 3 Months</option>
                <option value="6-months">Last 6 Months</option>
                <option value="1-year">Last Year</option>
              </select>
            </div>

            {/* Export Buttons */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Export
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleExportPDF}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-error/10 text-error rounded-lg text-sm font-medium hover:bg-error/20 transition"
                  title="Export as PDF"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-success/10 text-success rounded-lg text-sm font-medium hover:bg-success/20 transition"
                  title="Export as CSV"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
