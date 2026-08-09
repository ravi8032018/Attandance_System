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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Student Profile & Credentials
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            Official academic registration credentials, attendance performance, and course enrollment.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowEditModal(true)}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 text-white px-4 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <span>✏️</span>
            <span>Edit Profile</span>
          </button>

          <Link
            href="/student/dashboard"
            className="rounded-xl border border-border bg-card hover:bg-muted text-foreground px-4 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <span>← Back to Dashboard</span>
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
          <div className="solid-card rounded-2xl p-6 sm:p-8 border border-border space-y-6 bg-card shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-border/80">
              {/* Dynamic User Avatar (Image with auto-initials fallback) */}
              <UserAvatar
                name={name}
                firstName={user?.first_name}
                lastName={user?.last_name}
                photoUrl={photoUrl}
                size="3xl"
              />

              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">{name}</h2>
                  {summary && (
                    <Badge variant={summary.overall_total_classes === 0 || summary.is_eligible ? "success" : "error"}>
                      {summary.overall_total_classes === 0 ? "✓ Good Standing (No Classes Yet)" : summary.is_eligible ? "✓ Good Standing (≥75%)" : "⚠️ Low Attendance (<75%)"}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono font-bold text-foreground bg-muted px-2.5 py-1 rounded-md">
                    Reg: {regNo}
                  </span>
                  {
                    isCr ? <Badge variant="teal">CR</Badge> : null
                  }
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
            </div>

            {/* Academic Standing Stat Cards */}
            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <StatCard
                  title="Overall Attendance"
                  value={`${summary.overall_attendance_pct}%`}
                  subtitle={`${summary.overall_attended} / ${summary.overall_total_classes} Total Classes Attended`}
                  variant={summary.overall_total_classes === 0 || summary.overall_attendance_pct >= 75 ? "emerald" : "rose"}
                  icon={
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <StatCard
                  title="Term Examination Eligibility"
                  value={summary.overall_total_classes === 0 ? "Good Standing" : summary.is_eligible ? "Eligible" : "Flagged"}
                  subtitle={summary.overall_total_classes === 0 ? "No sessions conducted for batch yet" : summary.is_eligible ? "Satisfies 75% Cutoff Rule" : "Requires Minimum 75% Attendance"}
                  variant={summary.overall_total_classes === 0 || summary.is_eligible ? "indigo" : "rose"}
                  icon={
                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                />

                <StatCard
                  title="Enrolled Subjects"
                  value={summary.subject_breakdown.length.toString()}
                  subtitle="Curriculum Courses Enrolled"
                  variant="purple"
                  icon={
                    <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  }
                />
              </div>
            )}

            {/* Official Credentials Grid */}
            <div className="space-y-3 pt-2">
              {missingFields.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-amber-500 dark:text-amber-300 uppercase tracking-wider flex items-center gap-2">
                      <span>⚠️ Profile Incomplete ({missingFields.length} {missingFields.length === 1 ? "field" : "fields"} remaining)</span>
                    </h4>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="text-xs font-bold bg-amber-500 text-slate-950 px-3 py-1.5 rounded-lg hover:bg-amber-400 transition-colors shadow-xs"
                    >
                      Complete Now
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Please provide the following required details to finalize your account profile:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {missingFields.map((field) => (
                      <span key={field} className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40">
                        • {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                📌 Official Academic & Registration Credentials
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border border-border/80 bg-background/60">
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Registration Number</span>
                  <span className="text-xs font-mono font-bold text-foreground">{regNo}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Academic Email</span>
                  <span className="text-xs font-semibold text-foreground truncate block">{email}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Department & Track</span>
                  <span className="text-xs font-semibold text-foreground">{dept} ({course})</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Semester & Year</span>
                  <span className="text-xs font-semibold text-foreground">Sem {sem} • {regYear}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Contact Number</span>
                  <span className="text-xs font-mono text-foreground">{contactNo}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Gender Identification</span>
                  <span className="text-xs font-medium text-foreground capitalize">{gender}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Account Status</span>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">Verified Active</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Class Designation</span>
                  <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{isCr ? "Class Representative (CR)" : "Regular Student"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enrolled Curriculum Roster Section */}
          {summary && summary.subject_breakdown.length > 0 && (
            <div className="solid-card rounded-2xl p-6 sm:p-8 border border-border space-y-4 bg-card shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-base font-extrabold text-foreground">
                    Enrolled Subject Performance Breakdown
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Individual subject attendance tracking for Semester {sem}. Click any subject to view detailed session logs.
                  </p>
                </div>
                <Badge variant="muted" className="font-mono font-bold">{summary.subject_breakdown.length} Courses</Badge>
              </div>

              <div className="space-y-3 pt-1">
                {summary.subject_breakdown.map((sub) => (
                  <Link
                    key={sub.subject_code}
                    href={`/student/courses/${encodeURIComponent(sub.subject_code)}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-background hover:border-indigo-500/50 hover:bg-muted/30 transition-all group"
                  >
                    <div className="space-y-0.5">
                      <h4 className="text-xs sm:text-sm font-extrabold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {sub.subject_name}
                      </h4>
                      <span className="font-mono text-xs font-extrabold text-indigo-600 dark:text-indigo-400 block">
                        {sub.subject_code}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="text-xs font-mono text-muted-foreground font-semibold">
                        {sub.attended_classes} / {sub.total_classes} Attended
                      </span>
                      <Badge variant={sub.is_eligible ? "success" : "error"}>
                        {sub.attendance_pct}%
                      </Badge>
                      <span className="text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-transform group-hover:translate-x-1 font-bold text-xs">
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Direct Navigation Footer */}
          <div className="solid-card rounded-2xl p-6 border border-border bg-card shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">🔗 Quick Navigation Actions</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href="/student/reports"
                className="p-3 rounded-xl border border-border/80 hover:bg-muted/40 text-center transition-all text-xs font-bold text-foreground flex flex-col items-center gap-1.5"
              >
                <span>📊</span>
                <span>Attendance Summary</span>
              </Link>
              <Link
                href="/student/courses"
                className="p-3 rounded-xl border border-border/80 hover:bg-muted/40 text-center transition-all text-xs font-bold text-foreground flex flex-col items-center gap-1.5"
              >
                <span>📚</span>
                <span>My Courses</span>
              </Link>
              <Link
                href="/student/notifications"
                className="p-3 rounded-xl border border-border/80 hover:bg-muted/40 text-center transition-all text-xs font-bold text-foreground flex flex-col items-center gap-1.5"
              >
                <span>🔔</span>
                <span>Notifications</span>
              </Link>
              {isCr && (
                <Link
                  href="/student/cr"
                  className="p-3 rounded-xl border border-border/80 hover:bg-muted/40 text-center transition-all text-xs font-bold text-amber-600 dark:text-amber-400 flex flex-col items-center gap-1.5"
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

