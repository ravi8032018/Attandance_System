// app/(public)/Login/page.jsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {error} from "next/dist/build/output/log";
import {PasswordStrengthBar} from "@/src/_hooks/password_strength"

export default function LoginPage() {
  const router = useRouter();
  const [values, setValues] = useState({
    role: "Student",       // 'Student' | 'faculty' | 'admin'
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      // Choose endpoint by selected role
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
      const endpoint =
        values.role === ("admin")
          ? "/admin/signin"
          : values.role === ("faculty")
          ? "/faculty/signin"
          : "/Student/signin";

      const res = await fetch(base + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // remove if not using cookies
        body: JSON.stringify({ email: values.email, password: values.password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Extract readable error string (FastAPI-friendly)
        const msg =
          typeof data?.msg === "string"
            ? data.msg
            : typeof data?.detail === "string"
            ? data.detail
            : Array.isArray(data?.detail) && data.detail?.msg
            ? data.detail.msg
            : "Login failed";
        setErr(msg);
        return;
      }

      // Example success shape (adjust if your backend differs):
      // { message, access_token, token_type, token_role }
      const token_role = data?.token_role || values.role;

      // Optional: alert success
      // if (typeof data?.message === "string") alert(data.message);

      // Route by token role
      if (token_role === "admin") router.replace("/admin/dashboard");
      else if (token_role === "faculty" || token_role === "hod") router.replace("/faculty/dashboard");
      else router.replace("/student/dashboard");
    } catch (e) {
      setErr(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center p-6 bg-slate-500">
      <div className="w-full max-w-sm rounded-lg border bg-slate-100 p-4 pt-3 pb-3 shadow-sm text-black text-md font-mono">
        <h1 className="mb-2 text-3xl font-semibold text-center">Sign in</h1>
        <p className="mb-2 text-md text-slate-800 text-center">Choose role and enter credentials.</p>
        {err ? <p className="text-md text-center text-red-600 font-mono px-1 py-0">Email or password incorrect &nbsp; &nbsp;</p> : null}
        <form onSubmit={onSubmit} className="space-y-5 ">

          {/* Role selector */}
          <div className="space-y-1">
            <div className="text-md font-medium mb-0.5">
              <label htmlFor="role">Role</label>
            </div>
            <select
              id="role"
              value={values.role}
              onChange={(e) => setValues((v) => ({ ...v, role: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm outline-slate-50 focus:ring-2 focus:ring-indigo-200 bg-white">
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
            </select>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <div className="text-md font-medium mb-0.5">
              <label htmlFor="role">Email</label>
            </div>
            <input
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
              placeholder="user123@gmail.com"
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5 mb-0.5">
            <div className="text-md font-medium mb-0.5">
              <label htmlFor="role">Password</label>
            </div>
            <input
              type="password"

              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
              placeholder="••••••••"
              autoComplete="current-password"
              minLength={8}
              maxLength={32}
            />
          </div>

          <div className="flex items-center justify-between gap-1">
            <div className="min-w-0 flex-1 pr-3">
              <PasswordStrengthBar password={values.password} />
            </div>
            <a href="/forgot-password" className="text-sm text-indigo-500 hover:text-indigo-700 whitespace-nowrap">
              Forgot password?
            </a>
          </div>

          <button
            disabled={loading}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-white font-mono hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
