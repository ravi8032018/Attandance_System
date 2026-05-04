"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/src/api_fetch";
import { ContactCell } from "@/src/Contact_Cell"; // optional, if you want same contact UI

type Faculty = {
  faculty_id: string;
  email: string;
  first_name: string;
  last_name: string;
  dob?: string;
  gender?: string;
  contact_number?: string;
  photo_url?: string;
  profile_complete?: boolean;
  department?: string;
  designation?: string;
  joining_date?: string;
  role?: string[];
  status?: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
};

export default function FacultyProfilePage() {
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // fetch faculty profile
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr("");
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE  ;
        const url = `${base}/faculty/me`;

        const res = await apiFetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        const data = await res.json().catch(() => ({}));
        console.log("--> faculty data:", data);

        if (!res.ok) {
          const msg =
            typeof data?.detail === "string"
              ? data.detail
              : data?.message || "Failed to load faculty profile";
          throw new Error(msg);
        }

        if (cancelled) return;
        setFaculty(data);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load faculty profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const fullName = useMemo(() => {
    const fn = (faculty?.first_name ?? "").trim();
    const ln = (faculty?.last_name ?? "").trim();
    return [fn, ln].filter(Boolean).join(" ") || "—";
  }, [faculty]);

  const primaryRole = useMemo(
    () => (faculty?.role && faculty.role.length ? faculty.role.join(", ") : "—"),
    [faculty]
  );

  function formatDate(value?: string) {
    if (!value) return "—";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleDateString();
  }

  return (
    <main className="p-4 h-full bg-[#f2f5f9]">
      {/* Breadcrumbs */}
      <nav className="mb-4 text-md text-foreground ">
        <Link href="/faculty/dashboard" className="hover:underline">
          Dashboard
        </Link>
        <span className="mx-1">/</span>
        <span className="text-foreground">My profile</span>
      </nav>

      {/* Header card */}
      <section className="mb-4 p-4 shadow-sm hover:shadow-lg rounded-2xl border border-border bg-card px-5 py-4">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 w-60 rounded bg-muted" />
            <div className="mt-2 h-4 w-96 rounded bg-muted" />
          </div>
        ) : err ? (
          <div className="text-error">{err}</div>
        ) : faculty ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: avatar + identity */}
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="relative">
                {faculty.photo_url ? (
                  <img
                    src={faculty.photo_url}
                    alt={`${fullName} photo`}
                    className="h-29 w-55 rounded-full object-cover ring-1 ring-gray-300"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full grid place-items-center ring-2 ring-border bg-primary/20 text-primary">
                    <span className="font-semibold">
                      {(faculty.first_name || "").charAt(0).toUpperCase()}
                      {(faculty.last_name || "").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Identity text */}
              <div className="mt-1 text-sm">
                <h1 className="text-2xl font-semibold">{fullName}</h1>
                <p className="mt-0.5 text-muted-foreground">
                  Faculty ID:{" "}
                  <span className="font-medium">{faculty.faculty_id ?? "—"}</span>
                  <br />
                  Department: {faculty.department ?? "—"}
                  <br />
                  Designation: <span className="font-base">{faculty.designation ?? "—"}</span>
                </p>
              </div>
            </div>

            {/* Right side actions / status */}
            <div className="flex flex-col justify-between items-end gap-2 ">
              <div className="flex gap-3 ">
                {/* If you have a faculty profile update page */}
                <button
                  onClick={() => (window.location.href = "/faculty/update-profile")}
                  className="text-sm bg-primary text-white rounded-xl px-5 py-2.5 hover:hover:opacity-90"
                >
                  Update Profile
                </button>
              </div>
              <div className="inline-flex items-center gap-2 mt-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    faculty.status === "active"
                      ? "bg-success/10 text-success border border-emerald-200"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  Status: {faculty.status ?? "—"}
                </span>
                {faculty.profile_complete && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary border border-indigo-200">
                    Profile complete
                  </span>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">No profile found.</div>
        )}
      </section>

      {/* Details card */}
      <section className="grid grid-cols-1 gap-0 lg:grid-cols-3">
        <div className="lg:col-span-2 border p-4 hover:shadow-lg rounded-2xl border-border bg-card px-5 py-4 shadow-sm max-w-200">
          <h2 className="mb-3 text-base font-semibold">Faculty details</h2>
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-4 w-64 rounded bg-muted" />
              ))}
            </div>
          ) : faculty ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="text-md transition-all duration-100 hover:underline hover:underline-offset-2 hover:text-primary hover:font-semibold">
                  <a href={`mailto:${faculty.email}`}>{faculty.email ?? "—"}</a>
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Contact</dt>
                <dd className="text-md">
                  {faculty.contact_number ? (
                    <a
                      href={`tel:${faculty.contact_number}`}
                      className="hover:underline hover:text-primary"
                    >
                      {faculty.contact_number}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Gender</dt>
                <dd className="text-md">
                  {faculty.gender ? faculty.gender.toUpperCase() : "—"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Date of birth</dt>
                <dd className="text-md">{formatDate(faculty.dob)}</dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Joining date</dt>
                <dd className="text-md">{formatDate(faculty.joining_date)}</dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Roles</dt>
                <dd className="text-md">
                  {faculty.role && faculty.role.length ? faculty.role.join(", ") : "—"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Created at</dt>
                <dd className="text-md">{formatDate(faculty.created_at)}</dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Last updated</dt>
                <dd className="text-md">{formatDate(faculty.updated_at)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No data.</p>
          )}
        </div>
      </section>
    </main>
  );
}
