"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, Sparkles } from "lucide-react";
import { api } from "@/lib/axios";
import { PageShell } from "@/components/page-shell";

type ProblemRow = {
  problemNumber: number;
  title: string;
  slug: string;
  difficulty: string;
  topics: Array<{ name: string }>;
};

const PAGE_SIZE = 12;

function difficultyTone(difficulty: string) {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return "border-[#14532D] bg-[#052E16] text-[#86EFAC]";
    case "medium":
      return "border-[#9A3412] bg-[#431407] text-[#FDBA74]";
    case "hard":
      return "border-[#7F1D1D] bg-[#450A0A] text-[#FCA5A5]";
    default:
      return "border-[#475569] bg-[#0B1220] text-[#CBD5E1]";
  }
}

export default function ProblemsBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const query = searchParams.get("q") ?? "";
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadProblems() {
      try {
        setError("");
        const response = await api.get<{ problems: ProblemRow[] }>(`/problem/get/get-all/${page}/${PAGE_SIZE}`, {
          signal: controller.signal,
        });

        if (!active) {
          return;
        }

        setProblems(response.data.problems);
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

        setError("Unable to load problems right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProblems();

    return () => {
      active = false;
      controller.abort();
    };
  }, [page, router]);

  const filteredProblems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return problems;
    }

    return problems.filter((problem) => {
      const topicText = problem.topics.map((topic) => topic.name).join(" ").toLowerCase();
      return (
        problem.title.toLowerCase().includes(normalizedQuery) ||
        problem.slug.toLowerCase().includes(normalizedQuery) ||
        topicText.includes(normalizedQuery)
      );
    });
  }, [problems, query]);

  const topicLinks = useMemo(() => {
    const seen = new Set<string>();
    const values: string[] = [];

    for (const problem of problems) {
      for (const topic of problem.topics) {
        if (!seen.has(topic.name)) {
          seen.add(topic.name);
          values.push(topic.name);
        }
      }
    }

    return values.slice(0, 8);
  }, [problems]);

  function updateSearch(value: string) {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (value.trim()) {
      nextParams.set("q", value.trim());
    } else {
      nextParams.delete("q");
    }

    router.replace(`/problems${nextParams.toString() ? `?${nextParams.toString()}` : ""}`);
  }

  function movePage(step: number) {
    const nextPage = Math.max(1, page + step);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("page", String(nextPage));
    router.push(`/problems?${nextParams.toString()}`);
  }

  return (
    <PageShell
      eyebrow="Problem browser"
      title="Browse challenges"
      description="A clean problem list with quick topic shortcuts, simple filtering, and direct links into each duel."
      backHref="/dashboard"
      backLabel="Dashboard"
      action={
        <Link
          href="/user/check-username"
          className="rounded-full border border-[#334155] px-4 py-2 text-sm text-[#CBD5E1] transition hover:border-[#6366F1] hover:text-[#F8FAFC]"
        >
          Check username
        </Link>
      }
    >
      <section className="overflow-hidden rounded-3xl border border-[#334155] bg-[#111827]/80 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.85)]">
        <div className="flex flex-col gap-4 border-b border-[#334155] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              value={query}
              onChange={(event) => updateSearch(event.target.value)}
              type="search"
              placeholder="Search the current page by title, slug, or topic"
              className="h-11 w-full rounded-2xl border border-[#334155] bg-[#0F172A] pl-10 pr-4 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#647488] focus:border-[#6366F1]"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 text-sm text-[#CBD5E1]">
            <button
              type="button"
              onClick={() => movePage(-1)}
              disabled={page === 1}
              className="inline-flex items-center gap-2 rounded-full border border-[#334155] px-4 py-2 transition hover:border-[#6366F1] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <span className="rounded-full border border-[#334155] px-4 py-2 text-[#94A3B8]">
              Page {page}
            </span>
            <button
              type="button"
              onClick={() => movePage(1)}
              className="inline-flex items-center gap-2 rounded-full border border-[#334155] px-4 py-2 transition hover:border-[#6366F1] hover:text-[#F8FAFC]"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-[#334155] px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#334155] bg-[#0F172A] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-[#94A3B8]">
              <Sparkles className="h-3.5 w-3.5 text-[#FB923C]" />
              Topic shortcuts
            </span>
            {topicLinks.length ? (
              topicLinks.map((topic) => (
                <Link
                  key={topic}
                  href={`/problems/topic/${encodeURIComponent(topic)}`}
                  className="rounded-full border border-[#334155] px-3 py-1.5 text-sm text-[#CBD5E1] transition hover:border-[#6366F1] hover:text-[#F8FAFC]"
                >
                  {topic}
                </Link>
              ))
            ) : (
              <span className="text-sm text-[#94A3B8]">Load a page to see topic shortcuts.</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-12 text-sm text-[#94A3B8]">Loading problems...</div>
        ) : error ? (
          <div className="px-5 py-12 text-sm text-[#94A3B8]">{error}</div>
        ) : filteredProblems.length === 0 ? (
          <div className="px-5 py-12 text-sm text-[#94A3B8]">No problems match the current filter.</div>
        ) : (
          <div>
            {filteredProblems.map((problem) => (
              <Link key={problem.slug} href={`/problems/${problem.slug}`} className="block">
                <article className="grid gap-3 border-b border-[#1E293B] px-5 py-4 transition hover:bg-[#0F172A]/60 lg:grid-cols-[96px_minmax(0,1fr)_auto] lg:items-center">
                  <div className="text-sm text-[#94A3B8]">#{problem.problemNumber}</div>

                  <div className="min-w-0">
                    <h2 className="truncate text-base font-medium text-[#F8FAFC]">{problem.title}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {problem.topics.length ? (
                        problem.topics.map((topic) => (
                          <span
                            key={`${problem.slug}-${topic.name}`}
                            className="rounded-full border border-[#334155] bg-[#0F172A] px-2.5 py-1 text-xs text-[#CBD5E1]"
                          >
                            {topic.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#94A3B8]">No topics attached</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-start lg:justify-end">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${difficultyTone(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}