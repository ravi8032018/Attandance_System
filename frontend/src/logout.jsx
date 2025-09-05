// components/LogoutButton.jsx

"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton({ to = "/" }) {
  const router = useRouter();

  const onLogout = async () => {
    try {
      await fetch((process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000") + "/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
    } finally {
      router.replace(to);
      router.refresh();
    }
  };

  return (
    <button onClick={onLogout} className="rounded-md bg-slate-900 text-white px-3 py-2 hover:bg-slate-800">
      Logout
    </button>
  );
}
