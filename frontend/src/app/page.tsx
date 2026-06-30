"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Swords, Zap, Trophy, Users, Code2 } from "lucide-react";

/* =========================================================================
   CodeRival — Homepage
   Palette (from design tokens):
   bg-base #0F172A · bg-secondary #111827 · surface #1E293B · card #334155
   border #475569 · primary (indigo) #4F46E5 / hover #4338CA / light #6366F1
   text #F8FAFC · text-secondary #CBD5E1 · text-muted #94A3B8 · disabled #647488
   success #10B981 · warning #F59E0B · error #EF4444
   Accent: hot orange #FB923C is layered in sparingly as the "duel" signal color —
   indigo is "you", orange is "rival". Every 1v1 moment in the UI plays off that pair.
   ========================================================================= */

const RANKS = [
  { name: "Iron", color: "#94A3B8", glow: "rgba(148,163,184,0.35)" },
  { name: "Bronze", color: "#C2785C", glow: "rgba(194,120,92,0.35)" },
  { name: "Silver", color: "#CBD5E1", glow: "rgba(203,213,225,0.45)" },
  { name: "Gold", color: "#F59E0B", glow: "rgba(245,158,11,0.45)" },
  { name: "Diamond", color: "#6366F1", glow: "rgba(99,102,241,0.55)" },
  { name: "Master", color: "#A855F7", glow: "rgba(168,85,247,0.55)" },
  { name: "Legend", color: "#FB923C", glow: "rgba(251,146,60,0.65)" },
];

// const SNIPPET_LINES = [
//   "function duel(you, rival) {",
//   "  const verdict = judge0.run(you.code);",
//   "  if (verdict.passed && verdict.ms < rival.ms) {",
//   "    return WIN;",
//   "  }",
//   "  socket.emit('verdict', verdict);",
//   "}",
// ];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0F172A] text-[#F8FAFC] selection:bg-[#4F46E5]/40">
      <Nav />
      <Hero />
      <ProblemStrip />
      <RoadToGrandmaster />
      <HowItWorks />
      <Features />
      <CTA />
      <Footer />
    </main>
  );
}

/* ---------------------------------- Nav --------------------------------- */

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#1E293B] bg-[#0F172A]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-linear-to-br from-[#4F46E5] to-[#FB923C]">
            <Swords className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-mono text-lg font-bold tracking-tight">
            Code<span className="text-[#6366F1]">Rival</span>
          </span>
        </div>

        <nav className="hidden items-center gap-8 text-sm text-[#CBD5E1] md:flex">
          <a href="#how" className="transition hover:text-[#F8FAFC]">How it works</a>
          <a href="#ranks" className="transition hover:text-[#F8FAFC]">Ranks</a>
          <a href="#features" className="transition hover:text-[#F8FAFC]">Features</a>
          <a href="#" className="transition hover:text-[#F8FAFC]">Hiring rooms</a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/signin"
            className="hidden rounded-md px-4 py-2 text-sm font-medium text-[#CBD5E1] transition hover:text-[#F8FAFC] sm:block"
          >
            Sign in
          </a>
          <a
            href="/register"
            className="group flex items-center gap-1.5 rounded-md bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(99,102,241,0.4)] transition hover:bg-[#4338CA] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
          >
            Enter the Arena
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </header>
  );
}

