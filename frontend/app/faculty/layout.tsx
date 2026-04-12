// app/dashboard/layout.jsx
import "@/app/globals.css";
import FacultySideNav from "../../src/FacultySidenav";
import { redirect } from "next/navigation";

export default async function FacultyLayout({ children }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row md:overflow-hidden ">
      {/* Sidebar */}

      <aside className="bg-slate-50 border-r-2 border-[#d2d9d8]">
        <FacultySideNav />
      </aside>


      {/* Main scrollable content */}
      <main className="flex-1 p-6 md:overflow-y-auto md:p-0">
        {children}
      </main>
    </div>
  );
}