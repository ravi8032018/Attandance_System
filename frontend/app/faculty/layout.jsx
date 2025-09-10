// app/dashboard/layout.jsx
import SideNav from "../../src/sidenav";
import { redirect } from "next/navigation";
import { validateSession } from "@/src/validate_session";

export default async function DashboardLayout({ children }) {
  const session = await validateSession();
  console.log("--> inside dashboard session",session);

  if (!session) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col md:flex-row md:overflow-hidden ">
      {/* Sidebar */}

      <aside className="bg-slate-50 border-r-2 border-[#d2d9d8]">
        <SideNav />
      </aside>


      {/* Main scrollable content */}
      <main className="flex-1 p-6 md:overflow-y-auto md:p-0">
        {children}
      </main>
    </div>
  );
}