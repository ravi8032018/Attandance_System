"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { AcademicTermSwitcher } from "@/components/ui/AcademicTermSwitcher";
import { TermMode, getSavedTermMode, getSemesterSelectOptions, getActiveSemesters } from "@/lib/academicTerm";

const DEPARTMENTS = [
  { code: "CS", name: "Computer Science", icon: "💻" },
  { code: "CSE", name: "CS & Engineering", icon: "⚙️" },
  { code: "ECE", name: "Electronics & Comm", icon: "📡" },
  { code: "EEE", name: "Electrical & Electronics", icon: "⚡" },
  { code: "ME", name: "Mechanical Eng", icon: "🔧" },
  { code: "CE", name: "Civil Eng", icon: "🏗️" },
  { code: "MATH", name: "Mathematics", icon: "📐" },
  { code: "PHYS", name: "Physics", icon: "🔬" },
  { code: "AGRI", name: "Agriculture", icon: "🌾" },
];

function parseApiError(data: any): string {
  if (!data) return "An unexpected error occurred.";
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((err: any) => err.msg || JSON.stringify(err)).join("; ");
  }
  if (data.message && typeof data.message === "string") return data.message;
  return "An unexpected server error occurred.";
}

function getSubjectTypeBadgeVariant(typeStr: string): "primary" | "teal" | "warning" | "muted" {
  const t = (typeStr || "").trim().toLowerCase();
  if (t.includes("practical") || t.includes("lab")) return "teal";
  if (t.includes("theory")) return "primary";
  if (t.includes("elective")) return "warning";
  return "muted";
}

