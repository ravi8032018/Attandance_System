const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function apiFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const options: RequestInit = {
    ...init,
    credentials: "include",
    headers: {
      "Accept": "application/json",
      ...(init?.headers || {}),
    },
  };

  const res = await fetch(url, options);

  if (res.status === 401) {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  return res;
}
