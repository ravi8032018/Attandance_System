// src/apiFetch.ts
export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  const options: RequestInit = {
    credentials: "include", // include cookies
    ...init,
    headers: {
      "Accept": "application/json",
      ...(init.headers || {}),
    },
  };

  const res = await fetch(input, options);

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return res;
} 
