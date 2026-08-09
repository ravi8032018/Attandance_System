"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";
import { formatDateTimeIST } from "@/lib/utils";

interface PendingSessionItem {
  session_id: string;
  subject_code: string;
  subject_name?: string;
  department: string;
  semester: string;
  date: string;
  status: string;
  submission_details?: string;
}

interface StudentAttendanceRecord {
  registration_no: string;
  student_name?: string;
  status: "present" | "absent" | "leave";
}

interface SessionFullDetails {
  session_id: string;
  subject_code: string;
  subject_name?: string;
  department: string;
  sem: string;
  date: string;
  status: string;
  submitted_by?: string;
  attendance_records: StudentAttendanceRecord[];
  aggregates: {
    present_count: number;
    absent_count: number;
    leave_count: number;
    class_size: number;
  };
}

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

export default function ApproveAttendancePage() {
  const [sessions, setSessions] = useState<PendingSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Inspection Drawer state
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionFullDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Rejection modal
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPendingSessions = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/attendance/approvals?status=pending&period=all");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.items || []);
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: "Failed to fetch pending approval sessions." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSessions();
  }, []);

  // Inspect Session Details
  const inspectSession = async (sessionId: string) => {
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setSessionDetails(null);
      return;
    }

    setActiveSessionId(sessionId);
    setDetailsLoading(true);
    try {
      const res = await apiFetch(`/attendance/approvals/${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const data = await res.json();
        setSessionDetails(data);
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: "Could not load session details." });
    } finally {
      setDetailsLoading(false);
    }
  };

  // Toggle individual student status before approval
  const updateStudentStatus = async (sessionId: string, regNo: string, newStatus: "present" | "absent" | "leave") => {
    try {
      const res = await apiFetch(`/attendance/approvals/${encodeURIComponent(sessionId)}/students/${encodeURIComponent(regNo)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setSessionDetails((prev) => {
          if (!prev) return null;
          const updatedRecords = prev.attendance_records.map((r) =>
            r.registration_no === regNo ? { ...r, status: newStatus } : r
          );
          const presentCount = updatedRecords.filter((r) => r.status === "present").length;
          const absentCount = updatedRecords.filter((r) => r.status === "absent").length;
          return {
            ...prev,
            attendance_records: updatedRecords,
            aggregates: {
              ...prev.aggregates,
              present_count: presentCount,
              absent_count: absentCount,
            },
          };
        });
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: "Failed to update student status." });
    }
  };

  // Approve Session
  const handleApprove = async (sessionId: string) => {
    setActionLoading(true);
    setActionMsg(null);
    try {
      const res = await apiFetch(`/attendance/approvals/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
          setSessionDetails(null);
        }
        setActionMsg({ type: "success", text: `Attendance session approved successfully!` });
      } else {
        throw new Error(data.detail || "Failed to approve session");
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err?.message || "Could not approve session." });
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Session
  const handleRejectSubmit = async () => {
    if (!rejectModalId) return;

    if (!rejectReason.trim()) {
      setActionMsg({ type: "error", text: "A valid rejection reason is mandatory." });
      return;
    }

    setActionLoading(true);
    setActionMsg(null);
    try {
      const res = await apiFetch(`/attendance/approvals/${encodeURIComponent(rejectModalId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", reason: rejectReason.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.session_id !== rejectModalId));
        if (activeSessionId === rejectModalId) {
          setActiveSessionId(null);
          setSessionDetails(null);
        }
        setActionMsg({ type: "success", text: `Attendance session rejected with reason.` });
        setRejectModalId(null);
        setRejectReason("");
      } else {
        throw new Error(data.detail || "Failed to reject session");
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err?.message || "Could not reject session." });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            Approve Attendance Sessions
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Review, inspect, and approve attendance sessions submitted by Class Representatives (CRs).
          </p>
        </div>

        {/* Updated Refresh Button */}
        <button
          type="button"
          onClick={fetchPendingSessions}
          className="group flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl bg-card hover:bg-muted text-foreground border border-border text-xs font-bold transition-all shadow-xs"
        >
          <RefreshIcon className="text-indigo-600 dark:text-indigo-400 group-hover:rotate-180 transition-transform duration-500" />
          <span>Refresh</span>
        </button>
      </div>

      {actionMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold ${actionMsg.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
            : "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300"
            }`}
        >
          {actionMsg.text}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Loading pending approval sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div className="solid-card rounded-2xl p-12 text-center space-y-2 border border-border">
          <div className="text-4xl">✅</div>
          <h2 className="text-base font-bold text-foreground">All Clear!</h2>
          <p className="text-xs text-muted-foreground">No pending attendance sessions currently require approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((sess) => {
            const isExpanded = activeSessionId === sess.session_id;
            const subjectDisplayName = sess.subject_name || sess.subject_code;

            return (
              <div
                key={sess.session_id}
                className="solid-card rounded-2xl border border-border overflow-hidden transition-all shadow-xs"
              >
                {/* Main Session Card Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card">
                  <div className="space-y-1">
                    {/* Subject Name & Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                        {subjectDisplayName}
                      </h2>
                      <Badge variant="primary" className="text-xs font-mono">{sess.subject_code}</Badge>
                      <Badge variant="secondary" className="text-xs">Sem {sess.semester}</Badge>
                      <Badge variant="success" className="text-xs">Pending Approval</Badge>
                    </div>

                    {/* Metadata line kept at standard text-xs */}
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 pt-0.5">
                      <span>Department: <strong className="text-foreground">{sess.department}</strong></span>
                      <span>•</span>
                      <span>
                        Submitted By:{" "}
                        <strong className="text-foreground">
                          {sess.submission_details && sess.submission_details !== "marked_by_cr"
                            ? sess.submission_details
                            : "Class Representative"}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Class Date:{" "}
                        <strong className="text-foreground">
                          {formatDateTimeIST(sess.date)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => inspectSession(sess.session_id)}
                      className="px-3 py-2 rounded-xl bg-card hover:bg-muted text-foreground border border-border text-[11px] font-bold transition-all"
                    >
                      {isExpanded ? "Details ▲" : "Details ▼"}
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleApprove(sess.session_id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all active:scale-95 disabled:opacity-40"
                    >
                      Approve
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setRejectModalId(sess.session_id)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm transition-all active:scale-95 disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {/* Expanded Inspection Drawer */}
                {isExpanded && (
                  <div className="p-5 border-t border-border bg-muted/20 space-y-4 animate-in fade-in duration-200">
                    {detailsLoading || !sessionDetails ? (
                      <p className="text-xs font-bold text-muted-foreground animate-pulse">Loading student roster details...</p>
                    ) : (
                      <>
                        {(() => {
                          const pCount = sessionDetails.attendance_records?.filter((r) => r.status === "present").length || 0;
                          const aCount = sessionDetails.attendance_records?.filter((r) => r.status === "absent").length || 0;
                          return (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                                CLASS ATTENDANCE ROSTER ({pCount} PRESENT / {aCount} ABSENT)
                              </h4>
                              <span className="text-[11px] text-muted-foreground">
                                Click any student status to modify before final approval.
                              </span>
                            </div>
                          );
                        })()}

                        {/* Student Cards: Main Focus on Student Name, Reg No below */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {sessionDetails.attendance_records.map((rec) => {
                            const displayName = rec.student_name || rec.registration_no;

                            return (
                              <div
                                key={rec.registration_no}
                                className="p-3 rounded-xl border border-border bg-card flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 shadow-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <FacultyAvatar firstName={displayName} size="sm" />
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-extrabold text-foreground leading-tight truncate">
                                      {displayName}
                                    </h4>
                                    <p className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate">
                                      {rec.registration_no}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 w-full xs:w-auto justify-end pt-2 xs:pt-0 border-t xs:border-none border-border/40">
                                  <button
                                    type="button"
                                    onClick={() => updateStudentStatus(sess.session_id, rec.registration_no, "present")}
                                    className={`flex-1 xs:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${rec.status === "present"
                                      ? "bg-emerald-600 text-white shadow-xs"
                                      : "bg-muted text-muted-foreground hover:text-foreground"
                                      }`}
                                  >
                                    Present
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateStudentStatus(sess.session_id, rec.registration_no, "absent")}
                                    className={`flex-1 xs:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${rec.status === "absent"
                                      ? "bg-rose-600 text-white shadow-xs"
                                      : "bg-muted text-muted-foreground hover:text-foreground"
                                      }`}
                                  >
                                    Absent
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="solid-card rounded-2xl p-6 border border-border max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-extrabold text-foreground">Reject Attendance Session</h3>
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              ⚠️ A rejection reason is mandatory before rejecting this attendance session.
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide mandatory rejection reason (e.g. Roster discrepancy, wrong period)..."
              className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-rose-500/20"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectModalId(null);
                  setRejectReason("");
                }}
                className="px-4 py-2 rounded-xl bg-card hover:bg-muted border border-border text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold disabled:opacity-40"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
