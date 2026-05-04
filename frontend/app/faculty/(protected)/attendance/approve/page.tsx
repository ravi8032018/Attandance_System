'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/src/api_fetch';
import formatDateTime from '@/src/_hooks/datetime_formatter';
import { set } from 'zod';
import { da } from 'zod/v4/locales/index.cjs';

export default function FacultyCRApprovalsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
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
        const api = process.env.NEXT_PUBLIC_API_BASE ;
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

  // Auto-dismiss error after 7 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 7000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Auto-dismiss info after 7 seconds
  useEffect(() => {
    if (info) {
      const timer = setTimeout(() => setInfo(''), 7000);
      return () => clearTimeout(timer);
    }
  }, [info]);

  // Fetch subjects whenever filters change
  useEffect(() => {
  let ignore = false;

  async function loadSubjectsNames() {
    if (sessions.length === 0) return;

    const api = process.env.NEXT_PUBLIC_API_BASE;

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
      const api = process.env.NEXT_PUBLIC_API_BASE;
      const res = await apiFetch(`${api}/attendance/approvals/${encodeURIComponent(session_id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? 'Failed to approve session');

      console.log('--> data in approve response : ', data);
      setSessions((prev) => prev.filter((s: any) => s.session_id !== session_id));
      setInfo(data.message ?? 'Session approved successfully');


    } catch (e: any) {
      setError(e.message ?? 'Error approving session');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(session_id: string) {
    const reason = window.prompt('Reason for rejection (optional):') ?? '';
    try {
      setActionLoadingId(session_id);
      const api = process.env.NEXT_PUBLIC_API_BASE;
      const res = await fetch(`${api}/attendance/approvals/${encodeURIComponent(session_id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', reason : reason }),

      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? 'Failed to reject session');

      setSessions((prev) => prev.filter((s: any) => s.session_id !== session_id));
      setInfo(data.message ?? 'Session rejected successfully');
    } catch (e: any) {
      setError(e.message ?? 'Error rejecting session');
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <main className="m-4 p-4 pl-6 pr-6 bg-card/80 rounded-2xl max-w-3xl ">
      <div className="mx-auto">
        {/* Global Error Display */}
        {error && (
          <div className="mb-4 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-error flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="text-error hover:text-error font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Global Info Display */}
        {info && (
          <div className="mb-4 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-success flex items-center justify-between">
            <span>{info}</span>
            <button
              onClick={() => setInfo('')}
              className="text-success hover:text-success font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <h1 className=" text-2xl border-b-2 border-border font-semibold mb-4">Pending Attendance Approvals</h1>

        {loading ? (
          <div className="border-border px-3 py-6 text-center text-muted-foreground">
            Loading pending attendance sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-md border border-border px-3 py-6 text-center text-muted-foreground">
            No pending CR attendance session to approve.
          </div>
        ) : (
          <ul className=" max-w-3xl max-h-[calc(100vh-250px)] overflow-y-auto">
            {sessions.map((s: any) => (
              <li
                key={s.id}
                className="border-b-1 border-border last:border-0"
              >
              <div className="m-3 p-4 bg-card flex items-center justify-between rounded-lg shadow-sm border-2 border-border hover:bg-primary/20 hover:shadow-lg hover:border-border transition">
                {/* content */}
                <div className=" ">
                  <div className="text-md text-foreground">
                    {s.department} Sem {s.semester}
                    {usedSubjectNameMap[s.subject_code] && (
                        <>&nbsp;&nbsp;<b className='text-lg'>┃</b>&nbsp;&nbsp;{usedSubjectNameMap[s.subject_code]}</>
                    )}&nbsp;&nbsp;<b className='text-lg'>┃</b>&nbsp;&nbsp;
                    {s.subject_code}
                  </div>
                  <div id="date-display" className="text-xs text-foreground  ">

                    {formatDateTime(s.date)}
                  </div>
                </div>
                {/* buttons */}
                <div className="flex gap-3 text-[14px] text-white font-base">
                  <button
                    type="button"
                    onClick={() => handleApprove(s.session_id)}
                    disabled={actionLoadingId === s.session_id}
                    className="px-4 py-1.5 rounded-lg bg-success hover:opacity-90 disabled:bg-muted"
                  >
                    {actionLoadingId === s.session_id ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(s.session_id)}
                    disabled={actionLoadingId === s.session_id}
                    className="px-4 py-1.5 rounded-lg  bg-error hover:opacity-90 disabled:bg-muted"
                  >
                    {actionLoadingId === s.session_id ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
