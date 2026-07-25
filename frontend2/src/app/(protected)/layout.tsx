import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopHeader } from "@/components/layout/TopHeader";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Header spans full width across the very top */}
      <TopHeader />

      {/* Main content container below Top Header */}
      <div className="flex flex-1 min-w-0">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
