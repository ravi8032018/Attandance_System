"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ContactCell } from "@/src/Contact_Cell";
import { apiFetch } from "@/src/api_fetch";

function qs(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && String(v).length > 0) p.set(k, String(v));
  }
  return p.toString();
}

export default function StudentsClient({ initialQuery }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Reflect external URL changes (back/forward) into state
  useEffect(() => {
    const next = {
      registration_no: sp.get("registration_no") ?? "",
      sem: sp.get("sem") ?? "",
      email: sp.get("email") ?? "",
      first_name: sp.get("first_name") ?? "",
      last_name: sp.get("last_name") ?? "",
      status: sp.get("status") ?? "",
      sort_by: sp.get("sort_by") ?? "created_at",
      sort_order: sp.get("sort_order") ?? "desc",
      page: Math.max(1, parseInt(sp.get("page") ?? "1", 10)),
      limit: Math.min(100, Math.max(5, parseInt(sp.get("limit") ?? "10", 10))),
    };
    setQuery(next);
  }, [sp]);

  function pushUrl(next) {
    router.replace(`?${qs(next)}`);
  }

  // Backend call: GET /student with mapped params
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr("");

      try {
        const base = process.env.NEXT_PUBLIC_API_BASE  ;
        const params = {
          skip: (query.page - 1) * query.limit,
          limit: query.limit,
          registration_no: query.registration_no,
          email: query.email,
          semester: query.sem,
          first_name: query.first_name,
          last_name: query.last_name,
          status: query.status,
          sort_by: query.sort_by,
          sort_order: query.sort_order,
        };
        const url = `${base}/student/my/?${qs(params)}`;
        console.log("URL: ",url);

        const res = await apiFetch(url, {
          credentials: "include", 
          headers: { Accept: "application/json" },
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg =
            typeof data?.detail === "string"
              ? data.detail
              : Array.isArray(data?.detail) && data.detail?.msg
              ? data.detail.msg
              : data?.message || "Failed to load students";
          throw new Error(msg);
        }

        if (cancelled) return;
        setRows(Array.isArray(data?.data) ? data.data : []);
        // prefer backend’s total_count; fallback to rows length
        setTotal(Number.isFinite(data?.total_count) ? data.total_count : (data?.data?.length ?? 0));
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load students");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [
    query.registration_no,
    query.sem,
    query.email,
    query.first_name,
    query.last_name,
    query.status,
    query.sort_by,
    query.sort_order,
    query.page,
    query.limit,
  ]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / query.limit)),
    [total, query.limit]
  );

  // Helpers to update filters and keep URL in sync
  function update(partial, resetPage = true) {
    const next = { ...query, ...partial };
    if (resetPage) next.page = 1;
    setQuery(next);
    pushUrl(next);
  }

  const setPage = (p) => update({ page: Math.max(1, Math.min(totalPages, p)) }, false);
  const setLimit = (n) => update({ limit: n }, true);

  return (
    <main className="p-6">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Students</h1>
          <p className="text-slate-500">Search, filter, and manage students.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={query.limit}
            onChange={(e) => setLimit(parseInt(e.target.value, 10))}
            className={`rounded-md border px-2 py-1 text-sm bg-[#ffffff] hover:drop-shadow-lg }`}
            aria-label="Rows per page"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              update({
                registration_no: "",
                email: "",
                first_name: "",
                last_name: "",
                status: "",
              })
            }
            className="rounded-md border h-7 w-auto text-center px-3 py-auto text-sm font-semibold text-gray-900 bg-blue-400 hover:drop-shadow-lg"
          >
            Clear
          </button>
        </div>
      </header>

      {/* Filters row */}
      <section className="mb-4 text-sm grid grid-cols-1 gap-3 lg:grid-cols-6">
        <div>
          <label className="mb-1 block font-medium text-slate-600">Registration no</label>
          <input
            value={query.registration_no}
            onChange={(e) => update({ registration_no: e.target.value })}
            placeholder="CSBSC20XXXXX"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-[#ffffff]"
          />
        </div>
        <div>
          <label className="mb-1 block font-medium text-slate-600">Sem</label>
          <input
            value={query.sem}
            onChange={(e) => update({ sem: e.target.value })}
            placeholder="1"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-[#ffffff]"
          />
        </div>
        <div>
          <label className="mb-1 block font-medium text-slate-600">Email</label>
          <input
            value={query.email}
            onChange={(e) => update({ email: e.target.value })}
            placeholder="student@gmail.com"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-[#ffffff]"
          />
        </div>
        <div>
          <label className="mb-1 block font-medium text-slate-600">First name</label>
          <input
            value={query.first_name}
            onChange={(e) => update({ first_name: e.target.value })}
            placeholder="Harry"
            className="w-full rounded-md border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200 bg-[#ffffff]"
          />
        </div>
        <div>
          <label className="mb-1 block font-medium text-slate-600">Last name</label>
          <input
            value={query.last_name}
            onChange={(e) => update({ last_name: e.target.value })}
            placeholder="Puttar"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-[#ffffff]"
          />
        </div>
        <div>
          <label className="mb-1 block font-medium text-slate-600">Status</label>
          <select
            value={query.status}
            onChange={(e) => update({ status: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-[#ffffff]"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </section>

      {/* Sort bar */}
      <section className="mb-3 flex flex-wrap items-center gap-2 ">
        <label className="text-sm font-medium text-slate-600">Sort by</label>
        <select
          value={query.sort_by}
          onChange={(e) => update({ sort_by: e.target.value }, false)}
          className="rounded-md border px-2 py-1 text-sm bg-[#ffffff]"
        >
          <option value="email">Email</option>
          <option value="registration_no">Registration no</option>
          <option value="first_name">First name</option>
          <option value="last_name">Last name</option>
          <option value="created_at">Created At</option>
        </select>
        <select
          value={query.sort_order}
          onChange={(e) => update({ sort_order: e.target.value }, false)}
          className="rounded-md border px-2 py-1 text-sm bg-[#ffffff]"
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>
      </section>

      {/* Table */}
      <section className=" bg-white border rounded-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed">

            <thead className="bg-slate-50 text-center text-xs uppercase text-slate-500 ">
              <tr className={`divide-y divide-gray-500`}>
                <th className="px-4 py-3">Registration no</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Sem</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Guardian email</th>
                <th className="px-4 py-3">Roll no</th>
                <th className="px-4 py-3 text-slate-50 table-cell border-gray-500 border-b-1">V</th>
              </tr>
            </thead>

            <tbody className="divide-y  divide-gray-200">
              {loading ? (
                Array.from({ length: query.limit }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-28 rounded bg-slate-200" />
                      </td>
                    ))}
                    <td className="px-4 py-3"></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-500">
                    No students found. Try different filters.
                  </td>
                </tr>
              ) : (
                rows.map((s, idx) => (
                  <tr key={s.registration_no ?? idx} className="text-center text-sm font-mono hover:bg-slate-50 ">
                    <td className="px-4 py-3 font-medium">{s.registration_no}</td>

                    <td className="px-auto py-auto transition-all duration-100 hover:underline  hover:underline-offset-2 hover:text-indigo-600 hover:font-semibold">
                      <a href={`mailto:${s.email}`}>
                        {s.email}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        {(s.first_name ?? "").trim()} {(s.last_name ?? "").trim()}
                      </div>
                    </td>
                    <td className="px-4 py-3">{s.semester ?? "—"}</td>
                    <td className="px-4 py-3">{s.course ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${
                          s.status === "active"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-400"
                            : "bg-amber-50 text-amber-700 ring-1 ring-amber-400"
                        }`}
                      >
                        {s.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ContactCell student={s} />
                    </td>
                    <td className="px-4 py-3">{s.guardian_email ?? "—"}</td>
                    <td className="px-4 py-3">{s.roll_number ?? "—"}</td>
                    <td className="px-3 py-3 text-center ">

                        <a
                          href={`get-student-by-id/${encodeURIComponent(
                            s.registration_no ?? ""
                          )}`}
                          className="text-indigo-600 hover:text-indigo-500 hover:underline"
                        >
                          Details
                        </a>
                      {/*</div>*/}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Error bar */}
        {err ? <div className="border-t bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</div> : null}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t bg-slate-50 px-4 py-2 text-sm">
          <div className="text-slate-600">
            {rows.length > 0
              ? `Showing ${(query.page - 1) * query.limit + 1}–${
                  (query.page - 1) * query.limit + rows.length
                } of ${total}`
              : `No results`}
          </div>
          <div className="flex items-center gap-2 ">
            <button
              className="rounded-md border px-1.5 py-0.5 bg-white hover:drop-shadow-md disabled:opacity-50"
              onClick={() => setPage(query.page - 1)}
              disabled={query.page <= 1}
              aria-label="Previous page"
            >
              &lt; Prev
            </button>
            <span className="px-2">
              Page {query.page} / {totalPages}
            </span>
            <button
              className="rounded-md border px-1.5 py-0.5 bg-white hover:drop-shadow-md disabled:opacity-50"
              onClick={() => setPage(query.page + 1)}
              disabled={query.page >= totalPages}
              aria-label="Next page"
            >
              Next &gt;
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
