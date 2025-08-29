import "./globals.css";
import Link from "next/Link";

export const metadata = { title: "Student Attendance" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">



      {children}
      </body>
    </html>
  );
}