/* --------------------------------- Hero ---------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[#1E293B]">
      <CodeRain />
      {/* vignette so text stays legible over the rain */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-[#0F172A] via-[#0F172A]/85 to-[#0F172A]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(79,70,229,0.25),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 md:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-[#475569] bg-[#1E293B]/60 px-3 py-1 text-xs text-[#94A3B8]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            </span>
            2,481 duelists online right now
          </div>

          <h1 className="font-mono text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            Code<span className="text-[#6366F1]">Rival</span>
          </h1>
          <p className="mt-3 text-lg font-medium text-[#CBD5E1] sm:text-xl">
            Compete. Climb. Conquer.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-balance text-[#94A3B8]">
            Challenge your friends in real-time coding battles. Same problem, same clock,
            one winner — settled by test cases, not opinions.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/register"
              className="group flex w-full items-center justify-center gap-2 rounded-md bg-[#4F46E5] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#4338CA] hover:shadow-[0_0_24px_rgba(99,102,241,0.45)] sm:w-auto"
            >
              <Zap className="h-4 w-4" />
              Start a Duel
            </a>
            <a
              href="#how"
              className="w-full rounded-md border border-[#475569] bg-[#1E293B]/40 px-7 py-3 text-center text-sm font-medium text-[#CBD5E1] transition hover:border-[#6366F1] hover:text-[#F8FAFC] sm:w-auto"
            >
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function CodeRain() {
  const tokens = [
    "const", "while", "=>", "{ }", "[i]", "true", "0(n)", "await", "fn()",
    "==", "return", "for", "let", "!=", "0(log n)", "push()", "null", "try",
  ];
  const columns = Array.from({ length: 18 });

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.16]">
      <div className="flex h-full w-full justify-between">
        {columns.map((_, c) => {
          const duration = 14 + ((c * 7) % 11);
          const delay = -(c * 1.7) % duration;
          return (
            <div
              key={c}
              className="flex flex-col gap-6 font-mono text-xs text-[#6366F1]"
              style={{
                animation: `coderain ${duration}s linear infinite`,
                animationDelay: `${delay}s`,
              }}
            >
              {Array.from({ length: 24 }).map((__, i) => (
                <span key={i} style={{ opacity: 1 - (i % 8) * 0.1 }}>
                  {tokens[(c + i * 3) % tokens.length]}
                </span>
              ))}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes coderain {
          from { transform: translateY(-50%); }
          to { transform: translateY(0%); }
        }
      `}</style>
    </div>
  );
}

/* ----------------------------- Problem strip ----------------------------- */

function ProblemStrip() {
  const stats = [
    { label: "Active duelists", value: "12,400+" },
    { label: "Battles fought", value: "89,231" },
    { label: "Avg. match time", value: "6m 40s" },
    { label: "Problems seeded", value: "50" },
  ];
  return (
    <section className="border-b border-[#1E293B] bg-[#111827]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center sm:text-left">
            <div className="font-mono text-2xl font-bold text-[#F8FAFC] sm:text-3xl">
              {s.value}
            </div>
            <div className="mt-1 text-xs text-[#94A3B8]">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- Road to Grandmaster -------------------------- */

function RoadToGrandmaster() {
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <section id="ranks" className="relative overflow-hidden border-b border-[#1E293B] py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(251,146,60,0.08),transparent)]" />

      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#FB923C]">
            ELO progression
          </span>
          <h2 className="mt-3 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
            Road to Grandmaster
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[#94A3B8]">
            Every win pulls your rating up the line. Every loss pulls it back.
            Seven ranks stand between you and Legend.
          </p>
        </div>
      </div>

      {/* horizontal journey track */}
      <div
        ref={trackRef}
        className="scrollbar-none relative mx-auto max-w-7xl overflow-x-auto px-6 pb-4"
      >
        <div className="relative flex min-w-230 items-center justify-between gap-2 px-4 py-10 sm:min-w-0">
          {/* connecting line */}
          <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-linear-to-r from-[#475569] via-[#6366F1] to-[#FB923C]" />

          {RANKS.map((rank, i) => (
            <div key={rank.name} className="relative z-10 flex flex-1 flex-col items-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 bg-[#0F172A] text-xs font-bold transition-transform duration-300 hover:scale-110 sm:h-20 sm:w-20"
                style={{
                  borderColor: rank.color,
                  boxShadow: `0 0 22px ${rank.glow}`,
                }}
              >
                <RankGlyph index={i} color={rank.color} />
              </div>
              <span
                className="mt-3 font-mono text-sm font-semibold"
                style={{ color: rank.color }}
              >
                {rank.name}
              </span>
              <span className="mt-0.5 font-mono text-[10px] text-[#647488]">
                {(i + 1) * 400} ELO
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center font-mono text-xs text-[#647488]">
        scroll to walk the full ladder on mobile →
      </p>
    </section>
  );
}

function RankGlyph({ index, color }: { index: number; color: string }) {
  // simple chevron-stack glyph, density increases with rank
  const chevrons = index + 1;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      {Array.from({ length: Math.min(chevrons, 4) }).map((_, i) => (
        <path
          key={i}
          d={`M5 ${17 - i * 4} L12 ${11 - i * 4} L19 ${17 - i * 4}`}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={1 - i * 0.15}
        />
      ))}
    </svg>
  );
}

/* -------------------------------- How it works ---------------------------- */

function HowItWorks() {
  const steps = [
    {
      icon: Users,
      title: "Get matched",
      copy: "Queue solo or challenge a friend by handle. ELO matchmaking finds you an even fight.",
    },
    {
      icon: Code2,
      title: "Same problem, same clock",
      copy: "You and your rival get an identical problem in the Monaco editor. The timer starts for both at once.",
    },
    {
      icon: Zap,
      title: "Judge0 verdicts, live",
      copy: "Every submission runs against hidden test cases in an isolated sandbox. Verdicts stream to both screens in real time.",
    },
    {
      icon: Trophy,
      title: "Win, climb, repeat",
      copy: "First to pass all tests wins the duel and the ELO. Lose, and you're already queuing for the rematch.",
    },
  ];

  return (
    <section id="how" className="border-b border-[#1E293B] bg-[#111827] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-xl">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#6366F1]">
            The format
          </span>
          <h2 className="mt-3 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
            One problem. Two coders. One winner.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-[#334155] bg-[#334155] sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="group relative bg-[#0F172A] p-6 transition hover:bg-[#1E293B]">
              <span className="font-mono text-xs text-[#647488]">0{i + 1}</span>
              <s.icon className="mt-3 h-5 w-5 text-[#6366F1] transition group-hover:text-[#FB923C]" />
              <h3 className="mt-4 font-semibold text-[#F8FAFC]">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{s.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- Features ------------------------------ */

function Features() {
  const features = [
    {
      title: "Keystroke replay",
      copy: "Every match is recorded keystroke-by-keystroke. Scrub back through any duel and watch exactly where it was won or lost.",
      tag: "Signature",
    },
    {
      title: "Ranked ladder",
      copy: "Iron to Legend. A transparent ELO curve that rewards consistency, not lucky streaks.",
      tag: "Core",
    },
    {
      title: "Hiring rooms",
      copy: "Run live technical interviews inside CodeRival. Candidates duel a benchmark problem set while you watch the verdict stream.",
      tag: "For teams",
    },
  ];

  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-xl">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#FB923C]">
            Built for the grind
          </span>
          <h2 className="mt-3 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
            More than a duel.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-[#334155] bg-[#1E293B] p-7 transition hover:border-[#6366F1] hover:shadow-[0_0_30px_-10px_rgba(99,102,241,0.4)]"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">
                {f.tag}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-[#F8FAFC]">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{f.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------ CTA --------------------------------- */

function CTA() {
  return (
    <section className="relative overflow-hidden border-y border-[#1E293B]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,rgba(79,70,229,0.18),transparent)]" />
      <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="font-mono text-3xl font-bold tracking-tight sm:text-4xl">
          Your rival is already queuing.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[#94A3B8]">
          Sign in, pick a problem, and find out who actually ships faster under pressure.
        </p>
        <a
          href="/register"
          className="group mt-8 inline-flex items-center gap-2 rounded-md bg-[#4F46E5] px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-[#4338CA] hover:shadow-[0_0_24px_rgba(99,102,241,0.45)]"
        >
          <Swords className="h-4 w-4" />
          Enter the Arena
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </a>
      </div>
    </section>
  );
}

/* ----------------------------------- Footer -------------------------------- */

function Footer() {
  return (
    <footer className="bg-[#111827] py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <div className="flex items-center gap-2 font-mono text-sm text-[#94A3B8]">
          <Swords className="h-4 w-4 text-[#6366F1]" />
          Code<span className="text-[#6366F1]">Rival</span>
          <span className="text-[#647488]">· built by @amarpandey</span>
        </div>
        <a
          href="https://github.com/amarpandey2502"
          className="flex items-center gap-1.5 text-sm text-[#94A3B8] transition hover:text-[#F8FAFC]"
        >
          {/* <Github className="h-4 w-4" /> */}
          amarpandey2502
        </a>
      </div>
    </footer>
  );
}