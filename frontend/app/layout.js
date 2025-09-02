import "./globals.css";
import Link from "next/Link";
import Header from "@/src/_hooks/header"

export const metadata = { title: "Student Attendance" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`scroll-smooth`}>
      <body className="min-h-dvh">
        <Header />

      {children}
      </body>
    </html>
  );
}

