// app/dashboard/layout.jsx
import SideNav from "./sidenav";
import { redirect } from "next/navigation";
import { validateSession } from "@/src/validate_session";

export default async function DashboardLayout({ children }) {
  const session = await validateSession();
  // console.log("--> inside dashboard session",session);

  if (!session) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col md:flex-row md:overflow-hidden ">
      {/* Sidebar */}

      <aside className="">
        <SideNav />
      </aside>


      {/* Main scrollable content */}
      <main className="flex-1 p-6 md:overflow-y-auto md:p-0">
        {children}
      </main>
    </div>
  );
}