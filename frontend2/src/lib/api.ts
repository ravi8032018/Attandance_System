const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function apiFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    "Accept": "application/json",
  };

  if (init?.body && typeof init.body === "string") {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const options: RequestInit = {
    ...init,
    credentials: "include",
    headers: {
      ...defaultHeaders,
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
