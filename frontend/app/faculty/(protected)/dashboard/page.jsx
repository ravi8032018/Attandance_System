"use client";

import Link from "next/link";
import { SemesterPie } from "@/src/_hooks/charts";
import { StatCard } from "@/src/components/ui/StatCard";

export default function FacultyDashboardPage() {
  const semesters = [
    { id: "sem-5", name: "Semester 5", period: "Aug–Dec 2025", courses: 4, batches: 2, present: 62, absent: 28 },
    { id: "sem-6", name: "Semester 6", period: "Jan–May 2026", courses: 5, batches: 3, present: 78, absent: 14 },
  ];

  const batches = [
    { id: "CS-2023-A", program: "B.Tech CSE", year: "2023", size: 58 },
    { id: "CS-2022-B", program: "B.Tech CSE", year: "2022", size: 60 },
    { id: "IT-2023-A", program: "B.Tech IT", year: "2023", size: 55 },
  ];

  return (
    <main className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto min-h-screen bg-background text-foreground">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Faculty Dashboard
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Overview of active academic semesters, student batches, and live class attendance statistics.
        </p>
      </div>

      {/* Quick Metrics Banner */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Semesters"
          value="2"
          description="Aug 2025 – May 2026 term"
          icon="📚"
        />
        <StatCard
          title="Assigned Batches"
          value="3"
          description="173 total students"
          icon="🎓"
        />
        <StatCard
          title="Avg Attendance"
          value="76.5%"
          trend={{ value: "+2.4%", positive: true }}
          description="vs previous month"
          icon="📊"
        />
        <StatCard
          title="Pending Approvals"
          value="4"
          description="Attendance sessions awaiting review"
          icon="✅"
        />
      </section>

      {/* Active Semesters Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Current Semesters
          </h2>
          <Link href="/faculty/attendance/take" className="text-xs font-semibold text-primary hover:underline">
            Take Class Attendance →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {semesters.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-border bg-card p-5 shadow-xs transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">{s.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.period}</p>
                  
                  <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                    <p>
                      Courses Assigned: <span className="font-semibold text-foreground">{s.courses}</span>
                    </p>
                    <p>
                      Active Batches: <span className="font-semibold text-foreground">{s.batches}</span>
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-center">
                  <SemesterPie present={s.present} absent={s.absent} h={14} w={14} />
                  <span className="mt-1 text-[11px] font-medium text-muted-foreground">Semester Attendance</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Batches Roster Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Assigned Student Batches
          </h2>
          <Link href="/faculty/list_students" className="text-xs font-semibold text-primary hover:underline">
            View Student Directory →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-border bg-card p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-foreground">{b.id}</h3>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    {b.year}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">{b.program}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Total Strength: <span className="font-semibold text-foreground">{b.size} Students</span>
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                <Link
                  href="/faculty/list_students"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View Students →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
