// src/lib/getFacultyMe.ts
import { apiFetch } from "@/src/api_fetch"; 

export async function getFacultyDetails() {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  const url = `${base}/faculty/me`;

  const res = await apiFetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof data?.detail === "string"
        ? data.detail
        : data?.message || "Failed to load faculty profile";
    throw new Error(msg);
  }

  return data;
}