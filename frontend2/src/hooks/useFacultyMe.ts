"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Faculty } from "@/lib/types";
import { normalizeRoles, hasRole } from "@/lib/utils";

export function useFacultyMe() {
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMe() {
      setLoading(true);
      setError(null);

      try {
        const res = await apiFetch("/faculty/me");
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.detail || "Failed to authenticate faculty session");
        }

        if (!cancelled) {
          setFaculty(data);
          const rawRoles = data?.role || data?.roles || data?.token_role;
          setRoles(normalizeRoles(rawRoles));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load faculty identity");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const isHod = hasRole(roles, "hod");
  const isFaculty = hasRole(roles, "faculty");

  return { faculty, roles, isHod, isFaculty, loading, error };
}
