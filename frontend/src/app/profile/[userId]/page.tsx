"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { PageShell } from "@/components/page-shell";

type ProfileResponse = {
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    username: string;
    rating: number;
    wins: number;
    losses: number;
    draws: number;
    matchesPlayed: number;
    country: string | null;
    emailVerified: boolean;
    submissions: Array<{
      id: string;
      submittedAt: string;
      problem: {
        title: string;
      };
    }>;
  };
  formattedRecentMatches: Array<{
    id: string;
    createdAt: string;
    status: string;
    winnerId: string | null;
    problem: {
      title: string;
      slug: string;
    } | null;
    win: boolean;
  }>;
};

function formatRelativeTime(isoDate: string) {
  const elapsedMinutes = Math.max(
    1,
    Math.round((Date.now() - new Date(isoDate).getTime()) / 60000)
  );

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  return `${Math.round(elapsedHours / 24)}d ago`;
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const routeUserId = params.userId;
  const [profile, setProfile] = useState<ProfileResponse["user"] | null>(null);
  const [matches, setMatches] = useState<ProfileResponse["formattedRecentMatches"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadProfile() {
      try {
        setError("");
        const response = await api.get<ProfileResponse>(`/user/profile/${routeUserId}`, {
          signal: controller.signal,
        });

        if (!active) {
          return;
        }

        setProfile(response.data.user);
        setMatches(response.data.formattedRecentMatches);
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

        setError("Unable to load this profile right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
      controller.abort();
    };
  }, [routeUserId, router]);

  const summaryStats = useMemo(() => {
    if (!profile) {
      return [];
    }

    const winRate = profile.matchesPlayed
      ? Math.round((profile.wins / profile.matchesPlayed) * 100)
      : 0;

    return [
      { label: "Rating", value: String(profile.rating) },
      { label: "Win rate", value: `${winRate}%` },
      { label: "Wins", value: String(profile.wins) },
      { label: "Losses", value: String(profile.losses) },
      { label: "Draws", value: String(profile.draws) },
      { label: "Matches", value: String(profile.matchesPlayed) },
    ];
  }, [profile]);

  const routeMismatch = profile && profile.id !== routeUserId;

  return (
    <PageShell
      eyebrow="Profile"
      title={profile ? `${profile.name ?? profile.username}` : "Player profile"}
      description="A direct, readable profile view with the essentials first and recent activity below it."
      backHref="/me"
      backLabel="My account"
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
        {loading ? (
          <div className="px-5 py-12 text-sm text-[#94A3B8]">Loading profile...</div>
        ) : error ? (
          <div className="px-5 py-12 text-sm text-[#94A3B8]">{error}</div>
        ) : profile ? (
          <div>
            <div className="grid gap-4 border-b border-[#334155] px-5 py-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
              <div>
                <p className="text-sm text-[#94A3B8]">@{profile.username}</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#F8FAFC]">{profile.name ?? "Unnamed player"}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[#CBD5E1]">
                  {profile.email} {profile.emailVerified ? "· Email verified" : "· Email not verified"}
                </p>
                {routeMismatch ? (
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#FB923C]">
                    The backend currently resolves this profile from the signed-in session.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 rounded-2xl border border-[#334155] bg-[#0F172A] p-4 text-sm text-[#CBD5E1] sm:grid-cols-2">
                {summaryStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-[#1E293B] bg-[#111827]/70 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#94A3B8]">{stat.label}</p>
                    <p className="mt-2 text-lg font-semibold text-[#F8FAFC]">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-2">
              <div className="border-b border-[#334155] px-5 py-5 lg:border-b-0 lg:border-r">
                <p className="text-xs uppercase tracking-[0.22em] text-[#94A3B8]">Recent submissions</p>
                <div className="mt-4 space-y-3">
                  {profile.submissions.length ? (
                    profile.submissions.map((submission) => (
                      <div key={submission.id} className="flex items-center justify-between gap-4 border-b border-[#1E293B] pb-3 last:border-b-0 last:pb-0">
                        <div>
                          <p className="font-medium text-[#F8FAFC]">{submission.problem.title}</p>
                          <p className="mt-1 text-sm text-[#94A3B8]">{formatRelativeTime(submission.submittedAt)}</p>
                        </div>
                        <span className="rounded-full border border-[#334155] bg-[#0F172A] px-3 py-1 text-xs text-[#CBD5E1]">Submission</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#94A3B8]">No recent submissions.</p>
                  )}
                </div>
              </div>

              <div className="px-5 py-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#94A3B8]">Recent matches</p>
                <div className="mt-4 space-y-3">
                  {matches.length ? (
                    matches.map((match) => (
                      <Link
                        key={match.id}
                        href={match.problem ? `/problems/${match.problem.slug}` : "/dashboard"}
                        className="block"
                      >
                        <div className="flex items-center justify-between gap-4 border-b border-[#1E293B] pb-3 last:border-b-0 last:pb-0">
                          <div>
                            <p className="font-medium text-[#F8FAFC]">{match.problem?.title ?? "Unknown problem"}</p>
                            <p className="mt-1 text-sm text-[#94A3B8]">{formatRelativeTime(match.createdAt)}</p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${match.win ? "border-[#14532D] bg-[#052E16] text-[#86EFAC]" : "border-[#7F1D1D] bg-[#450A0A] text-[#FCA5A5]"}`}>
                            {match.win ? "Win" : "Loss"}
                          </span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-[#94A3B8]">No recent matches.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </PageShell>
  );
}