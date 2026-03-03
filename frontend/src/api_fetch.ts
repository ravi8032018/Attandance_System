// src/apiFetch.ts
export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  console.log("--> In apiFetch fn");
  const res = await fetch(input, {
    credentials: "include", // include cookies
    ...init,
  });

  if (res.status === 401) {
    // Token invalid/expired – mirror what layout does
    console.log("--> response status 401 in apiFetch fn");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    // throw new Error("Unauthorized");
  }

  return res;
}
