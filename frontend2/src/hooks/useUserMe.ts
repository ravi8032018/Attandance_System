"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { normalizeRoles, hasRole } from "@/lib/utils";

export interface UserIdentity {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  faculty_id?: string;
  registration_no?: string;
  department?: string;
  course?: string;
  sem?: string | number;
  semester?: string | number;
  photo_url?: string;
  role?: string[];
  [key: string]: any;
}

export function useUserMe() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMe() {
      setLoading(true);
      setError(null);

      // Determine priority route context based on URL pathname
      const isStudentPath = pathname?.startsWith("/student");
      const isAdminPath = pathname?.startsWith("/admin");

      let endpointsToTry: string[] = [];

      if (isAdminPath) {
        endpointsToTry = ["/admin/me", "/faculty/me", "/student/me"];
      } else if (isStudentPath) {
        endpointsToTry = ["/student/me", "/faculty/me", "/admin/me"];
      } else {
        endpointsToTry = ["/faculty/me", "/admin/me", "/student/me"];
      }

      for (const endpoint of endpointsToTry) {
        try {
          const res = await apiFetch(endpoint);
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) {
              setUser(data);
              let rawRoles = data?.role || data?.roles || data?.token_role;
              if (endpoint === "/admin/me" && (!rawRoles || (Array.isArray(rawRoles) && rawRoles.length === 0))) {
                rawRoles = ["admin"];
              } else if (endpoint === "/student/me" && (!rawRoles || (Array.isArray(rawRoles) && rawRoles.length === 0))) {
                rawRoles = ["student"];
              }
              const normRoles = normalizeRoles(rawRoles);
              setRoles(normRoles);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          // Continue to next endpoint try if applicable
        }
      }

      if (!cancelled) {
        // If on admin path, set fallback admin identity if session cookie exists
        if (isAdminPath) {
          setUser({
            first_name: "System",
            last_name: "Admin",
            email: "admin@academic.edu",
            role: ["admin"],
          });
          setRoles(["admin"]);
          setError(null);
        } else {
          setUser(null);
          setRoles([]);
          setError("Failed to authenticate session");
        }
        setLoading(false);
      }
    }

    fetchMe();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const isAdmin = hasRole(roles, "admin") || (roles.length === 0 && Boolean(pathname?.startsWith("/admin")));
  const isStudent = hasRole(roles, "student") || (roles.length === 0 && Boolean(pathname?.startsWith("/student")));
  const isHod = hasRole(roles, "hod");
  const isFaculty = hasRole(roles, "faculty") || isHod || (roles.length === 0 && Boolean(pathname?.startsWith("/faculty")));
  const isCr = hasRole(roles, "cr");

  return {
    user,
    roles,
    isStudent,
    isFaculty,
    isHod,
    isAdmin,
    isCr,
    loading,
    error,
  };
}
