// src/lib/getFacultyList.ts
import { apiFetch } from "@/src/api_fetch";

type GetFacultyListParams = {
  skip?: number;
  limit?: number;
  faculty_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  status?: string;         // "active" | "inactive"
  sort_by?: string;        // e.g. "created_at", "first_name"
  sort_order?: "asc" | "desc";
};

export async function getFacultyList(params: GetFacultyListParams = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!base) {
    throw new Error("API base URL is not configured");
  }

  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });

  const url = `${base}/faculty?${search.toString()}`;
  console.log("getFacultyList →", url);

  const res = await apiFetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof data?.detail === "string"
        ? data.detail
        : data?.message || "Failed to load faculty list";
    throw new Error(msg);
  }

  // Matches FacultyPaginatedResponse from your backend
  // { data: FacultyListResponse[], total_count: number, page: number, limit: number }
  return data;
}