"use client";

import { useEffect } from "react";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/lib/auth_store";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setUser, setLoading } = useAuthStore();

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

  return <>{children}</>;
}