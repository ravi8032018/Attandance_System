"use client";

import React, { useState } from "react";
import { getFacultyInitials } from "@/lib/utils";

interface FacultyAvatarProps {
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  className?: string;
}

const sizeClasses: Record<"sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl", string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-xs font-bold",
  lg: "h-12 w-12 text-sm font-bold",
  xl: "h-16 w-16 text-lg font-extrabold",
  "2xl": "h-20 w-20 text-xl font-extrabold",
  "3xl": "h-24 w-24 text-2xl font-extrabold",
  "4xl": "h-28 w-28 text-3xl font-extrabold",
};

export function FacultyAvatar({
  firstName,
  lastName,
  photoUrl,
  size = "md",
  className = "",
}: FacultyAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initials = getFacultyInitials(firstName, lastName);
  const sizeStyle = sizeClasses[size] || sizeClasses.md;
  const fullName = `${firstName || ""} ${lastName || ""}`.trim();

  if (photoUrl && !imgError) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-full border border-border shadow-xs ${sizeStyle} ${className}`}
        title={fullName}
      >
        <img
          src={photoUrl}
          alt={fullName || "Faculty Avatar"}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 text-white font-extrabold shadow-xs tracking-wider ${sizeStyle} ${className}`}
      title={fullName}
    >
      {initials}
    </div>
  );
}
