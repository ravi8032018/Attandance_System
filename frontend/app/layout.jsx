// app/layout.jsx
import "./globals.css";
import Top_Header from "@/src/top_header";

export const metadata = {
  title: "SAMS - Student Attendance Management System",
  description:
    "Modern faculty–student attendance and notification system for universities.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="z-10 min-h-dvh  antialiased">
        {/* Global top header (logo, nav, etc.) */}
        <Top_Header />

        {/* Page container */}
        <div className="z-5 bg-white/70">
          <div>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
