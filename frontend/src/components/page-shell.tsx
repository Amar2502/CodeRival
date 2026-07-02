import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function PageShell({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Back",
  action,
  children,
}: PageShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0F172A] text-[#F8FAFC] selection:bg-[#4F46E5]/40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.12),transparent_26%),linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,1))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#475569] to-transparent" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-7 flex flex-col gap-5 border-b border-[#334155] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            {backHref ? (
              <Link
                href={backHref}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#334155] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-[#CBD5E1] transition hover:border-[#6366F1] hover:text-[#F8FAFC]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {backLabel}
              </Link>
            ) : null}
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#FB923C]">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#94A3B8] sm:text-base">
              {description}
            </p>
          </div>

          {action ? <div className="flex items-center gap-3">{action}</div> : null}
        </div>

        {children}
      </div>
    </main>
  );
}