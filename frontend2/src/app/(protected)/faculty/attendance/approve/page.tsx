"use client";

import React, { useState } from "react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

interface PendingSession {
  id: string;
  subject_code: string;
  submitted_by: string;
  date: string;
  present_count: number;
  total_count: number;
}

const mockPending: PendingSession[] = [
  { id: "SESS_901", subject_code: "CS301", submitted_by: "CR Student (REG2024010)", date: "2026-07-22", present_count: 40, total_count: 45 },
  { id: "SESS_902", subject_code: "CS304", submitted_by: "CR Student (REG2024012)", date: "2026-07-21", present_count: 38, total_count: 42 },
];

export default function ApproveAttendancePage() {
  const [sessions, setSessions] = useState<PendingSession[]>(mockPending);
  const [actionMsg, setActionMsg] = useState("");

  function handleApprove(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setActionMsg(`Session ${id} approved successfully.`);
  }

  function handleReject(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setActionMsg(`Session ${id} rejected.`);
  }

  const columns: Column<PendingSession>[] = [
    {
      header: "Session ID",
      accessor: (item) => <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{item.id}</span>,
    },
    {
      header: "Subject Code",
      accessor: (item) => <span className="font-semibold">{item.subject_code}</span>,
    },
    {
      header: "Submitted By",
      accessor: (item) => <span className="text-xs text-muted-foreground">{item.submitted_by}</span>,
    },
    {
      header: "Date",
      accessor: (item) => <span className="text-xs text-muted-foreground">{item.date}</span>,
    },
    {
      header: "Ratio",
      accessor: (item) => (
        <Badge variant="primary">
          {item.present_count} / {item.total_count} ({Math.round((item.present_count / item.total_count) * 100)}%)
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleApprove(item.id)}
            className="rounded-lg bg-emerald-600 text-white px-3 py-1 text-xs font-bold hover:bg-emerald-700 transition-colors duration-150"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => handleReject(item.id)}
            className="rounded-lg bg-rose-600 text-white px-3 py-1 text-xs font-bold hover:bg-rose-700 transition-colors duration-150"
          >
            Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Approve Attendance Sessions
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Review and confirm class attendance submissions sent by Class Representatives (CRs).
        </p>
      </div>

      {actionMsg && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 p-4 text-xs font-bold text-emerald-700 dark:text-emerald-400">
          {actionMsg}
        </div>
      )}

      <DataTable
        columns={columns}
        data={sessions}
        keyExtractor={(item) => item.id}
        emptyMessage="No pending attendance submissions require approval."
      />
    </main>
  );
}
