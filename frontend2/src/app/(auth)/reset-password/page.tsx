"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

function ResetPasswordFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [verifyError, setVerifyError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setVerifyError("No reset token provided in the URL.");
      return;
    }

    async function checkToken() {
      try {
        const res = await apiFetch(`/forgot-password/verify-link?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.valid) {
          setTokenValid(true);
          setUserEmail(data.email || "");
        } else {
          setTokenValid(false);
          setVerifyError(data.detail || "This password reset link is invalid or has expired.");
        }
      } catch (err) {
        setTokenValid(false);
        setVerifyError("Network error verifying password reset link.");
      } finally {
        setVerifying(false);
      }
    }

    checkToken();
  }, [token]);

  // Password strength calculation
  const getStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strengthScore = getStrength(newPassword);

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await apiFetch("/forgot-password/confirm-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setResetSuccess(true);
      } else {
        setErrorMsg(data.detail || "Failed to reset password.");
      }
    } catch (err) {
      setErrorMsg("Server error resetting password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 text-foreground overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl solid-card p-6 sm:p-8 shadow-sm border border-border">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-3xl text-white mb-3 shadow-sm">
            🔒
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            Reset Password
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-muted-foreground">
            Department of Computer Science - Assam University
          </p>
        </div>

        {verifying ? (
          <div className="py-12 text-center space-y-3">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent align-[-0.125em]" />
            <p className="text-xs font-bold text-muted-foreground">Verifying security token...</p>
          </div>
        ) : resetSuccess ? (
          <div className="py-6 text-center space-y-4 animate-in fade-in duration-200">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl text-emerald-600 dark:text-emerald-400 mx-auto">
              ✓
            </div>
            <h2 className="text-lg font-extrabold text-foreground">Password Reset Complete!</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your account password has been updated successfully. You can now log in to your workspace using your new password.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold tracking-wider uppercase transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        ) : !tokenValid ? (
          <div className="py-6 text-center space-y-4 animate-in fade-in duration-200">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20 text-3xl text-rose-600 dark:text-rose-400 mx-auto">
              ⚠️
            </div>
            <h2 className="text-base font-extrabold text-foreground">Invalid or Expired Link</h2>
            <p className="text-xs text-rose-700 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/60 p-3 rounded-xl border border-rose-200 dark:border-rose-800">
              {verifyError}
            </p>
            <p className="text-xs text-muted-foreground">
              Password reset links expire in 30 minutes for security reasons. Please request a new link from the login page.
            </p>
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold tracking-wider uppercase transition-colors"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            {userEmail && (
              <div className="p-3 rounded-xl bg-muted/60 border border-border text-xs flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Resetting for:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{userEmail}</span>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-3 text-xs font-semibold text-rose-700 dark:text-rose-400">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-bold text-foreground uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {/* Strength Gauge */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strengthScore >= 1 ? (strengthScore >= 4 ? "bg-emerald-500 w-full" : strengthScore >= 2 ? "bg-amber-500 w-2/3" : "bg-rose-500 w-1/3") : "w-0"}`} />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground block text-right">
                    {strengthScore >= 4 ? "Strong Password" : strengthScore >= 2 ? "Moderate Password" : "Weak Password"}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-foreground uppercase tracking-wider">
                Confirm New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="h-11 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-extrabold tracking-wider uppercase text-white disabled:opacity-50 transition-colors mt-2 shadow-sm"
            >
              {submitting ? "Updating Password..." : "Set New Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-xs font-bold text-muted-foreground">Loading Password Reset...</p>
        </div>
      }
    >
      <ResetPasswordFormContent />
    </Suspense>
  );
}
