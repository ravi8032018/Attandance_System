// app/faculty/attendance/page.jsx
"use client";

import React  from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/src/api_fetch";
import { useState } from "react";

function StudentRow({ student, checked, onToggle }) {
  return (
    <label className="flex items-center justify-between rounded-md border bg-[#f0f0ff] border-slate-200 px-3 py-2 ">
      <span className="w-30 text-md block text-slate-900">
        {(student.first_name + " " + student.last_name) || student.registration_no}
      </span>
      <span className="text-sm block text-slate-800">{student.registration_no}
      </span>
      <span className={"gap-3 flex text-xs font-medium " + (checked ? "text-green-700" : "text-rose-700")}>
        {checked ? "present" : "absent"}
        <input
          type="checkbox"
          className="h-4 w-4 accent-indigo-600"
          checked={checked}
          onChange={() => onToggle(student.registration_no)}
          aria-label={`Mark ${student.registration_no} present`}
        />
      </span>
    </label>
  );
}

export default function FacultyAttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [info, setInfo] = React.useState("");
  const [query, setQuery] = React.useState("");

  // Metadata required by backend
  const [subjectCode, setSubjectCode] = React.useState("");
  const [subjects, setSubjects] = React.useState([]);
  const [department, setDepartment] = React.useState("");
  const [sem, setSem] = React.useState("");
  const [classDate, setClassDate] = React.useState(() => new Date().toISOString().slice(0, 16));

  // Dynamic roster from backend
  const [students, setStudents] = React.useState([]);
  const [presentSet, setPresentSet] = React.useState(() => new Set());

  // Build query string helper
  function qs(obj) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined && v !== null && String(v).length > 0) p.set(k, String(v));
    }
    return p.toString();
  }

  // Auto-dismiss error after 7 seconds
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 7000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Auto-dismiss info after 7 seconds
  React.useEffect(() => {
    if (info) {
      const timer = setTimeout(() => setInfo(''), 7000);
      return () => clearTimeout(timer);
    }
  }, [info]);

  // Fetch roster whenever filters change (requires all four fields)
  React.useEffect(() => {
    let ignore = false;

    async function loadRoster() {
      try {
        setLoading(true);
        setError("");

        const api = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
        // Adjust the path and param keys to match your backend
        const params = qs({
          department: department,
          semester: sem,                 
          subject_code: subjectCode,
        });
        console.log(params);
        const apiRosterUrl = `${api}/student/?${params}`;
        // console.log("Roster URL:", apiRosterUrl);
        console.log("--> apiRosterURL: ", apiRosterUrl);

        const res = await apiFetch(apiRosterUrl, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const api_response = await res.json().catch(() => ({}));
        console.log("--> API response : ", api_response);

        if (!res.ok) {
          const msg =
            (typeof api_response?.detail === "string" && api_response.detail) ||
            (Array.isArray(api_response?.detail) && api_response.detail?.msg) ||
            api_response?.message ||
            "Failed to load roster";
          throw new Error(msg);
        }

        if (ignore) return;


      // Your API shape: { data: [...], total_count, page, limit }
      const list = Array.isArray(api_response?.data) ? api_response.data : [];
      setStudents(list);
      setPresentSet(new Set()); // clear selections when roster changes
      } catch (e) {
        if (!ignore) {
          setStudents([]);
          setPresentSet(new Set());
          setError(e?.message || "Failed to load roster");
          }
        } finally {
          if (!ignore) setLoading(false);
        }
      }


    // Only fetch when all metadata is provided #
    if (department || sem || subjectCode ) {
    // if (true) {     // for testing only
      console.log("--> all reqs ok loading roster");
      loadRoster();
    } else {
      console.log("--> reqs not ok not loading roster: ", department, sem, subjectCode);
      setStudents([]);
      setPresentSet(new Set());
    }

    return () => {
      ignore = true;
    };
  }, [department, sem, subjectCode]); // re-fetch on changes [1]

  // Fetch subjects whenever filters change
  React.useEffect(() => {
    let ignore = false;

  async function loadSubjects() {
    if (!department && !sem) {
      setSubjects([]);
      return;
    }
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
      const params = qs({ department, semester: sem });
      const res = await apiFetch(`${api}/curriculum?${params}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const data = await res.json();
      console.log("--> Subjects API raw : ", data);

      if (!res.ok) throw new Error(data?.detail || "Failed to load subjects");
      if (ignore) return;

      // data = { data: [ { subjects: [...] } ] }
      const curriculumList = Array.isArray(data?.data) ? data.data : [];
      const allSubjects = curriculumList.flatMap(item => item.subjects || []);

      console.log("--> Subjects array used for dropdown : ", allSubjects);
      setSubjects(allSubjects);
    } catch (e) {
      if (!ignore) {
        setSubjects([]);
        console.error(e);
      }
    }
  }

  loadSubjects();
  return () => { ignore = true; };
  }, [department, sem]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        ((s.first_name) || "").toLowerCase().includes(q) ||
        (s.registration_no || "").toLowerCase().includes(q)
    );
  }, [students, query]);

  const allSelected =
    filtered.length > 0 && filtered.every((s) => presentSet.has(s.registration_no));
  const anySelected = filtered.some((s) => presentSet.has(s.registration_no));

  function toggleAllFiltered(filteredList, allSelectedNow) {
    setPresentSet((prev) => {
      const next = new Set(prev);
      if (allSelectedNow) {
        filteredList.forEach((s) => next.delete(s.registration_no));
      } else {
        filteredList.forEach((s) => next.add(s.registration_no));
      }
      return next;
    });
  }

  function toggle(regNo) {
    setPresentSet((prev) => {
      const next = new Set(prev);
      if (next.has(regNo)) next.delete(regNo);
      else next.add(regNo);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const payload = {
        subject_code: subjectCode,
        department: department,
        semester: sem,
        class_date: new Date(classDate).toISOString(),
        attendance_data: students.map((s) => ({
          registration_no: s.registration_no,
          status: presentSet.has(s.registration_no) ? "present" : "absent",
        })),
      };

      const api = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
      const res = await fetch(`${api}/attendance/mark-by-faculty`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to mark attendance");
      }
      const api_response = await res.json();

      setInfo(
        `Attendance saved • Session: ${api_response.session_id || "N/A"} • Status: ${
          api_response.status || "ok"
        }`
      );
      // Optional: router.replace("/faculty/dashboard"); router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving attendance");
    } finally {
      setSaving(false);
      router.push("/faculty/dashboard"); // refresh page to reset state and show updated attendance if needed
    }
  }

  function PingCRButton({
    subjectCode,
    department,
    semester,
    class_date,
    setError,
    setInfo,
  }) {
  const [loading, setLoading] = useState(false);
  const canPing = subjectCode.trim() && department.trim() && semester.trim() && class_date;
  const api = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  const handlePingCR = async () => {
    // validate required fields for Ping CR
    if (!subjectCode.trim() || !department.trim() || !semester.trim() || !class_date) {
      setError("Please select Department, Semester, Subject and Class date/time before pinging CR.");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");

    try {
      const res = await apiFetch(
        `${api}/attendance/initiate-for-cr`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            subject_code: subjectCode,
            department: department,
            semester: semester,
            class_date: new Date(class_date).toISOString(),
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Failed to initiate CR attendance");
      }

      const data = await res.json();
      console.log("initiate-for-cr response", data);
      setInfo("Ping sent to CR successfully.");
    } catch (e) {
      setError(e.message ?? "Error initiating CR attendance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePingCR}
      disabled={loading || !canPing}
      className="w-auto text-white block rounded-md border px-3 py-2 text-md outline-none focus:ring-2 focus:ring-indigo-200 bg-green-700 hover:bg-green-600 disabled:bg-gray-400 "
    >
      {loading ? "Pinging CR..." : "Ping CR"}
    </button>
    );
  }

  const requiredOk =
    subjectCode.trim() &&
    department.trim() &&
    sem.trim() &&
    classDate;

  return (
    <main className="p-4 md:p-6 bg-slate-100">
      <div className="mx-auto">
        <header className="mb-6 flex justify-between  gap-2">
          <div className="text-sm text-slate-500">
            <h1 className="text-2xl font-semibold text-slate-900 pb-2">
              Mark Attendance
            </h1>
            <p className="text-sm text-slate-600">
              Select students who are present. Unchecked will be marked absent.
            </p>
          </div>
          <div className="pt-2" title="Initiate attendance for CR">
            <PingCRButton
              subjectCode={subjectCode}
              department={department} 
              semester={sem}
              class_date={classDate}
              setError={setError}
              setInfo={setInfo}
            ></PingCRButton>
          </div>
        </header>

        {/* Alerts */}
        {error && (
          <div
            role="alert"
            className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700"
          >
            {error}
          </div>
        )}
        {info && (
          <div
            role="status"
            className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700"
          >
            {info}
          </div>
        )}

        {/* Filter Tabs */}
      <section className="mb-4 flex flex-col gap-4 md:flex-row-1 md:gap-2 lg:flex-row">
        {/* Dept + Sem grouped */}
        <div className="flex flex-col gap-3 md:flex-row md:flex-[2]">
          <div id="dept" className="flex flex-col gap-1 md:flex-1 min-w-[140px]">
            <label className="text-sm text-slate-600">Department</label>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value?.toUpperCase())}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-[#ffffff]"
              placeholder="CSE"
            />
          </div>

          <div id="sem" className="flex flex-col gap-1 md:flex-1 min-w-[100px]">
            <label className="text-sm text-slate-600">Semester</label>
            <input
              value={sem}
              onChange={(e) => setSem(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-[#ffffff]"
              placeholder="3"
            />
          </div>
        </div>

        {/* Subject */}
        <div id="subj" className="flex flex-col gap-1 md:flex-[3] min-w-[220px]">
          <label className="text-sm text-slate-600">Subject</label>
          <select
            value={subjectCode}
            onChange={(e) => setSubjectCode(e.target.value)}
            className="w-full h-9.5 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-[#ffffff]"
          >
            <option value="">Select subject</option>
            {subjects.map((subj) => (
              <option key={subj.subject_code} value={subj.subject_code}>
                {`${subj.subject_code} - ${subj.subject_name}`}
              </option>
            ))}
          </select>
        </div>

        {/* Class date/time */}
        <div id="class-date/time" className="flex flex-col gap-1 md:flex-[2] min-w-[200px]">
          <label className="text-sm text-slate-600">Class date/time</label>
          <input
            type="datetime-local"
            value={classDate}
            onChange={(e) => setClassDate(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-[#ffffff]"
          />
        </div>
      </section>


        {/* Controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder="Search by reg no or name"
              className="lg:w-64 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-[#ffffff]"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search students"
            />
            <button
              type="button"
              onClick={() => setPresentSet(new Set())}
              className="w-16 text-white block rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-indigo-600 hover:bg-indigo-500"
              title="Clear selections"
            >
              Clear
            </button>
          </div>

          {/* Master checkbox */}
          {(() => {
            const ref = React.useRef(null);
            React.useEffect(() => {
              if (ref.current) {
                ref.current.indeterminate = !allSelected && anySelected;
              }
            }, [allSelected, anySelected]);

            return (
              <label className="inline-flex items-center gap-2 pr-4 select-none">
                <span className="text-sm text-slate-700">
                  {allSelected
                    ? "All selected"
                    : anySelected
                    ? "Some selected"
                    : "None selected"}
                </span>
                <input
                  ref={ref}
                  type="checkbox"
                  className="h-4 w-4 accent-indigo-600"
                  checked={allSelected}
                  onChange={() => toggleAllFiltered(filtered, allSelected)}
                  aria-checked={allSelected ? "true" : anySelected ? "mixed" : "false"}
                  aria-label="Select all visible students"
                  title={
                    allSelected
                      ? "Uncheck all visible"
                      : anySelected
                      ? "Check remaining visible"
                      : "Check all visible"
                  }
                />
              </label>
            );
          })()}
        </div>

        {/* List + Submit */}
        <form onSubmit={handleSubmit} className="flex h-fit flex-col gap-1">
          <div className="mt-3 max-h-[45vh] overflow-y-auto rounded-md border border-slate-200">
            <ul className="divide-y-2 p-0.5 border rounded-md divide-slate-300">
              {loading ? (
                <div className="rounded-md border border-slate-200 px-3 py-6 text-center text-slate-500">
                  Loading Students...
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-md border border-slate-200 px-3 py-6 text-center text-slate-500">
                  No students found
                </div>
              ) : (
                filtered.map((s) => (
                  <li key={s.registration_no}>
                    <StudentRow
                      student={s}
                      checked={presentSet.has(s.registration_no)}
                      onToggle={toggle}
                    />
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="min-w-full sticky bottom-0 mt-3 flex items-center justify-between rounded-md bg-white/70 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/50">
            <div className="text-sm text-slate-600">
              Present: {presentSet.size} / {students.length}
            </div>
            <button
              type="submit"
              disabled={saving || !requiredOk || students.length === 0}
              className={
                "rounded-md px-4 py-2 text-sm font-medium " +
                (saving || !requiredOk || students.length === 0
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-500")
              }
              aria-busy={saving}
              title={!requiredOk ? "Fill all required fields" : undefined}
            >
              {saving ? "Saving…" : "Save attendance"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
