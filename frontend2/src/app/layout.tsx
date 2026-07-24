import React from "react";
import "./globals.css";

export const metadata = {
  title: "Academic Attendance & Workload Portal",
  description: "Role-based academic management and attendance system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
