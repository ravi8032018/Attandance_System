// src/lib/getFacultyList.ts
import { apiFetch } from "@/src/api_fetch";

export async function getFacultyList(params = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });

  const url = `${base}/faculty?${search.toString()}`;

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
        : data?.message || "Failed to load faculty list";
    throw new Error(msg);
  }

  return data;
}   