export default function AdminCurriculumPage() {
  const [department, setDepartment] = useState("CS");
  const [termMode, setTermMode] = useState<TermMode>("odd");
  const [semester, setSemester] = useState("1");
  const [viewMode, setViewMode] = useState<"table" | "card">("card");
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<any | null>(null);

  useEffect(() => {
    const initialMode = getSavedTermMode();
    setTermMode(initialMode);
    const active = getActiveSemesters(initialMode);
    if (active.length > 0 && !active.includes(semester)) {
      setSemester(active[0]);
    }
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("card");
    }
  }, []);

  const handleTermModeChange = (newMode: TermMode) => {
    setTermMode(newMode);
    const active = getActiveSemesters(newMode);
    if (active.length > 0 && !active.includes(semester)) {
      setSemester(active[0]);
    }
  };

  const [loading, setLoading] = useState(true);
  const [curriculumItems, setCurriculumItems] = useState<any[]>([]);
  const [facultyOptions, setFacultyOptions] = useState<{ value: string; label: string }[]>([]);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (actionMsg) {
      const timer = setTimeout(() => setActionMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionMsg]);

  // Add Subject Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [subForm, setSubForm] = useState({
    department: "CS",
    semester: "4",
    course: "BSC",
    subject_code: "",
    subject_name: "",
    credits: 3,
    type: "Theory",
    faculty_id: "",
  });

  // Edit Subject Modal State
  const [editSubject, setEditSubject] = useState<any | null>(null);

  const fetchCurriculum = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/curriculum/subjects?department=${encodeURIComponent(department)}&semester=${encodeURIComponent(semester)}`);
      if (res.ok) {
        const data = await res.json();
        setCurriculumItems(data.data || []);
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Failed to load curriculum catalog." });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentFaculty = async (targetDept?: string) => {
    const deptToFetch = targetDept || department;
    try {
      const res = await apiFetch(`/faculty/?department=${encodeURIComponent(deptToFetch)}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        const facs = data.data || [];
        const opts = [
          { value: "", label: "-- None (Unassigned) --" },
          ...facs.map((f: any) => ({
            value: f.faculty_id,
            label: `Dr. ${f.first_name} ${f.last_name} (ID: ${f.faculty_id}) • ${f.department || deptToFetch} Dept`,
          })),
        ];
        setFacultyOptions(opts);
      }
    } catch (err) {
      setFacultyOptions([{ value: "", label: "-- None (Unassigned) --" }]);
    }
  };

  useEffect(() => {
    fetchCurriculum();
    fetchDepartmentFaculty(department);
  }, [department, semester]);

  const handleModalDeptChange = (newDept: string) => {
    setSubForm((prev) => ({ ...prev, department: newDept }));
    fetchDepartmentFaculty(newDept);
  };

  const handleOpenAddModal = () => {
    setSubForm({
      department: department,
      semester: semester,
      course: "BSC",
      subject_code: "",
      subject_name: "",
      credits: 3,
      type: "Theory",
      faculty_id: "",
    });
    fetchDepartmentFaculty(department);
    setShowAddModal(true);
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetDept = subForm.department || department;
      const targetSem = subForm.semester || semester;
      const res = await apiFetch("/curriculum/add-subject", {
        method: "POST",
        body: JSON.stringify({
          department: targetDept,
          semester: targetSem,
          course: subForm.course,
          subject_code: subForm.subject_code,
          subject_name: subForm.subject_name,
          credits: subForm.credits,
          type: subForm.type,
          faculty_id: subForm.faculty_id || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || "Subject added to curriculum successfully." });
        setShowAddModal(false);
        setSubForm({
          department: targetDept,
          semester: targetSem,
          course: "BSC",
          subject_code: "",
          subject_name: "",
          credits: 3,
          type: "Theory",
          faculty_id: "",
        });
        if (targetDept === department && targetSem === semester) {
          fetchCurriculum();
        } else {
          setDepartment(targetDept);
          setSemester(targetSem);
        }
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Server error adding subject." });
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubject) return;
    try {
      const res = await apiFetch("/curriculum/update-subject", {
        method: "PUT",
        body: JSON.stringify({
          department,
          semester,
          subject_code: editSubject.original_code,
          new_subject_code: editSubject.subject_code,
          new_subject_name: editSubject.subject_name,
          credits: editSubject.credits,
          type: editSubject.type,
          faculty_id: editSubject.faculty_id || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || "Subject updated successfully." });
        setEditSubject(null);
        fetchCurriculum();
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Server error updating subject." });
    }
  };

  const handleDeleteSubject = async (scode: string) => {
    if (!confirm(`Are you sure you want to delete subject '${scode}' from ${department} Semester ${semester}?`)) return;
    try {
      const res = await apiFetch("/curriculum/delete-subject", {
        method: "DELETE",
        body: JSON.stringify({
          department,
          semester,
          subject_code: scode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || `Subject ${scode} deleted.` });
        fetchCurriculum();
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Server error deleting subject." });
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Auto-Dismiss Notification */}
      {actionMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-between shadow-sm ${actionMsg.type === "success"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
            }`}
        >
          <span>{actionMsg.text}</span>
          <span className="text-[10px] opacity-75 font-normal">(Auto-dismissing in 5s)</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Curriculum Catalog Manager
            </h1>
            <span className="hidden sm:inline-flex"><Badge variant="primary">Admin Workspace</Badge></span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage subject offerings, course codes, credits, and faculty assignments per department &amp; semester.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 w-full sm:w-auto text-center"
        >
          <span>✨</span>
          <span>+ Add New Course<span className="hidden sm:inline"> Definition</span></span>
        </button>
      </div>

      {/* Filters & Controls Bar */}
      <div className="solid-card rounded-2xl p-4 sm:p-5 border border-border bg-card space-y-4">
        <div className="grid grid-cols-2 gap-1 w-full">
          {/* Department Selector */}
          <div className="space-y-1.5 min-w-0">
            <label className="font-extrabold text-xs text-foreground block truncate">
              🏛️ <span className="hidden sm:inline">Academic </span>Department
            </label>
            <CustomSelect
              value={department}
              onChange={(val) => setDepartment(val)}
              options={DEPARTMENTS.map((d) => ({
                value: d.code,
                label: `${d.icon} ${d.name} (${d.code})`,
              }))}
            />
          </div>

          {/* Semester Selector */}
          <div className="space-y-1.5 min-w-0">
            <label className="font-extrabold text-xs text-foreground block truncate">
              🎓 <span className="hidden sm:inline">Active </span>Semester
            </label>
            <CustomSelect
              value={semester}
              onChange={(val) => setSemester(val)}
              options={getSemesterSelectOptions(termMode, false)}
            />
          </div>
        </div>

        {/* Term Switcher & View Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between  gap-3 w-full pt-3 border-t border-border/70">
          <AcademicTermSwitcher currentMode={termMode} onModeChange={handleTermModeChange} className="w-full sm:w-auto" />

          <div className="hidden sm:flex items-center border border-border rounded-xl bg-card p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              📋 Table
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === "card" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              🎴 Cards
            </button>
          </div>
        </div>
      </div>

      {/* Curriculum Items Display */}
      {loading ? (
        <div className="solid-card rounded-2xl p-8 border border-border text-center text-xs font-bold text-muted-foreground animate-pulse bg-card">
          Loading curriculum subjects for {department} Semester {semester}...
        </div>
      ) : curriculumItems.length === 0 ? (
        <div className="solid-card rounded-2xl p-8 border border-border text-center text-xs text-muted-foreground bg-card">
          No subjects configured for {department} Semester {semester}. Click "+ Add New Course" above to create one.
        </div>
      ) : viewMode === "table" ? (
        <div className="solid-card rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border font-bold text-muted-foreground">
                <tr>
                  <th className="p-4">Subject Code</th>
                  <th className="p-4">Subject Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Credits</th>
                  <th className="p-4">Assigned Faculty</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {curriculumItems.map((sub: any) => (
                  <tr
                    key={sub.subject_code}
                    onClick={() => setSelectedSubjectDetail(sub)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{sub.subject_code}</td>
                    <td className="p-4 font-extrabold text-foreground">{sub.subject_name || sub.subject_code}</td>
                    <td className="p-4">
                      <Badge variant={getSubjectTypeBadgeVariant(sub.type)}>
                        {sub.type || "Theory"}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono">{sub.credits !== undefined ? sub.credits : 3} Credits</td>
                    <td className="p-4">
                      {sub.faculty_id ? (
                        <span className="font-extrabold text-foreground">{sub.faculty_name || sub.faculty_id}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() =>
                          setEditSubject({
                            original_code: sub.subject_code,
                            subject_code: sub.subject_code,
                            subject_name: sub.subject_name || sub.subject_code,
                            credits: sub.credits !== undefined ? sub.credits : 3,
                            type: sub.type || "Theory",
                            faculty_id: sub.faculty_id || "",
                          })
                        }
                        className="px-2.5 py-1 rounded-lg border border-border text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(sub.subject_code)}
                        className="px-2 py-1 rounded-lg border border-red-200 dark:border-red-800/80 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete Subject"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {curriculumItems.map((sub: any) => (
            <div
              key={sub.subject_code}
              onClick={() => setSelectedSubjectDetail(sub)}
              className="solid-card rounded-2xl p-5 border border-border bg-card hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-400 block">
                    {sub.subject_code}
                  </span>
                  <Badge variant={getSubjectTypeBadgeVariant(sub.type)}>
                    {sub.type || "Theory"}
                  </Badge>
                </div>
                <h3 className="text-sm font-extrabold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {sub.subject_name || sub.subject_code}
                </h3>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong className="text-foreground">Credits:</strong> {sub.credits !== undefined ? sub.credits : 3} Credits</p>
                  <p className="truncate">
                    <strong className="text-foreground">Faculty:</strong>{" "}
                    {sub.faculty_id ? (
                      <span className="font-bold text-foreground">{sub.faculty_name || sub.faculty_id}</span>
                    ) : (
                      <span className="italic">Unassigned</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs font-bold">
                <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Manage Course &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Subject Details & Action Controls Pop-up Modal */}
      {selectedSubjectDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 cursor-pointer"
          onClick={() => setSelectedSubjectDetail(null)}
        >
          <div
            className="solid-card rounded-2xl p-6 border border-border max-w-md w-full space-y-5 bg-card shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-indigo-600 dark:text-indigo-400">
                    {selectedSubjectDetail.subject_code}
                  </span>
                  <Badge variant={getSubjectTypeBadgeVariant(selectedSubjectDetail.type)}>
                    {selectedSubjectDetail.type || "Theory"}
                  </Badge>
                </div>
                <h3 className="text-base font-black text-foreground capitalize">
                  {selectedSubjectDetail.subject_name || selectedSubjectDetail.subject_code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubjectDetail(null)}
                className="w-7 h-7 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-extrabold flex items-center justify-center border border-border/80 shadow-xs transition-colors shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Course Specs Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-4 rounded-xl border border-border/60">
              <div>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase block">Department</span>
                <span className="font-bold text-foreground">{department}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase block">Sem / Course</span>
                <span className="font-bold text-foreground">Sem {semester}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase block">Credits</span>
                <span className="font-bold text-foreground">{selectedSubjectDetail.credits !== undefined ? selectedSubjectDetail.credits : 3} Credits</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase block">Faculty</span>
                <span className="font-bold text-foreground">
                  {selectedSubjectDetail.faculty_name || selectedSubjectDetail.faculty_id || "Unassigned"}
                </span>
              </div>
            </div>

            {/* Operations Grid */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">⚡ Administrative Operations</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const sub = selectedSubjectDetail;
                    setSelectedSubjectDetail(null);
                    setEditSubject({
                      original_code: sub.subject_code,
                      subject_code: sub.subject_code,
                      subject_name: sub.subject_name || sub.subject_code,
                      credits: sub.credits !== undefined ? sub.credits : 3,
                      type: sub.type || "Theory",
                      faculty_id: sub.faculty_id || "",
                    });
                  }}
                  className="p-3 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>✏️ Edit Details</span>
                </button>

                <button
                  onClick={() => {
                    const scode = selectedSubjectDetail.subject_code;
                    setSelectedSubjectDetail(null);
                    handleDeleteSubject(scode);
                  }}
                  className="p-3 rounded-xl border border-rose-500/30 bg-card hover:bg-rose-500/10 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>🗑️ Delete Course</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Subject / Course Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 cursor-default max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="space-y-0.5">
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <span>📚 Add New Course / Subject Definition</span>
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Define new curriculum subject with department, semester, degree track &amp; faculty assignment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-extrabold flex items-center justify-center border border-border/80 shadow-xs transition-colors shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-4 text-xs">
              {/* 1. Academic Program Location */}
              <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 space-y-2.5">
                <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                  📌 Academic Program &amp; Semester Context
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="font-bold text-foreground block mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      value={subForm.department}
                      onChange={handleModalDeptChange}
                      options={DEPARTMENTS.map((d) => ({
                        value: d.code,
                        label: `${d.icon} ${d.name} (${d.code})`,
                      }))}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-foreground block mb-1">
                      Semester <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      value={subForm.semester}
                      onChange={(val) => setSubForm({ ...subForm, semester: val })}
                      options={[
                        { value: "1", label: "Semester 1" },
                        { value: "2", label: "Semester 2" },
                        { value: "3", label: "Semester 3" },
                        { value: "4", label: "Semester 4" },
                        { value: "5", label: "Semester 5" },
                        { value: "6", label: "Semester 6" },
                        { value: "7", label: "Semester 7" },
                        { value: "8", label: "Semester 8" },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-foreground block mb-1">Degree Track</label>
                    <CustomSelect
                      value={subForm.course}
                      onChange={(val) => setSubForm({ ...subForm, course: val })}
                      options={[
                        { value: "BSC", label: "B.Sc (Hons)" },
                        { value: "BTECH", label: "B.Tech" },
                        { value: "MSC", label: "M.Sc" },
                        { value: "BCA", label: "BCA" },
                        { value: "MCA", label: "MCA" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Course Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-foreground block mb-1">
                    Course ID / Subject Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    placeholder="e.g. CSDSC204"
                    value={subForm.subject_code}
                    onChange={(e) => setSubForm({ ...subForm, subject_code: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background font-mono uppercase font-black text-indigo-600 dark:text-indigo-400"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Unique official course code</span>
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">
                    Course Name / Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    placeholder="e.g. Data Structures & Algorithms"
                    value={subForm.subject_name}
                    onChange={(e) => setSubForm({ ...subForm, subject_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background font-bold"
                  />
                </div>
              </div>

              {/* 3. Academic Specifications */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-foreground block mb-1">Instruction Type</label>
                  <CustomSelect
                    value={subForm.type}
                    onChange={(val) => setSubForm({ ...subForm, type: val })}
                    options={[
                      { value: "Theory", label: "Theory (Lecture)" },
                      { value: "Practical", label: "Practical / Lab" },
                      { value: "Elective", label: "Elective Subject" },
                      { value: "Project", label: "Project / Dissertation" },
                    ]}
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">Credit Hours</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={subForm.credits}
                    onChange={(e) => setSubForm({ ...subForm, credits: parseInt(e.target.value) || 3 })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background font-mono font-bold"
                  />
                </div>
              </div>

              {/* 4. Faculty Allocation */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground block">
                    Assigned Faculty Instructor
                  </label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {facultyOptions.length > 1 ? `${facultyOptions.length - 1} Faculty Members` : "No Faculty Registered"}
                  </span>
                </div>
                <CustomSelect
                  value={subForm.faculty_id}
                  onChange={(val) => setSubForm({ ...subForm, faculty_id: val })}
                  options={facultyOptions}
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  ✨ Create<span className="hidden sm:inline"> &amp; Register Course</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {editSubject && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setEditSubject(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl cursor-default max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">Edit Subject ({editSubject.original_code})</h2>
              <button
                type="button"
                onClick={() => setEditSubject(null)}
                className="w-7 h-7 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-extrabold flex items-center justify-center border border-border/80 shadow-xs transition-colors shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateSubject} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-foreground block mb-1">Subject Code</label>
                <input
                  required
                  value={editSubject.subject_code}
                  onChange={(e) => setEditSubject({ ...editSubject, subject_code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 rounded-xl border border-border bg-background font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-foreground block mb-1">Subject Name</label>
                <input
                  required
                  value={editSubject.subject_name}
                  onChange={(e) => setEditSubject({ ...editSubject, subject_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-border bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-foreground block mb-1">Type</label>
                  <CustomSelect
                    value={editSubject.type}
                    onChange={(val) => setEditSubject({ ...editSubject, type: val })}
                    options={[
                      { value: "Theory", label: "Theory" },
                      { value: "Practical", label: "Practical" },
                      { value: "Elective", label: "Elective" },
                    ]}
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editSubject.credits}
                    onChange={(e) => setEditSubject({ ...editSubject, credits: parseInt(e.target.value) || 3 })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-foreground block mb-1">Assigned Faculty Member</label>
                <CustomSelect
                  value={editSubject.faculty_id}
                  onChange={(val) => setEditSubject({ ...editSubject, faculty_id: val })}
                  options={facultyOptions}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditSubject(null)}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                >
                  Save Subject Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
