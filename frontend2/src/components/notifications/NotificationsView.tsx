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

  const handleQuickApproveReject = async (
    e: React.MouseEvent,
    notifId: string,
    sessionId?: string,
    status: "approved" | "rejected" = "approved"
  ) => {
    e.stopPropagation();
    e.preventDefault();

    if (!sessionId) {
      markAsRead(notifId);
      router.push("/faculty/attendance/approve");
      return;
    }

    try {
      const res = await apiFetch(`/attendance/approvals/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        markAsRead(notifId);
        setActionMsg(`Session ${status} successfully!`);
        setTimeout(() => setActionMsg(null), 3000);
      } else {
        router.push("/faculty/attendance/approve");
      }
    } catch (err) {
      router.push("/faculty/attendance/approve");
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Real-time attendance requests, approval alerts, academic warnings, and department notices.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {notifications.some((n) => n.status === "unread") && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="rounded-xl bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold shadow-sm transition-all"
            >
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAllNotifications}
              className="rounded-xl bg-rose-600/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 px-4 py-2 text-xs font-bold transition-all"
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
                className={`solid-card rounded-2xl p-4 sm:p-5 border transition-all ${
                  isUnread
                    ? "border-indigo-500/40 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs"
                    : "border-border opacity-90"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
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
                    <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>

                    {/* Action 1: CR Attendance Session Link */}
                    {isCRSession && n.data?.token && (
                      <div className="pt-2">
                        <Link
                          href={`/student/cr/attendance/take?token=${encodeURIComponent(n.data.token)}`}
                          onClick={() => markAsRead(n.id)}
                          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-4 py-2 shadow-sm transition-all active:scale-95"
                        >
                          <span>Take Attendance Now (15m Window)</span>
                          <span>→</span>
                        </Link>
                      </div>
                    )}

                    {/* Action 2: Faculty Session Quick Approval / Rejection */}
                    {isFacultyApproval && (
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleQuickApproveReject(e, n.id, n.data?.session_id, "approved")}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 shadow-sm transition-all active:scale-95"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleQuickApproveReject(e, n.id, n.data?.session_id, "rejected")}
                          className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-4 py-2 shadow-sm transition-all active:scale-95"
                        >
                          Reject
                        </button>
                        <Link
                          href="/faculty/attendance/approve"
                          onClick={() => markAsRead(n.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline ml-2"
                        >
                          <span>View Details</span>
                          <span>→</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {new Date(n.timestamp).toLocaleDateString()} {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => markAsRead(n.id)}
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
    </main>
  );
}
