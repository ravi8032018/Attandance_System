
import { cookies } from "next/headers";

export async function validateSession() {
  const jar = await cookies(); // Next 15: async
  const token = jar.get("dept_user_token")?.value;
  if (!token) return null;
  // console.log("--> inside validate session", token);

  const api = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const res = await fetch(`${api}/verify-me`, {
    method: "GET",
    headers: token ? { Cookie: `dept_user_token=${token}` } : {},
    cache: "no-store",
  });
  // console.log("-->brfore res: ");
  if (!res.ok) return null;
  // console.log("-->after res: ");

  return res.json();
}