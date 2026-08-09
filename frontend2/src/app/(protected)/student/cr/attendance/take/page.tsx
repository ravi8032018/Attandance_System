"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Student } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";
import { formatDateTimeIST } from "@/lib/utils";

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
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
      <main className="p-4 sm:p-8 mx-auto space-y-6">
        <div className="solid-card rounded-2xl p-6 sm:p-8 border border-border space-y-6 bg-card text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🔑</div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">CR Attendance Marking Console</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
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
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-xs active:scale-[0.99]"
            >
              Launch Attendance Roster →
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-full mx-auto space-y-6">
      {/* Header & Session Info */}
      <div className="solid-card rounded-2xl p-6 border border-border space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                {tokenDetails.subject_code}
              </span>
              <Badge variant="primary">CR Session</Badge>
              <Badge variant="secondary">Sem {tokenDetails.semester}</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">
              Mark Attendance ({tokenDetails.department})
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Class Date: {new Date(tokenDetails.date).toLocaleDateString()} at{" "}
              {new Date(tokenDetails.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          {/* Live Countdown Clock Widget */}
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border shrink-0 ${isTimeExpired
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400"
              : secondsLeft <= 120
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 animate-pulse"
                : secondsLeft <= 300
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                  : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
              }`}
          >
            <div className="text-4xl pb-">⏱️</div>
            <div className="pt-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                {isTimeExpired ? "Status" : "Window Remaining"}
              </span>
              <span className="text-xl font-mono font-black">
                {isTimeExpired ? "EXPIRED" : formatTime(secondsLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {msg && (
          <div
            className={`p-4 rounded-xl border text-xs font-bold ${msg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/60 border-rose-300 text-rose-800 dark:text-rose-300"
              }`}
          >
            {msg.text}
          </div>
        )}

        {isTimeExpired && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>
              The 15-minute time window for this attendance request has elapsed or the token has already been submitted.
              Contact faculty to issue a fresh ping.
            </span>
          </div>
        )}

        {/* Quick Summary Stats Bar */}
        <div className="grid grid-cols-3 gap-3 pt-2 text-center">
          <div className="p-3 rounded-xl bg-muted/40 border border-border">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Enrolled</span>
            <span className="text-lg font-black text-foreground">{students.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
            <span className="text-[10px] font-bold uppercase block">Present</span>
            <span className="text-lg font-black">{presentCount} ({presentPct}%)</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
            <span className="text-[10px] font-bold uppercase block">Absent</span>
            <span className="text-lg font-black">{absentCount}</span>
          </div>
        </div>
      </div>

      {/* Roster & Controls */}
      <div className="solid-card rounded-2xl p-6 border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          {/* Search */}
          <input
            type="text"
            placeholder="Filter student by name or reg no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isTimeExpired}
            className="h-10 px-4 rounded-xl border border-border bg-background text-xs text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-72"
          />

          {/* Quick Action Shortcuts */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => markAll("present")}
              disabled={isTimeExpired}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all disabled:opacity-40"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => markAll("absent")}
              disabled={isTimeExpired}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-xs font-bold transition-all disabled:opacity-40"
            >
              Mark All Absent
            </button>
          </div>
        </div>

        {/* Student List Grid */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredStudents.map((student) => {
            const isSuspended = (student.status || "").toLowerCase() === "frozen" || (student.status || "").toLowerCase() === "suspended";
            const currentStatus = attendanceMap[student.registration_no] || "present";
            const fullName = `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Student";

            return (
              <div
                key={student.registration_no}
                className={`flex items-center justify-between p-3.5 rounded-xl border border-border transition-colors ${
                  isSuspended ? "opacity-50 bg-muted/30 select-none cursor-not-allowed" : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FacultyAvatar firstName={student.first_name} lastName={student.last_name} size="sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-extrabold text-foreground leading-tight">{fullName}</h3>
                      {isSuspended && (
                        <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                          [Suspended]
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground">{student.registration_no}</p>
                  </div>
                </div>

                {/* Present / Absent Toggle Buttons or Suspended Badge */}
                {isSuspended ? (
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                    <span>❄️</span> Suspended
                  </span>
                ) : (
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
                    <button
                      type="button"
                      disabled={isTimeExpired}
                      onClick={() => setStudentStatus(student.registration_no, "present")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${currentStatus === "present"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      disabled={isTimeExpired}
                      onClick={() => setStudentStatus(student.registration_no, "absent")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${currentStatus === "absent"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Absent
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit Attendance Bar */}
        <div className="pt-4 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={handleSubmitSession}
            disabled={isTimeExpired || submitting}
            className="w-full sm:w-auto h-11 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all disabled:opacity-40"
          >
            {submitting ? "Submitting Session..." : "Submit Attendance Session →"}
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
