// src/apiFetch.ts
export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  const res = await fetch(input, {
    credentials: "include", // include cookies
    ...init,
  });

  if (res.status === 401) {
    // Token invalid/expired – mirror what layout does
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    // throw new Error("Unauthorized");
  }

  return res;
}
