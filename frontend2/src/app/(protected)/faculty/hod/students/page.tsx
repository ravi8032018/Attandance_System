"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Student } from "@/lib/types";
import { apiFetch } from "@/lib/api";

export default function HODStudentsPage() {
  const [semester, setSemester] = useState("4");
  const [department, setDepartment] = useState("CS");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadStudents() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ semester, department, limit: "50" });
        const res = await apiFetch(`/student/my/?${params.toString()}`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setStudents(Array.isArray(data?.data) ? data.data : []);
        }
      } catch (e) {
        console.error("Failed to load students", e);
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [semester, department]);

  const columns: Column<Student>[] = [
    {
      header: "Registration No",
      accessor: (item) => <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{item.registration_no}</span>,
    },
    {
      header: "Name",
      accessor: (item) => <span className="font-semibold text-foreground">{item.first_name} {item.last_name}</span>,
    },
    {
      header: "Roll No",
      accessor: (item) => <span className="text-xs text-muted-foreground">{item.roll_number || "—"}</span>,
    },
    {
      header: "Email",
      accessor: (item) => <span className="text-xs text-muted-foreground">{item.email}</span>,
    },
    {
      header: "Status",
      accessor: () => <Badge variant="success">Active</Badge>,
    },
    {
      header: "Details",
      accessor: (item) => (
        <Link
          href={`/faculty/get-student-by-id?reg=${item.registration_no}`}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          View Profile →
        </Link>
      ),
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Department Student Roster
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          HOD oversight directory for enrolled department students.
        </p>
      </div>

      <div className="solid-card rounded-2xl p-4 border border-border grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Semester</label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150"
          >
            {["1", "2", "3", "4", "5", "6", "7", "8"].map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150"
          >
            {["CS", "CSE", "ECE", "AGRI"].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={students}
        keyExtractor={(item) => item.registration_no}
        loading={loading}
        emptyMessage="No student records found."
      />
    </main>
  );
}
