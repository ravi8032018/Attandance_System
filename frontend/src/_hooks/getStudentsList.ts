// src/_hooks/getStudentsList.ts
import { apiFetch } from "@/src/api_fetch";

type GetStudentsListParams = {
  skip?: number;
  limit?: number;
  registration_no?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  status?: string;       // "active" | "inactive"
  semester?: string;     // "1" – "8"
  department?: string;
  subject_code?: string;
  sort_by?: string;      // e.g. "created_at", "first_name"
  sort_order?: "asc" | "desc";
};

export async function getStudentsList(params: GetStudentsListParams = {}) {
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

  const url = `${base}/student?${search.toString()}`;
  console.log("getStudentsList →", url);

  const res = await apiFetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await res.json().catch(() => ({}));
  console.log("getStudentsList response →", { data });
  if (!res.ok) {
    const msg =
      typeof data?.detail === "string"
        ? data.detail
        : data?.message || "Failed to load students list";
    throw new Error(msg);
  }

  // Matches StudentPaginatedResponse from backend
  // { data: StudentListResponse[], total_count: number, page: number, limit: number }
  return data;
}
