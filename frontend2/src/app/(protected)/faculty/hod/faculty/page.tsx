"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";
import { apiFetch } from "@/lib/api";
import { formatFacultyName } from "@/lib/utils";

interface FacultyItem {
  faculty_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  designation?: string;
  status?: string;
  assigned_count?: number;
  photo_url?: string;
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function UsersIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

export default function HODFacultyListPage() {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [facultyList, setFacultyList] = useState<FacultyItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchFaculty() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: "100",
          ...(search ? { first_name: search } : {}),
        });
        const res = await apiFetch(`/faculty?${params.toString()}`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
          setFacultyList(list);
        }
      } catch (e) {
        setFacultyList([
          { faculty_id: "CSFAC01", first_name: "Prodipto", last_name: "Das", email: "pd@aus.ac.in", department: "CS", designation: "Assistant Professor", assigned_count: 3 },
          { faculty_id: "CSFAC02", first_name: "Pankaj Kumar", last_name: "Deva", email: "pankaj@aus.ac.in", department: "CS", designation: "Assistant Professor", assigned_count: 2 },
          { faculty_id: "CSFAC03", first_name: "Biswa Ranjan", last_name: "Roy", email: "brr@aus.ac.in", department: "CS", designation: "Assistant Professor", assigned_count: 2 },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchFaculty();
  }, [search]);

  const filteredFaculty = facultyList.filter((f) => {
    if (departmentFilter !== "all" && f.department?.toUpperCase() !== departmentFilter.toUpperCase()) {
      return false;
    }
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const fullName = `${f.first_name || ""} ${f.last_name || ""}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (f.faculty_id && f.faculty_id.toLowerCase().includes(q)) ||
      (f.email && f.email.toLowerCase().includes(q))
    );
  });

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <UsersIcon className="text-indigo-600 dark:text-indigo-400" />
            <span>Faculty Registry & Workload</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Academic faculty directory, subject assignments, and live attendance metrics. Click any card to open detailed faculty analytics.
          </p>
        </div>

        <Link
          href="/faculty/hod/faculty/assign-subject"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95 self-start sm:self-auto"
        >
          <span>+ Assign Subjects</span>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="solid-card rounded-2xl p-4 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-1">
              Department
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-10 w-full sm:w-40 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Depts</option>
              <option value="CS">Computer Science (CS)</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="AGRI">AGRI</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search faculty name, ID, or email..."
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Faculty Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Loading faculty members directory...
        </div>
      ) : filteredFaculty.length === 0 ? (
        <div className="solid-card rounded-2xl p-12 text-center space-y-2 border border-border">
          <div className="text-3xl">👨‍🏫</div>
          <h2 className="text-base font-bold text-foreground">No Faculty Members Found</h2>
          <p className="text-xs text-muted-foreground">
            No faculty members match your search criteria. Try modifying your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredFaculty.map((f) => {
            const rawFullName = `${f.first_name || ""} ${f.last_name || ""}`.trim();
            const formattedName = formatFacultyName(rawFullName);

            return (
              <div
                key={f.faculty_id}
                className="solid-card rounded-2xl border border-border p-5 hover:border-indigo-500/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between group relative bg-card space-y-4"
              >
                <div className="space-y-3">
                  {/* Top ID & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                      {f.faculty_id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="primary">{f.department || "CS"}</Badge>
                      <Badge variant={f.status === "inactive" ? "error" : "success"}>
                        {f.status || "Active"}
                      </Badge>
                    </div>
                  </div>

                  {/* Avatar & Name formatted with Dr. prefix */}
                  <div className="flex items-center gap-3 pt-1">
                    <FacultyAvatar
                      firstName={f.first_name}
                      lastName={f.last_name}
                      photoUrl={f.photo_url}
                      size="lg"
                    />
                    <div className="truncate">
                      <h3 className="text-base font-black text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {formattedName}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">{f.email}</p>
                      <span className="text-[11px] font-semibold text-muted-foreground/80 block mt-0.5">
                        {f.designation || "Assistant Professor"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Links */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-xs font-bold">
                  <Link
                    href={`/faculty/hod/faculty/${encodeURIComponent(f.faculty_id)}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    View Details & Analytics →
                  </Link>

                  <Link
                    href={`/faculty/hod/faculty/assign-subject?faculty_id=${encodeURIComponent(f.faculty_id)}`}
                    className="text-muted-foreground hover:text-foreground bg-muted px-2.5 py-1 rounded-lg border border-border"
                  >
                    Assign Subject
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
