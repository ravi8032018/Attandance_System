
import { cookies } from "next/headers";
import { apiFetch } from "./api_fetch";

export async function validateSession( req_role ) {
  console.log("--> inside validate session");
  const jar = await cookies(); // Next 15: async
  const token = jar.get("dept_user_token")?.value;

  console.log("--> token from validate session: ",token);
  if (!token) {
    return null;
  }

  // const api = process.env.NEXT_PUBLIC_API_BASE  ;
  const api = "http://localhost:8000";

  const res = await apiFetch(`${api}/verify-me`, {
    method: "GET",
    headers: token ? { Cookie: `dept_user_token=${token}` } : {},
    cache: "no-store",
  });
  console.log("-->before res: ");
  if (!res.ok) return null;
  const data = await res.json();
  const role = String(data.token_role || "").trim().toLowerCase();

  console.log("-->before IF,, data.token_role : ", data.token_role);
  if (role !== req_role){
    // console.log("-->in IF,, data : ", data);
    return null;
  }
  return data;
}