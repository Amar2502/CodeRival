"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Mail, ShieldCheck, SkipForward } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(() => searchParams.get("email") ?? "your email", [searchParams]);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState(Array.from({ length: 6 }, () => ""));
  const [verified, setVerified] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otp.join("").trim()) {
      return;
    }

    setSkipped(false);
    setVerified(true);
  }

  function handleRequestOtp() {
    setOtpRequested(true);
    setVerified(false);
    setSkipped(false);
    window.setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 0);
  }

  function updateDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);

    setOtp((currentOtp) => {
      const nextOtp = [...currentOtp];
      nextOtp[index] = digit;
      return nextOtp;
    });

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleSkip() {
    setVerified(false);
    setSkipped(true);
    router.push("/");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0F172A] text-[#F8FAFC]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.14),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.75),rgba(15,23,42,1))]" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center px-6 py-10">
        <div className="grid w-full overflow-hidden rounded-4xl border border-[#334155] bg-[#111827]/85 shadow-[0_30px_120px_-40px_rgba(15,23,42,0.95)] backdrop-blur-xl lg:grid-cols-[0.9fr_1.1fr]">
          <section className="border-b border-[#334155] p-8 lg:border-b-0 lg:border-r">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#475569] bg-[#0F172A]/70 px-3 py-1 text-xs text-[#CBD5E1]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
              Optional verification
            </div>

            <h1 className="max-w-md font-mono text-4xl font-bold tracking-tight sm:text-5xl">
              Verify your email
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-[#94A3B8]">
              We would normally send an OTP to {email}. For now, this is a UI-only step: enter any code to continue, or skip verification for later.
            </p>

            <div className="mt-8 grid gap-4">
              {[
                {
                  icon: Mail,
                  title: "Email delivery",
                  text: "Send OTP code after registration in production.",
                },
                {
                  icon: CheckCircle2,
                  title: "Verified state",
                  text: "Show a confirmed badge once the code is accepted.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-[#334155] bg-[#0F172A]/70 p-4">
                  <item.icon className="h-5 w-5 text-[#6366F1]" />
                  <h2 className="mt-3 font-semibold text-[#F8FAFC]">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#94A3B8]">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="p-8 sm:p-10">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#FB923C]">Email verification</p>
                <p className="mt-2 text-sm text-[#94A3B8]">Enter any OTP to mark the screen as verified.</p>
              </div>
              <Link
                href="/"
                className="rounded-full border border-[#334155] px-4 py-2 text-sm text-[#CBD5E1] transition hover:border-[#6366F1] hover:text-[#F8FAFC]"
              >
                Home
              </Link>
            </div>

            {otpRequested ? (
              <div className="mb-6 rounded-2xl border border-[#334155] bg-[#0F172A]/70 p-4 text-sm text-[#CBD5E1]">
                {verified ? (
                  <span className="font-semibold text-[#10B981]">verified</span>
                ) : skipped ? (
                  <span className="font-semibold text-[#94A3B8]">skipped for now</span>
                ) : (
                  <span className="font-semibold text-[#CBD5E1]">Check your email for the OTP</span>
                )}
              </div>
            ) : null}

            {!otpRequested ? (
              <button
                type="button"
                onClick={handleRequestOtp}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3.5 font-semibold text-white transition hover:bg-[#4338CA]"
              >
                Get OTP
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>
            ) : (
              <form className="space-y-4" onSubmit={handleVerify}>
                <div>
                  <span className="mb-2 block text-sm font-medium text-[#CBD5E1]">OTP code</span>
                  <div className="grid grid-cols-6 gap-2 sm:gap-3">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          inputRefs.current[index] = element;
                        }}
                        value={digit}
                        onChange={(event) => updateDigit(index, event.target.value)}
                        onKeyDown={(event) => handleKeyDown(index, event)}
                        inputMode="numeric"
                        maxLength={1}
                        aria-label={`OTP digit ${index + 1}`}
                        className="h-14 w-full rounded-2xl border border-[#334155] bg-[#0F172A] text-center text-lg font-semibold text-[#F8FAFC] outline-none transition placeholder:text-[#647488] focus:border-[#6366F1]"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3.5 font-semibold text-white transition hover:bg-[#4338CA]"
                >
                  Verify email
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </button>
              </form>
            )}

            {verified ? (
              <div className="mt-4 rounded-2xl border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-3 text-sm text-[#A7F3D0]">
                Email verified successfully.
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleSkip}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#334155] px-5 py-3 text-sm font-medium text-[#CBD5E1] transition hover:border-[#6366F1] hover:text-[#F8FAFC]"
              >
                <SkipForward className="h-4 w-4" />
                Skip for now
              </button>
              <Link
                href="/signin"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#334155] px-5 py-3 text-sm font-medium text-[#CBD5E1] transition hover:border-[#6366F1] hover:text-[#F8FAFC]"
              >
                Go to sign in
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}