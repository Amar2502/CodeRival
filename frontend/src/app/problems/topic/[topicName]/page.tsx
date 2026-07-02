"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { api } from "@/lib/axios";
import { PageShell } from "@/components/page-shell";

type TopicProblem = {
  problemNumber: number;
  title: string;
  slug: string;
  difficulty: string;
  submissions?: Array<{ id: string }>;
};

export default function TopicProblemsPage() {
  const router = useRouter();
  const params = useParams<{ topicName: string }>();
  const topicName = decodeURIComponent(params.topicName);
  const [problems, setProblems] = useState<TopicProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadTopicProblems() {
      try {
        setError("");
        const response = await api.get<{ problems: TopicProblem[] }>(
          `/problem/get/by-topic/${encodeURIComponent(topicName)}`,
          {
            signal: controller.signal,
          }
        );

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

        setError("Unable to load problems for this topic right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadTopicProblems();

    return () => {
      active = false;
      controller.abort();
    };
  }, [router, topicName]);

  const filteredProblems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return problems;
    }

    return problems.filter((problem) => {
      return (
        problem.title.toLowerCase().includes(normalizedQuery) ||
        problem.slug.toLowerCase().includes(normalizedQuery) ||
        problem.difficulty.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [problems, query]);

  return (
    <PageShell
      eyebrow="Topic view"
      title={topicName}
      description="A focused list for one topic, kept intentionally simple so you can move straight into practice."
      backHref="/problems"
      backLabel="All problems"
      action={
        <Link
          href="/dashboard"
          className="rounded-full border border-[#334155] px-4 py-2 text-sm text-[#CBD5E1] transition hover:border-[#6366F1] hover:text-[#F8FAFC]"
        >
          Dashboard
        </Link>
      }
    >
      <section className="overflow-hidden rounded-3xl border border-[#334155] bg-[#111827]/80 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.85)]">
        <div className="border-b border-[#334155] px-5 py-4">
          <label className="relative block w-full max-w-lg">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              placeholder="Filter within this topic"
              className="h-11 w-full rounded-2xl border border-[#334155] bg-[#0F172A] pl-10 pr-4 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#647488] focus:border-[#6366F1]"
            />
          </label>
        </div>

        {loading ? (
          <div className="px-5 py-12 text-sm text-[#94A3B8]">Loading topic problems...</div>
        ) : error ? (
          <div className="px-5 py-12 text-sm text-[#94A3B8]">{error}</div>
        ) : filteredProblems.length === 0 ? (
          <div className="px-5 py-12 text-sm text-[#94A3B8]">No problems found for this topic.</div>
        ) : (
          <div>
            {filteredProblems.map((problem) => (
              <Link key={problem.slug} href={`/problems/${problem.slug}`} className="block">
                <article className="grid gap-3 border-b border-[#1E293B] px-5 py-4 transition hover:bg-[#0F172A]/60 lg:grid-cols-[96px_minmax(0,1fr)_auto] lg:items-center">
                  <div className="text-sm text-[#94A3B8]">#{problem.problemNumber}</div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-medium text-[#F8FAFC]">{problem.title}</h2>
                    <p className="mt-1 text-sm text-[#94A3B8]">Open the problem and jump into the editor.</p>
                  </div>
                  <div className="flex items-center justify-start lg:justify-end">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#334155] bg-[#0F172A] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#CBD5E1]">
                      {problem.difficulty}
                      <ChevronRight className="h-3.5 w-3.5" />
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