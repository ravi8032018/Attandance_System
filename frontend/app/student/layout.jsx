// app/student/layout.tsx
import { redirect } from "next/navigation";
import { validateSession } from "@/src/validate_session";
import { StudentSideNav } from "@/src/Student_Sidenav"

export default async function StudentLayout({
  children,
}) { 
    console.log("--> in student layout : ");
    const session = await validateSession("student");
    if (!session) {
        console.log("--> invalid session. redirecting to /login ");
        redirect("/login");}
    console.log("--> in student layout, before return: ");

    return (
    <>
        <div className="flex min-h-dvh flex-col md:flex-row md:overflow-hidden ">
        {/* Sidebar */}

        <aside className="bg-slate-50 border-r-2 border-[#d2d9d8]">
            <StudentSideNav />
        </aside>


        {/* Main scrollable content */}
        <main className="flex-1 p-6 md:overflow-y-auto md:p-0">
            {children}
        </main>
        </div>
    </>   
    );
}
