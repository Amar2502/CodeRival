"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { PageShell } from "@/components/page-shell";

type MeResponse = {
  user: {
    id: string;
    username: string;
    email: string;
  };
};

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadMe() {
      try {
        setError("");
        const response = await api.get<MeResponse>("/user/me", {
          signal: controller.signal,
        });

        if (!active) {
          return;
        }

        setUser(response.data.user);
      } catch (requestError) {
        if (controller.signal.aborted || !active) {
          return;
        }

        if (
          typeof requestError === "object" &&
          requestError !== null &&
          "response" in requestError &&
          (requestError as { response?: { status?: number } }).response?.status === 401
        ) {
          router.replace("/signin");
          return;
        }

        setError("Unable to load your account right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadMe();

    return () => {
      active = false;
      controller.abort();
    };
  }, [router]);

  return (
    <PageShell
      eyebrow="Account"
      title="Signed-in user"
      description="A compact view of the current session, useful for confirming the account behind the cookie-based auth flow."
      backHref="/dashboard"
      backLabel="Dashboard"
      action={
        user ? (
          <Link
            href={`/profile/${encodeURIComponent(user.id)}`}
            className="rounded-full border border-[#334155] px-4 py-2 text-sm text-[#CBD5E1] transition hover:border-[#6366F1] hover:text-[#F8FAFC]"
          >
            Open profile
          </Link>
        ) : null
      }
    >
      <section className="overflow-hidden rounded-3xl border border-[#334155] bg-[#111827]/80 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.85)]">
        {loading ? (
          <div className="px-5 py-12 text-sm text-[#94A3B8]">Loading account details...</div>
        ) : error ? (
          <div className="px-5 py-12 text-sm text-[#94A3B8]">{error}</div>
        ) : user ? (
          <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm text-[#94A3B8]">Current session</p>
              <h2 className="mt-1 text-2xl font-semibold text-[#F8FAFC]">@{user.username}</h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-[#CBD5E1]">
                This screen confirms the account attached to the authenticated cookie. It keeps the same dark, simple theme used across the rest of the app.
              </p>
            </div>

            <div className="grid gap-3 rounded-2xl border border-[#334155] bg-[#0F172A] p-4 text-sm text-[#CBD5E1]">
              <div className="flex items-center justify-between gap-4 border-b border-[#1E293B] pb-3">
                <span className="text-[#94A3B8]">User ID</span>
                <span className="truncate font-mono text-xs text-[#F8FAFC]">{user.id}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[#1E293B] pb-3">
                <span className="text-[#94A3B8]">Username</span>
                <span className="text-[#F8FAFC]">{user.username}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#94A3B8]">Email</span>
                <span className="truncate text-[#F8FAFC]">{user.email}</span>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </PageShell>
  );
}