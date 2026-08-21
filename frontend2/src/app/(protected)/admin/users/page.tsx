"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { AcademicTermSwitcher } from "@/components/ui/AcademicTermSwitcher";
import { TermMode, getSavedTermMode, getSemesterSelectOptions } from "@/lib/academicTerm";
import { normalizeRoles } from "@/lib/utils";

function checkIsHod(fac: any): boolean {
  if (!fac) return false;
  const roles = normalizeRoles(fac.role);
  if (roles.includes("hod")) return true;
  if (typeof fac.role === "string" && fac.role.toLowerCase().includes("hod")) return true;
  if (Array.isArray(fac.role) && fac.role.some((r: any) => String(r).toLowerCase() === "hod")) return true;
  if (Boolean(fac.is_hod)) return true;
  if ((fac.designation || "").toLowerCase().includes("head of department")) return true;
  return false;
}

function checkIsCr(stu: any): boolean {
  if (!stu) return false;
  const roles = normalizeRoles(stu.role);
  if (roles.includes("cr")) return true;
  if (typeof stu.role === "string" && stu.role.toLowerCase().includes("cr")) return true;
  if (Array.isArray(stu.role) && stu.role.some((r: any) => String(r).toLowerCase() === "cr")) return true;
  if (Boolean(stu.is_cr)) return true;
  return false;
}

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

