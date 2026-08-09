"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

function parseApiError(data: any): string {
  if (!data) return "An unexpected error occurred.";
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((err: any) => err.msg || JSON.stringify(err)).join("; ");
  }
  if (data.message && typeof data.message === "string") return data.message;
  return "An unexpected server error occurred.";
}

function OnboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";
  const userType = (searchParams.get("type") || "student").toLowerCase();

  const [step, setStep] = useState<"password" | "profile">("password");

  // Step 1: Set Password state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Step 2: Profile state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");
  const [contactNumber, setContactNumber] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [rollNumber, setRollNumber] = useState("");

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [step2SuccessBanner, setStep2SuccessBanner] = useState("");

  // Validate Token on Mount
  useEffect(() => {
    if (!token) {
      setPasswordError("Missing onboarding token. Please use the link provided in your welcome email.");
    }
  }, [token]);

  // 5-Second Auto-Dismiss for Password Error
  useEffect(() => {
    if (passwordError) {
      const timer = setTimeout(() => setPasswordError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [passwordError]);

  // 5-Second Auto-Dismiss for Profile Error
  useEffect(() => {
    if (profileError) {
      const timer = setTimeout(() => setProfileError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [profileError]);

  // 5-Second Auto-Dismiss for Step 2 Success Banner
  useEffect(() => {
    if (step2SuccessBanner) {
      const timer = setTimeout(() => setStep2SuccessBanner(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [step2SuccessBanner]);

  // Handle Step 1: Set Password
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!token) {
      setPasswordError("Invalid or missing activation token.");
      return;
    }

    if (!password || password.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const endpoint = userType === "faculty"
        ? `/reset-fac-password?token=${encodeURIComponent(token)}`
        : `/reset-password?token=${encodeURIComponent(token)}`;

      const res = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({
          new_password: password,
          confirm_password: confirmPassword,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(parseApiError(errData));
      }

      // Password set successfully! Now transition to Step 2: Profile Completion
      setStep2SuccessBanner("🎉 Password set successfully! Fill in details below to finalize onboarding.");
      setStep("profile");
    } catch (err: any) {
      setPasswordError(err.message || "Failed to activate password. The link may be expired or already used.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle Step 2: Profile Completion
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");

    if (!firstName.trim() || !lastName.trim() || !dob || !gender || !contactNumber.trim()) {
      setProfileError("Please fill in all required fields marked with *.");
      return;
    }

    setProfileLoading(true);
    try {
      if (userType === "faculty") {
        const payload = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          dob: dob,
          gender: gender,
          contact_number: contactNumber.trim(),
          office_location: officeLocation.trim() || undefined,
        };

        const res = await apiFetch("/faculty/me", {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(parseApiError(errData));
        }
      } else {
        const payload = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          dob: dob,
          gender: gender,
          contact_number: contactNumber.trim(),
          roll_number: rollNumber.trim() || undefined,
        };

        const res = await apiFetch("/student/me", {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(parseApiError(errData));
        }
      }

      // Success! Redirect to user dashboard
      const targetDashboard = userType === "faculty" ? "/faculty/dashboard" : "/student/dashboard";
      router.push(targetDashboard);
    } catch (err: any) {
      setProfileError(err.message || "Could not save profile details. You can skip and complete it later from your dashboard.");
    } finally {
      setProfileLoading(false);
    }
  };

  // Skip profile completion for now
  const handleSkipProfile = () => {
    const targetDashboard = userType === "faculty" ? "/faculty/dashboard" : "/student/dashboard";
    router.push(targetDashboard);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl z-10 relative">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 mb-3 text-2xl">
            🎓
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Welcome to SAMS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {step === "password"
              ? `Activate your ${userType === "faculty" ? "Faculty" : "Student"} Account`
              : "Complete your basic profile details"}
          </p>
        </div>

        {/* Wizard Steps Indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${step === "password" ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            }`}>
            <span>{step === "password" ? "1" : "✓"}</span>
            <span>Set Password</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-800" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${step === "profile" ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40" : "bg-slate-800 text-slate-400"
            }`}>
            <span>2</span>
            <span>Complete Profile</span>
          </div>
        </div>

        {/* STEP 1: SET PASSWORD FORM */}
        {step === "password" && (
          <form onSubmit={handleSetPassword} className="space-y-5">
            {passwordError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{passwordError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordError("")}
                  className="font-bold opacity-70 hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Create New Password <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Confirm Password <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading || !token}
              className="w-full mt-6 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {passwordLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Activating Account...</span>
                </>
              ) : (
                <span>Activate & Continue</span>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: PROFILE COMPLETION FORM */}
        {step === "profile" && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {step2SuccessBanner && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                <span>{step2SuccessBanner}</span>
                <button
                  type="button"
                  onClick={() => setStep2SuccessBanner("")}
                  className="font-bold opacity-70 hover:opacity-100 transition-opacity ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {profileError && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>💡</span>
                  <span>{profileError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileError("")}
                  className="font-bold opacity-70 hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Rahul"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Sharma"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Date of Birth <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Gender <span className="text-red-400">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contact Number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {userType === "faculty" ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Office / Cabin Location (Optional)
                </label>
                <input
                  type="text"
                  value={officeLocation}
                  onChange={(e) => setOfficeLocation(e.target.value)}
                  placeholder="e.g. Block C - Room 302"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Class Roll Number (Optional)
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div className="pt-3 flex items-center gap-3">
              <button
                type="submit"
                disabled={profileLoading}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {profileLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Complete Profile & Finish</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleSkipProfile}
                className="py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition-all border border-slate-700/60"
              >
                Skip for now
              </button>
            </div>

            <p className="text-center text-[11px] text-slate-500 mt-2">
              If skipped, you can complete your profile later from your account dashboard.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OnboardContent />
    </Suspense>
  );
}
