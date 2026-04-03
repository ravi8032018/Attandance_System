// src/lib/getFacultyById.js
import { apiFetch } from "@/src/api_fetch";

export async function getFacultyById(facultyId) {
  const base = process.env.NEXT_PUBLIC_API_BASE;

  const res = await apiFetch(`${base}/faculty/faculty-id/${facultyId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.detail || "Failed to load faculty profile");
  }

  return data;
}