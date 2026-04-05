// src/lib/getFacultyMeServer.ts
import "server-only";
import { cookies } from "next/headers";

export async function getFacultyDetailsServer() {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  const cookieStore = await cookies();

  const token = cookieStore.get("dept_user_token")?.value || cookieStore.get("token")?.value;
  
  console.log("getFacultyDetailsServer - In get faculty details server:", token); // Debug log
  // if (!token) return null;
  const cookieHeader = cookieStore.toString();

  const res = await fetch(`${base}/faculty/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    //   Authorization: `Bearer ${token}`,
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  console.log("getFacultyDetailsServer - Out Fetched user details:", data); // Debug log
  return data;
}