"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Student } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";

interface TokenDetails {
  attendance_token: string;
  subject_code: string;
  department: string;
  semester: string;
  date: string;
  expires_at: string;
  is_used: boolean;
  is_expired: boolean;
  seconds_left: number;
}

function CRAttendanceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token") || "";

  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, "present" | "absent" | "leave">>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 5-Second Auto-Dismiss for Messages System-Wide
  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => setMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  // 1. Fetch Session Metadata and Student Roster
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        // Fetch Token Details
        const detailsRes = await apiFetch(`/attendance/token-details?token=${encodeURIComponent(token)}`);
        const detailsData = await detailsRes.json().catch(() => ({}));

        if (!detailsRes.ok) {
          throw new Error(detailsData.detail || "Invalid or expired attendance token.");
        }

        if (cancelled) return;
        setTokenDetails(detailsData);
        setSecondsLeft(detailsData.seconds_left || 0);

        // Fetch Enrolled Student Roster
        const rosterRes = await apiFetch(`/student/list-students-for-cr?token=${encodeURIComponent(token)}&limit=100`);
        const rosterData = await rosterRes.json().catch(() => ({}));

        if (rosterRes.ok && rosterData?.data) {
          const list: Student[] = rosterData.data;
          setStudents(list);

          // Default all students to present
          const initialMap: Record<string, "present" | "absent" | "leave"> = {};
          list.forEach((s) => {
            initialMap[s.registration_no] = "present";
          });
          setAttendanceMap(initialMap);
        }
      } catch (err: any) {
        if (!cancelled) {
          setMsg({ type: "error", text: err?.message || "Failed to load session details" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // 2. Live Countdown Timer (Decrements every 1 sec)
  useEffect(() => {
    if (!tokenDetails || secondsLeft <= 0 || tokenDetails.is_used) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenDetails, secondsLeft]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")} : ${s.toString().padStart(2, "0")}`;
  };

  const isTimeExpired = secondsLeft <= 0 || tokenDetails?.is_expired || tokenDetails?.is_used;

  // Toggle student status
  const setStudentStatus = (regNo: string, status: "present" | "absent" | "leave") => {
    if (isTimeExpired) return;
    const st = students.find((s) => s.registration_no === regNo);
    if (st && ((st.status || "").toLowerCase() === "frozen" || (st.status || "").toLowerCase() === "suspended")) return;
    setAttendanceMap((prev) => ({ ...prev, [regNo]: status }));
  };

  const markAll = (status: "present" | "absent") => {
    if (isTimeExpired) return;
    const nextMap: Record<string, "present" | "absent" | "leave"> = {};
    students.forEach((s) => {
      if ((s.status || "").toLowerCase() !== "frozen" && (s.status || "").toLowerCase() !== "suspended") {
        nextMap[s.registration_no] = status;
      }
    });
    setAttendanceMap(nextMap);
  };

  // Submit Attendance Session
  const handleSubmitSession = async () => {
    if (!tokenDetails || isTimeExpired) return;

    setSubmitting(true);
    setMsg(null);

    try {
      // Send complete attendance records for active non-suspended enrolled students
      const activeStudents = students.filter(
        (s) => (s.status || "").toLowerCase() !== "frozen" && (s.status || "").toLowerCase() !== "suspended"
      );
      const attendance_data = activeStudents.map((s) => ({
        registration_no: s.registration_no,
        status: attendanceMap[s.registration_no] || "present",
      }));

      const payload = {
        attendance_token: tokenDetails.attendance_token,
        subject_code: tokenDetails.subject_code,
        department: tokenDetails.department,
        semester: tokenDetails.semester,
        class_date: tokenDetails.date,
        attendance_data,
      };

      const res = await apiFetch("/attendance/submit-by-cr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setMsg({
          type: "success",
          text: "Attendance submitted successfully! It is now sent to Faculty for approval.",
        });
        setTimeout(() => {
          router.push("/student/dashboard");
        }, 3000);
      } else {
        throw new Error(data.detail || "Failed to submit attendance session.");
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Could not submit attendance session." });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.registration_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const presentCount = Object.values(attendanceMap).filter((v) => v === "present").length;
  const absentCount = students.length - presentCount;
  const presentPct = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse max-w-4xl mx-auto">
        Validating attendance token and loading class details...
      </div>
    );
  }

  if (!token || !tokenDetails) {
    return (
      <main className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
        <div className="solid-card rounded-2xl p-6 sm:p-8 border border-border space-y-6 bg-card text-center sm:text-left">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <div className="text-3xl p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">🔑</div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground">CR Attendance Marking Console</h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
                {msg ? msg.text : "Enter your active attendance session token provided by your faculty."}
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const inputEl = (e.currentTarget.elements.namedItem("inputToken") as HTMLInputElement)?.value?.trim();
              if (inputEl) {
                router.push(`/student/cr/attendance/take?token=${encodeURIComponent(inputEl)}`);
              }
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5 text-left">
                Session Token / Passcode
              </label>
              <input
                name="inputToken"
                type="text"
                placeholder="Enter or paste token e.g. 550e8400-e29b-41d4-a716-446655440000"
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all shadow-xs active:scale-[0.99]"
            >
              Launch Attendance Roster →
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header & Session Details Card */}
      <div className="solid-card rounded-2xl p-5 sm:p-6 space-y-5 bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                {tokenDetails.subject_code}
              </span>
              <Badge variant="primary" showDot={false}>CR Session</Badge>
              <Badge variant="secondary" showDot={false}>Sem {tokenDetails.semester}</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight pt-1">
              Mark Attendance
            </h1>
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 pt-0.5">
              <span>📅 Class Date:</span>
              <strong className="text-foreground">
                {new Date(tokenDetails.date).toLocaleDateString()} at{" "}
                {new Date(tokenDetails.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </strong>
            </p>
          </div>

          {/* Live Countdown Clock Widget */}
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shrink-0 transition-all ${isTimeExpired
              ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
              : secondsLeft <= 120
                ? "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 animate-pulse"
                : secondsLeft <= 300
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              }`}
          >
            <div className="text-3xl shrink-0">⏱️</div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider block text-muted-foreground">
                {isTimeExpired ? "Status" : "Window Remaining"}
              </span>
              <span className="text-xl font-mono font-black tracking-wider">
                {isTimeExpired ? "EXPIRED" : formatTime(secondsLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {msg && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-bold text-center ${msg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
              }`}
          >
            {msg.text}
          </div>
        )}

        {isTimeExpired && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>
              The 15-minute time window for this attendance request has elapsed or the token has already been submitted.
            </span>
          </div>
        )}
      </div>

      {/* Roster Container & Controls */}
      <div className="solid-card rounded-2xl p-5 sm:p-6 border border-border space-y-4 bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          {/* Search Filter Input */}
          <div className="relative flex-1 max-w-sm">
            <svg
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Filter student by name or reg no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isTimeExpired}
              className="h-10 w-full pl-10 pr-4 rounded-xl border border-border bg-background text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-muted-foreground"
            />
          </div>

          {/* Quick Action Bulk Buttons */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
            <button
              type="button"
              onClick={() => markAll("present")}
              disabled={isTimeExpired}
              className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-extrabold transition-all disabled:opacity-40 active:scale-[0.98]"
            >
              <span>✓</span>
              <span>Mark All Present</span>
            </button>
            <button
              type="button"
              onClick={() => markAll("absent")}
              disabled={isTimeExpired}
              className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-extrabold transition-all disabled:opacity-40 active:scale-[0.98]"
            >
              <span>✕</span>
              <span>Mark All Absent</span>
            </button>
          </div>
        </div>

        {/* Student Roster Scrollable List */}
        <div className="space-y-2.5 max-h-[60vh] min-h-[250px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold text-muted-foreground">
              No matching students found in this roster.
            </div>
          ) : (
            filteredStudents.map((student: any) => {
              const isSuspended = (student.status || "").toLowerCase() === "frozen" || (student.status || "").toLowerCase() === "suspended";
              const currentStatus = attendanceMap[student.registration_no] || "present";
              const rawName = student.student_name || student.name || student.full_name;
              const fullName = rawName || `${student.first_name || ""} ${student.last_name || ""}`.trim() || student.registration_no || "Student";
              const firstNameProp = student.first_name || rawName || student.registration_no;
              const lastNameProp = student.last_name || "";

              return (
                <div
                  key={student.registration_no}
                  onClick={() => {
                    if (!isSuspended && !isTimeExpired) {
                      setStudentStatus(student.registration_no, currentStatus === "present" ? "absent" : "present");
                    }
                  }}
                  className={`group p-2.5 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-2 sm:gap-3 cursor-pointer ${isSuspended
                    ? "opacity-50 bg-muted/20 border-border cursor-not-allowed"
                    : currentStatus === "present"
                      ? "bg-emerald-500/[0.03] border-emerald-500/20 hover:border-emerald-500/40"
                      : "bg-rose-500/[0.03] border-rose-500/20 hover:border-rose-500/40"
                    }`}
                >
                  {/* Left: Avatar & Name + Reg No */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <FacultyAvatar firstName={firstNameProp} lastName={lastNameProp} size="sm" />
                    <div className="min-w-0 space-y-0.5 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-extrabold text-foreground leading-snug truncate" title={fullName}>
                          {fullName}
                        </h4>
                        {isSuspended && (
                          <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 shrink-0">
                            Suspended
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] font-mono text-muted-foreground font-semibold truncate">
                        {student.registration_no}
                      </p>
                    </div>
                  </div>

                  {/* Right: Present / Absent Segmented Toggle (Compact on mobile, standard on larger screens) */}
                  {isSuspended ? (
                    <span className="px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                      ❄️ Frozen
                    </span>
                  ) : (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-0.5 sm:gap-1 bg-muted/60 p-0.5 sm:p-1 rounded-xl border border-border shrink-0"
                    >
                      <button
                        type="button"
                        disabled={isTimeExpired}
                        onClick={() => setStudentStatus(student.registration_no, "present")}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-extrabold transition-all flex items-center gap-1 ${currentStatus === "present"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <span>✓</span>
                        <span className="hidden min-[360px]:inline">Present</span>
                      </button>
                      <button
                        type="button"
                        disabled={isTimeExpired}
                        onClick={() => setStudentStatus(student.registration_no, "absent")}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-extrabold transition-all flex items-center gap-1 ${currentStatus === "absent"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <span>✕</span>
                        <span className="hidden min-[360px]:inline">Absent</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Submit Attendance Bottom Bar */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-semibold text-muted-foreground text-center sm:text-left">
            <span>Summary: </span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{presentCount} Present</strong>
            <span className="mx-1 font-normal">/</span>
            <strong className="text-rose-600 dark:text-rose-400 font-extrabold">{absentCount} Absent</strong>
          </div>

          <button
            type="button"
            onClick={handleSubmitSession}
            disabled={isTimeExpired || submitting}
            className="w-full sm:w-auto h-11 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-extrabold text-xs transition-all shadow-xs active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <span>{submitting ? "Submitting Session..." : "Submit Session"}</span>
            <span className="text-sm">→</span>
          </button>
        </div>
      </div>
    </main>
  );
}

export default function CRAttendancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-muted-foreground">Loading CR Workspace...</div>}>
      <CRAttendanceContent />
    </Suspense>
  );
}

