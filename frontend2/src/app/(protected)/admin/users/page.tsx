"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { CustomSelect } from "@/components/ui/CustomSelect";

function parseApiError(data: any): string {
  if (!data) return "An unexpected error occurred.";
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((err: any) => err.msg || JSON.stringify(err)).join("; ");
  }
  if (data.message && typeof data.message === "string") return data.message;
  return "An unexpected server error occurred.";
}

interface DepartmentOption {
  code: string;
  name: string;
  icon: string;
}

const DEPARTMENTS: DepartmentOption[] = [
  { code: "CS", name: "Computer Science", icon: "💻" },
  { code: "CSE", name: "Computer Science & Eng", icon: "⚙️" },
  { code: "ECE", name: "Electronics & Comm", icon: "📡" },
  { code: "AGRI", name: "Agriculture Science", icon: "🌾" },
];

export default function AdminUserManagerPage() {
  const [selectedDept, setSelectedDept] = useState("CS");
  const [activePersona, setActivePersona] = useState<"faculty" | "student">("faculty");
  const [selectedSem, setSelectedSem] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (actionMsg) {
      const timer = setTimeout(() => setActionMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionMsg]);

  // Create Faculty Modal State
  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [facForm, setFacForm] = useState({
    faculty_id: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    department: selectedDept,
    designation: "Assistant Professor",
    is_hod: false,
  });

  // Edit Faculty Modal State
  const [editFaculty, setEditFaculty] = useState<any | null>(null);

  // Admin Assign Subject Modal State
  const [assignFacultyModal, setAssignFacultyModal] = useState<any | null>(null);
  const [assignSem, setAssignSem] = useState("4");
  const [assignedSubjects, setAssignedSubjects] = useState<any[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Create Student Modal State
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [stuForm, setStuForm] = useState({
    registration_no: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    department: selectedDept,
    semester: "1",
    is_cr: false,
  });

  // Edit Student Modal State
  const [editStudent, setEditStudent] = useState<any | null>(null);

  const filteredFaculty = facultyList.filter((f) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    const name = `${f.first_name || ""} ${f.last_name || ""}`.toLowerCase();
    const email = (f.email || "").toLowerCase();
    const fid = (f.faculty_id || "").toLowerCase();
    const desig = (f.designation || "").toLowerCase();
    return name.includes(q) || email.includes(q) || fid.includes(q) || desig.includes(q);
  });

  const filteredStudents = studentList.filter((s) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
    const email = (s.email || "").toLowerCase();
    const reg = (s.registration_no || "").toLowerCase();
    return name.includes(q) || email.includes(q) || reg.includes(q);
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (activePersona === "faculty") {
        const res = await apiFetch(`/faculty/?department=${encodeURIComponent(selectedDept)}&limit=100`);
        if (res.ok) {
          const data = await res.json();
          setFacultyList(data.data || []);
        }
      } else {
        let url = `/student/my/?department=${encodeURIComponent(selectedDept)}&limit=100`;
        if (selectedSem !== "all") {
          url += `&semester=${encodeURIComponent(selectedSem)}`;
        }
        const res = await apiFetch(url);
        if (res.ok) {
          const data = await res.json();
          setStudentList(data.data || []);
        }
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Failed to fetch directory records." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedDept, activePersona, selectedSem]);

  useEffect(() => {
    setFacForm((prev) => ({ ...prev, department: selectedDept }));
    setStuForm((prev) => ({ ...prev, department: selectedDept }));
  }, [selectedDept]);

  // --- Handlers for Faculty ---
  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/admin/faculty", {
        method: "POST",
        body: JSON.stringify(facForm),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || "Faculty created successfully." });
        setShowAddFacultyModal(false);
        setFacForm({
          faculty_id: "",
          first_name: "",
          last_name: "",
          email: "",
          password: "",
          department: selectedDept,
          designation: "Assistant Professor",
          is_hod: false,
        });
        fetchUsers();
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Server error creating faculty member." });
    }
  };

  const handleUpdateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFaculty) return;
    try {
      const res = await apiFetch(`/admin/faculty/${encodeURIComponent(editFaculty.faculty_id)}`, {
        method: "PUT",
        body: JSON.stringify({
          first_name: editFaculty.first_name,
          last_name: editFaculty.last_name,
          email: editFaculty.email,
          department: editFaculty.department,
          designation: editFaculty.designation,
          status: editFaculty.status,
          office_location: editFaculty.office_location,
          contact_number: editFaculty.contact_number,
          qualification: editFaculty.qualification,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || "Faculty updated successfully." });
        setEditFaculty(null);
        fetchUsers();
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Server error updating faculty." });
    }
  };

  const handleDeleteFaculty = async (facultyId: string) => {
    if (!confirm(`Are you sure you want to delete faculty member ${facultyId}?`)) return;
    try {
      const res = await apiFetch(`/admin/faculty/${encodeURIComponent(facultyId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || "Faculty deleted." });
        fetchUsers();
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Server error deleting faculty." });
    }
  };

  const handleToggleHod = async (facultyId: string) => {
    try {
      const res = await apiFetch(`/admin/faculty/${encodeURIComponent(facultyId)}/toggle-hod`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || "HOD status updated." });
        fetchUsers();
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Server error toggling HOD role." });
    }
  };

  // --- Handlers for Admin Subject Assignment Modal ---
  const openAssignSubjectModal = (fac: any) => {
    setAssignFacultyModal(fac);
    fetchFacultySubjectWorkspace(fac.faculty_id, fac.department, assignSem);
  };

  const fetchFacultySubjectWorkspace = async (facId: string, dept: string, sem: string) => {
    setModalLoading(true);
    try {
      const resAssigned = await apiFetch(`/curriculum/my-subjects-for-sem?Faculty_id=${encodeURIComponent(facId)}`);
      if (resAssigned.ok) {
        const dataA = await resAssigned.json();
        setAssignedSubjects(dataA.assigned_subjects || []);
      }
      const resAvailable = await apiFetch(`/curriculum/subjects?department=${encodeURIComponent(dept)}&semester=${encodeURIComponent(sem)}`);
      if (resAvailable.ok) {
        const dataPool = await resAvailable.json();
        setAvailableSubjects(dataPool.data || []);
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Error loading curriculum pool." });
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    if (assignFacultyModal) {
      fetchFacultySubjectWorkspace(assignFacultyModal.faculty_id, assignFacultyModal.department, assignSem);
    }
  }, [assignSem]);

  const handleAssignSubjectInModal = async (subjectCode: string) => {
    if (!assignFacultyModal) return;
    try {
      const res = await apiFetch("/curriculum/assign-subject", {
        method: "POST",
        body: JSON.stringify({
          faculty_id: assignFacultyModal.faculty_id,
          subject_code: subjectCode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || `Subject ${subjectCode} assigned successfully.` });
        fetchFacultySubjectWorkspace(assignFacultyModal.faculty_id, assignFacultyModal.department, assignSem);
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Error assigning subject." });
    }
  };

  const handleUnassignSubjectInModal = async (subjectCode: string) => {
    if (!assignFacultyModal) return;
    try {
      const res = await apiFetch("/curriculum/unassign-subject", {
        method: "DELETE",
        body: JSON.stringify({
          faculty_id: assignFacultyModal.faculty_id,
          subject_code: subjectCode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || `Subject ${subjectCode} unassigned.` });
        fetchFacultySubjectWorkspace(assignFacultyModal.faculty_id, assignFacultyModal.department, assignSem);
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Error unassigning subject." });
    }
  };

  // --- Handlers for Student ---
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/admin/student", {
        method: "POST",
        body: JSON.stringify(stuForm),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || "Student created successfully." });
        setShowAddStudentModal(false);
        setStuForm({
          registration_no: "",
          first_name: "",
          last_name: "",
          email: "",
          password: "",
          department: selectedDept,
          semester: "1",
          is_cr: false,
        });
        fetchUsers();
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Server error creating student." });
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    try {
      const res = await apiFetch(`/admin/student/${encodeURIComponent(editStudent.registration_no)}`, {
        method: "PUT",
        body: JSON.stringify({
          first_name: editStudent.first_name,
          last_name: editStudent.last_name,
          email: editStudent.email,
          department: editStudent.department,
          semester: editStudent.semester,
          status: editStudent.status,
          phone_number: editStudent.phone_number,
          guardian_name: editStudent.guardian_name,
          guardian_phone: editStudent.guardian_phone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || "Student updated successfully." });
        setEditStudent(null);
        fetchUsers();
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Server error updating student." });
    }
  };

  const handleDeleteStudent = async (regNo: string) => {
    if (!confirm(`Are you sure you want to delete student ${regNo}?`)) return;
    try {
      const res = await apiFetch(`/admin/student/${encodeURIComponent(regNo)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || "Student deleted." });
        fetchUsers();
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Server error deleting student." });
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Auto-Dismiss Notification */}
      {actionMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-between shadow-sm ${
            actionMsg.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
          }`}
        >
          <span>{actionMsg.text}</span>
          <span className="text-[10px] opacity-75 font-normal">(Auto-dismissing in 5s)</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              User Manager Console
            </h1>
            <Badge variant="primary">Admin Workspace</Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Select department, choose persona (Faculty / Student), and perform account operations and role updates.
          </p>
        </div>

        <button
          onClick={() => (activePersona === "faculty" ? setShowAddFacultyModal(true) : setShowAddStudentModal(true))}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2.5 text-xs font-bold transition-colors duration-150 shadow-sm self-start sm:self-auto"
        >
          + Add New {activePersona === "faculty" ? "Faculty" : "Student"}
        </button>
      </div>

      {/* Filters & Control Bar */}
      <div className="solid-card rounded-2xl p-5 border border-border bg-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Department Dropdown Selector */}
          <div className="flex items-center gap-3">
            <label className="font-extrabold text-xs text-foreground shrink-0 flex items-center gap-1.5">
              <span>🏛️ Academic Department:</span>
            </label>
            <div className="w-56 sm:w-64">
              <CustomSelect
                value={selectedDept}
                onChange={(val) => setSelectedDept(val)}
                options={DEPARTMENTS.map((d) => ({
                  value: d.code,
                  label: `${d.icon} ${d.name} (${d.code})`,
                }))}
              />
            </div>
          </div>

          {/* Search Utility Input */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder={`🔍 Search ${activePersona === "faculty" ? "faculty by name, email, ID..." : "students by name, email, reg no..."}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-8 py-2 rounded-xl border border-border bg-background text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Persona Tabs, Semester Filter, and View Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-border/70">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePersona("faculty")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activePersona === "faculty"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "border border-border bg-card hover:bg-muted text-muted-foreground"
              }`}
            >
              👨‍🏫 Faculty Members ({filteredFaculty.length})
            </button>
            <button
              onClick={() => setActivePersona("student")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activePersona === "student"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "border border-border bg-card hover:bg-muted text-muted-foreground"
              }`}
            >
              🎓 Enrolled Students ({filteredStudents.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activePersona === "student" && (
              <div className="w-40">
                <CustomSelect
                  value={selectedSem}
                  onChange={(val) => setSelectedSem(val)}
                  options={[
                    { value: "all", label: "All Semesters" },
                    { value: "1", label: "Semester 1" },
                    { value: "2", label: "Semester 2" },
                    { value: "3", label: "Semester 3" },
                    { value: "4", label: "Semester 4" },
                    { value: "5", label: "Semester 5" },
                    { value: "6", label: "Semester 6" },
                  ]}
                />
              </div>
            )}

            <div className="flex items-center border border-border rounded-xl bg-card p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  viewMode === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📋 Table
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  viewMode === "card" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🎴 Cards
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT DISPLAY: Faculty Persona */}
      {activePersona === "faculty" && (
        <>
          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-muted-foreground animate-pulse">
              Loading faculty records for {selectedDept}...
            </div>
          ) : filteredFaculty.length === 0 ? (
            <div className="solid-card rounded-2xl p-8 border border-border text-center text-xs text-muted-foreground bg-card">
              No faculty members found matching your search in department {selectedDept}.
            </div>
          ) : viewMode === "table" ? (
            <div className="solid-card rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border font-bold text-muted-foreground">
                    <tr>
                      <th className="p-4">Faculty Member</th>
                      <th className="p-4">Faculty ID</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Designation</th>
                      <th className="p-4">Roles</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredFaculty.map((fac) => {
                      const isHod = (fac.role || []).includes("hod");
                      return (
                        <tr key={fac.faculty_id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <FacultyAvatar firstName={fac.first_name} lastName={fac.last_name} photoUrl={fac.photo_url} size="sm" />
                              <div>
                                <button
                                  onClick={() => setEditFaculty(fac)}
                                  className="font-extrabold text-foreground hover:underline text-left block"
                                >
                                  {fac.first_name} {fac.last_name}
                                </button>
                                <span className="text-[10px] text-muted-foreground block">{fac.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{fac.faculty_id}</td>
                          <td className="p-4 font-extrabold">{fac.department}</td>
                          <td className="p-4 text-muted-foreground">{fac.designation}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="primary">Faculty</Badge>
                              {isHod && <Badge variant="success">HOD</Badge>}
                            </div>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => openAssignSubjectModal(fac)}
                              className="px-2.5 py-1 rounded-lg border border-border text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                              Assign Subjects
                            </button>
                            <button
                              onClick={() => handleToggleHod(fac.faculty_id)}
                              className="px-2.5 py-1 rounded-lg border border-border text-[11px] font-bold hover:bg-muted transition-colors"
                            >
                              {isHod ? "Revoke HOD" : "Promote HOD"}
                            </button>
                            <button
                              onClick={() => setEditFaculty(fac)}
                              className="px-2.5 py-1 rounded-lg border border-border text-[11px] font-bold hover:bg-muted transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteFaculty(fac.faculty_id)}
                              className="px-2.5 py-1 rounded-lg border border-red-500/20 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFaculty.map((fac) => {
                const isHod = (fac.role || []).includes("hod");
                return (
                  <div key={fac.faculty_id} className="solid-card rounded-2xl p-5 border border-border bg-card space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <FacultyAvatar firstName={fac.first_name} lastName={fac.last_name} photoUrl={fac.photo_url} size="md" />
                          <div>
                            <button
                              onClick={() => setEditFaculty(fac)}
                              className="font-extrabold text-foreground hover:underline text-left block text-sm"
                            >
                              {fac.first_name} {fac.last_name}
                            </button>
                            <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block">{fac.faculty_id}</span>
                          </div>
                        </div>
                        {isHod && <Badge variant="success">HOD</Badge>}
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p><strong className="text-foreground">Dept:</strong> {fac.department}</p>
                        <p><strong className="text-foreground">Designation:</strong> {fac.designation}</p>
                        <p><strong className="text-foreground">Email:</strong> {fac.email}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                      <button
                        onClick={() => openAssignSubjectModal(fac)}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Assign Subjects →
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditFaculty(fac)}
                          className="px-2 py-1 rounded-lg border border-border text-[11px] font-bold hover:bg-muted"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteFaculty(fac.faculty_id)}
                          className="px-2 py-1 rounded-lg border border-red-500/20 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* CONTENT DISPLAY: Student Persona */}
      {activePersona === "student" && (
        <>
          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-muted-foreground animate-pulse">
              Loading student records for {selectedDept}...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="solid-card rounded-2xl p-8 border border-border text-center text-xs text-muted-foreground bg-card">
              No students found matching your search in department {selectedDept} {selectedSem !== "all" ? `Semester ${selectedSem}` : ""}.
            </div>
          ) : viewMode === "table" ? (
            <div className="solid-card rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border font-bold text-muted-foreground">
                    <tr>
                      <th className="p-4">Student</th>
                      <th className="p-4">Registration No</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Semester</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStudents.map((stu) => {
                      const isCr = (stu.role || []).includes("cr");
                      return (
                        <tr key={stu.registration_no} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                firstName={stu.first_name}
                                lastName={stu.last_name}
                                photoUrl={stu.photo_url || stu.profile_image || stu.avatar_url}
                                size="sm"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-foreground capitalize">
                                    {stu.first_name} {stu.last_name}
                                  </span>
                                  {isCr && <Badge variant="primary" className="text-[10px]">CR</Badge>}
                                </div>
                                <span className="text-[10px] text-muted-foreground block font-mono">{stu.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{stu.registration_no}</td>
                          <td className="p-4 font-extrabold">{stu.department}</td>
                          <td className="p-4">Semester {stu.semester}</td>
                          <td className="p-4">
                            <Badge variant={stu.status === "active" ? "success" : "muted"}>
                              {stu.status || "active"}
                            </Badge>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => setEditStudent(stu)}
                              className="px-2.5 py-1 rounded-lg border border-border text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(stu.registration_no)}
                              className="px-2.5 py-1 rounded-lg border border-red-500/20 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((stu) => {
                const isCr = (stu.role || []).includes("cr");
                return (
                  <div key={stu.registration_no} className="solid-card rounded-2xl p-5 border border-border bg-card space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            firstName={stu.first_name}
                            lastName={stu.last_name}
                            photoUrl={stu.photo_url || stu.profile_image || stu.avatar_url}
                            size="md"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-extrabold text-foreground text-sm capitalize">
                                {stu.first_name} {stu.last_name}
                              </h3>
                              {isCr && <Badge variant="primary" className="text-[10px]">CR</Badge>}
                            </div>
                            <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block">{stu.registration_no}</span>
                          </div>
                        </div>
                        <Badge variant={stu.status === "active" ? "success" : "muted"}>
                          {stu.status || "active"}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p><strong className="text-foreground">Dept:</strong> {stu.department}</p>
                        <p><strong className="text-foreground">Semester:</strong> Semester {stu.semester}</p>
                        <p><strong className="text-foreground">Email:</strong> {stu.email}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setEditStudent(stu)}
                        className="px-2.5 py-1 rounded-lg border border-border text-[11px] font-bold hover:bg-muted"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(stu.registration_no)}
                        className="px-2.5 py-1 rounded-lg border border-red-500/20 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Admin Assign Subjects Modal */}
      {assignFacultyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  Assign Subjects & Workload Manager
                </h2>
                <p className="text-xs text-muted-foreground">
                  Faculty: <strong className="text-foreground">{assignFacultyModal.first_name} {assignFacultyModal.last_name}</strong> ({assignFacultyModal.faculty_id}) | Dept: <strong className="text-foreground">{assignFacultyModal.department}</strong>
                </p>
              </div>
              <Badge variant={assignedSubjects.length >= 5 ? "error" : assignedSubjects.length >= 4 ? "warning" : "success"}>
                Workload: {assignedSubjects.length} Subject{assignedSubjects.length !== 1 ? "s" : ""} ({assignedSubjects.length >= 5 ? "Very High" : assignedSubjects.length >= 4 ? "High" : "Normal"})
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-xs font-bold text-foreground">Curriculum Semester Pool:</label>
              <div className="w-48">
                <CustomSelect
                  value={assignSem}
                  onChange={(val) => setAssignSem(val)}
                  options={[
                    { value: "1", label: "Semester 1" },
                    { value: "2", label: "Semester 2" },
                    { value: "3", label: "Semester 3" },
                    { value: "4", label: "Semester 4" },
                    { value: "5", label: "Semester 5" },
                    { value: "6", label: "Semester 6" },
                  ]}
                />
              </div>
            </div>

            {modalLoading ? (
              <div className="p-6 text-center text-xs font-bold text-muted-foreground animate-pulse">
                Loading curriculum assignments...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Left Panel: Assigned Subjects */}
                <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
                  <h3 className="text-xs font-black uppercase text-foreground">
                    Assigned Subjects ({assignedSubjects.length})
                  </h3>
                  {assignedSubjects.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No subjects assigned yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {assignedSubjects.map((s: any) => (
                        <div key={s.subject_code} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-xs">
                          <div>
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 block">{s.subject_code}</span>
                            <span className="font-bold text-foreground block">{s.subject_name || s.subject_code}</span>
                          </div>
                          <button
                            onClick={() => handleUnassignSubjectInModal(s.subject_code)}
                            className="px-2 py-1 text-[10px] font-bold rounded-md border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            ✕ Unassign
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Panel: Available Pool */}
                <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
                  <h3 className="text-xs font-black uppercase text-foreground">
                    Available Subjects in Sem {assignSem} ({availableSubjects.length})
                  </h3>
                  {availableSubjects.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No curriculum subjects found for Sem {assignSem}.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {availableSubjects.map((s: any) => {
                        const isAlreadyAssigned = assignedSubjects.some((as: any) => as.subject_code === s.subject_code);
                        return (
                          <div key={s.subject_code} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-xs">
                            <div>
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 block">{s.subject_code}</span>
                              <span className="font-bold text-foreground block">{s.subject_name || s.subject_code}</span>
                            </div>
                            {isAlreadyAssigned ? (
                              <Badge variant="muted" className="text-[10px]">Assigned</Badge>
                            ) : (
                              <button
                                onClick={() => handleAssignSubjectInModal(s.subject_code)}
                                className="px-2 py-1 text-[10px] font-bold rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                              >
                                + Assign
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                onClick={() => setAssignFacultyModal(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-border text-foreground hover:bg-muted"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Faculty Modal */}
      {editFaculty && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-foreground">Edit Faculty Profile ({editFaculty.faculty_id})</h2>
            <form onSubmit={handleUpdateFaculty} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-foreground block mb-1">First Name</label>
                  <input
                    required
                    value={editFaculty.first_name || ""}
                    onChange={(e) => setEditFaculty({ ...editFaculty, first_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">Last Name</label>
                  <input
                    value={editFaculty.last_name || ""}
                    onChange={(e) => setEditFaculty({ ...editFaculty, last_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-foreground block mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={editFaculty.email || ""}
                  onChange={(e) => setEditFaculty({ ...editFaculty, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-border bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-foreground block mb-1">Department</label>
                  <input
                    required
                    value={editFaculty.department || ""}
                    onChange={(e) => setEditFaculty({ ...editFaculty, department: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">Account Status</label>
                  <CustomSelect
                    value={editFaculty.status || "active"}
                    onChange={(val) => setEditFaculty({ ...editFaculty, status: val })}
                    options={[
                      { value: "active", label: "Active" },
                      { value: "on_leave", label: "On Leave" },
                      { value: "suspended", label: "Suspended" },
                      { value: "inactive", label: "Inactive" },
                    ]}
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-foreground block mb-1">Designation</label>
                <input
                  value={editFaculty.designation || ""}
                  onChange={(e) => setEditFaculty({ ...editFaculty, designation: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-border bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-foreground block mb-1">Office Location</label>
                  <input
                    placeholder="e.g. CS Block, Room 302"
                    value={editFaculty.office_location || ""}
                    onChange={(e) => setEditFaculty({ ...editFaculty, office_location: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">Contact Phone</label>
                  <input
                    placeholder="e.g. +91 9876543210"
                    value={editFaculty.contact_number || ""}
                    onChange={(e) => setEditFaculty({ ...editFaculty, contact_number: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-foreground block mb-1">Qualification / Specialization</label>
                <input
                  placeholder="e.g. Ph.D in AI & Machine Learning"
                  value={editFaculty.qualification || ""}
                  onChange={(e) => setEditFaculty({ ...editFaculty, qualification: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-border bg-background"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditFaculty(null)}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Onboard New Student</h2>
            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-foreground block mb-1">Registration No</label>
                <input
                  required
                  placeholder="e.g. CSBSC2024099"
                  value={stuForm.registration_no}
                  onChange={(e) => setStuForm({ ...stuForm, registration_no: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-border bg-background font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-foreground block mb-1">First Name</label>
                  <input
                    required
                    placeholder="First Name"
                    value={stuForm.first_name}
                    onChange={(e) => setStuForm({ ...stuForm, first_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">Last Name</label>
                  <input
                    placeholder="Last Name"
                    value={stuForm.last_name}
                    onChange={(e) => setStuForm({ ...stuForm, last_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-foreground block mb-1">Email</label>
                <input
                  required
                  type="email"
                  placeholder="student@university.edu"
                  value={stuForm.email}
                  onChange={(e) => setStuForm({ ...stuForm, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-border bg-background"
                />
              </div>
              <div>
                <label className="font-bold text-foreground block mb-1">Initial Password</label>
                <input
                  required
                  type="password"
                  placeholder="Password"
                  value={stuForm.password}
                  onChange={(e) => setStuForm({ ...stuForm, password: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-border bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-foreground block mb-1">Department</label>
                  <CustomSelect
                    value={stuForm.department}
                    onChange={(val) => setStuForm({ ...stuForm, department: val })}
                    options={DEPARTMENTS.map((d) => ({ value: d.code, label: d.code }))}
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">Semester</label>
                  <CustomSelect
                    value={stuForm.semester}
                    onChange={(val) => setStuForm({ ...stuForm, semester: val })}
                    options={[
                      { value: "1", label: "Semester 1" },
                      { value: "2", label: "Semester 2" },
                      { value: "3", label: "Semester 3" },
                      { value: "4", label: "Semester 4" },
                      { value: "5", label: "Semester 5" },
                      { value: "6", label: "Semester 6" },
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                >
                  Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-foreground">Edit Student ({editStudent.registration_no})</h2>
            <form onSubmit={handleUpdateStudent} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-foreground block mb-1">First Name</label>
                  <input
                    required
                    value={editStudent.first_name || ""}
                    onChange={(e) => setEditStudent({ ...editStudent, first_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">Last Name</label>
                  <input
                    value={editStudent.last_name || ""}
                    onChange={(e) => setEditStudent({ ...editStudent, last_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-foreground block mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={editStudent.email || ""}
                  onChange={(e) => setEditStudent({ ...editStudent, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-border bg-background"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-foreground block mb-1">Department</label>
                  <input
                    required
                    value={editStudent.department || ""}
                    onChange={(e) => setEditStudent({ ...editStudent, department: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">Semester</label>
                  <input
                    required
                    value={editStudent.semester || ""}
                    onChange={(e) => setEditStudent({ ...editStudent, semester: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">Status</label>
                  <CustomSelect
                    value={editStudent.status || "active"}
                    onChange={(val) => setEditStudent({ ...editStudent, status: val })}
                    options={[
                      { value: "active", label: "Active" },
                      { value: "suspended", label: "Suspended" },
                      { value: "graduated", label: "Graduated" },
                      { value: "inactive", label: "Inactive" },
                    ]}
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-foreground block mb-1">Student Phone Number</label>
                <input
                  placeholder="e.g. +91 9876543210"
                  value={editStudent.phone_number || ""}
                  onChange={(e) => setEditStudent({ ...editStudent, phone_number: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-border bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-foreground block mb-1">Guardian / Parent Name</label>
                  <input
                    placeholder="Guardian Name"
                    value={editStudent.guardian_name || ""}
                    onChange={(e) => setEditStudent({ ...editStudent, guardian_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">Guardian Contact Phone</label>
                  <input
                    placeholder="Guardian Phone"
                    value={editStudent.guardian_phone || ""}
                    onChange={(e) => setEditStudent({ ...editStudent, guardian_phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditStudent(null)}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
