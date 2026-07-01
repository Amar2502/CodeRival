"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
	ArrowRight,
	Bot,
	Medal,
	Play,
	Shield,
	Swords,
	TrendingUp,
	Trophy,
} from "lucide-react";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/lib/auth_store";

const activity = [
	{ icon: Trophy, title: "Rank up", text: "You crossed 1,430 Elo and entered Gold III." },
	{ icon: Swords, title: "Battle ready", text: "Queue is live with fast matchmaking enabled." },
	{ icon: Bot, title: "Practice streak", text: "3 daily problem solves in a row." },
];

type DashboardProblem = {
	id: string;
	title: string;
	slug: string;
	difficulty: string;
	topics: Array<{ name: string }>;
};

type DashboardMatch = {
	id: string;
	createdAt: string;
	status: string;
	player1Id: string;
	player2Id: string;
	winnerId: string | null;
	win: boolean;
	problem: {
		title: string;
		slug: string;
	} | null;
};

type DashboardData = {
	user: {
		id: string;
		username: string;
		email: string;
		avatar: string | null;
		rating: number;
		wins: number;
		losses: number;
		matchesPlayed: number;
	};
	problems: DashboardProblem[];
	recentMatches: DashboardMatch[];
};

function formatRelativeTime(isoDate: string) {
	const elapsedMinutes = Math.max(1, Math.round((Date.now() - new Date(isoDate).getTime()) / 60000));

	if (elapsedMinutes < 60) {
		return `${elapsedMinutes}m ago`;
	}

	const elapsedHours = Math.round(elapsedMinutes / 60);
	if (elapsedHours < 24) {
		return `${elapsedHours}h ago`;
	}

	return `${Math.round(elapsedHours / 24)}d ago`;
}

