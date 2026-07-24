"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Subject } from "@/lib/types";

export function useFacultySubjects(facultyId: string) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAssignedSubjects() {
      if (!facultyId) {
        setSubjects([]);
        return;
      }

      setSubjectsLoading(true);
      setSubjectsError(null);

      try {
        const res = await apiFetch(`/curriculum/my-subjects-for-sem?Faculty_id=${encodeURIComponent(facultyId)}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.detail || "Failed to load assigned subjects");
        }

        if (!cancelled) {
          const rawList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
          const flattened = rawList.flatMap((item: any) => item.subjects || (item.subject_code ? [item] : []));
          setSubjects(flattened);
        }
      } catch (err: any) {
        if (!cancelled) {
          setSubjectsError(err?.message || "Failed to load assigned subjects");
        }
      } finally {
        if (!cancelled) {
          setSubjectsLoading(false);
        }
      }
    }

    loadAssignedSubjects();
    return () => {
      cancelled = true;
    };
  }, [facultyId]);

  return { subjects, subjectsLoading, subjectsError, setSubjects };
}
