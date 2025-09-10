// components/LogoutButton.jsx
"use client";
import { useRouter } from "next/navigation";
import React from "react";

export default function LogoutButton({ to = "/login", className = "" }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const onLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch((process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000") + "/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
    } catch (_) {
      // ignore network errors; still navigate away
    } finally {
      router.replace(to);
      router.refresh();
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      className={
        "w-full flex items-center gap-2 rounded-md px-2 py-2 " +
        (loading ? "bg-slate-200 text-slate-400 cursor-not-allowed " : "bg-white text-slate-900 hover:bg-gray-300 hover:text-black") +
        className
      }
      aria-busy={loading}
      aria-label="Logout"
      title="Logout"
    >
      <span aria-hidden="true" className="shrink-0 text-s">
        <svg width="17px" height="19px" viewBox="0 0 24.00 24.00" fill="none" xmlns="http://www.w3.org/2000/svg" transform="matrix(1, 0, 0, 1, 0, 0)rotate(0)" stroke="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" stroke="#CCCCCC" strokeWidth="0.144"></g><g id="SVGRepo_iconCarrier"> <g id="Iconly/Curved/Logout"> <g id="Logout"> <path id="Stroke 1" d="M21.791 12.1208H9.75" stroke="#261773" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"></path> <path id="Stroke 3" d="M18.8643 9.20483L21.7923 12.1208L18.8643 15.0368" stroke="#261773" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"></path> <path id="Stroke 4" d="M16.3597 7.63C16.0297 4.05 14.6897 2.75 9.35974 2.75C2.25874 2.75 2.25874 5.06 2.25874 12C2.25874 18.94 2.25874 21.25 9.35974 21.25C14.6897 21.25 16.0297 19.95 16.3597 16.37" stroke="#261773" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"></path> </g> </g> </g></svg>
      </span>
      <span className="whitespace-nowrap overflow-hidden">Logout</span>
    </button>
  );
}
