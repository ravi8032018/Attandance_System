"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { StudentAvatar } from "@/components/ui/UserAvatar";
import { apiFetch } from "@/lib/api";

import { useUserMe } from "@/hooks/useUserMe";

interface SubjectReport {
  subject_code: string;
  subject_name?: string;
  total_classes: number;
  present_count: number;
  absent_count: number;
  excused_count?: number;
  attendance_percentage: number;
}

function StudentLookupContent() {
  const searchParams = useSearchParams();
  const regParam = searchParams.get("reg") || "";
  const { isHod, isAdmin } = useUserMe();
  const [regNo, setRegNo] = useState(regParam);
  const [student, setStudent] = useState<any>(null);
  const [reports, setReports] = useState<SubjectReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [crActionMsg, setCrActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [crSubmitting, setCrSubmitting] = useState(false);
  const [showCrModal, setShowCrModal] = useState(false);
  const [activeCrsList, setActiveCrsList] = useState<any[]>([]);
  const [loadingActiveCrs, setLoadingActiveCrs] = useState(false);
  const [modalActionMsg, setModalActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [breakdownViewMode, setBreakdownViewMode] = useState<"auto" | "cards" | "table">("auto");

  // 5-Second Auto-Dismiss for Messages System-Wide
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (crActionMsg) {
      const timer = setTimeout(() => setCrActionMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [crActionMsg]);

  useEffect(() => {
    if (modalActionMsg) {
      const timer = setTimeout(() => setModalActionMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [modalActionMsg]);

  const fetchActiveCrs = async (dept?: string, sem?: string) => {
    if (!dept || !sem) return;
    setLoadingActiveCrs(true);
    try {
      const res = await apiFetch(`/student/active-crs?department=${encodeURIComponent(dept)}&semester=${encodeURIComponent(sem)}`);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setActiveCrsList(data.raw_crs || []);
      }
    } catch {
      setActiveCrsList([]);
    } finally {
      setLoadingActiveCrs(false);
    }
  };

  const openCrManagementModal = async () => {
    setModalActionMsg(null);
    setShowCrModal(true);
    if (student?.department && student?.semester) {
      await fetchActiveCrs(student.department, String(student.semester));
    }
  };

  // Automatically clear CR action notification message after 5 seconds (5000ms)
  useEffect(() => {
    if (crActionMsg) {
      const timer = setTimeout(() => {
        setCrActionMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [crActionMsg]);

  const handleModalToggleCR = async (targetRegNo: string, isRevoke: boolean) => {
    setCrSubmitting(true);
    setModalActionMsg(null);
    try {
      const endpoint = isRevoke
        ? `/student/${encodeURIComponent(targetRegNo)}/revoke-cr`
        : `/student/${encodeURIComponent(targetRegNo)}/promote-to-cr`;
      const res = await apiFetch(endpoint, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const msgText = data.message || `CR status updated for ${targetRegNo}.`;
        setModalActionMsg({ type: "success", text: msgText });
        setCrActionMsg({ type: "success", text: msgText });
        if (student?.department && student?.semester) {
          await fetchActiveCrs(student.department, String(student.semester));
        }
        if (targetRegNo === student?.registration_no) {
          setShowCrModal(false);
          setStudent((prev: any) => {
            if (!prev) return prev;
            const roles: string[] = Array.isArray(prev.role) ? [...prev.role] : [];
            if (isRevoke) {
              return { ...prev, role: roles.filter((r) => r !== "cr"), is_cr: false };
            } else {
              return { ...prev, role: [...roles, "cr"], is_cr: true };
            }
          });
        }
      } else {
        throw new Error(data.detail || "Operation failed.");
      }
    } catch (err: any) {
      const errMsg = err?.message || "Operation failed.";
      setModalActionMsg({ type: "error", text: errMsg });
      setCrActionMsg({ type: "error", text: errMsg });
    } finally {
      setCrSubmitting(false);
    }
  };

  const [curriculumMap, setCurriculumMap] = useState<Record<string, string>>({});

  async function handleSearch(targetReg: string) {
    if (!targetReg) return;
    setLoading(true);
    setError("");
    setStudent(null);
    setReports([]);
    try {
      // 1. Fetch Student Details
      const res = await apiFetch(`/student/registration-no/${encodeURIComponent(targetReg)}`);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setStudent(data?.data || data);
      } else {
        throw new Error("Student record not found for registration number: " + targetReg);
      }

      // 2. Fetch Curriculum Catalog for complete subject name mapping
      try {
        const currRes = await apiFetch("/curriculum/");
        if (currRes.ok) {
          const currData = await currRes.json().catch(() => ({}));
          const items = Array.isArray(currData?.data) ? currData.data : [];
          const map: Record<string, string> = {};
          items.forEach((item: any) => {
            (item.subjects || []).forEach((s: any) => {
              if (s.subject_code && s.subject_name) {
                map[s.subject_code] = s.subject_name;
              }
            });
          });
          setCurriculumMap(map);
        }
      } catch (e) {
        // console.warn("Could not load curriculum catalog", e);
      }

      // 3. Fetch Student Attendance Report
      try {
        const reportRes = await apiFetch(
          `/attendance/report/student-subject?registration_no=${encodeURIComponent(targetReg)}`
        );
        if (reportRes.ok) {
          const reportData = await reportRes.json().catch(() => ({}));
          setReports(Array.isArray(reportData?.reports) ? reportData.reports : []);
        }
      } catch (e) {
        // console.warn("Could not load attendance reports for student", e);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to locate student.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (regParam) {
      handleSearch(regParam);
    }
  }, [regParam]);

  // Aggregate attendance numbers across all subjects
  const totalClasses = reports.reduce((sum, r) => sum + (r.total_classes || 0), 0);
  const totalPresent = reports.reduce((sum, r) => sum + (r.present_count || 0) + (r.excused_count || 0), 0);
  const totalAbsent = reports.reduce((sum, r) => sum + (r.absent_count || 0), 0);
  const overallPercentage =
    totalClasses > 0 ? ((totalPresent / totalClasses) * 100).toFixed(1) : null;

  return (
    <main className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-24 sm:pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
          Student Profile & Attendance Record
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Detailed academic credentials, contact info, and subject attendance metrics directly from database.
        </p>
      </div>

      {/* Search Input */}
      <div className="solid-card rounded-2xl p-3.5 sm:p-4 border border-border flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 bg-card shadow-xs">
        <input
          type="text"
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch(regNo);
          }}
          placeholder="Enter Registration No (e.g. CSBSC2024001)"
          className="h-10 sm:h-12 flex-1 w-full rounded-xl border border-border bg-background px-3.5 sm:px-4 py-2 text-xs sm:text-sm text-foreground outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150 font-mono"
        />
        <button
          type="button"
          onClick={() => handleSearch(regNo)}
          disabled={loading || !regNo}
          className="h-8 sm:h-10 w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 sm:px-6 text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 shrink-0"
        >
          {loading ? "Searching..." : "Lookup Student"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-4 text-xs font-bold text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {student && (
        <div className="space-y-4 sm:space-y-6">
          {/* Main Profile Card */}
          <div className="solid-card rounded-2xl p-4 sm:p-6 border border-border space-y-4 sm:space-y-5 bg-card shadow-xs">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 pb-4 sm:pb-5 border-b border-border text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
                <StudentAvatar
                  firstName={student.first_name}
                  lastName={student.last_name}
                  photoUrl={student.photo_url}
                  size="2xl"
                />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
                      {student.first_name ? `${student.first_name} ${student.last_name || ""}` : "Student Record"}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-lg">
                      {student.registration_no}
                    </span>
                    {student.department && <Badge variant="primary">{student.department}</Badge>}
                    {student.course && <Badge variant="secondary">{student.course}</Badge>}
                    {student.semester && <Badge variant="secondary">Sem {student.semester}</Badge>}
                    {(Boolean(student.is_cr) || (Array.isArray(student.role) ? student.role.includes("cr") : String(student.role || "").includes("cr"))) && (
                      <Badge variant="warning">CR</Badge>
                    )}
                    <Badge variant={student.status === "active" ? "success" : "warning"}>
                      {(student.status || "active").toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Grid based on backend fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-0.5 overflow-hidden">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Email Address</span>
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate block" title={student.email || "—"}>
                  {student.email || "—"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-0.5 overflow-hidden">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Contact Number</span>
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate block">
                  {student.contact_number || "—"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-0.5 overflow-hidden">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Gender</span>
                <span className="text-xs sm:text-sm font-semibold capitalize text-foreground truncate block">
                  {student.gender || "—"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-0.5 overflow-hidden">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Date of Birth</span>
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate block">
                  {student.dob || "—"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-0.5 overflow-hidden">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Guardian Email</span>
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate block" title={student.guardian_email || "—"}>
                  {student.guardian_email || "—"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-0.5 overflow-hidden">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Batch Name</span>
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate block">
                  {student.batch_name || "—"}
                </span>
              </div>
            </div>

            {/* CR Management Actions (for Admin & HOD ONLY - hidden from regular faculty) */}
            {(isAdmin || isHod) && (
              <div className="pt-3.5 border-t border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Class Representative (CR) Status Management</h4>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    Designate or revoke CR privileges for this student (Max 2 CRs per semester/department rule applies).
                  </p>
                </div>
                {(() => {
                  const isCurrentCr = Boolean(student.is_cr) || (Array.isArray(student.role) ? student.role.includes("cr") : String(student.role || "").includes("cr"));
                  return (
                    <button
                      type="button"
                      disabled={crSubmitting}
                      onClick={openCrManagementModal}
                      className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5 ${isCurrentCr
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        }`}
                    >
                      {crSubmitting
                        ? "Processing..."
                        : isCurrentCr
                          ? "Revoke CR Role"
                          : "Appoint Class Representative (CR)"}
                    </button>
                  );
                })()}
              </div>
            )}
            {crActionMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold border ${crActionMsg.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  }`}
              >
                {crActionMsg.text}
              </div>
            )}
          </div>

          {/* Attendance Stats section from real backend aggregates */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-extrabold text-foreground flex items-center gap-2">
              <span>📊 Attendance Overview</span>
            </h3>
            {totalClasses > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <StatCard
                    title="Classes Attended"
                    value={`${totalPresent} / ${totalClasses}`}
                    description="Total Conducted Sessions"
                    icon="📚"
                    variant="indigo"
                  />
                  <StatCard
                    title="Average Attendance"
                    value={`${overallPercentage}%`}
                    trend={{
                      value: Number(overallPercentage) >= 75 ? "Eligible (≥75%)" : "Shortfall (<75%)",
                      positive: Number(overallPercentage) >= 75,
                    }}
                    icon="📊"
                    variant={Number(overallPercentage) >= 75 ? "emerald" : "amber"}
                  />
                  <StatCard
                    title="Absences"
                    value={`${totalAbsent} Sessions`}
                    trend={{
                      value: Number(overallPercentage) >= 75 ? "Satisfactory" : "Low Attendance",
                      positive: Number(overallPercentage) >= 75,
                    }}
                    icon="✕"
                    variant="rose"
                  />
                </div>

                {/* Subject wise breakdown table & cards with View Switcher */}
                <div className="solid-card rounded-2xl p-4 sm:p-6 border border-border space-y-4 bg-card shadow-xs">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pb-1">
                    <h4 className="text-sm font-extrabold text-foreground tracking-wider">
                      Subject Attendance Breakdown
                    </h4>

                    {/* View Mode Switcher */}
                    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/80">
                      <button
                        type="button"
                        onClick={() => setBreakdownViewMode("cards")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${breakdownViewMode === "cards"
                          ? "bg-background text-foreground shadow-xs border border-border/50"
                          : breakdownViewMode === "table"
                            ? "text-muted-foreground hover:text-foreground"
                            : "bg-background text-foreground shadow-xs border border-border/50 sm:bg-transparent sm:text-muted-foreground sm:shadow-none sm:border-transparent"
                          }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>Cards View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBreakdownViewMode("table")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${breakdownViewMode === "table"
                          ? "bg-background text-foreground shadow-xs border border-border/50"
                          : breakdownViewMode === "cards"
                            ? "text-muted-foreground hover:text-foreground"
                            : "text-muted-foreground hover:text-foreground sm:bg-background sm:text-foreground sm:shadow-xs sm:border sm:border-border/50"
                          }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        <span>Table View</span>
                      </button>
                    </div>
                  </div>

                  {/* Cards View (Default on Mobile < 640px via CSS, or when explicitly chosen) */}
                  <div
                    className={
                      breakdownViewMode === "cards"
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                        : breakdownViewMode === "table"
                          ? "hidden"
                          : "grid grid-cols-1 gap-3 sm:hidden"
                    }
                  >
                    {reports.map((report) => {
                      const subjName =
                        report.subject_name ||
                        curriculumMap[report.subject_code] ||
                        student?.subjects?.[report.subject_code] ||
                        "Subject " + report.subject_code;
                      const isEligible = report.attendance_percentage >= 75;
                      return (
                        <div key={report.subject_code} className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-2 hover:border-indigo-500/30 transition-all">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                              {report.subject_code}
                            </span>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${isEligible ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"}`}>
                              {report.attendance_percentage}%
                            </span>
                          </div>

                          <div className="text-[13px] font-bold text-foreground line-clamp-2" title={subjName}>
                            {subjName}
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-center text-[11px]">
                            <div>
                              <span className="text-[10px] text-muted-foreground block font-bold">Total</span>
                              <span className="font-extrabold text-foreground">{report.total_classes}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground block font-bold">Present</span>
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{report.present_count}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground block font-bold">Absent</span>
                              <span className="font-extrabold text-rose-600 dark:text-rose-400">{report.absent_count}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Table View (Default on Desktop >= 640px via CSS, or when explicitly chosen) */}
                  <div
                    className={
                      breakdownViewMode === "table"
                        ? "block overflow-x-auto"
                        : breakdownViewMode === "cards"
                          ? "hidden"
                          : "hidden sm:block overflow-x-auto"
                    }
                  >
                    <table className="w-full text-center text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-center">
                          <th className="pb-3 px-2 text-center">Subject Code</th>
                          <th className="pb-3 px-2 text-center">Subject Name</th>
                          <th className="pb-3 px-2 text-center">Total Classes</th>
                          <th className="pb-3 px-2 text-center">Present</th>
                          <th className="pb-3 px-2 text-center">Absent</th>
                          <th className="pb-3 px-2 text-center">Percentage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {reports.map((report) => {
                          const subjName =
                            report.subject_name ||
                            curriculumMap[report.subject_code] ||
                            student?.subjects?.[report.subject_code] ||
                            "Subject " + report.subject_code;
                          return (
                            <tr key={report.subject_code} className="hover:bg-muted/30 transition-colors">
                              <td className="py-3 px-2 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                {report.subject_code}
                              </td>
                              <td className="py-3 px-2 font-medium text-foreground min-w-[200px]" title={subjName}>
                                {subjName}
                              </td>
                              <td className="py-3 px-2 text-center font-medium">{report.total_classes}</td>
                              <td className="py-3 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                {report.present_count}
                              </td>
                              <td className="py-3 px-2 text-center font-bold text-rose-600 dark:text-rose-400">
                                {report.absent_count}
                              </td>
                              <td className="py-3 px-2 text-center font-extrabold">
                                <span className={report.attendance_percentage >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                                  {report.attendance_percentage}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="solid-card rounded-2xl p-6 border border-border text-center text-xs font-semibold text-muted-foreground">
                No attendance sessions recorded yet for this student.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onscreen CR Management Interactive Window Modal */}
      {showCrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="solid-card rounded-3xl p-6 sm:p-8 border border-border max-w-2xl w-full bg-card shadow-2xl space-y-6 my-8 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                  <span>🎓 Class Representative (CR) Management</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cohort: <strong className="text-foreground">Dept {student?.department}</strong> • <strong className="text-foreground">Semester {student?.semester}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCrModal(false)}
                className="h-8 w-8 rounded-full bg-muted hover:bg-border text-muted-foreground hover:text-foreground flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Target Student Identity Card */}
            {student && (
              <div className="p-4 rounded-2xl border border-border bg-muted/30 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Target Student</span>
                  <h4 className="text-base font-extrabold text-foreground">
                    {student.first_name} {student.last_name}
                  </h4>
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {student.registration_no}
                  </span>
                </div>
                <div>
                  {Boolean(student.is_cr) || (Array.isArray(student.role) ? student.role.includes("cr") : String(student.role || "").includes("cr")) ? (
                    <Badge variant="warning">Current CR</Badge>
                  ) : (
                    <Badge variant="secondary">Regular Student</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Active Cohort CRs Capacity Overview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                  Active Cohort CRs ({activeCrsList.length} / 2 Max Limit)
                </h4>
                <Badge variant={activeCrsList.length >= 2 ? "error" : "success"}>
                  {activeCrsList.length >= 2 ? "Capacity Full (2/2)" : `${2 - activeCrsList.length} Slot Available`}
                </Badge>
              </div>

              {loadingActiveCrs ? (
                <p className="text-xs text-muted-foreground animate-pulse p-4 text-center">Loading active cohort CRs...</p>
              ) : activeCrsList.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 rounded-xl border border-dashed border-border text-center">
                  No active Class Representatives appointed yet in Department {student?.department}, Sem {student?.semester}.
                </p>
              ) : (
                <div className="space-y-2">
                  {activeCrsList.map((crItem) => (
                    <div
                      key={crItem.registration_no}
                      className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between gap-3"
                    >
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-foreground">{crItem.name}</span>
                          <Badge variant="teal" className="text-[9px] py-0 px-1">CR</Badge>
                        </div>
                        <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 block">
                          {crItem.registration_no} ({crItem.email})
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={crSubmitting}
                        onClick={() => handleModalToggleCR(crItem.registration_no, true)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shrink-0 active:scale-95 disabled:opacity-50"
                      >
                        {crSubmitting ? "..." : "Revoke CR"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System CR Rules Box */}
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-1.5 text-amber-800 dark:text-amber-300">
              <h5 className="font-extrabold flex items-center gap-1.5">
                <span>📌 System CR Capacity Rules</span>
              </h5>
              <p className="text-[11px] opacity-90 leading-relaxed">
                1. Exactly <strong>2 Class Representatives (CRs)</strong> maximum allowed per semester & department.
                <br />
                2. If 2 CRs are active, click <strong>Revoke CR</strong> on one of the active CRs above before appointing a new student.
                <br />
                3. Access granted to <strong>Admin and HOD</strong> users.
              </p>
            </div>

            {modalActionMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold border ${modalActionMsg.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  }`}
              >
                {modalActionMsg.text}
              </div>
            )}

            {/* Footer Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowCrModal(false)}
                className="px-4 py-2 rounded-xl bg-card hover:bg-muted text-foreground border border-border text-xs font-bold transition-colors"
              >
                Close
              </button>

              {(() => {
                const isCurrentCr = Boolean(student?.is_cr) || (Array.isArray(student?.role) ? student.role.includes("cr") : String(student?.role || "").includes("cr"));
                return (
                  <button
                    type="button"
                    disabled={crSubmitting}
                    onClick={() => handleModalToggleCR(student.registration_no, isCurrentCr)}
                    className={`px-5 py-2 rounded-xl text-xs font-extrabold text-white transition-all shadow-md active:scale-95 ${isCurrentCr
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                  >
                    {crSubmitting
                      ? "Processing..."
                      : isCurrentCr
                        ? `Confirm Revoke CR for ${student?.registration_no}`
                        : `Confirm Appoint CR for ${student?.registration_no}`}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function GetStudentByIdPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading lookup console...</div>}>
      <StudentLookupContent />
    </Suspense>
  );
}
