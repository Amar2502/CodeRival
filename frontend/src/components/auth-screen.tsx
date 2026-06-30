"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Shield, Swords, Zap } from "lucide-react";
import { API_URL } from "../lib/api";
import { useAuthStore } from "@/lib/auth_store";

type AuthMode = "signin" | "register";

type FormState = {
  name: string;
  username: string;
  email: string;
  identifier: string;
  password: string;
};

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "error";

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
}

interface AuthResponse {
  message?: string;
  user: User;
}

const initialFormState: FormState = {
  name: "",
  username: "",
  email: "",
  identifier: "",
  password: "",
};

const copy = {
  signin: {
    badge: "Welcome back, duelist",
    title: "Sign in to the arena",
    subtitle: "Pick up where you left off and jump straight into the next battle.",
    helper: "Use your username or email address.",
    action: "Sign in",
    switchCopy: "Need an account?",
    switchLabel: "Create one",
    switchHref: "/register",
  },
  register: {
    badge: "Join the ladder",
    title: "Create your CodeRival account",
    subtitle: "Claim your handle, enter the ladder, and start challenging rivals.",
    helper: "Your username must be unique across the platform.",
    action: "Create account",
    switchCopy: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/signin",
  },
} satisfies Record<
  AuthMode,
  {
    badge: string;
    title: string;
    subtitle: string;
    helper: string;
    action: string;
    switchCopy: string;
    switchLabel: string;
    switchHref: string;
  }
>;

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [form, setForm] = useState(initialFormState);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");

  const current = copy[mode];
  const isRegister = mode === "register";

  const { setUser } = useAuthStore();

  useEffect(() => {
    if (!isRegister) {
      setUsernameStatus("idle");
      return;
    }

    const username = form.username.trim();

    if (!username) {
      setUsernameStatus("idle");
      return;
    }

    const controller = new AbortController();
    setUsernameStatus("checking");

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_URL}/user/check-username?username=${encodeURIComponent(username)}`,
          {
            signal: controller.signal,
          }
        );

        const data = (await response.json().catch(() => ({}))) as { available?: boolean };

        if (!response.ok) {
          throw new Error("Unable to check username");
        }

        setUsernameStatus(data.available ? "available" : "taken");
      } catch (usernameError) {
        if (!controller.signal.aborted) {
          setUsernameStatus("error");
        }
      }
    }, 500);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [form.username, isRegister]);

  function updateField(field: keyof FormState, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    if (field === "username" && isRegister) {
      setUsernameStatus("idle");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const payload = isRegister
      ? {
          name: form.name,
          username: form.username,
          email: form.email,
          password: form.password,
        }
      : {
          id: form.identifier,
          password: form.password,
        };

    try {
      const response = await fetch(`${API_URL}/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as AuthResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to complete authentication");
      }

      setUser(data.user);

      if (isRegister) {
        router.replace(`/verify-email?email=${encodeURIComponent(form.email)}`);
      } else {
        router.replace("/dashboard");
      }
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0F172A] text-[#F8FAFC]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_32%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.16),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.8),rgba(15,23,42,1))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#475569] to-transparent" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10">
        <div className="grid w-full overflow-hidden rounded-4xl border border-[#334155] bg-[#111827]/85 shadow-[0_30px_120px_-40px_rgba(15,23,42,0.95)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative overflow-hidden border-b border-[#334155] p-8 lg:border-b-0 lg:border-r">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(79,70,229,0.12),transparent_55%)]" />
            <div className="relative flex h-full flex-col justify-between gap-10">
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#475569] bg-[#0F172A]/70 px-3 py-1 text-xs text-[#CBD5E1]">
                  <Shield className="h-3.5 w-3.5 text-[#6366F1]" />
                  {current.badge}
                </div>
                <h1 className="max-w-md font-mono text-4xl font-bold tracking-tight sm:text-5xl">
                  {current.title}
                </h1>
                <p className="mt-4 max-w-lg text-base leading-7 text-[#94A3B8]">
                  {current.subtitle}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: Swords,
                    title: "Battle-tested flow",
                    text: "Jump from landing page to duel queue without losing momentum.",
                  },
                  {
                    icon: Zap,
                    title: "Cookie sessions",
                    text: "Your login is stored in an httpOnly cookie from the backend.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-[#334155] bg-[#0F172A]/70 p-4">
                    <item.icon className="h-5 w-5 text-[#FB923C]" />
                    <h2 className="mt-3 font-semibold text-[#F8FAFC]">{item.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-[#94A3B8]">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="p-8 sm:p-10">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#FB923C]">
                  {mode === "signin" ? "Sign in" : "Register"}
                </p>
                <p className="mt-2 text-sm text-[#94A3B8]">{current.helper}</p>
              </div>
              <Link
                href="/"
                className="rounded-full border border-[#334155] px-4 py-2 text-sm text-[#CBD5E1] transition hover:border-[#6366F1] hover:text-[#F8FAFC]"
              >
                Home
              </Link>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {isRegister ? (
                <>
                  <Field
                    label="Name"
                    value={form.name}
                    onChange={(value) => updateField("name", value)}
                    placeholder="Jane Doe"
                    autoComplete="name"
                  />
                  <Field
                    label="Username"
                    value={form.username}
                    onChange={(value) => updateField("username", value)}
                    placeholder="jane_rival"
                    autoComplete="username"
                    helperText={
                      isRegister && form.username.trim()
                        ? usernameStatus === "available"
                          ? "username_available"
                          : usernameStatus === "taken"
                            ? "username_taken"
                            : usernameStatus === "error"
                              ? "unable to check username"
                              : undefined
                        : undefined
                    }
                    helperTone={
                      usernameStatus === "available"
                        ? "success"
                        : usernameStatus === "taken"
                          ? "danger"
                          : "muted"
                    }
                  />
                  <Field
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(value) => updateField("email", value)}
                    placeholder="jane@coderival.dev"
                    autoComplete="email"
                  />
                </>
              ) : (
                <Field
                  label="Username or email"
                  value={form.identifier}
                  onChange={(value) => updateField("identifier", value)}
                  placeholder="jane_rival or jane@coderival.dev"
                  autoComplete="username"
                />
              )}

              <Field
                label="Password"
                type="password"
                value={form.password}
                onChange={(value) => updateField("password", value)}
                placeholder="••••••••"
                autoComplete={isRegister ? "new-password" : "current-password"}
              />

              {error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3.5 font-semibold text-white transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Please wait..." : current.action}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>
            </form>

            <div className="mt-8 rounded-2xl border border-[#334155] bg-[#0F172A]/70 p-4 text-sm text-[#CBD5E1]">
              <span className="text-[#94A3B8]">{current.switchCopy}</span>{" "}
              <Link href={current.switchHref} className="font-semibold text-[#F8FAFC] underline decoration-[#6366F1] underline-offset-4">
                {current.switchLabel}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  helperText,
  helperTone = "muted",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder: string;
  autoComplete?: string;
  helperText?: string;
  helperTone?: "muted" | "success" | "danger";
}) {
  const helperClassName =
    helperTone === "success"
      ? "text-[#10B981]"
      : helperTone === "danger"
        ? "text-[#EF4444]"
        : "text-[#94A3B8]";

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#CBD5E1]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-[#334155] bg-[#0F172A] px-4 py-3 text-[#F8FAFC] outline-none transition placeholder:text-[#647488] focus:border-[#6366F1]"
      />
      <span className={`mt-1.5 block min-h-4 text-xs ${helperClassName}`}>{helperText ?? ""}</span>
    </label>
  );
}
