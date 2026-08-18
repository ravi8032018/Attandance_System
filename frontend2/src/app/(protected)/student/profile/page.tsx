"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useUserMe } from "@/hooks/useUserMe";
import { apiFetch } from "@/lib/api";

import { useSearchParams } from "next/navigation";

import { getMissingProfileFields } from "@/lib/utils";

interface StudentSummaryData {
  student_info: {
    registration_no: string;
    student_name: string;
    email: string;
    department: string;
    semester: string;
    course?: string;
    photo_url?: string;
  };
  overall_attended: number;
  overall_total_classes: number;
  overall_attendance_pct: number;
  is_eligible: boolean;
  subject_breakdown: Array<{
    subject_code: string;
    subject_name: string;
    attended_classes: number;
    total_classes: number;
    attendance_pct: number;
    is_eligible: boolean;
  }>;
}

function getPaletteForAttendance(pct: number) {
  if (pct >= 75) {
    return {
      gradient: "from-emerald-600 via-teal-500 to-green-400",
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      textColor: "text-emerald-600 dark:text-emerald-400",
      barBg: "bg-emerald-500",
    };
  }
  if (pct >= 60) {
    return {
      gradient: "from-indigo-600 via-violet-500 to-blue-400",
      badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      textColor: "text-indigo-600 dark:text-indigo-400",
      barBg: "bg-indigo-500",
    };
  }
  if (pct >= 40) {
    return {
      gradient: "from-amber-600 via-orange-500 to-yellow-400",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      textColor: "text-amber-600 dark:text-amber-400",
      barBg: "bg-amber-500",
    };
  }
  return {
    gradient: "from-rose-600 via-pink-500 to-red-400",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    textColor: "text-rose-600 dark:text-rose-400",
    barBg: "bg-rose-500",
  };
}

function getClassesNeededFor75(attended: number, total: number) {
  if (total === 0) return 0;
  const currentPct = (attended / total) * 100;
  if (currentPct >= 75.0) return 0;
  const needed = Math.ceil((0.75 * total - attended) / 0.25);
  return Math.max(0, needed);
}

function getSafeClassesToMiss(attended: number, total: number) {
  if (total === 0) return 0;
  const currentPct = (attended / total) * 100;
  if (currentPct < 75.0) return 0;
  const allowed = Math.floor((attended - 0.75 * total) / 0.75);
  return Math.max(0, allowed);
}

