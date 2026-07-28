"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Subject } from "@/lib/types";

interface UseAvailableSubjectsParams {
  semester: string;
  department: string;
}

export function useAvailableSubjects({ semester, department }: UseAvailableSubjectsParams) {
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availableError, setAvailableError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailablePool() {
      if (!semester || !department) {
        setAvailableSubjects([]);
        return;
      }

      setAvailableLoading(true);
      setAvailableError(null);

      try {
        const query = `?department=${encodeURIComponent(department)}&semester=${encodeURIComponent(semester)}`;
        const res = await apiFetch(`/curriculum/subjects${query}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          // Fallback to /curriculum?department=...&semester=...
          const fallbackRes = await apiFetch(`/curriculum${query}`);
          const fallbackData = await fallbackRes.json().catch(() => ({}));
          if (fallbackRes.ok && !cancelled) {
            const items = Array.isArray(fallbackData?.data) ? fallbackData.data : [];
            const list = items.flatMap((item: any) => item.subjects || []);
            setAvailableSubjects(list);
            return;
          }
          throw new Error(data?.detail || "Failed to fetch available subjects pool");
        }

        if (!cancelled) {
          const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
          setAvailableSubjects(list);
        }
      } catch (err: any) {
        if (!cancelled) {
          setAvailableError(err?.message || "Failed to load subjects pool");
        }
      } finally {
        if (!cancelled) {
          setAvailableLoading(false);
        }
      }
    }

    loadAvailablePool();
    return () => {
      cancelled = true;
    };
  }, [semester, department]);

  return { availableSubjects, availableLoading, availableError };
}
