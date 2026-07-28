'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Trophy,
  Swords,
  Code2,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  User,
  ArrowRight,
  ShieldAlert,
  Flame,
  Award,
  Sparkles
} from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'
import { getRatingInfo } from '@/lib/rating'
import { api } from '@/lib/axios'
import { UserAvatar } from '@/components/UserAvatar'

interface UserProfileData {
  id: string
  name: string
  username: string
  email: string
  avatar_url?: string | null
  avatar_id?: string | null
  avatar?: string
  rating: number
  wins: number
  losses: number
  draws: number
  matchesPlayed: number
  problemsSolved: number
  country?: string
  submissions: Array<{
    id: string
    submittedAt: string
    problem: { title: string }
  }>
}

interface RecentMatchData {
  id: string
  createdAt: string
  status: string
  player1Id: string
  player2Id: string
  winnerId: string | null
  win: boolean
  problem: {
    title: string
    slug: string
  }
}

export default function DashboardPage() {
  const { user: authUser, setUser } = useAuthStore()
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [matches, setMatches] = useState<RecentMatchData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/user/profile/me')
      setProfile(res.data.user)
      if (res.data?.user) {
        setUser(res.data.user)
      }
      setMatches(res.data.formattedRecentMatches || [])
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const userRating = profile?.rating || authUser?.rating || 1200
  const ratingInfo = getRatingInfo(userRating)

  const wins = profile?.wins || 0
  const losses = profile?.losses || 0
  const totalMatches = profile?.matchesPlayed || wins + losses
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Welcome & Stats Banner */}
        <div className="relative p-6 sm:p-8 rounded-2xl bg-card border border-border overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <UserAvatar
                src={profile?.avatar_url || profile?.avatar || authUser?.avatar_url || authUser?.avatar}
                username={profile?.username || authUser?.username}
                name={profile?.name || authUser?.name}
                size="xl"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight">
                    Welcome back, {profile?.name || authUser?.username || 'Coder'}!
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ratingInfo.bgClass}`}>
                    {ratingInfo.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 font-mono">
                  <span>@{profile?.username || authUser?.username}</span>
                  <span>•</span>
                  <span>ELO Rating: {userRating}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/battles">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 shadow-md">
                  <Swords className="w-4 h-4" /> Enter 1v1 Battle
                </Button>
              </Link>
              <Link href="/problems">
                <Button size="lg" variant="outline" className="border-border bg-surface hover:bg-surface-2 text-foreground font-semibold gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400" /> Solve Problems
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border bg-card hover-lift transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Rating</p>
                <h3 className={`text-2xl font-black ${ratingInfo.colorClass} mt-1`}>
                  {userRating}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{ratingInfo.title} tier</p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover-lift transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Problems Solved</p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">
                  {profile?.problemsSolved || 0}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Verified solutions</p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover-lift transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Matches Played</p>
                <h3 className="text-2xl font-black text-accent mt-1">
                  {totalMatches}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{wins} W / {losses} L</p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border">
                <Swords className="w-6 h-6 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover-lift transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Win Rate</p>
                <h3 className="text-2xl font-black text-rose-500 mt-1">
                  {winRate}%
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Duels victory ratio</p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border">
                <TrendingUp className="w-6 h-6 text-rose-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two-Column Grid: Recent Matches & Submissions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Matches */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Swords className="w-4 h-4 text-primary" /> Recent 1v1 Matches
                </CardTitle>
                <CardDescription className="text-xs">Your latest competitive duels</CardDescription>
              </div>
              <Link href="/battles">
                <Button size="sm" variant="ghost" className="text-xs text-accent gap-1">
                  Arena <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {isLoading ? (
                <div className="space-y-3 py-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border/50 bg-surface/50 space-y-2">
                      <div className="skeleton h-4 w-1/2" />
                      <div className="skeleton h-3 w-1/4" />
                    </div>
                  ))}
                </div>
              ) : matches.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <Swords className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No match history yet. Jump into 1v1 Arena to challenge players!
                </div>
              ) : (
                matches.map((match) => (
                  <div key={match.id} className="p-3 rounded-lg border border-border bg-surface flex items-center justify-between hover:border-border-muted transition-colors">
                    <div>
                      <span className="text-xs font-semibold text-foreground">{match.problem?.title || 'Coding Duel'}</span>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {new Date(match.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      {match.win ? (
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          VICTORY
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          DEFEAT
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400" /> Recent Submissions
                </CardTitle>
                <CardDescription className="text-xs">Your latest problem solutions</CardDescription>
              </div>
              <Link href="/problems">
                <Button size="sm" variant="ghost" className="text-xs text-accent gap-1">
                  Problems <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {isLoading ? (
                <div className="space-y-3 py-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border/50 bg-surface/50 space-y-2">
                      <div className="skeleton h-4 w-1/2" />
                      <div className="skeleton h-3 w-1/4" />
                    </div>
                  ))}
                </div>
              ) : !profile?.submissions || profile.submissions.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <Code2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No submissions yet. Practice problems to test your code!
                </div>
              ) : (
                profile.submissions.map((sub) => (
                  <div key={sub.id} className="p-3 rounded-lg border border-border bg-surface flex items-center justify-between hover:border-border-muted transition-colors">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">{sub.problem?.title}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {new Date(sub.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-accent font-semibold font-mono">Submitted</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
    </div>
  )
}
