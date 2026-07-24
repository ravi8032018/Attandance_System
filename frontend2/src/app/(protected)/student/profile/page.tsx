"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";

export default function StudentProfilePage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Student Profile
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Academic registration details and personal information.
        </p>
      </div>

      <div className="solid-card rounded-2xl p-6 border border-border space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-border">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white text-2xl font-bold">
            S
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-foreground">Student User</h2>
            <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">REG2024001</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="primary">Computer Science</Badge>
              <Badge variant="secondary">Semester 4</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Registration Number</span>
            <span className="text-sm font-mono font-bold text-foreground">REG2024001</span>
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Roll Number</span>
            <span className="text-sm font-semibold text-foreground">CS2401</span>
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Department</span>
            <span className="text-sm font-semibold text-foreground">Computer Science & Engineering</span>
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Email Address</span>
            <span className="text-sm font-semibold text-foreground">student@academic.edu</span>
          </div>
        </div>
      </div>
    </main>
  );
}
