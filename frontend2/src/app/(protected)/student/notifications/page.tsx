"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";

export default function StudentNotificationsPage() {
  const notifications = [
    { id: 1, title: "Attendance Session Recorded", desc: "Your attendance for CS301 (Data Structures) on 2026-07-22 was marked Present.", date: "Today", type: "success" },
    { id: 2, title: "Attendance Warning Flag", desc: "Your attendance for CS308 (Operating Systems) is currently at 70%. Maintain >75% for exam eligibility.", date: "Yesterday", type: "warning" },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Notifications & Alerts
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Academic warnings, session updates, and department notices.
        </p>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div key={n.id} className="solid-card rounded-2xl p-4 border border-border flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm font-bold text-foreground">{n.title}</h2>
                <Badge variant={n.type === "success" ? "success" : "warning"}>{n.type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{n.desc}</p>
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0 font-medium">{n.date}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
