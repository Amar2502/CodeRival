"use client";

import React, { useState } from "react";

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
  const [imageError, setImageError] = useState(false);
  const initial = (name || username || "U").charAt(0).toUpperCase();

  const showImage = src && !imageError;

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 border border-border/80 bg-surface flex items-center justify-center font-bold text-foreground transition-all duration-200 hover:ring-2 hover:ring-primary/40 hover:border-primary/50 shadow-xs ${sizeClasses[size]} ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={username}
          className="w-full h-full object-cover rounded-full transition-opacity duration-300"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="bg-linear-to-br from-primary/20 via-surface-2 to-accent/20 w-full h-full flex items-center justify-center text-primary font-bold tracking-tight select-none">
          {initial}
        </span>
      )}
    </div>
  );
}
