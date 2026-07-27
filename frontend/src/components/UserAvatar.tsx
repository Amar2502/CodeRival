"use client";

import React from "react";

interface UserAvatarProps {
  src?: string | null;
  username?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const sizeClasses = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
  "2xl": "w-24 h-24 text-3xl",
};

export function UserAvatar({
  src,
  username = "User",
  name,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const initial = (name || username || "U").charAt(0).toUpperCase();

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 border border-border bg-surface flex items-center justify-center font-bold text-foreground ${sizeClasses[size]} ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={username}
          className="w-full h-full object-cover rounded-full"
          onError={(e) => {
            // Fallback to initials on broken image load
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      ) : null}

      {!src && (
        <span className="bg-gradient-to-br from-primary/20 via-surface to-accent/20 w-full h-full flex items-center justify-center text-primary">
          {initial}
        </span>
      )}
    </div>
  );
}