function AdminUserManagerContent() {
  const searchParams = useSearchParams();
  const [selectedDept, setSelectedDept] = useState("CS");
  const [activePersona, setActivePersona] = useState<"faculty" | "student">("faculty");
  const [termMode, setTermMode] = useState<TermMode>("odd");
  const [selectedSem, setSelectedSem] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "card">("card");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserDetail, setSelectedUserDetail] = useState<{ type: "faculty" | "student"; user: any } | null>(null);

  useEffect(() => {
    setTermMode(getSavedTermMode());
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("card");
    }
  }, []);

  useEffect(() => {
    const qSearch = searchParams?.get("search");
    if (qSearch) {
      setSearchTerm(qSearch);
    }
  }, [searchParams]);

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

  // Admin Reset Password Modal State
  const [resetPassTarget, setResetPassTarget] = useState<{ type: "faculty" | "student"; id: string; name: string; email?: string } | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [resetPassLoading, setResetPassLoading] = useState(false);

  // Admin Promote Cohort Modal State
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteDept, setPromoteDept] = useState(selectedDept);
  const [promoteFromSem, setPromoteFromSem] = useState("1");
  const [promoteToSem, setPromoteToSem] = useState("2");
  const [promoteLoading, setPromoteLoading] = useState(false);
  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassTarget || !newAdminPassword) return;
    setResetPassLoading(true);
    try {
      const res = await apiFetch("/admin/reset-user-password", {
        method: "POST",
        body: JSON.stringify({
          target_type: resetPassTarget.type,
          user_id: resetPassTarget.id,
          new_password: newAdminPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || "Password reset successfully." });
        setResetPassTarget(null);
        setNewAdminPassword("");
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Server error resetting password." });
    } finally {
      setResetPassLoading(false);
    }
  };

  // Freeze User Modal State
  const [freezeModalData, setFreezeModalData] = useState<{
    target_type: "faculty" | "student" | "hod";
    user_id: string;
    name: string;
    email: string;
    is_hod: boolean;
    active_courses_count: number;
  } | null>(null);
  const [freezeReason, setFreezeReason] = useState("");
  const [freezeSubmitting, setFreezeSubmitting] = useState(false);
  const [freezeCheckingCourses, setFreezeCheckingCourses] = useState(false);

  const openFreezeModal = async (target_type: "faculty" | "student", user: any) => {
    const is_hod = checkIsHod(user);
    const uid = user.faculty_id || user.registration_no;
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || uid;

    setFreezeReason("");
    setFreezeModalData({
      target_type: is_hod ? "hod" : target_type,
      user_id: uid,
      name,
      email: user.email || "",
      is_hod,
      active_courses_count: 0,
    });

    if (target_type === "faculty" || is_hod) {
      setFreezeCheckingCourses(true);
      try {
        const res = await apiFetch(`/admin/faculty/${encodeURIComponent(uid)}/active-courses-check`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const activeCourses = data.active_courses_count || 0;
          setFreezeModalData((prev) => prev ? { ...prev, active_courses_count: activeCourses } : null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFreezeCheckingCourses(false);
      }
    }
  };

  const handleConfirmFreeze = async () => {
    if (!freezeModalData) return;
    if (!freezeReason.trim()) {
      setActionMsg({ type: "error", text: "Please enter a reason for account suspension." });
      return;
    }

    setFreezeSubmitting(true);
    try {
      const res = await apiFetch("/admin/freeze-user", {
        method: "POST",
        body: JSON.stringify({
          target_type: freezeModalData.target_type,
          user_id: freezeModalData.user_id,
          action: "FREEZE",
          reason: freezeReason.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || `Account for ${freezeModalData.name} frozen.` });
        setFreezeModalData(null);
        fetchUsers();
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Failed to process account freeze request." });
    } finally {
      setFreezeSubmitting(false);
    }
  };

  const handleUnfreezeUser = async (target_type: "faculty" | "student", user: any) => {
    const is_hod = checkIsHod(user);
    const uid = user.faculty_id || user.registration_no;
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || uid;

    try {
      const res = await apiFetch("/admin/freeze-user", {
        method: "POST",
        body: JSON.stringify({
          target_type: is_hod ? "hod" : target_type,
          user_id: uid,
          action: "UNFREEZE",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || `Account for ${name} reactivated.` });
        fetchUsers();
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Failed to reactivate account." });
    }
  };

  const isUserFrozen = (u: any) => {
    const st = (u?.status || "").toLowerCase();
    return st === "frozen" || st === "suspended";
  };

  const renderAccountStatusBadge = (user: any) => {
    if (isUserFrozen(user)) {
      return (
        <span
          title={user.status_reason ? `Reason: ${user.status_reason}` : "Account Suspended"}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-extrabold text-[11px] bg-rose-600 text-white shadow-xs shrink-0"
        >
          <span>❄️</span>
          <span>Frozen</span>
        </span>
      );
    }
    const st = (user?.status || "active").toLowerCase();
    if (st === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
          Pending
        </span>
      );
    }
    if (st === "graduated" || st === "inactive") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] bg-muted text-muted-foreground border border-border shrink-0 capitalize">
          {st}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-extrabold text-[11px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.25)] shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Active</span>
      </span>
    );
  };

  const handleToggleUserStatus = async (target_type: "faculty" | "student", user_id: string, newStatus: string) => {
    try {
      const res = await apiFetch("/admin/toggle-user-status", {
        method: "POST",
        body: JSON.stringify({
          target_type,
          user_id,
          status: newStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || `Status updated to ${newStatus}.` });
        fetchUsers();
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Server error updating status." });
    }
  };

  const handlePromoteCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoteLoading(true);
    try {
      const res = await apiFetch("/admin/students/promote-cohort", {
        method: "POST",
        body: JSON.stringify({
          department: promoteDept,
          current_semester: promoteFromSem,
          target_semester: promoteToSem,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || "Cohort promoted successfully!" });
        setShowPromoteModal(false);
        fetchUsers();
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Server error promoting cohort." });
    } finally {
      setPromoteLoading(false);
    }
  };

  // Unified Onboarding & User Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCategory, setCreateCategory] = useState<"student" | "faculty">("faculty");
  const [createMode, setCreateMode] = useState<"single" | "batch">("single");
  const [creatingUser, setCreatingUser] = useState(false);

  // Single / Batch form state
  const [singleFacEmail, setSingleFacEmail] = useState("");
  const [singleFacDept, setSingleFacDept] = useState(selectedDept);
  const [singleFacDesig, setSingleFacDesig] = useState("Assistant Professor");

  const [batchFacEmailsText, setBatchFacEmailsText] = useState("");
  const [batchFacDept, setBatchFacDept] = useState(selectedDept);
  const [batchFacDesig, setBatchFacDesig] = useState("Assistant Professor");

  const [singleStuEmail, setSingleStuEmail] = useState("");
  const [singleStuDept, setSingleStuDept] = useState(selectedDept);
  const [singleStuCourse, setSingleStuCourse] = useState("BSc");
  const [singleStuSem, setSingleStuSem] = useState("1");
  const [singleStuYear, setSingleStuYear] = useState(new Date().getFullYear().toString());

  const [batchStuEmailsText, setBatchStuEmailsText] = useState("");
  const [batchStuDept, setBatchStuDept] = useState(selectedDept);
  const [batchStuCourse, setBatchStuCourse] = useState("BSc");
  const [batchStuSem, setBatchStuSem] = useState("1");
  const [batchStuYear, setBatchStuYear] = useState(new Date().getFullYear().toString());

  // Sync selectedDept with creation forms
  useEffect(() => {
    setSingleFacDept(selectedDept);
    setBatchFacDept(selectedDept);
    setSingleStuDept(selectedDept);
    setBatchStuDept(selectedDept);
  }, [selectedDept]);

  const handleUnifiedUserCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      if (createCategory === "faculty") {
        if (createMode === "single") {
          const res = await apiFetch("/faculty/create", {
            method: "POST",
            body: JSON.stringify({
              email: singleFacEmail.trim(),
              department: singleFacDept,
              designation: singleFacDesig.trim() || "Assistant Professor",
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            setActionMsg({ type: "success", text: data.message || "Faculty account created & activation email sent!" });
            setShowCreateModal(false);
            setSingleFacEmail("");
            fetchUsers();
          } else {
            setActionMsg({ type: "error", text: parseApiError(data) });
          }
        } else {
          // Batch Faculty
          const parsedEmails = batchFacEmailsText
            .split(/[\n,;]+/)
            .map((e) => e.trim())
            .filter((e) => e.length > 0 && e.includes("@"));

          if (parsedEmails.length === 0) {
            setActionMsg({ type: "error", text: "Please enter at least one valid email address." });
            setCreatingUser(false);
            return;
          }

          const res = await apiFetch("/faculty/bulk-create", {
            method: "POST",
            body: JSON.stringify({
              department: batchFacDept,
              designation: batchFacDesig.trim() || "Assistant Professor",
              faculty_emails: parsedEmails,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            setActionMsg({
              type: "success",
              text: data.message || `Successfully created ${data.created_count || parsedEmails.length} faculty accounts!`,
            });
            setShowCreateModal(false);
            setBatchFacEmailsText("");
            fetchUsers();
          } else {
            setActionMsg({ type: "error", text: parseApiError(data) });
          }
        }
      } else {
        // Student Creation
        if (createMode === "single") {
          const res = await apiFetch("/student/create", {
            method: "POST",
            body: JSON.stringify({
              email: singleStuEmail.trim(),
              department: singleStuDept,
              course: singleStuCourse.trim().toUpperCase(),
              semester: singleStuSem,
              registration_year: singleStuYear.trim(),
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            setActionMsg({ type: "success", text: data.message || "Student account created & activation email sent!" });
            setShowCreateModal(false);
            setSingleStuEmail("");
            fetchUsers();
          } else {
            setActionMsg({ type: "error", text: parseApiError(data) });
          }
        } else {
          // Batch Student
          const parsedEmails = batchStuEmailsText
            .split(/[\n,;]+/)
            .map((e) => e.trim())
            .filter((e) => e.length > 0 && e.includes("@"));

          if (parsedEmails.length === 0) {
            setActionMsg({ type: "error", text: "Please enter at least one valid email address." });
            setCreatingUser(false);
            return;
          }

          const res = await apiFetch("/student/bulk-create", {
            method: "POST",
            body: JSON.stringify({
              department: batchStuDept,
              course: batchStuCourse.trim().toUpperCase(),
              sem: batchStuSem,
              registration_year: batchStuYear.trim(),
              student_emails: parsedEmails,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            setActionMsg({
              type: "success",
              text: data.message || `Successfully created ${data.created_count || parsedEmails.length} student accounts!`,
            });
            setShowCreateModal(false);
            setBatchStuEmailsText("");
            fetchUsers();
          } else {
            setActionMsg({ type: "error", text: parseApiError(data) });
          }
        }
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "An error occurred while creating user accounts." });
    } finally {
      setCreatingUser(false);
    }
  };


  const filteredFaculty = facultyList.filter((f) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    const name = `${f.first_name || ""} ${f.last_name || ""}`.toLowerCase();
    const email = (f.email || "").toLowerCase();
    const fid = (f.faculty_id || "").toLowerCase();
    const desig = (f.designation || "").toLowerCase();
    const role = (f.role || "").toLowerCase();
    return name.includes(q) || email.includes(q) || fid.includes(q) || desig.includes(q) || role.includes(q);
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

  const handleToggleCr = async (registration_no: string) => {
    try {
      const res = await apiFetch(`/admin/student/${encodeURIComponent(registration_no)}/toggle-cr`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message || "CR role updated." });
        fetchUsers();
      } else {
        setActionMsg({ type: "error", text: parseApiError(data) });
      }
    } catch (err) {
      setActionMsg({ type: "error", text: "Server error toggling CR role." });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              User Manager Console
            </h1>
            <span className="hidden sm:inline-flex"><Badge variant="primary">Admin Workspace</Badge></span>

          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Select department, choose persona (Faculty / Student), and perform account operations and role updates.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {activePersona === "student" && (
            <button
              onClick={() => {
                setPromoteDept(selectedDept);
                setShowPromoteModal(true);
              }}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2.5 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              <span>🎓</span>
              <span>Promote Semester Cohort</span>
            </button>
          )}

          <button
            onClick={() => {
              setCreateCategory(activePersona);
              setShowCreateModal(true);
            }}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 w-full sm:w-auto text-center"
          >
            <span>✨</span>
            <span>Onboard New {activePersona === "faculty" ? "Faculty" : "Student"}<span className="hidden sm:inline"> (Single / Batch)</span></span>
          </button>
        </div>

      </div>

      {/* Filters & Control Bar */}
      <div className="solid-card rounded-2xl p-4 sm:p-5 border border-border bg-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Department Dropdown Selector */}
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full md:w-auto">
            <label className="font-extrabold text-xs text-foreground shrink-0 flex items-center gap-1.5">
              <span>🏛️ <span className="hidden sm:inline">Academic </span>Department:</span>
            </label>
            <div className="flex-1 sm:w-64 min-w-[130px]">
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
          <div className="relative flex-1 max-w-md w-full">
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 border-t border-border/70">
          <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
            <button
              onClick={() => setActivePersona("faculty")}
              className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all text-center truncate ${activePersona === "faculty"
                ? "bg-indigo-600 text-white shadow-sm"
                : "border border-border bg-card hover:bg-muted text-muted-foreground"
                }`}
            >
              👨‍🏫 Faculty<span className="hidden sm:inline"> Members</span> ({filteredFaculty.length})
            </button>
            <button
              onClick={() => setActivePersona("student")}
              className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all text-center truncate ${activePersona === "student"
                ? "bg-indigo-600 text-white shadow-sm"
                : "border border-border bg-card hover:bg-muted text-muted-foreground"
                }`}
            >
              🎓 <span className="hidden sm:inline">Enrolled </span>Students ({filteredStudents.length})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between sm:justify-end gap-3 w-full md:w-auto">
            <AcademicTermSwitcher currentMode={termMode} onModeChange={(mode) => setTermMode(mode)} className="w-full sm:w-auto" />

            {activePersona === "student" && (
              <div className="w-full sm:w-40">
                <CustomSelect
                  value={selectedSem}
                  onChange={(val) => setSelectedSem(val)}
                  options={getSemesterSelectOptions(termMode, true)}
                />
              </div>
            )}

            <div className="hidden sm:flex items-center border border-border rounded-xl bg-card p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${viewMode === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                📋 Table
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${viewMode === "card" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
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
              <div className="w-full overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border font-bold text-muted-foreground">
                    <tr>
                      <th className="p-4">Faculty Member</th>
                      <th className="p-4">Faculty ID</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Designation</th>
                      <th className="p-4">Roles</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredFaculty.map((fac) => {
                      const isHod = checkIsHod(fac);
                      const isFrozen = isUserFrozen(fac);
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
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{fac.faculty_id}</td>
                          <td className="p-4 font-extrabold">{fac.department}</td>
                          <td className="p-4 text-muted-foreground">{fac.designation}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              {isHod && <Badge variant="teal">HOD</Badge>}
                              <Badge variant="primary">Faculty</Badge>
                            </div>
                          </td>
                          <td className="p-4">
                            {renderAccountStatusBadge(fac)}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isFrozen ? (
                                <button
                                  type="button"
                                  onClick={() => handleUnfreezeUser("faculty", fac)}
                                  className="px-2.5 py-1 rounded-lg border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all flex items-center gap-1 shrink-0"
                                  title="Reactivate user account"
                                >
                                  <span>☀️</span> Unfreeze
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openFreezeModal("faculty", fac)}
                                  className="px-2.5 py-1 rounded-lg border border-rose-500/30 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all flex items-center gap-1 shrink-0"
                                  title="Freeze/Suspend user account"
                                >
                                  <span>❄️</span> Freeze
                                </button>
                              )}
                              <button
                                onClick={() => setEditFaculty(fac)}
                                className="px-3 py-1 rounded-lg border border-border text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all shrink-0"
                              >
                                Edit
                              </button>
                            </div>
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
                const isHod = checkIsHod(fac);
                const isFrozen = isUserFrozen(fac);
                return (
                  <div
                    key={fac.faculty_id}
                    onClick={() => setSelectedUserDetail({ type: "faculty", user: fac })}
                    className="solid-card rounded-2xl p-5 border border-border bg-card hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <FacultyAvatar firstName={fac.first_name} lastName={fac.last_name} photoUrl={fac.photo_url} size="md" />
                          <div>
                            <span className="font-extrabold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors block text-sm">
                              {fac.first_name} {fac.last_name}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block">{fac.faculty_id}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {isHod && <Badge variant="teal">HOD</Badge>}
                          {renderAccountStatusBadge(fac)}
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p><strong className="text-foreground">Dept:</strong> {fac.department}</p>
                        <p><strong className="text-foreground">Designation:</strong> {fac.designation}</p>
                        <p className="truncate"><strong className="text-foreground">Email:</strong> {fac.email}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between text-xs font-bold">
                      <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Manage Profile &rarr;
                      </span>
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
              <div className="w-full overflow-x-auto custom-scrollbar">
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
                      const isCr = checkIsCr(stu);
                      const isFrozen = isUserFrozen(stu);
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
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-foreground capitalize">
                                    {stu.first_name} {stu.last_name}
                                  </span>
                                  {isCr && <Badge variant="teal" className="text-[10px]">CR</Badge>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{stu.registration_no}</td>
                          <td className="p-4 font-extrabold">{stu.department}</td>
                          <td className="p-4">Semester {stu.semester}</td>
                          <td className="p-4">
                            {renderAccountStatusBadge(stu)}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isFrozen ? (
                                <button
                                  type="button"
                                  onClick={() => handleUnfreezeUser("student", stu)}
                                  className="px-2.5 py-1 rounded-lg border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all flex items-center gap-1 shrink-0"
                                  title="Reactivate user account"
                                >
                                  <span>☀️</span> Unfreeze
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openFreezeModal("student", stu)}
                                  className="px-2.5 py-1 rounded-lg border border-rose-500/30 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all flex items-center gap-1 shrink-0"
                                  title="Freeze/Suspend user account"
                                >
                                  <span>❄️</span> Freeze
                                </button>
                              )}
                              <button
                                onClick={() => setEditStudent(stu)}
                                className="px-3 py-1 rounded-lg border border-border text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all shrink-0"
                              >
                                Edit
                              </button>
                            </div>
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
                const isCr = checkIsCr(stu);
                const isFrozen = isUserFrozen(stu);
                return (
                  <div
                    key={stu.registration_no}
                    onClick={() => setSelectedUserDetail({ type: "student", user: stu })}
                    className="solid-card rounded-2xl p-5 border border-border bg-card hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            firstName={stu.first_name}
                            lastName={stu.last_name}
                            photoUrl={stu.photo_url || stu.profile_image || stu.avatar_url}
                            size="md"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-extrabold text-foreground text-sm capitalize group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {stu.first_name} {stu.last_name}
                              </h3>
                              {isCr && <Badge variant="teal" className="text-[10px]">CR</Badge>}
                            </div>
                            <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block">{stu.registration_no}</span>
                          </div>
                        </div>
                        {renderAccountStatusBadge(stu)}
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p><strong className="text-foreground">Dept:</strong> {stu.department}</p>
                        <p><strong className="text-foreground">Semester:</strong> Semester {stu.semester}</p>
                        <p className="truncate"><strong className="text-foreground">Email:</strong> {stu.email}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between text-xs font-bold">
                      <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Manage Profile &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Freeze / Account Suspension Confirmation Modal */}
      {freezeModalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 cursor-pointer"
          onClick={() => setFreezeModalData(null)}
        >
          <div
            className="solid-card rounded-2xl p-6 border border-border bg-card max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-xl">❄️</span>
                <h3 className="text-base font-extrabold text-foreground">
                  Confirm Account Suspension (Freeze)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFreezeModalData(null)}
                className="w-7 h-7 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-extrabold flex items-center justify-center border border-border/80 shadow-xs transition-colors shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-muted/50 border border-border space-y-1">
                <p><strong className="text-foreground">Target User:</strong> {freezeModalData.name}</p>
                <p><strong className="text-foreground">ID / Reg No:</strong> <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{freezeModalData.user_id}</span></p>
                <p><strong className="text-foreground">Email:</strong> {freezeModalData.email}</p>
                <p><strong className="text-foreground">Role:</strong> <span className="uppercase font-bold text-indigo-600 dark:text-indigo-400">{freezeModalData.target_type}</span></p>
              </div>

              {freezeCheckingCourses ? (
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-bold animate-pulse flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                  Checking active course assignments...
                </div>
              ) : freezeModalData.active_courses_count > 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-medium space-y-1">
                  <div className="flex items-center gap-2 font-extrabold text-amber-900 dark:text-amber-200">
                    <span>⚠️ Warning: Active Course Assignments</span>
                  </div>
                  <p className="leading-relaxed">
                    This faculty member is currently assigned to <strong className="font-extrabold text-rose-600 dark:text-rose-400">{freezeModalData.active_courses_count} active course(s)</strong>. Freezing them will leave these courses without an active instructor. Proceed?
                  </p>
                </div>
              ) : null}

              {freezeModalData.is_hod && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-bold">
                  🛡️ System Directive: You are suspending a Head of Department (HoD) account. Only System Administrators have privileges to freeze HoD profiles.
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">
                  Reason for Suspension <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  placeholder="Type the brief reason for suspending this account (e.g. Disciplinary review, Pending investigation, Administrative request)..."
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-rose-500/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setFreezeModalData(null)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={freezeSubmitting || !freezeReason.trim()}
                onClick={handleConfirmFreeze}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>❄️</span>
                <span>{freezeSubmitting ? "Freezing Account..." : "Confirm Account Freeze"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Assign Subjects Modal */}
      {assignFacultyModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setAssignFacultyModal(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
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
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setEditFaculty(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
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
                <CustomSelect
                  value={editFaculty.designation || "Assistant Professor"}
                  onChange={(val) => setEditFaculty({ ...editFaculty, designation: val })}
                  options={[
                    { value: "Professor", label: "Professor" },
                    { value: "Associate Professor", label: "Associate Professor" },
                    { value: "Assistant Professor", label: "Assistant Professor" },
                    { value: "Senior Lecturer", label: "Senior Lecturer" },
                    { value: "Visiting Faculty", label: "Visiting Faculty" },
                    { value: "Guest Lecturer", label: "Guest Lecturer" },
                  ]}
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
              {/* Admin Actions Toolbar inside Edit Faculty Modal */}
              <div className="pt-4 border-t border-border space-y-2">
                <label className="font-extrabold block text-[10px] uppercase tracking-wider text-muted-foreground">
                  ⚡ Quick Admin Actions &amp; Role Operations
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const fac = editFaculty;
                      setEditFaculty(null);
                      openAssignSubjectModal(fac);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-100 transition-colors"
                  >
                    📚 Assign Subjects
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fac = editFaculty;
                      setEditFaculty(null);
                      setResetPassTarget({ type: "faculty", id: fac.faculty_id, email: fac.email, name: `${fac.first_name} ${fac.last_name}` });
                    }}
                    className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-100 transition-colors"
                  >
                    🔑 Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fac = editFaculty;
                      handleToggleHod(fac.faculty_id);
                      setEditFaculty(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl border font-bold transition-colors ${checkIsHod(editFaculty)
                      ? "border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100"
                      : "border-teal-200 dark:border-teal-800/80 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 hover:bg-teal-100"
                      }`}
                  >
                    {checkIsHod(editFaculty) ? "Demote from HOD" : "👑 Promote to HOD"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fac = editFaculty;
                      setEditFaculty(null);
                      handleDeleteFaculty(fac.faculty_id);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-800/80 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 transition-colors"
                  >
                    🗑️ Delete Faculty
                  </button>
                </div>
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
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowAddStudentModal(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
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
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setEditStudent(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
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

              {/* Admin Actions Toolbar inside Edit Student Modal */}
              <div className="pt-4 border-t border-border space-y-2">
                <label className="font-extrabold block text-[10px] uppercase tracking-wider text-muted-foreground">
                  ⚡ Quick Admin Actions & Role Operations
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const stu = editStudent;
                      setEditStudent(null);
                      setResetPassTarget({ type: "student", id: stu.registration_no, name: `${stu.first_name} ${stu.last_name}` });
                    }}
                    className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-100 transition-colors"
                  >
                    🔑 Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const stu = editStudent;
                      handleToggleCr(stu.registration_no);
                      setEditStudent(null);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800/80 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 font-bold hover:bg-teal-100 transition-colors"
                  >
                    {checkIsCr(editStudent) ? "Revoke CR Role" : "🎓 Promote to CR"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const stu = editStudent;
                      setEditStudent(null);
                      handleDeleteStudent(stu.registration_no);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-800/80 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 transition-colors"
                  >
                    🗑️ Delete Student
                  </button>
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

      {/* Unified User Creation & Onboarding Modal (Single & Batch) */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <span>✨ Onboard New Users</span>
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Auto-generates unique IDs & sends email links for password setup and profile completion.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-extrabold flex items-center justify-center border border-border/80 shadow-xs transition-colors shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Category Toggle: Faculty vs Student */}
            <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setCreateCategory("faculty")}
                className={`py-2 text-xs font-bold rounded-lg transition-all text-center truncate ${createCategory === "faculty"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                👨‍🏫 Faculty<span className="hidden sm:inline"> Member</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateCategory("student")}
                className={`py-2 text-xs font-bold rounded-lg transition-all text-center truncate ${createCategory === "student"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                🎓 <span className="hidden sm:inline">Enrolled </span>Student
              </button>
            </div>

            {/* Mode Toggle: Single vs Batch */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateMode("single")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all text-center truncate ${createMode === "single"
                  ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-bold"
                  : "border-border text-muted-foreground hover:bg-muted/30"
                  }`}
              >
                👤 Single<span className="hidden sm:inline"> User</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateMode("batch")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all text-center truncate ${createMode === "batch"
                  ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-bold"
                  : "border-border text-muted-foreground hover:bg-muted/30"
                  }`}
              >
                👥 Batch<span className="hidden sm:inline"> / Multiple Users</span>
              </button>
            </div>

            <form onSubmit={handleUnifiedUserCreate} className="space-y-4 text-xs">
              {/* FACULTY FORM */}
              {createCategory === "faculty" && (
                <>
                  {createMode === "single" ? (
                    <div className="space-y-3">
                      <div>
                        <label className="font-bold text-foreground block mb-1">
                          Faculty Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="email"
                          placeholder="e.g. professor.sharma@university.edu"
                          value={singleFacEmail}
                          onChange={(e) => setSingleFacEmail(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-border bg-background"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-bold text-foreground block mb-1">Department</label>
                          <CustomSelect
                            value={singleFacDept}
                            onChange={(val) => setSingleFacDept(val)}
                            options={DEPARTMENTS.map((d) => ({ value: d.code, label: d.code }))}
                          />
                        </div>
                        <div>
                          <label className="font-bold text-foreground block mb-1">Designation</label>
                          <CustomSelect
                            value={singleFacDesig}
                            onChange={(val) => setSingleFacDesig(val)}
                            options={[
                              { value: "Professor", label: "Professor" },
                              { value: "Associate Professor", label: "Associate Professor" },
                              { value: "Assistant Professor", label: "Assistant Professor" },
                              { value: "Senior Lecturer", label: "Senior Lecturer" },
                              { value: "Visiting Faculty", label: "Visiting Faculty" },
                              { value: "Guest Lecturer", label: "Guest Lecturer" },
                            ]}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-bold text-foreground block mb-1">Department</label>
                          <CustomSelect
                            value={batchFacDept}
                            onChange={(val) => setBatchFacDept(val)}
                            options={DEPARTMENTS.map((d) => ({ value: d.code, label: d.code }))}
                          />
                        </div>
                        <div>
                          <label className="font-bold text-foreground block mb-1">Designation</label>
                          <CustomSelect
                            value={batchFacDesig}
                            onChange={(val) => setBatchFacDesig(val)}
                            options={[
                              { value: "Professor", label: "Professor" },
                              { value: "Associate Professor", label: "Associate Professor" },
                              { value: "Assistant Professor", label: "Assistant Professor" },
                              { value: "Senior Lecturer", label: "Senior Lecturer" },
                              { value: "Visiting Faculty", label: "Visiting Faculty" },
                              { value: "Guest Lecturer", label: "Guest Lecturer" },
                            ]}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-foreground block">
                            Faculty Email Addresses <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[10px] text-muted-foreground">
                            {batchFacEmailsText.split(/[\n,;]+/).filter((e) => e.trim().includes("@")).length} valid email(s)
                          </span>
                        </div>
                        <textarea
                          required
                          rows={5}
                          placeholder="Enter email addresses separated by lines or commas:&#10;fac1@univ.edu&#10;fac2@univ.edu&#10;fac3@univ.edu"
                          value={batchFacEmailsText}
                          onChange={(e) => setBatchFacEmailsText(e.target.value)}
                          className="w-full p-3 rounded-xl border border-border bg-background font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* STUDENT FORM */}
              {createCategory === "student" && (
                <>
                  {createMode === "single" ? (
                    <div className="space-y-3">
                      <div>
                        <label className="font-bold text-foreground block mb-1">
                          Student Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="email"
                          placeholder="e.g. rahul.student@university.edu"
                          value={singleStuEmail}
                          onChange={(e) => setSingleStuEmail(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-border bg-background"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-bold text-foreground block mb-1">Department</label>
                          <CustomSelect
                            value={singleStuDept}
                            onChange={(val) => setSingleStuDept(val)}
                            options={DEPARTMENTS.map((d) => ({ value: d.code, label: d.code }))}
                          />
                        </div>
                        <div>
                          <label className="font-bold text-foreground block mb-1">Course Name</label>
                          <input
                            required
                            placeholder="e.g. BSc"
                            value={singleStuCourse}
                            onChange={(e) => setSingleStuCourse(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-border bg-background"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-bold text-foreground block mb-1">Semester</label>
                          <CustomSelect
                            value={singleStuSem}
                            onChange={(val) => setSingleStuSem(val)}
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
                        <div>
                          <label className="font-bold text-foreground block mb-1">Registration Year</label>
                          <input
                            required
                            placeholder="e.g. 2025"
                            value={singleStuYear}
                            onChange={(e) => setSingleStuYear(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-border bg-background"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-bold text-foreground block mb-1">Department</label>
                          <CustomSelect
                            value={batchStuDept}
                            onChange={(val) => setBatchStuDept(val)}
                            options={DEPARTMENTS.map((d) => ({ value: d.code, label: d.code }))}
                          />
                        </div>
                        <div>
                          <label className="font-bold text-foreground block mb-1">Course Name</label>
                          <input
                            required
                            placeholder="e.g. BSc"
                            value={batchStuCourse}
                            onChange={(e) => setBatchStuCourse(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-border bg-background"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-bold text-foreground block mb-1">Semester</label>
                          <CustomSelect
                            value={batchStuSem}
                            onChange={(val) => setBatchStuSem(val)}
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
                        <div>
                          <label className="font-bold text-foreground block mb-1">Registration Year</label>
                          <input
                            required
                            placeholder="e.g. 2025"
                            value={batchStuYear}
                            onChange={(e) => setBatchStuYear(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-border bg-background"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-foreground block">
                            Student Email Addresses <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[10px] text-muted-foreground">
                            {batchStuEmailsText.split(/[\n,;]+/).filter((e) => e.trim().includes("@")).length} valid email(s)
                          </span>
                        </div>
                        <textarea
                          required
                          rows={5}
                          placeholder="Enter email addresses separated by lines or commas:&#10;student1@univ.edu&#10;student2@univ.edu&#10;student3@univ.edu"
                          value={batchStuEmailsText}
                          onChange={(e) => setBatchStuEmailsText(e.target.value)}
                          className="w-full p-3 rounded-xl border border-border bg-background font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] flex items-start gap-2">
                <span className="shrink-0">💡</span>
                <span>
                  The system will auto-generate unique registration numbers (e.g. 2025CS001) and dispatch password activation links directly to each email.
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 flex items-center gap-2"
                >
                  {creatingUser ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>✨ Create<span className="hidden sm:inline"> &amp; Send Activation Emails</span></span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Direct Reset Password Modal */}
      {resetPassTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setResetPassTarget(null)}
        >
          <div
            className="solid-card rounded-2xl p-6 border border-border max-w-md w-full bg-card space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <span>🔑</span>
                <span>Reset User Password</span>
              </h2>
              <button
                type="button"
                onClick={() => setResetPassTarget(null)}
                className="w-7 h-7 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-extrabold flex items-center justify-center border border-border/80 shadow-xs transition-colors shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              Target User: <strong className="text-foreground">{resetPassTarget.name}</strong> ({resetPassTarget.id})
            </div>

            <form onSubmit={handleAdminResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-foreground block mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password (min 6 chars)"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setResetPassTarget(null)}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPassLoading || newAdminPassword.length < 6}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  {resetPassLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>🔑 Update Password Now</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Promote Semester Cohort Modal */}
      {showPromoteModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowPromoteModal(false)}
        >
          <div
            className="solid-card rounded-2xl p-6 border border-border max-w-lg w-full bg-card space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <span>🎓</span>
                <span>Promote Semester Cohort</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowPromoteModal(false)}
                className="w-7 h-7 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-extrabold flex items-center justify-center border border-border/80 shadow-xs transition-colors shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
              ⚠️ Mass promotion updates the active semester for all enrolled students in the target cohort. Moving students to "Graduated" sets their status to alumnus.
            </div>

            <form onSubmit={handlePromoteCohort} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-foreground block mb-1">Academic Department</label>
                <CustomSelect
                  value={promoteDept}
                  onChange={setPromoteDept}
                  options={DEPARTMENTS.map((d) => ({
                    value: d.code,
                    label: `${d.icon} ${d.name} (${d.code})`,
                  }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-foreground block mb-1">Current Semester</label>
                  <CustomSelect
                    value={promoteFromSem}
                    onChange={setPromoteFromSem}
                    options={["1", "2", "3", "4", "5", "6", "7", "8"].map((s) => ({
                      value: s,
                      label: `Semester ${s}`,
                    }))}
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">Target Semester</label>
                  <CustomSelect
                    value={promoteToSem}
                    onChange={setPromoteToSem}
                    options={[
                      { value: "2", label: "Semester 2" },
                      { value: "3", label: "Semester 3" },
                      { value: "4", label: "Semester 4" },
                      { value: "5", label: "Semester 5" },
                      { value: "6", label: "Semester 6" },
                      { value: "7", label: "Semester 7" },
                      { value: "8", label: "Semester 8" },
                      { value: "Graduated", label: "Graduated (Alumni)" },
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowPromoteModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={promoteLoading}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  {promoteLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Promoting Students...</span>
                    </>
                  ) : (
                    <span>🚀 Execute Cohort Promotion</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* User Details & Action Controls Modal Pop-up */}
      {selectedUserDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 cursor-pointer"
          onClick={() => setSelectedUserDetail(null)}
        >
          <div
            className="solid-card rounded-2xl p-6 border border-border max-w-lg w-full space-y-5 bg-card shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                {selectedUserDetail.type === "faculty" ? (
                  <FacultyAvatar
                    firstName={selectedUserDetail.user.first_name}
                    lastName={selectedUserDetail.user.last_name}
                    photoUrl={selectedUserDetail.user.photo_url}
                    size="xl"
                  />
                ) : (
                  <UserAvatar
                    firstName={selectedUserDetail.user.first_name}
                    lastName={selectedUserDetail.user.last_name}
                    photoUrl={selectedUserDetail.user.photo_url || selectedUserDetail.user.profile_image}
                    size="xl"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-foreground capitalize">
                      {selectedUserDetail.user.first_name} {selectedUserDetail.user.last_name}
                    </h3>
                    {selectedUserDetail.type === "faculty" && checkIsHod(selectedUserDetail.user) && <Badge variant="teal">HOD</Badge>}
                    {selectedUserDetail.type === "student" && checkIsCr(selectedUserDetail.user) && <Badge variant="teal">CR</Badge>}
                  </div>
                  <p className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedUserDetail.user.faculty_id || selectedUserDetail.user.registration_no}
                  </p>
                  <p
                    className="text-xs text-muted-foreground truncate max-w-[150px] xs:max-w-[200px] sm:max-w-xs"
                    title={selectedUserDetail.user.email}
                  >
                    {selectedUserDetail.user.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="w-7 h-7 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-extrabold flex items-center justify-center border border-border/80 shadow-xs transition-colors shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Profile Info Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-4 rounded-xl border border-border/60">
              <div>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase block">Department</span>
                <span className="font-bold text-foreground">{selectedUserDetail.user.department || selectedDept}</span>
              </div>
              {selectedUserDetail.type === "faculty" ? (
                <div>
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase block">Designation</span>
                  <span className="font-bold text-foreground">{selectedUserDetail.user.designation || "Faculty"}</span>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase block">Sem / Course</span>
                  <span className="font-bold text-foreground">Sem {selectedUserDetail.user.semester || "1"} • {selectedUserDetail.user.course || "BSC"}</span>
                </div>
              )}
              <div>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase block">Account Status</span>
                <span className="mt-0.5 inline-block">{renderAccountStatusBadge(selectedUserDetail.user)}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase block">Contact</span>
                <span className="font-bold text-foreground">{selectedUserDetail.user.phone_number || selectedUserDetail.user.contact_number || "Not provided"}</span>
              </div>
            </div>

            {/* Admin Controls & Tweaks Action Grid */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">⚡ Administrative Operations</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const u = selectedUserDetail.user;
                    setSelectedUserDetail(null);
                    if (selectedUserDetail.type === "faculty") setEditFaculty(u);
                    else setEditStudent(u);
                  }}
                  className="p-3 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>✏️ Edit Profile</span>
                </button>

                {selectedUserDetail.type === "faculty" && (
                  <button
                    onClick={() => {
                      const u = selectedUserDetail.user;
                      setSelectedUserDetail(null);
                      openAssignSubjectModal(u);
                    }}
                    className="p-3 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>📖 Assign Subjects</span>
                  </button>
                )}

                {selectedUserDetail.type === "faculty" ? (
                  <button
                    onClick={() => {
                      const u = selectedUserDetail.user;
                      setSelectedUserDetail(null);
                      handleToggleHod(u.faculty_id);
                    }}
                    className="p-3 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>👑 {checkIsHod(selectedUserDetail.user) ? "Demote HOD" : "Promote HOD"}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const u = selectedUserDetail.user;
                      setSelectedUserDetail(null);
                      handleToggleCr(u.registration_no);
                    }}
                    className="p-3 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>⭐ {checkIsCr(selectedUserDetail.user) ? "Remove CR Role" : "Promote CR"}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const u = selectedUserDetail.user;
                    setSelectedUserDetail(null);
                    setResetPassTarget({
                      type: selectedUserDetail.type,
                      id: u.faculty_id || u.registration_no,
                      name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
                      email: u.email,
                    });
                  }}
                  className="p-3 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>🔑 Reset Password</span>
                </button>

                {isUserFrozen(selectedUserDetail.user) ? (
                  <button
                    onClick={() => {
                      const u = selectedUserDetail.user;
                      const t = selectedUserDetail.type;
                      setSelectedUserDetail(null);
                      handleUnfreezeUser(t, u);
                    }}
                    className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>☀️ Reactivate Account</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const u = selectedUserDetail.user;
                      const t = selectedUserDetail.type;
                      setSelectedUserDetail(null);
                      openFreezeModal(t, u);
                    }}
                    className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>❄️ Freeze Account</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const u = selectedUserDetail.user;
                    setSelectedUserDetail(null);
                    if (selectedUserDetail.type === "faculty") handleDeleteFaculty(u.faculty_id);
                    else handleDeleteStudent(u.registration_no);
                  }}
                  className="p-3 rounded-xl border border-rose-500/30 bg-card hover:bg-rose-500/10 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>🗑️ Delete User</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

export default function AdminUserManagerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-muted-foreground animate-pulse">Loading user manager...</div>}>
      <AdminUserManagerContent />
    </Suspense>
  );
}

