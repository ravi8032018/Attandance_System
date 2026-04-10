"use client";

import { useEffect, useState } from "react";
import qs from "@/src/_hooks/qs";
import { apiFetch } from "@/src/api_fetch";

export type FacultySubject = {
  subject_code: string;
  subject_name: string;
  semester?: string;
  department?: string;
};

export function useFacultySubjects(facultyId?: string) {
  const [subjects, setSubjects] = useState<FacultySubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!facultyId) {
      setSubjects([]);
      return;
    }

    let ignore = false;

    async function loadSubjects() {
      setLoading(true);
      setError(null);

      try {
        const api = process.env.NEXT_PUBLIC_API_BASE;
        const params = qs({ Faculty_id: facultyId });

        const res = await apiFetch(
          `${api}/curriculum/my-subjects-for-sem?${params}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: { Accept: "application/json" },
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.detail || "Failed to load subjects");
        }

        if (ignore) return;

        const curriculumList = Array.isArray(data?.data) ? data.data : [];
        const allSubjects = curriculumList.flatMap(
          (item: any) => item.subjects || []
        );

        setSubjects(allSubjects);
      } catch (e: any) {
        if (!ignore) {
          setSubjects([]);
          setError(e?.message || "Something went wrong");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSubjects();
    return () => {
      ignore = true;
    };
  }, [facultyId]);

  return { subjects, setSubjects, loading, error };
}