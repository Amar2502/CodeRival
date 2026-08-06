"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "../lib/axios";
import { useAuthStore } from "@/lib/authStore";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";

const GUEST_ONLY_ROUTES = ["/", "/signin", "/register", "/forgot-password"];

const PROTECTED_ROUTES = [
  "/dashboard",
  "/battles",
  "/problems",
  "/leaderboard",
  "/profile",
  "/friends",
  "/tournaments",
];

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, setUser, setLoading } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get("/user/me");
        setUser(res.data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [setUser, setLoading]);

  const isGuestOnlyRoute = GUEST_ONLY_ROUTES.includes(pathname);
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  useEffect(() => {
    if (loading) return;

    if (user && isGuestOnlyRoute) {
      router.replace("/dashboard");
    } else if (!user && isProtectedRoute) {
      router.replace("/signin");
    }
  }, [loading, user, isGuestOnlyRoute, isProtectedRoute, router]);

  // While auth check is in progress, show loader
  if (loading) {
    return <FullScreenLoader />;
  }

  // If user is authenticated and attempting to view guest-only routes, keep showing loader while redirecting
  if (user && isGuestOnlyRoute) {
    return <FullScreenLoader />;
  }

  // If user is not authenticated and attempting to view protected routes, keep showing loader while redirecting
  if (!user && isProtectedRoute) {
    return <FullScreenLoader />;
  }

  return <>{children}</>;
}