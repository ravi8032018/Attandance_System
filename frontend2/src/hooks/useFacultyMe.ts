"use client";

import { useUserMe } from "./useUserMe";
import { Faculty } from "@/lib/types";

export function useFacultyMe() {
  const { user, roles, isHod, isFaculty, loading, error } = useUserMe();

  // Return user cast to Faculty for backward compatibility if present
  const faculty = (user as Faculty) || null;

  return { faculty, roles, isHod, isFaculty, loading, error };
}
