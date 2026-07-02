"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, UserRoundSearch, XCircle } from "lucide-react";
import { API_URL } from "@/lib/api";
import { PageShell } from "@/components/page-shell";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "error";

export default function CheckUsernamePage() {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<UsernameStatus>("idle");

  useEffect(() => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    setStatus("checking");

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_URL}/user/check-username?username=${encodeURIComponent(trimmedUsername)}`,
          {
            signal: controller.signal,
          }
        );

        const data = (await response.json().catch(() => ({}))) as { available?: boolean };

        if (!response.ok) {
          throw new Error("Unable to check username");
        }

        setStatus(data.available ? "available" : "taken");
      } catch {
        if (!controller.signal.aborted) {
          setStatus("error");
        }
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [username]);

  return (
    <PageShell
      eyebrow="Utility"
      title="Check a username"
      description="A tiny helper page for the same availability check used during registration."
      backHref="/register"
      backLabel="Register"
      action={
        <Link
          href="/signin"
          className="rounded-full border border-[#334155] px-4 py-2 text-sm text-[#CBD5E1] transition hover:border-[#6366F1] hover:text-[#F8FAFC]"
        >
          Sign in
        </Link>
      }
    >
      <section className="overflow-hidden rounded-3xl border border-[#334155] bg-[#111827]/80 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.85)]">
        <div className="flex flex-col gap-4 border-b border-[#334155] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full max-w-xl">
            <UserRoundSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              type="text"
              placeholder="Type a username to check availability"
              className="h-11 w-full rounded-2xl border border-[#334155] bg-[#0F172A] pl-10 pr-4 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#647488] focus:border-[#6366F1]"
            />
          </label>

          <div className="flex items-center gap-3 text-sm text-[#CBD5E1]">
            {status === "checking" ? (
              <span className="inline-flex items-center gap-2 text-[#94A3B8]"><Loader2 className="h-4 w-4 animate-spin" /> Checking</span>
            ) : status === "available" ? (
              <span className="inline-flex items-center gap-2 text-[#86EFAC]"><CheckCircle2 className="h-4 w-4" /> Available</span>
            ) : status === "taken" ? (
              <span className="inline-flex items-center gap-2 text-[#FCA5A5]"><XCircle className="h-4 w-4" /> Taken</span>
            ) : status === "error" ? (
              <span className="inline-flex items-center gap-2 text-[#FDBA74]"><XCircle className="h-4 w-4" /> Unable to check</span>
            ) : (
              <span className="text-[#94A3B8]">Results update as you type.</span>
            )}
          </div>
        </div>

        <div className="px-5 py-5 text-sm leading-7 text-[#CBD5E1]">
          This page mirrors the registration lookup, so you can test handles before creating an account.
        </div>
      </section>
    </PageShell>
  );
}