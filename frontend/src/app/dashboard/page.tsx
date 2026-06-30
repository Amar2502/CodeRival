"use client";

import Link from "next/link";
import {
	ArrowRight,
	Bot,
	Gauge,
	Medal,
	Play,
	Shield,
	Swords,
	TimerReset,
	TrendingUp,
	Trophy,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth_store";

const problemRows = [
	{
		label: "Problem 1",
		title: "Search problem",
		tags: ["array", "binary search", "medium"],
		note: "Use the top row for the active battle and keep the rest as ruled space.",
	},
	{ label: "Problem 2", title: "", tags: [], note: "" },
	{ label: "Problem 3", title: "", tags: [], note: "" },
	{ label: "Problem 4", title: "", tags: [], note: "" },
	{ label: "Problem 5", title: "", tags: [], note: "" },
	{ label: "Problem 6", title: "", tags: [], note: "" },
	{ label: "Problem 7", title: "", tags: [], note: "" },
];

const recentMatches = [
	{ opponent: "neoKage", result: "Win", delta: "+28", time: "12m ago" },
	{ opponent: "syntaxstorm", result: "Loss", delta: "-16", time: "48m ago" },
	{ opponent: "byteRanger", result: "Win", delta: "+24", time: "2h ago" },
];

const activity = [
	{ icon: Trophy, title: "Rank up", text: "You crossed 1,430 Elo and entered Gold III." },
	{ icon: Swords, title: "Battle ready", text: "Queue is live with fast matchmaking enabled." },
	{ icon: Bot, title: "Practice streak", text: "3 daily problem solves in a row." },
];

const rankingStats = [
	{ label: "Current rating", value: "1432" },
	{ label: "Current rank", value: "Gold III" },
	{ label: "Recent wins", value: "72%" },
	{ label: "Battles today", value: "8" },
];

export default function DashboardPage() {
	const user = useAuthStore((state) => state.user);

	console.log("DashboardPage user:", user);

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
						<p className="mt-1 font-medium text-[#F8FAFC]">{user?.username ?? "Rival"}</p>
					</div>
				</header>

				<section className="grid flex-1 gap-4 pt-4 lg:grid-cols-[minmax(0,1fr)_340px]">
					<div className="min-w-0">
						<div className="flex flex-col gap-3 border-b border-[#334155] pb-3">
							<div>
								<p className="text-xs uppercase tracking-[0.28em] text-[#94A3B8]">Challenge friends</p>
								<h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#F8FAFC] sm:text-4xl">Problem queue</h2>
							</div>

							<div className="flex flex-wrap items-center gap-3 text-sm text-[#CBD5E1]">
								<button
									type="button"
									className="inline-flex items-center gap-2 border-b border-[#475569] pb-1 font-medium transition hover:border-[#6366F1] hover:text-[#F8FAFC]"
								>
									Challenge friends
								</button>
								<button
									type="button"
									className="inline-flex items-center gap-2 border-b border-[#475569] pb-1 font-medium transition hover:border-[#FB923C] hover:text-[#F8FAFC]"
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
							{problemRows.map((problem, index) => {
								const isActive = index === 0;

								return (
									<article
										key={problem.label}
										className="grid gap-3 border-b border-[#1E293B] py-3.5 lg:grid-cols-[120px_minmax(0,1fr)_auto] lg:items-start"
									>
										<div className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">{problem.label}</div>
										<div className="min-w-0">
											<div className="flex flex-wrap items-center gap-2">
												<h3 className="text-lg font-medium text-[#F8FAFC]">{isActive ? problem.title : ""}</h3>
												{isActive ? <span className="text-xs uppercase tracking-[0.24em] text-[#FB923C]">{problem.tags.join(" / ")}</span> : null}
											</div>
											<p className="mt-1.5 max-w-2xl text-sm leading-5 text-[#94A3B8]">{isActive ? problem.note : ""}</p>
										</div>
										<div className="text-right lg:pt-0.5">
											{isActive ? (
												<>
													<p className="text-xs uppercase tracking-[0.24em] text-[#94A3B8]">Open</p>
													<p className="mt-2 font-mono text-lg text-[#F8FAFC]">01</p>
												</>
											) : (
												<div className="h-6" />
											)}
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
										<div key={`${match.opponent}-${match.time}`} className="flex items-center justify-between gap-4 border-b border-[#1E293B] pb-3 text-sm last:border-b-0 last:pb-0">
											<div>
												<p className="font-medium text-[#F8FAFC]">vs {match.opponent}</p>
												<p className="mt-1 text-[#94A3B8]">{match.time}</p>
											</div>
											<div className="text-right">
												<p className={match.result === "Win" ? "text-[#10B981]" : "text-[#EF4444]"}>{match.result}</p>
												<p className="mt-1 font-mono text-[#CBD5E1]">{match.delta} rating</p>
											</div>
										</div>
									))}
								</div>
							</section>

							<section className="border-b border-[#334155] pb-4">
								<div className="flex items-center justify-between gap-4">
									<div>
										<p className="text-xs uppercase tracking-[0.28em] text-[#94A3B8]">Queue state</p>
										<h3 className="mt-2 text-lg font-semibold text-[#F8FAFC]">Match readiness</h3>
									</div>
									<TimerReset className="h-5 w-5 text-[#FB923C]" />
								</div>

								<div className="mt-3 grid gap-3 border-t border-[#1E293B] pt-3">
									<div className="flex items-end justify-between gap-4">
										<div>
											<p className="text-sm text-[#94A3B8]">Matchmaking</p>
											<p className="mt-2 text-4xl font-semibold tracking-tight text-[#F8FAFC]">01:12</p>
										</div>
										<Gauge className="h-5 w-5 text-[#6366F1]" />
									</div>
									<div className="flex items-center gap-3 text-sm text-[#CBD5E1]">
										<div className="h-1 flex-1 bg-[#334155]">
											<div className="h-full w-[68%] bg-[#F8FAFC]" />
										</div>
										<span>68%</span>
									</div>
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
