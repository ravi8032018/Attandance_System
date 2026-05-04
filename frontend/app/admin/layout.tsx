// app/admin/layout.jsx
import AdminSideNav from "@/src/AdminSidenav";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row md:overflow-hidden ">
      {/* Sidebar */}

      <aside className="bg-muted border-r-2 border-[#d2d9d8]">
        <AdminSideNav />
      </aside>


      {/* Main scrollable content */}
      <main className="flex-1 p-6 md:overflow-y-auto md:p-0">
        {children}
      </main>
    </div>
  );
}