export default function DashboardPage() {
	const router = useRouter();
	const user = useAuthStore((state) => state.user);
	const [dashboard, setDashboard] = useState<DashboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		const controller = new AbortController();
		let active = true;

		async function loadDashboard() {
			try {
				const response = await api.get<DashboardData>("/dashboard/get", {
					signal: controller.signal,
				});

				if (!active) {
					return;
				}

				setDashboard(response.data);
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

				setError("Unable to load dashboard data right now.");
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		}

		void loadDashboard();

		return () => {
			active = false;
			controller.abort();
		};
	}, [router]);

	const dashboardUser = dashboard?.user ?? null;
	const displayUsername = dashboardUser?.username ?? user?.username ?? "Rival";
	const recentMatches = dashboard?.recentMatches ?? [];
	const rankingStats = dashboardUser
		? [
			{ label: "Current rating", value: String(dashboardUser.rating) },
			{
				label: "Current rank",
				value: dashboardUser.rating >= 1600 ? "Gold I" : dashboardUser.rating >= 1400 ? "Gold III" : "Silver",
			},
			{
				label: "Recent wins",
				value: dashboardUser.matchesPlayed ? `${Math.round((dashboardUser.wins / dashboardUser.matchesPlayed) * 100)}%` : "0%",
			},
			{ label: "Battles today", value: String(dashboardUser.matchesPlayed) },
		]
		: [];
	const problemRows = dashboard?.problems ?? [];

	function getDifficultyCapsuleClass(difficulty: string) {
		switch (difficulty.toLowerCase()) {
			case "easy":
				return "border-[#14532D] bg-[#052E16] text-[#86EFAC]";
			case "medium":
				return "border-orange-400 bg-orange-900 text-[#FDBA74]";
			case "hard":
				return "border-[#7F1D1D] bg-[#450A0A] text-[#FCA5A5]";
			default:
				return "border-[#475569] bg-[#0B1220] text-[#F8FAFC]";
		}
	}

	if (loading) {
		return (
			<main className="relative min-h-screen overflow-hidden bg-[#0F172A] text-[#F8FAFC] selection:bg-[#4F46E5]/40">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.12),transparent_26%),linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,1))]" />
				<div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-3 sm:px-6 lg:px-8">
					<p className="text-sm uppercase tracking-[0.3em] text-[#94A3B8]">Loading dashboard</p>
				</div>
			</main>
		);
	}

	if (error) {
		return (
			<main className="relative min-h-screen overflow-hidden bg-[#0F172A] text-[#F8FAFC] selection:bg-[#4F46E5]/40">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.12),transparent_26%),linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,1))]" />
				<div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-3 sm:px-6 lg:px-8">
					<div className="max-w-md rounded-3xl border border-[#334155] bg-[#111827]/80 p-6 text-center shadow-[0_30px_120px_-40px_rgba(15,23,42,0.95)]">
						<p className="text-xs uppercase tracking-[0.3em] text-[#FB923C]">Dashboard unavailable</p>
						<p className="mt-3 text-sm leading-6 text-[#CBD5E1]">{error}</p>
						<button
							type="button"
							onClick={() => router.refresh()}
							className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#475569] px-4 py-2 text-sm text-[#F8FAFC] transition hover:border-[#6366F1]"
						>
							Retry
						</button>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="relative min-h-screen overflow-hidden bg-[#0F172A] text-[#F8FAFC] selection:bg-[#4F46E5]/40">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.12),transparent_26%),linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,1))]" />
			<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#475569] to-transparent" />

			<div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-3 sm:px-6 lg:px-8">
				<header className="grid gap-3 border-b border-[#334155] pb-3 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center border border-[#475569] bg-[#111827]/70 text-[#6366F1]">
							<Shield className="h-5 w-5" />
						</div>
						<div>
							<p className="text-[11px] uppercase tracking-[0.32em] text-[#94A3B8]">CodeRival</p>
							<h1 className="text-xl font-semibold tracking-tight text-[#F8FAFC] sm:text-2xl">Dashboard</h1>
						</div>
					</div>

					<nav className="flex flex-wrap items-center gap-5 text-sm text-[#CBD5E1]">
						{[
							["Battles", "/dashboard"],
							["Leaderboard", "/dashboard"],
							["Profile", "/dashboard"],
						].map(([label, href]) => (
							<Link key={label} href={href} className="border-b border-transparent pb-1 transition hover:border-[#6366F1] hover:text-[#F8FAFC]">
								{label}
							</Link>
						))}
					</nav>

					<div className="justify-self-start text-sm text-[#94A3B8] lg:justify-self-end lg:text-right">
						<p className="uppercase tracking-[0.22em]">Signed in</p>
						<p className="mt-1 font-medium text-[#F8FAFC]">{displayUsername}</p>
					</div>
				</header>

				<section className="grid flex-1 gap-4 pt-4 lg:grid-cols-[minmax(0,1fr)_340px]">
					<div className="min-w-0">
						<div className="flex flex-col gap-3 border-b border-[#334155] pb-3">

							<div className="flex flex-wrap align-middle items-center gap-3 text-sm text-[#CBD5E1]">
								<button
									type="button"
									className="inline-flex border-2 rounded-2xl border-slate-400 p-3 align-middle items-center gap-2  font-medium transition hover:border-[#6366F1] hover:text-[#F8FAFC] cursor-pointer"
								>
									Challenge friends
								</button>
								<button
									type="button"
									className="inline-flex items-center gap-2 border-2 rounded-2xl border-slate-400 p-3 align-middle font-medium transition hover:border-[#FB923C] hover:text-[#F8FAFC] cursor-pointer"
								>
									Start battle
									<Play className="h-4 w-4" />
								</button>
							</div>

							<div className="flex flex-col gap-3 border-t border-[#1E293B] pt-3 lg:flex-row lg:items-center lg:justify-between">
								<div className="flex-1">
									<label className="sr-only" htmlFor="problem-search">
										Search problem
									</label>
									<input
										id="problem-search"
										type="search"
										placeholder="Search problem"
										className="h-10 w-full border border-[#334155] bg-[#111827]/70 px-3 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#94A3B8] focus:border-[#6366F1]"
									/>
								</div>

								<div className="w-full lg:w-52">
									<label className="sr-only" htmlFor="problem-filter">
										Filter
									</label>
									<select
										id="problem-filter"
										defaultValue="all"
										className="h-10 w-full border border-[#334155] bg-[#111827]/70 px-3 text-sm text-[#F8FAFC] outline-none transition focus:border-[#6366F1]"
									>
										<option value="all">Filter</option>
										<option value="easy">Easy</option>
										<option value="medium">Medium</option>
										<option value="hard">Hard</option>
									</select>
								</div>
							</div>
						</div>

						<div className="mt-3 border-t border-[#334155]">
							{problemRows.map((problem) => {
								return (
									<article
										key={problem.id}
										className="grid gap-3 border-b border-[#1E293B] py-3.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
									>
										<div className="min-w-0">
											<div className="flex flex-wrap items-center gap-2.5">
												<h3 className="text-lg font-medium text-[#F8FAFC]">{problem.title}</h3>
												{problem.topics.map((topic) => (
													<span
														key={`${problem.id}-${topic.name}`}
														className="inline-flex items-center rounded-full border border-[#334155] bg-[#111827]/70 px-2.5 py-1 text-xs font-medium text-[#CBD5E1]"
													>
														{topic.name}
													</span>
												))}
											</div>
										</div>
										<div className="flex items-center justify-end">
											<span
												className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getDifficultyCapsuleClass(problem.difficulty)}`}
											>
												{problem.difficulty}
											</span>
										</div>
									</article>
								);
							})}
						</div>
					</div>

					<aside className="border-l border-[#334155] pl-0 lg:pl-5">
						<div className="space-y-4">
							<section className="border-b border-[#334155] pb-4">
								<div className="flex items-center justify-between gap-4">
									<div>
										<p className="text-xs uppercase tracking-[0.28em] text-[#94A3B8]">Sidebar</p>
										<h3 className="mt-2 text-lg font-semibold text-[#F8FAFC]">Current ranking tier</h3>
									</div>
									<div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#475569] bg-[#111827]/70 text-[#FB923C]">
										<Medal className="h-5 w-5" />
									</div>
								</div>

								<div className="mt-3 grid gap-3 border-t border-[#1E293B] pt-3">
									{rankingStats.map((stat) => (
										<div key={stat.label} className="flex items-end justify-between gap-4">
											<p className="text-sm text-[#94A3B8]">{stat.label}</p>
											<p className="text-lg font-semibold text-[#F8FAFC]">{stat.value}</p>
										</div>
									))}
								</div>
							</section>

							<section className="border-b border-[#334155] pb-4">
								<div className="flex items-center justify-between gap-4">
									<div>
										<p className="text-xs uppercase tracking-[0.28em] text-[#94A3B8]">Battle search</p>
										<h3 className="mt-2 text-lg font-semibold text-[#F8FAFC]">Recent matches</h3>
									</div>
									<div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#475569] bg-[#111827]/70 text-[#6366F1]">
										<ArrowRight className="h-4 w-4 rotate-45" />
									</div>
								</div>

								<div className="mt-3 space-y-2.5 border-t border-[#1E293B] pt-3">
									{recentMatches.map((match) => (
												<div key={match.id} className="flex items-center justify-between gap-4 border-b border-[#1E293B] pb-3 text-sm last:border-b-0 last:pb-0">
											<div>
														<p className="font-medium text-[#F8FAFC]">vs {match.problem?.title ?? "Unknown opponent"}</p>
														<p className="mt-1 text-[#94A3B8]">{formatRelativeTime(match.createdAt)}</p>
											</div>
											<div className="text-right">
														<p className={match.win ? "text-[#10B981]" : "text-[#EF4444]"}>{match.win ? "Win" : "Loss"}</p>
														<p className="mt-1 font-mono text-[#CBD5E1]">{match.status}</p>
											</div>
										</div>
									))}
								</div>
							</section>

							<section>
								<div className="flex items-center justify-between gap-4">
									<div>
										<p className="text-xs uppercase tracking-[0.28em] text-[#94A3B8]">Recent activity</p>
										<h3 className="mt-2 text-lg font-semibold text-[#F8FAFC]">Momentum</h3>
									</div>
									<TrendingUp className="h-5 w-5 text-[#FB923C]" />
								</div>

								<div className="mt-3 space-y-3 border-t border-[#1E293B] pt-3">
									{activity.map((item) => (
										<div key={item.title} className="flex gap-3 border-b border-[#1E293B] pb-4 last:border-b-0 last:pb-0">
											<div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-[#334155] bg-[#111827]/70 text-[#FB923C]">
												<item.icon className="h-4 w-4" />
											</div>
											<div>
												<p className="font-medium text-[#F8FAFC]">{item.title}</p>
												<p className="mt-1 text-sm leading-6 text-[#94A3B8]">{item.text}</p>
											</div>
										</div>
									))}
								</div>
							</section>
						</div>
					</aside>
				</section>
			</div>
		</main>
	);
}
