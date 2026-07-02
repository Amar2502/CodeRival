"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  BookOpen,
  Users,
  History,
  ThumbsUp,
  ThumbsDown,
  Star,
  Share2,
  HelpCircle,
  CheckCircle2,
  Tag,
  Lock,
  Lightbulb,
} from "lucide-react";
import { api } from "@/lib/axios";
import { Badge } from "@/components/ui/badge";

const TABS = [
  { key: "description", label: "Description", icon: FileText },
  { key: "editorial", label: "Editorial", icon: BookOpen },
  { key: "solutions", label: "Solutions", icon: Users },
  { key: "submissions", label: "Submissions", icon: History },
];

type ProblemPayload = {
  id: string;
  title: string;
  description: string;
  slug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  constraints: string[];
  topics: Array<{ id: string; name: string }>;
  starterCodes: Array<{ language: "CPP" | "JAVA" | "PYTHON"; starterCode: string }>;
  testCases: Array<{ id: string; input: string; output: string; isSample: boolean }>;
  likes?: number;
  dislikes?: number;
  onlineCount?: number;
};

type ProblemPanelProps = {
  slug: string;
};

function formatDifficulty(difficulty: ProblemPayload["difficulty"]) {
  switch (difficulty) {
    case "EASY":
      return { label: "Easy", variant: "neutral" as const };
    case "MEDIUM":
      return { label: "Medium", variant: "secondary" as const };
    case "HARD":
      return { label: "Hard", variant: "destructive" as const };
  }
}

export default function ProblemPanel({ slug }: ProblemPanelProps) {
  const [activeTab, setActiveTab] = useState("description");
  const [problem, setProblem] = useState<ProblemPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadProblem() {
      try {
        setError("");
        const response = await api.get<{ problem: ProblemPayload }>(`/problem/get/${slug}`, {
          signal: controller.signal,
        });

        if (!active) {
          return;
        }

        setProblem(response.data.problem);
      } catch {
        if (controller.signal.aborted || !active) {
          return;
        }

        setError("Unable to load problem right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProblem();

    return () => {
      active = false;
      controller.abort();
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#94A3B8]">
        Loading problem...
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#94A3B8]">
        {error || "Problem not found."}
      </div>
    );
  }

  const p = problem;
  const difficulty = formatDifficulty(p.difficulty);
  const sampleCases = p.testCases.filter((testCase) => testCase.isSample);

  return (
    <div className="flex h-full flex-col bg-[#111827]/90 text-[#F8FAFC]">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-[#334155] px-2 py-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${active
                ? "bg-[#1E293B] text-[#F8FAFC]"
                : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC]"
                }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Scrollable content */}
      <div className="lc-scroll flex-1 overflow-y-auto px-5 py-4">
        {activeTab === "description" && (
          <div className="problem-content">
            {/* Title row */}
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-[#F8FAFC]">
                {p.title}
              </h1>
              <span className="flex items-center gap-1 text-sm font-medium text-[#10B981]">
                Solved <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>

            {/* Badges */}
            <div className="mb-5 flex items-center gap-2">
              <Badge variant={difficulty.variant}>
                {difficulty.label}
              </Badge>
              <Badge variant="neutral" className="gap-1">
                <Tag className="h-3 w-3" />
                {p.topics.length ? p.topics.map((topic) => topic.name).join(" • ") : "Topics"}
              </Badge>
            </div>

            {/* Prompt */}
            <p className="mb-3 text-[15px] leading-6 text-[#CBD5E1]">
              {p.description}
            </p>

            {/* Examples */}
            {sampleCases.map((testCase, i) => (
              <div key={i} className="mb-5">
                <p className="mb-2 font-semibold text-[#F8FAFC]">
                  Example {i + 1}:
                </p>
                <div className="rounded-lg border border-[#334155] bg-[#0B1220] p-4 font-mono text-[13px] leading-6 text-[#E2E8F0]">
                  <div>
                    <span className="font-semibold">Input:</span> {testCase.input}
                  </div>
                  <div>
                    <span className="font-semibold">Output:</span> {testCase.output}
                  </div>
                </div>
              </div>
            ))}

            {/* Constraints */}
            <div className="mb-8">
              <p className="mb-2 font-semibold text-[#F8FAFC]">Constraints:</p>

              <ul className="list-disc space-y-1.5 pl-6 text-[13px] leading-6 text-[#CBD5E1]">
                {p.constraints.length === 0 && (
                  <li>No constraints specified.</li>
                )}

                {p.constraints.length > 0 &&
                  p.constraints.map((c, i) => (
                    <li key={i}>
                      <code>{c}</code>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab !== "description" && (
          <div className="flex h-full items-center justify-center text-sm text-lc-subtext">
            {TABS.find((t) => t.key === activeTab)?.label} content goes here.
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center justify-between border-t border-[#334155] px-4 py-2 text-xs text-[#94A3B8]">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 transition hover:text-[#F8FAFC]">
            <ThumbsUp className="h-3.5 w-3.5" /> {p.likes ?? 0}
          </button>
          <button className="flex items-center gap-1 transition hover:text-[#F8FAFC]">
            <ThumbsDown className="h-3.5 w-3.5" /> {p.dislikes ?? 0}
          </button>
          <button className="transition hover:text-[#F8FAFC]">
            <Star className="h-3.5 w-3.5" />
          </button>
          <button className="transition hover:text-[#F8FAFC]">
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button className="transition hover:text-[#F8FAFC]">
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
          {p.onlineCount ?? 0} Online
        </div>
      </div>
    </div>
  );
}
