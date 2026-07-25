import React from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const metadata = {
  title: "Academic Attendance & Workload Portal",
  description: "Role-based academic management and attendance system",
};

// Inline script to prevent FOUC (Flash of Unstyled Content) before React mounts
const themeInitScript = `
  (function() {
    try {
      var saved = localStorage.getItem('portal_theme');
      var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (saved === 'dark' || (!saved && systemDark) || (saved === 'system' && systemDark)) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased selection:bg-primary selection:text-white bg-background text-foreground min-h-screen">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
