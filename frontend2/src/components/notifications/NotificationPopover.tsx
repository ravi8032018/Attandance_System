"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import { useUserMe } from "@/hooks/useUserMe";
import { apiFetch } from "@/lib/api";

function BellIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function NotificationPopover() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications(8000);
  const { isStudent, isAdmin } = useUserMe();

  const notificationsHref = isStudent
    ? "/student/notifications"
    : isAdmin
      ? "/admin/notifications"
      : "/faculty/notifications";

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      setOpen(false);
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
        setOpen(false);
      }
    } catch (err) {
      router.push("/faculty/attendance/approve");
      setOpen(false);
    }
  };

  const handleNotificationCardClick = (nId: string, isUnread: boolean) => {
    if (isUnread) {
      markAsRead(nId);
    }
    setOpen(false);
    router.push(notificationsHref);
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-card hover:bg-muted text-foreground border border-border transition-all duration-200 active:scale-95 shadow-xs"
        title="Notifications"
        aria-label="Open Notifications"
      >
        <BellIcon className="text-muted-foreground group-hover:text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border shadow-2xl z-50 overflow-hidden text-foreground animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <CheckIcon /> Mark read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {actionMsg && (
            <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 text-xs font-bold border-b border-emerald-500/20 text-center">
              {actionMsg}
            </div>
          )}

          {/* List of Notifications */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/60 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-1">
                <p className="text-2xl">🔔</p>
                <p className="text-xs font-bold text-foreground">No notifications yet</p>
                <p className="text-[11px] text-muted-foreground">You are all caught up!</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = n.status === "unread";
                const isCRSession = n.type === "cr_attendance_session_started" || n.data?.token;
                const isFacultyApproval = n.title?.includes("Attendance Marked by CR") || n.title?.includes("Attendance marked by CR") || n.type?.includes("Attendance marked by CR") || n.data?.session_id;

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationCardClick(n.id, isUnread)}
                    className={`p-3.5 transition-colors duration-150 relative group cursor-pointer ${isUnread ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "hover:bg-muted/40"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-xs font-bold text-foreground leading-snug flex items-center gap-1.5">
                        {isCRSession && <span className="text-amber-500">⏱️</span>}
                        {isFacultyApproval && <span className="text-indigo-500">📋</span>}
                        {n.title}
                      </h4>
                      <button
                        type="button"
                        onClick={(e) => deleteNotification(n.id, e)}
                        className="text-muted-foreground hover:text-rose-500 text-xs px-1.5 py-0.5 rounded-md hover:bg-muted/80 transition-colors shrink-0"
                        title="Dismiss"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{n.body}</p>

                    {/* Direct Action 1: CR Attendance Session Link */}
                    {isCRSession && n.data?.token && (
                      <div className="mt-2 mb-1" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/student/cr/attendance/take?token=${encodeURIComponent(n.data.token)}`}
                          onClick={() => {
                            markAsRead(n.id);
                            setOpen(false);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] px-3 py-1.5 shadow-sm active:scale-95 transition-all"
                        >
                          <span>Take Attendance Now (15m Window)</span>
                          <span>→</span>
                        </Link>
                      </div>
                    )}

                    {/* Direct Action 2: Faculty Quick Approve / Reject Buttons */}
                    {isFacultyApproval && (
                      <div className="mt-2 mb-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleQuickApproveReject(e, n.id, n.data?.session_id, "approved")}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-3 py-1 shadow-xs transition-all active:scale-95"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleQuickApproveReject(e, n.id, n.data?.session_id, "rejected")}
                          className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] px-3 py-1 shadow-xs transition-all active:scale-95"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 mt-1">
                      <span>
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border bg-muted/20 text-center">
            <Link
              href={notificationsHref}
              onClick={() => setOpen(false)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline block py-1"
            >
              View All Notifications & History →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
