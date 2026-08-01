"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
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

export default function AdminCurriculumPage() {
  const [department, setDepartment] = useState("CS");
  const [semester, setSemester] = useState("4");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

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

  const fetchDepartmentFaculty = async () => {
    try {
      const res = await apiFetch(`/faculty/?department=${encodeURIComponent(department)}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        const facs = data.data || [];
        const opts = [
          { value: "", label: "-- None (Unassigned) --" },
          ...facs.map((f: any) => ({
            value: f.faculty_id,
            label: `${f.first_name} ${f.last_name} (${f.faculty_id})`,
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
    fetchDepartmentFaculty();
  }, [department, semester]);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/curriculum/add-subject", {
        method: "POST",
        body: JSON.stringify({
          department,
          semester,
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
        setSubForm({ subject_code: "", subject_name: "", credits: 3, type: "Theory", faculty_id: "" });
        fetchCurriculum();
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
              Curriculum Catalog Manager
            </h1>
            <Badge variant="primary">Admin Workspace</Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage subject offerings, course codes, credits, and faculty assignments per department & semester.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2.5 text-xs font-bold transition-colors duration-150 shadow-sm"
        >
          + Add New Subject
        </button>
      </div>

      {/* Filters & View Toggle */}
      <div className="solid-card rounded-2xl p-4 border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          <div>
            <label className="font-bold text-xs text-foreground block mb-1">Department</label>
            <CustomSelect
              value={department}
              onChange={(val) => setDepartment(val)}
              options={[
                { value: "CS", label: "Computer Science (CS)" },
                { value: "CSE", label: "Computer Science & Eng (CSE)" },
                { value: "ECE", label: "Electronics & Comm (ECE)" },
                { value: "AGRI", label: "Agriculture (AGRI)" },
              ]}
            />
          </div>
          <div>
            <label className="font-bold text-xs text-foreground block mb-1">Semester</label>
            <CustomSelect
              value={semester}
              onChange={(val) => setSemester(val)}
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

        <div className="flex items-center border border-border rounded-xl bg-card p-1 self-start sm:self-auto">
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              viewMode === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📋 Table View
          </button>
          <button
            onClick={() => setViewMode("card")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              viewMode === "card" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🎴 Card View
          </button>
        </div>
      </div>

      {/* Curriculum Items Display */}
      {loading ? (
        <div className="solid-card rounded-2xl p-8 border border-border text-center text-xs font-bold text-muted-foreground animate-pulse bg-card">
          Loading curriculum subjects for {department} Semester {semester}...
        </div>
      ) : curriculumItems.length === 0 ? (
        <div className="solid-card rounded-2xl p-8 border border-border text-center text-xs text-muted-foreground bg-card">
          No subjects configured for {department} Semester {semester}. Click "+ Add New Subject" above to create one.
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
                  <tr key={sub.subject_code} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{sub.subject_code}</td>
                    <td className="p-4 font-extrabold text-foreground">{sub.subject_name || sub.subject_code}</td>
                    <td className="p-4">
                      <Badge variant="muted">{sub.type || "Theory"}</Badge>
                    </td>
                    <td className="p-4 font-mono">{sub.credits || 3} Credits</td>
                    <td className="p-4">
                      {sub.faculty_id ? (
                        <span className="font-extrabold text-foreground">{sub.faculty_name || sub.faculty_id}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() =>
                          setEditSubject({
                            original_code: sub.subject_code,
                            subject_code: sub.subject_code,
                            subject_name: sub.subject_name || sub.subject_code,
                            credits: sub.credits || 3,
                            type: sub.type || "Theory",
                            faculty_id: sub.faculty_id || "",
                          })
                        }
                        className="px-2.5 py-1 rounded-lg border border-border text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      >
                        Edit
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
            <div key={sub.subject_code} className="solid-card rounded-2xl p-5 border border-border bg-card space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-400 block">
                    {sub.subject_code}
                  </span>
                  <Badge variant="muted">{sub.type || "Theory"}</Badge>
                </div>
                <h3 className="text-sm font-extrabold text-foreground">{sub.subject_name || sub.subject_code}</h3>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong className="text-foreground">Credits:</strong> {sub.credits || 3} Credits</p>
                  <p>
                    <strong className="text-foreground">Faculty:</strong>{" "}
                    {sub.faculty_id ? (
                      <span className="font-bold text-foreground">{sub.faculty_name || sub.faculty_id}</span>
                    ) : (
                      <span className="italic">Unassigned</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end">
                <button
                  onClick={() =>
                    setEditSubject({
                      original_code: sub.subject_code,
                      subject_code: sub.subject_code,
                      subject_name: sub.subject_name || sub.subject_code,
                      credits: sub.credits || 3,
                      type: sub.type || "Theory",
                      faculty_id: sub.faculty_id || "",
                    })
                  }
                  className="px-3 py-1 rounded-lg border border-border text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                >
                  Edit Subject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Add Subject to {department} Sem {semester}</h2>
            <form onSubmit={handleAddSubject} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-foreground block mb-1">Subject Code</label>
                <input
                  required
                  placeholder="e.g. CSDSC255"
                  value={subForm.subject_code}
                  onChange={(e) => setSubForm({ ...subForm, subject_code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 rounded-xl border border-border bg-background font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-foreground block mb-1">Subject Name</label>
                <input
                  required
                  placeholder="e.g. Cloud Computing & DevOps"
                  value={subForm.subject_name}
                  onChange={(e) => setSubForm({ ...subForm, subject_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-border bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-foreground block mb-1">Type</label>
                  <CustomSelect
                    value={subForm.type}
                    onChange={(val) => setSubForm({ ...subForm, type: val })}
                    options={[
                      { value: "Theory", label: "Theory" },
                      { value: "Practical/Lab", label: "Practical/Lab" },
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
                    value={subForm.credits}
                    onChange={(e) => setSubForm({ ...subForm, credits: parseInt(e.target.value) || 3 })}
                    className="w-full p-2.5 rounded-xl border border-border bg-background font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-foreground block mb-1">Assigned Faculty Member</label>
                <CustomSelect
                  value={subForm.faculty_id}
                  onChange={(val) => setSubForm({ ...subForm, faculty_id: val })}
                  options={facultyOptions}
                />
              </div>

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
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                >
                  Add Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {editSubject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Edit Subject ({editSubject.original_code})</h2>
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
                      { value: "Practical/Lab", label: "Practical/Lab" },
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
