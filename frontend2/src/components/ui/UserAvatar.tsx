"use client";

import React, { useState } from "react";

interface UserAvatarProps {
  name?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  className?: string;
}

const sizeClasses: Record<"sm" | "md" | "lg" | "xl" | "2xl" | "3xl", string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-xs font-bold",
  lg: "h-12 w-12 text-sm font-bold",
  xl: "h-16 w-16 text-lg font-black",
  "2xl": "h-20 w-20 text-xl font-black",
  "3xl": "h-24 w-24 text-2xl font-black",
};

export function UserAvatar({
  name,
  firstName,
  lastName,
  photoUrl,
  size = "xl",
  className = "",
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Compute Full Name
  const fullName =
    name ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    "User";

  // Compute Initials
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const sizeStyle = sizeClasses[size] || sizeClasses.xl;

  if (photoUrl && !imgError) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-2xl border-2 border-indigo-500/20 shadow-md ${sizeStyle} ${className}`}
        title={fullName}
      >
        <img
          src={photoUrl}
          alt={fullName}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 text-white font-black shadow-md tracking-wider ${sizeStyle} ${className}`}
      title={fullName}
    >
      {initials}
    </div>
  );
}