function StudentProfileContent() {

  const { user, isCr } = useUserMe();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StudentSummaryData | null>(null);

  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form Fields State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");
  const [contactNumber, setContactNumber] = useState("");
  const [rollNumber, setRollNumber] = useState("");

  const missingFields = getMissingProfileFields(user);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setDob(user.dob ? String(user.dob).slice(0, 10) : "");
      setGender(user.gender || "male");
      setContactNumber(user.contact_number || user.phone || "");
      setRollNumber(user.roll_number || "");
    }
  }, [user]);

  // Only auto-open edit modal if explicitly navigated with ?edit=true
  useEffect(() => {
    if (searchParams?.get("edit") === "true") {
      setShowEditModal(true);
    }
  }, [searchParams]);


  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const res = await apiFetch("/reports/student-summary");
        if (res.ok) {
          const data = await res.json();
          setSummary(data);
        }
      } catch (e) {
        // Silent catch
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setMsg(null);
    try {
      const res = await apiFetch("/student/me", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          dob: dob,
          gender: gender,
          contact_number: contactNumber.trim(),
          roll_number: rollNumber.trim() || undefined,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ type: "success", text: "Profile updated successfully!" });
        setShowEditModal(false);
        window.location.href = "/student/profile";
      } else {
        setMsg({ type: "error", text: resData.detail || "Failed to update profile." });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: "Error saving profile details." });
    } finally {
      setSavingProfile(false);
    }
  };

  const name =
    user?.name ||
    summary?.student_info?.student_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    "Student User";
  const regNo = summary?.student_info?.registration_no || user?.registration_no || "N/A";
  const email = summary?.student_info?.email || user?.email || "N/A";
  const dept = summary?.student_info?.department || user?.department || "CS";
  const sem = summary?.student_info?.semester || user?.sem || user?.semester || "4";
  const course = summary?.student_info?.course || user?.course || "B.Sc Computer Science";
  const photoUrl = user?.photo_url || user?.avatar_url || user?.image_url || summary?.student_info?.photo_url;
  const contactNo = user?.contact_number || user?.phone || "Not Provided";
  const genderVal = user?.gender || "Not Specified";
  const regYear = user?.registration_year || "2024";

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {msg && (
        <div className={`p-4 rounded-xl border text-xs font-bold ${msg.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
          {msg.text}
        </div>
      )}

      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        {/* header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Student Profile & Credentials
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Official academic registration credentials, attendance performance, and course enrollment.
          </p>
        </div>

        {/* 50/50 Half Screen Split Action Buttons on Mobile, Flex on Desktop */}
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
          <button
            onClick={() => setShowEditModal(true)}
            className="w-full sm:w-auto justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 text-white px-4 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <span>✏️</span>
            <span>Edit Profile</span>
          </button>

          <Link
            href="/student/dashboard"
            className="w-full sm:w-auto justify-center rounded-xl border border-border bg-card hover:bg-muted text-foreground px-4 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <span>← Dashboard</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs font-bold text-muted-foreground animate-pulse flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span>Loading academic credentials & profile data...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Hero / Profile Card */}
          <div className="solid-card rounded-2xl p-5 sm:p-7 border border-border space-y-3 bg-card shadow-xs">
            <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4 pb-3 sm:pb-5 border-b border-border text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-4.5 w-full sm:w-auto">
                <UserAvatar
                  name={name}
                  firstName={user?.first_name}
                  lastName={user?.last_name}
                  photoUrl={photoUrl}
                  size="3xl"
                  className="ring-1 sm:ring-2 ring-indigo-500/20 shadow-md shrink-0"
                />

                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">{name}</h2>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                    <Badge variant="muted" showDot={false} className="text-xs font-extrabold">{regNo}</Badge>
                    <Badge variant="muted" showDot={false} className="text-xs font-extrabold">{dept}</Badge>
                    <Badge variant="muted" showDot={false} className="text-xs font-extrabold">Sem {sem}</Badge>
                    {isCr ? <Badge variant="teal" showDot={false} className="text-xs font-extrabold">CR</Badge> : null}
                    {summary && (
                      <Badge variant={summary.overall_total_classes === 0 || summary.is_eligible ? "success" : "error"} showDot={false} className="inline-flex sm:hidden text-xs font-extrabold">
                        {summary.overall_total_classes === 0 ? "✓ Good Standing" : summary.is_eligible ? "✓ Eligible (≥75%)" : "⚠️ Warning (<75%)"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Standing Stat Cards */}
            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <StatCard
                  title="Overall Attendance"
                  value={`${summary.overall_attendance_pct}%`}
                  subtitle={`${summary.overall_attended} / ${summary.overall_total_classes} Classes Attended`}
                  variant={summary.overall_total_classes === 0 || summary.overall_attendance_pct >= 75 ? "emerald" : "rose"}
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <StatCard
                  title="Exam Eligibility"
                  value={summary.overall_total_classes === 0 ? "Good Standing" : summary.is_eligible ? "Eligible" : "Flagged"}
                  subtitle={summary.overall_total_classes === 0 ? "No sessions held yet" : summary.is_eligible ? "Satisfies 75% Rule" : "Below 75% Cutoff"}
                  variant={summary.overall_total_classes === 0 || summary.is_eligible ? "indigo" : "rose"}
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                />
                <StatCard
                  title="Enrolled Courses"
                  value={summary.subject_breakdown.length.toString()}
                  subtitle="Active Curriculum Subjects"
                  variant="purple"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  }
                />
              </div>
            )}

            {/* Official Credentials Key-Value Card Grid */}
            <div className="space-y-3 pt-2">
              {missingFields.length > 0 && (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-amber-600 dark:text-amber-300 uppercase tracking-wider flex items-center gap-2">
                      <span>⚠️ Profile Incomplete ({missingFields.length} {missingFields.length === 1 ? "field" : "fields"} remaining)</span>
                    </h4>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="text-xs font-extrabold bg-amber-500 text-slate-950 px-3 py-1.5 rounded-lg hover:bg-amber-400 transition-colors shadow-xs"
                    >
                      Complete Profile
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {missingFields.map((field) => (
                      <span key={field} className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40">
                        • {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="solid-card rounded-2xl p-6 sm:p-8 border border-border space-y-6 bg-card shadow-xs">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span>📌 Academic Credentials</span>
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-background/80 flex flex-col justify-between space-y-1 shadow-2xs hover:border-indigo-500/30 transition-all min-w-0">
                <span className="hidden sm:inline text-[10px] font-extrabold text-muted-foreground  tracking-wider block truncate">Registration Number</span>
                <span className="inline sm:hidden text-[10px] font-extrabold text-muted-foreground  tracking-wider block truncate">Reg No</span>
                <span className="text-xs font-mono font-black text-foreground truncate block" title={regNo}>{regNo}</span>
              </div>

              <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-background/80 flex flex-col justify-between space-y-1 shadow-2xs hover:border-indigo-500/30 transition-all min-w-0">
                <span className="text-[10px] font-extrabold text-muted-foreground  tracking-wider block truncate">Email</span>
                <a
                  href={`mailto:${email}`}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline truncate block"
                  title={`Send email to ${email}`}
                >
                  {email}
                </a>
              </div>

              <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-background/80 flex flex-col justify-between space-y-1 shadow-2xs hover:border-indigo-500/30 transition-all min-w-0">
                <span className="hidden sm:inline text-[10px] font-extrabold text-muted-foreground  tracking-wider block truncate">Department & Course</span>
                <span className="inline sm:hidden text-[10px] font-extrabold text-muted-foreground  tracking-wider block truncate">Dept & Course</span>
                <span className="text-xs font-extrabold text-foreground  truncate block" title={`${dept} (${course})`}>{dept} ({course})</span>
              </div>

              <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-background/80 flex flex-col justify-between space-y-1 shadow-2xs hover:border-indigo-500/30 transition-all min-w-0">
                <span className="hidden sm:inline text-[10px] font-extrabold text-muted-foreground  tracking-wider block truncate">Semester & Batch</span>
                <span className="inline sm:hidden text-[10px] font-extrabold text-muted-foreground  tracking-wider block truncate">Sem & Batch</span>
                <span className="text-xs font-extrabold text-foreground truncate block">Sem {sem} • {regYear}</span>
              </div>

              <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-background/80 flex flex-col justify-between space-y-1 shadow-2xs hover:border-indigo-500/30 transition-all min-w-0">
                <span className="text-[10px] font-extrabold text-muted-foreground  tracking-wider block truncate">Contact</span>
                <span className="text-xs font-mono font-bold text-foreground truncate block">{contactNo}</span>
              </div>

              <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-background/80 flex flex-col justify-between space-y-1 shadow-2xs hover:border-indigo-500/30 transition-all min-w-0">
                <span className="text-[10px] font-extrabold text-muted-foreground  tracking-wider block truncate">Gender</span>
                <span className="text-xs font-extrabold text-foreground capitalize truncate block">{genderVal}</span>
              </div>

              <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-background/80 flex flex-col justify-between space-y-1 shadow-2xs hover:border-indigo-500/30 transition-all min-w-0">
                <span className="text-[10px] font-extrabold text-muted-foreground  tracking-wider block truncate">Status</span>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 truncate">
                  <span>✓</span> Active
                </span>
              </div>

              <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-background/80 flex flex-col justify-between space-y-1 shadow-2xs hover:border-indigo-500/30 transition-all min-w-0">
                <span className="text-[10px] font-extrabold text-muted-foreground  tracking-wider block truncate">Class Role</span>
                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 truncate block">
                  {isCr ? "CR" : "Student"}
                </span>
              </div>
            </div>
          </div>

          {/* Enrolled Courses Cards Grid Section */}
          {summary && summary.subject_breakdown.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-1 border-b border-border pb-2">
                <div className="flex items-center justify-between mb-0">
                  <h3 className="text-base font-extrabold text-foreground">
                    Course Performance
                  </h3>
                  <Badge variant="secondary" showDot={false} className="font-mono font-bold">{summary.subject_breakdown.length} Courses</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Coursewise performance. Click any card to view detailed session logs.
                </p>
              </div>

              {/* Formatted Course Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {summary.subject_breakdown.map((sub) => {
                  const pct = sub.attendance_pct;
                  const palette = getPaletteForAttendance(pct);
                  const isEligible = sub.is_eligible;
                  const needed = getClassesNeededFor75(sub.attended_classes, sub.total_classes);
                  const safeMiss = getSafeClassesToMiss(sub.attended_classes, sub.total_classes);

                  return (
                    <div
                      key={sub.subject_code}
                      className="group solid-card rounded-2xl p-5 border border-border bg-card hover:border-indigo-500/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-4 relative overflow-hidden"
                    >
                      {/* Accent Top Bar */}
                      <div
                        className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${palette.gradient}`}
                      />

                      <div className="space-y-1">
                        {/* Course Title */}
                        <div className="flex flex-row gap-2 items-center justify-between pb-1">
                          <h3 className="text-sm font-extrabold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug line-clamp-2 truncate">
                            {sub.subject_name}
                          </h3>
                          <Badge variant={isEligible ? "success" : "error"} showDot={false} className="text-[11px] font-extrabold flex-shrink-0">
                            {isEligible ? "Eligible" : "Warning (<75%)"}
                          </Badge>
                        </div>

                        {/* Attendance Bar & Metrics */}
                        <div className="space-y-2 pt-1 border-t border-border/60">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-muted-foreground">Attendance Score</span>
                            <span className={`font-mono text-sm font-black ${palette.textColor}`}>
                              {pct}%
                            </span>
                          </div>

                          {/* Progress Bar Container */}
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden relative">
                            {/* Cutoff Threshold Line at 75% */}
                            <div
                              className="absolute top-0 bottom-0 w-1.5 bg-amber-500 z-10"
                              style={{ left: "75%" }}
                              title="75% Cutoff Threshold"
                            />
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${palette.gradient} transition-all duration-500`}
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold pt-0.5">
                            <span>{sub.attended_classes} Attended</span>
                            <span>{sub.total_classes} Total Classes</span>
                          </div>
                        </div>

                        {/* Hint & Details Action */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-border/60 text-[11px] font-bold">
                          {sub.total_classes === 0 ? (
                            <span className="text-indigo-500">ℹ️ No classes held yet.</span>
                          ) : isEligible ? (
                            <span className="text-emerald-600 dark:text-emerald-400">You Can miss up to {safeMiss} {safeMiss === 1 ? "class" : "classes"}.</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">⚠️ Attend next {needed} {needed === 1 ? "class" : "classes"}</span>
                          )}

                          <Link
                            href={`/student/courses/${encodeURIComponent(sub.subject_code)}`}
                            className="w-fit px-2 py-0.5 rounded-xl border border-indigo-500/20 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 text-indigo-600 dark:text-indigo-300 text-xs transition-all shadow-xs flex items-center justify-center gap-2 group-hover:shadow-md mt-2 flex-shrink-0"
                          >
                            <span>Details</span>
                            <span className="transition-transform group-hover:translate-x-1">→</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Direct Navigation Footer */}
          <div className="solid-card rounded-2xl p-5 border border-border bg-card shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">🔗 Quick Navigation Actions</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href="/student/reports"
                className="p-3 rounded-xl border border-border hover:bg-muted/40 text-center transition-all text-xs font-bold text-foreground flex flex-col items-center gap-1.5"
              >
                <span>📊</span>
                <span>Attendance Summary</span>
              </Link>
              <Link
                href="/student/courses"
                className="p-3 rounded-xl border border-border hover:bg-muted/40 text-center transition-all text-xs font-bold text-foreground flex flex-col items-center gap-1.5"
              >
                <span>📚</span>
                <span>My Courses</span>
              </Link>
              <Link
                href="/student/notifications"
                className="p-3 rounded-xl border border-border hover:bg-muted/40 text-center transition-all text-xs font-bold text-foreground flex flex-col items-center gap-1.5"
              >
                <span>🔔</span>
                <span>Notifications</span>
              </Link>
              {isCr && (
                <Link
                  href="/student/cr"
                  className="p-3 rounded-xl border border-border hover:bg-muted/40 text-center transition-all text-xs font-bold text-amber-600 dark:text-amber-400 flex flex-col items-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>CR Console Hub</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit / Complete Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <span>✏️ Edit Profile Details</span>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Update your personal information to complete profile setup.
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              {missingFields.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-600 dark:text-amber-300">
                  <span>⚠️ Required details to complete profile: </span>
                  <span className="underline">{missingFields.join(", ")}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-foreground block mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-foreground block mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border bg-background"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">
                  Contact Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full p-2.5 rounded-xl border border-border bg-background"
                />
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">
                  Class Roll Number (Optional)
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full p-2.5 rounded-xl border border-border bg-background font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  {savingProfile ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Profile Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default function StudentProfilePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-muted-foreground animate-pulse">Loading student profile...</div>}>
      <StudentProfileContent />
    </Suspense>
  );
}

