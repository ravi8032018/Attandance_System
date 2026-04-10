"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/api_fetch";

export type AvailableSubject = {
  subject_code: string;
  subject_name: string;
  semester?: string;
  department?: string;
  _id?: string;
  id?: string | number;
};

type Filters = {
  department: string;
  semester: string;
};

export function useAvailableSubjects({ department, semester }: Filters) {
  const [subjects, setSubjects] = useState<AvailableSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const api = process.env.NEXT_PUBLIC_API_BASE;
        const search = new URLSearchParams();

        if (department) search.set("department", department);
        if (semester) search.set("semester", semester);

        const url = `${api}/curriculum?${search.toString()}`;

        const res = await apiFetch(url, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.detail || data?.message || "Failed to load subjects");
        }

        if (ignore) return;

        // data = { data: [ { subjects: [...] } ] }
        const curriculumList = Array.isArray(data?.data) ? data.data : [];
        const allSubjects = curriculumList.flatMap(item => item.subjects || []);

        console.log("Fetched all Subjects:", allSubjects);

        setSubjects(allSubjects);
      } catch (e: any) {
        if (!ignore) {
          setSubjects([]);
          setError(e?.message || "Something went wrong");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [department, semester]); // 🔁 re-run whenever filters change

  return { subjects, loading, error, setSubjects };
}