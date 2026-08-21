"use client";

import React, { useState } from "react";
import Link from "next/link";
import { NotificationsView } from "@/components/notifications/NotificationsView";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api";

export default function AdminNotificationsPage() {
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    setSending(true);
    setBroadcastMsg(null);

    try {
      const res = await apiFetch("/admin/broadcast-notification", {
        method: "POST",
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          body: broadcastBody.trim(),
          target: targetAudience,
        }),
      });

      if (res.ok) {
        setBroadcastMsg({ type: "success", text: "System broadcast notification dispatched successfully!" });
        setBroadcastTitle("");
        setBroadcastBody("");
        setTimeout(() => {
          setShowBroadcastModal(false);
          setBroadcastMsg(null);
        }, 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        setBroadcastMsg({ type: "error", text: data.detail || "Failed to dispatch broadcast." });
      }
    } catch (err) {
      setBroadcastMsg({ type: "error", text: "Server error dispatching notification." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Notifications & System Alerts
              </h1>
              <Badge variant="primary">Admin Broadcasts</Badge>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Monitor incoming system logs, automated notifications, and dispatch announcements.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-extrabold shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>📢 Create Broadcast</span>
            </button>
            <Link
              href="/admin/dashboard"
              className="rounded-xl border border-border bg-card hover:bg-muted text-foreground px-3.5 py-2 text-xs font-bold transition-all shadow-xs"
            >
              ← Console
            </Link>
          </div>
        </div>
      </div>

      {/* Embedded Notifications Core View */}
      <NotificationsView title="Admin Console Notifications Feed" />

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="solid-card rounded-2xl p-6 border border-border max-w-lg w-full space-y-4 bg-card shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <span>📢 Send System Broadcast</span>
              </h3>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {broadcastMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold text-center ${broadcastMsg.type === "success"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  }`}
              >
                {broadcastMsg.text}
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-foreground block mb-1">Target Audience</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">All Users (Students, Faculty, HODs)</option>
                  <option value="faculty">Faculty & HODs Only</option>
                  <option value="student">Student Body Only</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-foreground block mb-1">Notification Title</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Mid-term Exam Schedule Update / Portal Maintenance"
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-foreground block mb-1">Message Details</label>
                <textarea
                  required
                  rows={4}
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="Enter broadcast message body..."
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !broadcastTitle.trim() || !broadcastBody.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold disabled:opacity-40 flex items-center gap-2"
                >
                  {sending ? "Dispatching..." : "Send Announcement 🚀"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

