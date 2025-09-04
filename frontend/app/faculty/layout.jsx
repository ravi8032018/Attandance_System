// app/dashboard/layout.jsx
import SideNav from "./sidenav";


export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row md:overflow-hidden ">
      {/* Sidebar */}

      <aside className="md:w-64 flex-none border-b md:border-b-0 md:border-r">
        <SideNav />
      </aside>


      {/* Main scrollable content */}
      <main className="flex-1 p-6 md:overflow-y-auto md:p-0">
        {children}
      </main>
    </div>
  );
}