"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { useNotifications } from "@/hooks/useNotifications";
import { apiFetch } from "@/lib/api";

function formatNotifTime(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) {
    return `Today, ${timeStr}`;
  }
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}, ${timeStr}`;
}

export function NotificationsView({ title = "Notifications & Alerts" }: { title?: string }) {
  const router = useRouter();
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications(10000);

  // Mandatory Rejection Modal State
  const [rejectModalTarget, setRejectModalTarget] = useState<{ notifId: string; sessionId: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  const handleQuickApprove = async (
    e: React.MouseEvent,
    notifId: string,
    sessionId?: string
  ) => {
    e.stopPropagation();
    e.preventDefault();

    if (!sessionId) {
      deleteNotification(notifId);
      router.push("/faculty/attendance/approve");
      return;
    }

    try {
      const res = await apiFetch(`/attendance/approvals/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      if (res.ok) {
        deleteNotification(notifId);
        setActionMsg("Session approved successfully!");
        setTimeout(() => setActionMsg(null), 3000);
      } else {
        router.push("/faculty/attendance/approve");
      }
    } catch (err) {
      router.push("/faculty/attendance/approve");
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalTarget || !rejectReason.trim()) return;
    setRejectLoading(true);
    try {
      const res = await apiFetch(`/attendance/approvals/${encodeURIComponent(rejectModalTarget.sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", reason: rejectReason.trim() }),
      });

      if (res.ok) {
        deleteNotification(rejectModalTarget.notifId);
        setActionMsg("Attendance session rejected with reason!");
        setTimeout(() => setActionMsg(null), 3000);
        setRejectModalTarget(null);
        setRejectReason("");
      } else {
        const data = await res.json().catch(() => ({}));
        setActionMsg(`Rejection failed: ${data.detail || "Error"}`);
      }
    } catch (err) {
      setActionMsg("Could not reject session.");
    } finally {
      setRejectLoading(false);
    }
  };

  const hasUnread = notifications.some((n) => n.status === "unread");

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              🔔
            </span>
            <span>{title}</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">
            Real-time attendance requests, approval alerts, academic warnings, and department notices.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
          {hasUnread && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3.5 py-2 text-xs font-extrabold shadow-xs transition-all active:scale-[0.98]"
            >
              <span>✓ Mark All Read</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAllNotifications}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 px-3.5 py-2 text-xs font-extrabold transition-all active:scale-[0.98]"
            >
              <span>🗑️ Clear All</span>
            </button>
          )}
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 text-center animate-in fade-in duration-200">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Loading notification feed...
        </div>
      ) : notifications.length === 0 ? (
        <div className="solid-card rounded-2xl p-12 text-center space-y-3 border border-border bg-card">
          <div className="text-4xl">🔔</div>
          <h2 className="text-base font-extrabold text-foreground">No Notifications</h2>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto font-medium">
            You are all caught up! You have no unread notifications or active session requests right now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => {
            const isCRSession = n.type === "cr_attendance_session_started" || n.data?.token;
            const isFacultyApproval = n.title?.includes("Attendance Marked by CR") || n.title?.includes("Attendance marked by CR") || n.type?.includes("Attendance marked by CR") || n.data?.session_id;
            const isUnread = n.status === "unread";
            const formattedTime = formatNotifTime(n.timestamp);

            return (
              <div
                key={n.id}
                className={`solid-card rounded-2xl p-4 sm:p-5 border transition-all relative overflow-hidden bg-card ${isUnread
                  ? "border-l-4 border-l-amber-500 border-indigo-500/30 bg-indigo-500/[0.02] dark:bg-indigo-500/[0.04] shadow-xs"
                  : "border-border opacity-95"
                  }`}
              >
                <div className="space-y-3">
                  {/* Top Header Row: Icon + Title + Status Badges */}
                  <div className="flex items-start justify-between gap-2.5 border-b border-border/50 pb-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm font-extrabold text-foreground leading-snug">
                            {n.title}
                          </h2>
                        </div>
                        <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <span>📅 {formattedTime}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    {n.body}
                  </p>

                  {/* Bottom Footer Actions Toolbar */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-end gap-3 sm:6 text-xs">
                    {/* Action 1: CR Attendance Session Link (Highlighted Callout Button) */}
                    {isCRSession && n.data?.token && (
                      <div className="pt-1">
                        <Link
                          href={`/student/cr/attendance/take?token=${encodeURIComponent(n.data.token)}`}
                          onClick={() => deleteNotification(n.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs px-4 py-2.5 shadow-sm active:scale-[0.98] transition-all w-full text-center"
                        >
                          <span>Take Attendance</span>
                          <span className="hidden sm:block text-sm">→</span>
                        </Link>
                      </div>
                    )}

                    {/* Action 2: Faculty Session Quick Approval / Rejection */}
                    {isFacultyApproval && (
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleQuickApprove(e, n.id, n.data?.session_id)}
                          className="flex-1 sm:flex-none rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 shadow-xs transition-all active:scale-[0.98] text-center"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (n.data?.session_id) {
                              setRejectModalTarget({ notifId: n.id, sessionId: n.data.session_id });
                              setRejectReason("");
                            } else {
                              deleteNotification(n.id);
                              router.push("/faculty/attendance/approve");
                            }
                          }}
                          className="flex-1 sm:flex-none rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-4 py-2 shadow-xs transition-all active:scale-[0.98] text-center"
                        >
                          Reject
                        </button>
                        <Link
                          href="/faculty/attendance/approve"
                          onClick={() => deleteNotification(n.id)}
                          className="inline-flex items-center justify-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1"
                        >
                          <span>View Details</span>
                          <span>→</span>
                        </Link>
                      </div>
                    )}

                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => markAsRead(n.id)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                      >
                        <span>✓</span>
                        <span>Mark Read</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => deleteNotification(n.id, e)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
                    >
                      <span>🗑️</span>
                      <span className="hidden sm:block">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mandatory Rejection Reason Modal */}
      {rejectModalTarget && (
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
              placeholder="Provide mandatory rejection reason (e.g. Roster discrepancy, wrong section)..."
              className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-rose-500/20"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectModalTarget(null);
                  setRejectReason("");
                }}
                className="px-4 py-2 rounded-xl bg-card hover:bg-muted border border-border text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={rejectLoading || !rejectReason.trim()}
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

