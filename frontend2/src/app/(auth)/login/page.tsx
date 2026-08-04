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

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
            SAMS - AUS
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
              className={`flex-1 rounded-lg py-2 text-xs font-bold capitalize transition-colors duration-150 ${role === r
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgotModal(true);
                }}
                className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
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

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl solid-card p-6 bg-card border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <span>🔑</span> Reset Your Password
              </h3>
              <button
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotMsg(null);
                }}
                className="text-muted-foreground hover:text-foreground font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter your registered email address below. We will dispatch a secure, self-service password reset link directly to your inbox.
            </p>

            {forgotMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold border ${
                  forgotMsg.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                }`}
              >
                {forgotMsg.text}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!forgotEmail) return;
                setForgotLoading(true);
                setForgotMsg(null);
                try {
                  const res = await apiFetch("/forgot-password/request-link", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: forgotEmail }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (res.ok) {
                    setForgotMsg({
                      type: "success",
                      text: data.message || "A password reset link has been dispatched to your email address.",
                    });
                  } else {
                    setForgotMsg({
                      type: "error",
                      text: data.detail || "Failed to process password reset request.",
                    });
                  }
                } catch (err) {
                  setForgotMsg({
                    type: "error",
                    text: "Network or server error. Please try again.",
                  });
                } finally {
                  setForgotLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                  Registered Email
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="your.email@aus.ac.in"
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotMsg(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {forgotLoading ? "Sending Link..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
