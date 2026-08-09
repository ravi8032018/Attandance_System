"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { useNotifications } from "@/hooks/useNotifications";
import { apiFetch } from "@/lib/api";

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

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Real-time attendance requests, approval alerts, academic warnings, and department notices.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {notifications.some((n) => n.status === "unread") && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="flex-1 sm:flex-none rounded-xl bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold shadow-sm transition-all text-center"
            >
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAllNotifications}
              className="flex-1 sm:flex-none rounded-xl bg-rose-600/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 px-4 py-2 text-xs font-bold transition-all text-center"
            >
              Clear All Notifications
            </button>
          )}
        </div>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 text-center">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Loading notification feed...
        </div>
      ) : notifications.length === 0 ? (
        <div className="solid-card rounded-2xl p-12 text-center space-y-2 border border-border">
          <div className="text-3xl">🔔</div>
          <h2 className="text-base font-bold text-foreground">No Notifications</h2>
          <p className="text-xs text-muted-foreground">You currently have no active notifications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isCRSession = n.type === "cr_attendance_session_started" || n.data?.token;
            const isFacultyApproval = n.title?.includes("Attendance Marked by CR") || n.title?.includes("Attendance marked by CR") || n.type?.includes("Attendance marked by CR") || n.data?.session_id;
            const isUnread = n.status === "unread";

            return (
              <div
                key={n.id}
                className={`solid-card rounded-2xl p-4 sm:p-5 border transition-all ${isUnread
                  ? "border-indigo-500/40 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs"
                  : "border-border opacity-90"
                  }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Main Content Area */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h2 className="text-sm font-extrabold text-foreground flex items-center gap-1.5 leading-snug">
                          {isCRSession && <span>⏱️</span>}
                          {isFacultyApproval && <span>📋</span>}
                          {n.title}
                        </h2>
                        {isUnread ? (
                          <Badge variant="primary">New</Badge>
                        ) : (
                          <Badge variant="secondary">Read</Badge>
                        )}
                      </div>

                      {/* Timestamp on Mobile */}
                      <span className="text-[11px] font-medium text-muted-foreground sm:hidden">
                        {new Date(n.timestamp).toLocaleDateString()} {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>

                    {/* Action 1: CR Attendance Session Link */}
                    {isCRSession && n.data?.token && (
                      <div className="pt-2">
                        <Link
                          href={`/student/cr/attendance/take?token=${encodeURIComponent(n.data.token)}`}
                          onClick={() => deleteNotification(n.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-4 py-2 shadow-sm transition-all active:scale-95 w-full sm:w-auto text-center"
                        >
                          <span>Take Attendance Now (15m Window)</span>
                          <span>→</span>
                        </Link>
                      </div>
                    )}

                    {/* Action 2: Faculty Session Quick Approval / Rejection */}
                    {isFacultyApproval && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleQuickApprove(e, n.id, n.data?.session_id)}
                          className="flex-1 sm:flex-none rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 shadow-sm transition-all active:scale-95 text-center"
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
                          className="flex-1 sm:flex-none rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-4 py-2 shadow-sm transition-all active:scale-95 text-center"
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
                  </div>

                  {/* Controls Area (Desktop on right, Mobile bottom toolbar) */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-none border-border/40 min-w-0">
                    <span className="text-[11px] font-medium text-muted-foreground hidden sm:block">
                      {new Date(n.timestamp).toLocaleDateString()} {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="flex items-center gap-3 text-xs w-full sm:w-auto justify-end">
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => deleteNotification(n.id)}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Mark Read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => deleteNotification(n.id, e)}
                        className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
                      >
                        Dismiss
                      </button>
                    </div>
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
