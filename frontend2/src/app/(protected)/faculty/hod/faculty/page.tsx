"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";
import { apiFetch } from "@/lib/api";

interface FacultyItem {
  faculty_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  assigned_count?: number;
  photo_url?: string;
}

export default function HODFacultyListPage() {
  const [search, setSearch] = useState("");
  const [facultyList, setFacultyList] = useState<FacultyItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchFaculty() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: "50",
          ...(search ? { first_name: search } : {}),
        });
        const res = await apiFetch(`/faculty?${params.toString()}`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
          setFacultyList(list);
        }
      } catch (e) {
        // Fallback demo items
        setFacultyList([
          { faculty_id: "CSFAC01", first_name: "Prodipto", last_name: "Das", email: "pd@aus.ac.in", department: "CS", assigned_count: 3 },
          { faculty_id: "CSFAC02", first_name: "Pankaj Kumar", last_name: "Deva", email: "pankaj@aus.ac.in", department: "CS", assigned_count: 2 },
          { faculty_id: "CSFAC03", first_name: "Biswa Ranjan", last_name: "Roy", email: "brr@aus.ac.in", department: "CS", assigned_count: 2 },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchFaculty();
  }, [search]);

  const columns: Column<FacultyItem>[] = [
    {
      header: "Faculty ID",
      accessor: (item) => <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{item.faculty_id}</span>,
    },
    {
      header: "Name",
      accessor: (item) => (
        <div className="flex items-center gap-2.5">
          <FacultyAvatar
            firstName={item.first_name}
            lastName={item.last_name}
            photoUrl={item.photo_url}
            size="sm"
          />
          <span className="font-semibold text-foreground">{item.first_name} {item.last_name}</span>
        </div>
      ),
    },
    {
      header: "Email",
      accessor: (item) => <span className="text-xs text-muted-foreground">{item.email}</span>,
    },
    {
      header: "Department",
      accessor: (item) => <Badge variant="secondary">{item.department || "CS"}</Badge>,
    },
    {
      header: "Actions",
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/faculty/hod/faculty/assign-subject?faculty_id=${encodeURIComponent(item.faculty_id)}`}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-3 py-1.5 text-xs font-bold transition-colors duration-150 shadow-xs"
          >
            Assign Subjects
          </Link>
        </div>
      ),
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Faculty Directory & Workload Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Browse department teaching staff and launch subject assignment workspaces.
          </p>
        </div>

        <Link
          href="/faculty/hod/faculty/assign-subject"
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2.5 text-xs font-bold transition-colors duration-150 self-start sm:self-auto"
        >
          + Open Assign Workspace
        </Link>
      </div>

      {/* Search Bar */}
      <div className="solid-card rounded-2xl p-4 border border-border">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search faculty member by first name..."
          className="h-10 w-full max-w-md rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150"
        />
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={facultyList}
        keyExtractor={(item) => item.faculty_id}
        loading={loading}
        emptyMessage="No faculty records found."
      />
    </main>
  );
}
