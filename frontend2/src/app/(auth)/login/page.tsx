"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"faculty" | "student" | "admin">("faculty");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = role === "student" ? "/student/signin" : role === "admin" ? "/admin/signin" : "/faculty/signin";
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.detail || data?.message || "Invalid email or password");
      }

      if (role === "student") {
        router.push("/student/dashboard");
      } else if (role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/faculty/dashboard");
      }
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 text-foreground overflow-hidden">
      {/* Top Right Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Subtle Static Low-Opacity Background Wash */}
      <div className="login-backdrop-wash" />

      <div className="relative z-10 w-full max-w-md rounded-2xl solid-card p-6 sm:p-8 shadow-sm border border-border">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-3xl text-white mb-3 shadow-sm">
            🎓
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Academic Portal
          </h1>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            Sign in to access your role-based workspace
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex rounded-xl border border-border bg-muted p-1 mb-6">
          {(["faculty", "student", "admin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 rounded-lg py-2 text-xs font-bold capitalize transition-colors duration-150 ${
                role === r
                  ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-3 text-xs font-semibold text-rose-700 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@academic.edu"
              required
              className="h-11 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="h-11 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-xs font-extrabold tracking-wider uppercase text-white disabled:opacity-50 transition-colors duration-150 mt-2 shadow-sm"
          >
            {loading ? "Signing in..." : `Sign In as ${role.toUpperCase()}`}
          </button>
        </form>
      </div>
    </div>
  );
}
