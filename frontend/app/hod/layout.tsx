// app/hod/layout.jsx
import { redirect } from "next/navigation";
import FacultySideNav from "@/src/FacultySidenav";
import { getFacultyDetailsServer } from "@/src/_hooks/get_faculty_me_server";

export default async function HodLayout({ children }) {
  const user = await getFacultyDetailsServer();
    console.log("HOD Layout - User details:", user); // Debug log
  if (!user) {
    redirect("/login");
  }

  const roles = user?.role || [];
  const isHod = Array.isArray(roles)
    ? roles.includes("hod")
    : String(roles).toLowerCase().includes("hod");

  if (!isHod) {
    redirect("/faculty/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row md:overflow-hidden">
      <aside className="bg-slate-50 border-r-2 border-[#d2d9d8]">
        <FacultySideNav role="hod" />
      </aside>

      <main className="flex-1 p-6 md:overflow-y-auto md:p-0">
        {children}
      </main>
    </div>
  );
}