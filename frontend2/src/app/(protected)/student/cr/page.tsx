"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUserMe } from "@/hooks/useUserMe";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";

export default function CRConsolePage() {
  const router = useRouter();
  const { user } = useUserMe();
  const { notifications } = useNotifications();

  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState("");

  // Extract active CR attendance ping notifications
  const activeSessionNotifs = notifications.filter(
    (n) => n.type === "cr_attendance_session_started" && n.data?.token
  );

  function handleStartSession(e: React.FormEvent) {
    e.preventDefault();
    let cleanToken = tokenInput.trim();

    if (!cleanToken) {
      setError("Please enter a valid attendance session token or passcode.");
      return;
    }

    // Smart Token Parsing: If full URL is pasted, extract the 'token' param
    if (cleanToken.includes("token=")) {
      try {
        const url = new URL(cleanToken.startsWith("http") ? cleanToken : `http://${cleanToken}`);
        const extracted = url.searchParams.get("token");
        if (extracted) {
          cleanToken = extracted;
        }
      } catch {
        // Fallback to manual split if URL parsing fails
        const match = cleanToken.match(/token=([a-zA-Z0-9_-]+)/);
        if (match) cleanToken = match[1];
      }
    }

    router.push(`/student/cr/attendance/take?token=${encodeURIComponent(cleanToken)}`);
  }

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyToken = (e: React.MouseEvent, tokenVal?: string, notifId?: string) => {
    e.stopPropagation();
    if (!tokenVal) return;
    navigator.clipboard.writeText(tokenVal);
    if (notifId) {
      setCopiedId(notifId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  function launchDirectToken(token: string) {
    router.push(`/student/cr/attendance/take?token=${encodeURIComponent(token)}`);
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            CR Attendance Hub
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Conduct live classroom attendance sessions assigned by your course faculty in real-time.
          </p>
        </div>
      </div>

      {/* Cohort & Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Role Verification"
          value={user?.role?.includes("cr") ? "Authorized CR" : "Student"}
          subtitle={user?.registration_no ? `Reg: ${user.registration_no}` : "CR Permissions Active"}
          icon={
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <StatCard
          title="Assigned Cohort"
          value={user?.department || "Department"}
          subtitle={`Semester ${user?.semester || "-"}`}
          icon={
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          title="Active Pings"
          value={activeSessionNotifs.length.toString()}
          subtitle={activeSessionNotifs.length > 0 ? "Pending Faculty Pings" : "No Active Requests"}
          icon={
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          }
        />
        <StatCard
          title="Session Window"
          value="15 Mins"
          subtitle="Standard Token Expiry"
          icon={
            <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Real-time Active Faculty Attendance Pings */}
      {activeSessionNotifs.length > 0 && (
        <div className="rounded-2xl p-5 border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <h2 className="text-sm font-extrabold text-foreground">
                Attendance Session Initiated!
              </h2>
            </div>
            <Badge variant="warning" showDot={false}>{activeSessionNotifs.length} Active</Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1">
            {activeSessionNotifs.map((notif) => (
              <div
                key={notif.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-amber-500/20 bg-background/80 gap-3"
              >
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-foreground">{notif.title}</h4>
                  <p className="text-[11px] text-muted-foreground font-medium">{notif.body}</p>

                  {/* Token display with side copy icon button */}
                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400  px-2 py-0.5 rounded border border-amber-500/20 truncate ">
                      Token: {notif.data?.token}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyToken(e, notif.data?.token, notif.id)}
                      className="p-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all active:scale-95 shrink-0 flex items-center justify-center"
                      title="Copy token to clipboard"
                    >
                      {copiedId === notif.id ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold px-0.5">✓</span>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => launchDirectToken(notif.data?.token)}
                  className="px-4 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                >
                  <span>Launch Live Roster Now</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Token Entry Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Input Form (2 Cols) */}
        <div className="lg:col-span-2 solid-card rounded-2xl p-6 sm:p-8 border border-border space-y-3 bg-card shadow-xs">
          <div className="space-y-1.5 border-b border-border/60 pb-3">
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <span>🔑 Enter Session Token or Link</span>
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Faculty members transmit temporary 15-minute session tokens. Paste the passcode or full link below to launch the interactive student roster.
            </p>
          </div>

          <form onSubmit={handleStartSession} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Attendance Session Token / Passcode
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value);
                    setError("");
                  }}
                  placeholder="e.g. 550e8400-e29b-41d4... or paste complete URL link"
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 pr-10 text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                />
                {tokenInput && (
                  <button
                    type="button"
                    onClick={() => setTokenInput("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
              {error && <p className="text-xs font-bold text-rose-500 mt-1.5">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold text-xs transition-all shadow-xs active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>Launch Live Student Roster</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </form>

          {/* Quick Navigation Shortcuts */}
          <div className="hidden sm:inline pt-3 border-t border-border/60">
            <h4 className="text-xs font-bold text-foreground mb-3">🔗 Quick Student Shortcuts:</h4>
            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/student/courses"
                className="p-2.5 rounded-xl border border-border/70 hover:bg-muted/40 text-center transition-all text-xs font-semibold text-foreground flex flex-col items-center gap-1"
              >
                <span>📚</span>
                <span>My Courses</span>
              </Link>
              <Link
                href="/student/reports"
                className="p-2.5 rounded-xl border border-border/70 hover:bg-muted/40 text-center transition-all text-xs font-semibold text-foreground flex flex-col items-center gap-1"
              >
                <span>📊</span>
                <span>My Reports</span>
              </Link>
              <Link
                href="/student/notifications"
                className="p-2.5 rounded-xl border border-border/70 hover:bg-muted/40 text-center transition-all text-xs font-semibold text-foreground flex flex-col items-center gap-1"
              >
                <span>🔔</span>
                <span>Notifications</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Workflow & Rules Panel (1 Col) */}
        <div className="solid-card rounded-2xl p-6 border border-border bg-card shadow-xs space-y-4">
          <h3 className="text-xs font-extrabold text-foreground tracking-wide uppercase flex items-center gap-1.5">
            <span>💡 Attendance Workflow</span>
          </h3>

          <div className="space-y-3.5 text-xs">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <h5 className="font-bold text-foreground">Faculty Initiates Session</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Subject faculty starts attendance and generates a 15-minute token link.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <h5 className="font-bold text-foreground">CR Receives Token</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Active pings appear automatically in the banner above or via notification.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <h5 className="font-bold text-foreground">Live Roster Marking</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Mark present students on the roster. Unmarked students auto-default to absent.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                4
              </div>
              <div>
                <h5 className="font-bold text-foreground">Faculty Verification</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Submissions enter pending approval state until reviewed by the course faculty.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 text-[11px] text-muted-foreground space-y-1">
            <span className="font-bold text-amber-600 dark:text-amber-400 block">⚠️ Capacity & Rules:</span>
            <p className="leading-relaxed">
              Maximum 2 CRs can be designated per semester per department. Sessions auto-expire after 15 minutes.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
