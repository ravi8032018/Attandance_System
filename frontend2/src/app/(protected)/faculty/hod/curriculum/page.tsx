"use client";

import React, { useState, useEffect } from "react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api";

interface CurriculumSubject {
  subject_code: string;
  subject_name: string;
  department: string;
  semester: string;
}

export default function HODCurriculumPage() {
  const [semester, setSemester] = useState("4");
  const [department, setDepartment] = useState("CS");
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadCurriculum() {
      setLoading(true);
      try {
        const res = await apiFetch(`/curriculum?department=${encodeURIComponent(department)}&semester=${encodeURIComponent(semester)}`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const items = Array.isArray(data?.data) ? data.data : [];
          const list = items.flatMap((item: any) =>
            (item.subjects || []).map((s: any) => ({
              ...s,
              department: item.department || department,
              semester: item.semester || semester,
            }))
          );
          setSubjects(list);
        }
      } catch (e) {
        console.error("Failed to load curriculum subjects", e);
      } finally {
        setLoading(false);
      }
    }
    loadCurriculum();
  }, [semester, department]);

  const columns: Column<CurriculumSubject>[] = [
    {
      header: "Subject Code",
      accessor: (item) => <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{item.subject_code}</span>,
    },
    {
      header: "Subject Title",
      accessor: (item) => <span className="font-semibold text-foreground">{item.subject_name}</span>,
    },
    {
      header: "Department",
      accessor: (item) => <Badge variant="secondary">{item.department}</Badge>,
    },
    {
      header: "Semester",
      accessor: (item) => <span className="text-xs font-bold">Semester {item.semester}</span>,
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Curriculum Catalog
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Academic department subject pool and course structure.
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
        data={subjects}
        keyExtractor={(item) => item.subject_code}
        loading={loading}
        emptyMessage="No curriculum subjects found for selected semester and department."
      />
    </main>
  );
}
