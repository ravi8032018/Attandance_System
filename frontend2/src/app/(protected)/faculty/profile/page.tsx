"use client";

import React from "react";
import { useFacultyMe } from "@/hooks/useFacultyMe";
import { Badge } from "@/components/ui/Badge";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";

export default function FacultyProfilePage() {
  const { faculty, isHod, loading } = useFacultyMe();

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Faculty Profile
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Personal academic credentials, department role, and teaching details.
        </p>
      </div>

      {loading ? (
        <div className="solid-card rounded-2xl p-6 border border-border animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Card */}
          <div className="solid-card rounded-2xl p-6 border border-border space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-border">
              <FacultyAvatar
                firstName={faculty?.first_name}
                lastName={faculty?.last_name}
                photoUrl={faculty?.photo_url}
                size="3xl"
              />
              <div>
                <h2 className="text-xl font-extrabold text-foreground">
                  {faculty ? `${faculty.first_name} ${faculty.last_name}` : "Faculty Member"}
                </h2>
                <p className="text-xs font-semibold text-muted-foreground">{faculty?.email || "faculty@academic.edu"}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="primary">{faculty?.department || "Computer Science"}</Badge>
                  {isHod && <Badge variant="warning">Head of Department (HOD)</Badge>}
                  <Badge variant="success">Active Status</Badge>
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Faculty ID</label>
                <p className="mt-1 font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">{faculty?.faculty_id || "CSFAC01"}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Department</label>
                <p className="mt-1 text-sm font-semibold text-foreground">{faculty?.department || "Computer Science & Engineering"}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Designation</label>
                <p className="mt-1 text-sm font-semibold text-foreground">{isHod ? "Head of Department (HOD) / Senior Professor" : "Assistant Professor"}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Contact Email</label>
                <p className="mt-1 text-sm font-semibold text-foreground">{faculty?.email || "faculty@academic.edu"}</p>
              </div>
            </div>
          </div>

          {/* Teaching Load */}
          <div className="solid-card rounded-2xl p-6 border border-border space-y-4">
            <h3 className="text-base font-bold text-foreground">Current Teaching Assignments</h3>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-xl bg-slate-100 dark:bg-slate-800 border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
                CS301 • Data Structures (Sem 4)
              </span>
              <span className="rounded-xl bg-slate-100 dark:bg-slate-800 border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
                CS304 • Database Management (Sem 4)
              </span>
              <span className="rounded-xl bg-slate-100 dark:bg-slate-800 border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
                CS308 • Operating Systems (Sem 4)
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
