'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/src/api_fetch';

export default function FacultyCRApprovalsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const router = useRouter();
  const [subjectNameMap, setSubjectNameMap] = useState<Record<string, string>>({});

    // Build query string helper
  function qs(obj) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined && v !== null && String(v).length > 0) p.set(k, String(v));
    }
    return p.toString();
  }

  useEffect(() => {
    async function loadPending() {
      try {
        setLoading(true);
        setError('');
        const api = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
        const res = await apiFetch(`${api}/attendance/approvals`, {
          method: 'GET',
          credentials: 'include',
        });
        const data = await res.json().catch(() => []);
        console.log('data :', data);
        console.log('data["items"] :', data["items"]);
        console.log('is data of type array :', Array.isArray(data));

        if (!res.ok) {
          throw new Error(data.detail ?? 'Failed to load pending CR attendance sessions');
        }
        setSessions(Array.isArray(data["items"]) ? data["items"] : []);
      } catch (e: any) {
        setError(e.message ?? 'Error loading pending sessions');
      } finally {
        setLoading(false);
      }
    }
    loadPending();
  }, []);

  // Fetch subjects whenever filters change
  useEffect(() => {
  let ignore = false;

  async function loadSubjectsNames() {
    if (sessions.length === 0) return;

    const api = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

    // Collect unique (department, semester) pairs
    const seen = new Set<string>();
    const combos: { department: string; semester: string }[] = [];

    sessions.forEach((s: any) => {
      const key = `${s.department}::${s.semester}`;
      if (!seen.has(key)) {
        seen.add(key);
        combos.push({ department: s.department, semester: s.semester });
      }
    });

    const newMap: Record<string, string> = {};

    for (const combo of combos) {
      const params = qs({ department: combo.department, semester: combo.semester });
      try {
        const res = await apiFetch(`${api}/curriculum?${params}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });

        const data = await res.json();
        console.log('--> Subjects API raw : ', data);

        if (!res.ok) throw new Error(data?.detail || 'Failed to load subjects');
        if (ignore) return;

        // data = { data: [ { subjects: [...] } ] }
        const curriculumList = Array.isArray(data?.data) ? data.data : [];
        const subjectsArray = curriculumList.flatMap((item: any) => item.subjects || []);

        for (const subj of subjectsArray) {
          if (subj.subject_code && subj.subject_name) {
            newMap[subj.subject_code] = subj.subject_name;
          }
        }
      } catch (e) {
        if (!ignore) {
          console.error('Error loading subjects for', combo, e);
        }
      }
    }

    console.log('--> Final subjectNameMap : ', newMap);

    if (!ignore) {
      setSubjectNameMap((prev) => ({ ...prev, ...newMap }));
    }
  }

  loadSubjectsNames();
  return () => {
    ignore = true;
  };
}, [sessions]);
    
  const usedSubjectNameMap = useMemo(() => {
    if (!sessions.length) return {};

    const result: Record<string, string> = {};

    sessions.forEach((s: any) => {
        const code = s.subject_code;
        const name = subjectNameMap[code];
        if (code && name) {
        result[code] = name;
        }
    });
    console.log('--> usedSubjectNameMap : ', result);

    return result;
    }, [sessions, subjectNameMap]);



  async function handleApprove(session_id: string) {
    try {
      setActionLoadingId(session_id);
      const api = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
      const res = await fetch(`${api}/attendance/${encodeURIComponent(session_id)}/approve-cr`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? 'Failed to approve session');
      setSessions((prev) => prev.filter((s: any) => s.session_id !== session_id));
    } catch (e: any) {
      alert(e.message ?? 'Error approving');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(session_id: string) {
    const reason = window.prompt('Reason for rejection (optional):') ?? '';
    try {
      setActionLoadingId(session_id);
      const api = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
      const res = await fetch(`${api}/attendance/${encodeURIComponent(session_id)}/reject-cr`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? 'Failed to reject session');
      setSessions((prev) => prev.filter((s: any) => s.session_id !== session_id));
    } catch (e: any) {
      alert(e.message ?? 'Error rejecting');
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <main className="p-7 md:p-6 ">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold mb-4">Pending Attendance Approvals</h1>

        {error && (
          <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-md border border-slate-200 px-3 py-6 text-center text-slate-500">
            Loading pending attendance sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-md border border-slate-200 px-3 py-6 text-center text-slate-500">
            No pending CR attendance session to approve.
          </div>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s: any) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-md border bg-white px-3 py-2"
              >
                <div className="text-sm">
                  <div className="font-medium">
                    {s.department} Sem {s.semester}
                    {usedSubjectNameMap[s.subject_code] && (
                        <>&nbsp;&nbsp;<b className='text-lg'>┃</b>&nbsp;&nbsp;{usedSubjectNameMap[s.subject_code]}</>
                    )}&nbsp;&nbsp;<b className='text-lg'>┃</b>&nbsp;&nbsp;
                    {s.subject_code}
                  </div>
                  <div className="text-xs text-slate-600">
                    &nbsp;&nbsp;{new Date(s.date).toLocaleString()}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b className='text-sm font-bold'>•</b>&nbsp;&nbsp;Session ID: {s.session_id}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(s.session_id)}
                    disabled={actionLoadingId === s.session_id}
                    className="px-3 py-1 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-slate-300"
                  >
                    {actionLoadingId === s.session_id ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(s.session_id)}
                    disabled={actionLoadingId === s.session_id}
                    className="px-3 py-1 rounded-md text-xs font-medium bg-rose-600 text-white hover:bg-rose-500 disabled:bg-slate-300"
                  >
                    {actionLoadingId === s.session_id ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
