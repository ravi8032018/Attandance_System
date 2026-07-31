"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";

export default function CRConsolePage() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState("");

  function handleStartSession(e: React.FormEvent) {
    e.preventDefault();
    const cleanToken = tokenInput.trim();
    if (!cleanToken) {
      setError("Please enter a valid attendance session token.");
      return;
    }
    router.push(`/student/cr/attendance/take?token=${encodeURIComponent(cleanToken)}`);
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="primary">CR Console</Badge>
            <Badge variant="secondary">Class Representative</Badge>
          </div>
          <h1 className="text-3xl sm:text-3xl font-black text-foreground tracking-tight">
            CR's Attendance Marking Console
          </h1>
          <p className="text-sm sm:text-sm text-muted-foreground mt-0.5">
            Enter the attendance ping session token issued by your subject faculty to mark class attendance.
          </p>
        </div>
      </div>

      <div className="solid-card rounded-2xl p-6 sm:p-8 border border-border space-y-6 bg-card shadow-xs">
        <div className="space-y-2">
          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <span>🔑 Enter Attendance Session Token</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Faculty members generate temporary attendance tokens during class sessions and transmit them to the Class Representative.
          </p>
        </div>

        <form onSubmit={handleStartSession} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">
              Attendance Token / Passcode
            </label>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => {
                setTokenInput(e.target.value);
                setError("");
              }}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000 or Passcode"
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
            />
            {error && <p className="text-xs font-bold text-rose-500 mt-1.5">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold text-xs transition-all shadow-xs active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>Launch Attendance Roster →</span>
          </button>
        </form>

        <div className="pt-4 border-t border-border/60 text-xs text-muted-foreground space-y-2">
          <h4 className="font-bold text-foreground">💡 How CR Attendance Marking Works:</h4>
          <ol className="list-decimal list-inside space-y-1 text-[11px] font-medium leading-relaxed">
            <li>Faculty initiates an active attendance ping session for a course.</li>
            <li>Faculty shares the unique session token link with the Class Representative.</li>
            <li>Paste or enter the token above to launch the live class roster.</li>
            <li>Mark students as Present/Absent and submit before the timer expires.</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
