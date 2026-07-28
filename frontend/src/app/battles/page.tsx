'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Swords,
  ShieldAlert,
  Zap,
  Trophy,
  Users,
  Clock,
  Flame,
  Loader2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  BarChart2,
  Code2,
  Search,
} from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'
import { getRatingInfo } from '@/lib/rating'
import { socket } from '@/lib/socket'
import { api } from '@/lib/axios'

interface MatchHistoryRecord {
  id: string
  status: 'WAITING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED'
  result: 'PLAYER1' | 'PLAYER2' | 'DRAW' | 'ABANDONED' | null
  winnerId: string | null
  startedAt: string
  endedAt: string
  createdAt: string
  player1: { id: string; username: string; avatar_url?: string | null; avatar_id?: string | null; avatar?: string; rating: number }
  player2: { id: string; username: string; avatar_url?: string | null; avatar_id?: string | null; avatar?: string; rating: number }
  problem: { id: string; title: string; slug: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD' }
  winner: { id: string; username: string } | null
}

interface MatchFoundPayload {
  matchId: string
  roomId: string
  startedAt: number
  durationMs: number
  problem: {
    id: string
    title: string
    slug: string
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  }
  player1: { id: string; username: string; avatar_url?: string | null; avatar_id?: string | null; avatar?: string; rating: number }
  player2: { id: string; username: string; avatar_url?: string | null; avatar_id?: string | null; avatar?: string; rating: number }
}

export default function BattlesPage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()

  // Matchmaking Queue State
  const [isSearching, setIsSearching] = useState(false)
  const [queueTime, setQueueTime] = useState(0)
  const [joinedAt, setJoinedAt] = useState<number | null>(null)
  const [queueError, setQueueError] = useState<string | null>(null)

  // Match Found VS Overlay State
  const [matchFoundData, setMatchFoundData] = useState<MatchFoundPayload | null>(null)
  const [matchCountdown, setMatchCountdown] = useState(3)

  // Match History & Stats State
  const [matchHistory, setMatchHistory] = useState<MatchHistoryRecord[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  // Selected Match Detail Modal
  const [selectedHistoryMatch, setSelectedHistoryMatch] = useState<MatchHistoryRecord | null>(null)

  // Timer effect for queue duration
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isSearching) {
      timer = setInterval(() => setQueueTime((prev) => prev + 1), 1000)
    } else {
      setQueueTime(0)
    }
    return () => clearInterval(timer)
  }, [isSearching])

  // Countdown timer for Match Found transition
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (matchFoundData && matchCountdown > 0) {
      interval = setInterval(() => {
        setMatchCountdown((prev) => prev - 1)
      }, 1000)
    } else if (matchFoundData && matchCountdown === 0) {
      router.push(`/battles/${matchFoundData.matchId}`)
    }
    return () => clearInterval(interval)
  }, [matchFoundData, matchCountdown, router])

  // Socket event listeners for Matchmaking
  useEffect(() => {
    const onSearching = (data: { joinedAt: number; rating: number }) => {
      setIsSearching(true)
      setJoinedAt(data.joinedAt)
      setQueueError(null)
    }

    const onLeft = () => {
      setIsSearching(false)
      setJoinedAt(null)
    }

    const onError = (data: { message: string }) => {
      setIsSearching(false)
      setQueueError(data.message || 'Matchmaking error occurred.')
    }

    const onMatchStart = (data: MatchFoundPayload) => {
      setIsSearching(false)
      setMatchFoundData(data)
      setMatchCountdown(3)
    }

    socket.on('matchmaking:searching', onSearching)
    socket.on('matchmaking:left', onLeft)
    socket.on('matchmaking:error', onError)
    socket.on('match:start', onMatchStart)
    socket.on('match:found', onMatchStart)

    return () => {
      socket.off('matchmaking:searching', onSearching)
      socket.off('matchmaking:left', onLeft)
      socket.off('matchmaking:error', onError)
      socket.off('match:start', onMatchStart)
      socket.off('match:found', onMatchStart)
    }
  }, [])

  // Fetch match history & check active match on mount
  useEffect(() => {
    const refreshUser = async () => {
      try {
        const res = await api.get('/user/me')
        if (res.data?.user) {
          setUser(res.data.user)
        }
      } catch (err) {
        // ignore
      }
    }
    refreshUser()
    fetchMatchHistory()
    checkActiveMatch()
  }, [])

  const checkActiveMatch = async () => {
    try {
      const res = await api.get('/match/active')
      if (res.data?.data) {
        const activeMatch = res.data.data
        router.push(`/battles/${activeMatch.id}`)
      }
    } catch (err) {
      // ignore
    }
  }

  const fetchMatchHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const res = await api.get('/match/history/me')
      setMatchHistory(res.data.data || [])
    } catch (err: any) {
      if (err.response?.status === 401) {
        // Ignore expected 401 if unauthenticated
      } else {
        console.error('Failed to fetch match history:', err)
      }
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const toggleSearch = () => {
    setQueueError(null)
    if (!socket.connected) {
      socket.connect()
    }

    if (isSearching) {
      socket.emit('matchmaking:leave')
      setIsSearching(false)
    } else {
      socket.emit('matchmaking:join')
      setIsSearching(true)
    }
  }

  // Calculate current rating expansion boundary
  const getAllowedRatingWindow = (seconds: number) => {
    if (seconds < 5) return '±100 ELO'
    if (seconds < 10) return '±150 ELO'
    if (seconds < 20) return '±200 ELO'
    if (seconds < 30) return '±300 ELO'
    if (seconds < 45) return '±500 ELO'
    return 'Any Rating (Unrestricted)'
  }

  const ratingInfo = getRatingInfo(user?.rating || 1200)

  const winRate =
    user?.matchesPlayed && user.matchesPlayed > 0
      ? Math.round(((user.wins || 0) / user.matchesPlayed) * 100)
      : 0

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ─── MATCH FOUND FULLSCREEN OVERLAY ─── */}
        {matchFoundData && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fadeIn">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] pointer-events-none" />

            <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
              {/* Header Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-sm tracking-wider animate-bounce">
                <Swords className="w-4 h-4 text-primary" /> MATCH FOUND! PREPARE FOR DUEL
              </div>

              {/* Problem Preview Badge */}
              <div className="p-3 rounded-xl bg-surface border border-border inline-block max-w-md mx-auto">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Target Problem</div>
                <div className="text-base font-bold text-foreground mt-0.5 flex items-center justify-center gap-2">
                  <span>{matchFoundData.problem.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      matchFoundData.problem.difficulty === 'EASY'
                        ? 'bg-easy-subtle text-easy'
                        : matchFoundData.problem.difficulty === 'MEDIUM'
                        ? 'bg-medium-subtle text-medium'
                        : 'bg-hard-subtle text-hard'
                    }`}
                  >
                    {matchFoundData.problem.difficulty}
                  </span>
                </div>
              </div>

              {/* 1v1 VERSUS PLAYERS CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-4 items-center">
                {/* Player 1 (You or Opponent) */}
                <div className="sm:col-span-3 p-6 rounded-2xl bg-card border-2 border-accent/40 shadow-xl flex flex-col items-center text-center space-y-2">
                  <div className="w-20 h-20 rounded-full bg-surface border-2 border-accent flex items-center justify-center overflow-hidden text-2xl font-bold text-accent">
                    {(matchFoundData.player1.avatar_url || matchFoundData.player1.avatar) ? (
                      <img src={matchFoundData.player1.avatar_url || matchFoundData.player1.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      matchFoundData.player1.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-foreground truncate max-w-[180px]">
                    {matchFoundData.player1.username}
                  </h3>
                  <div className="text-xs text-muted-foreground font-mono">
                    Rating: <strong className="text-accent">{matchFoundData.player1.rating}</strong>
                  </div>
                </div>

                {/* VS Badge */}
                <div className="sm:col-span-1 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center animate-pulse">
                    <span className="font-extrabold text-lg text-primary">VS</span>
                  </div>
                </div>

                {/* Player 2 (Opponent or You) */}
                <div className="sm:col-span-3 p-6 rounded-2xl bg-card border-2 border-primary/40 shadow-xl flex flex-col items-center text-center space-y-2">
                  <div className="w-20 h-20 rounded-full bg-surface border-2 border-primary flex items-center justify-center overflow-hidden text-2xl font-bold text-primary">
                    {(matchFoundData.player2.avatar_url || matchFoundData.player2.avatar) ? (
                      <img src={matchFoundData.player2.avatar_url || matchFoundData.player2.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      matchFoundData.player2.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-foreground truncate max-w-[180px]">
                    {matchFoundData.player2.username}
                  </h3>
                  <div className="text-xs text-muted-foreground font-mono">
                    Rating: <strong className="text-primary">{matchFoundData.player2.rating}</strong>
                  </div>
                </div>
              </div>

              {/* Redirecting Countdown */}
              <div className="space-y-2">
                <div className="text-3xl font-extrabold text-foreground font-mono">
                  Entering Arena in {matchCountdown}...
                </div>
                <div className="w-48 h-1.5 bg-surface rounded-full mx-auto overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-1000 ease-linear"
                    style={{ width: `${(matchCountdown / 3) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── ARENA HERO & QUEUE TRIGGER ─── */}
        <div className="relative p-8 rounded-3xl bg-card border border-border overflow-hidden">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Hero Copy */}
            <div className="space-y-4 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs font-semibold text-rose-400">
                <Swords className="w-3.5 h-3.5 text-primary animate-pulse" /> Live Competitive 1v1 Arena
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Ranked 1v1 Code Duels
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Enter the matchmaking queue to duel against rival programmers in real-time. Both contenders receive the exact same problem. The first developer to submit an Accepted solution claims victory and ELO rating points!
              </p>

              {/* Quick Specs */}
              <div className="flex flex-wrap gap-4 text-xs font-mono text-muted-foreground pt-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-accent" /> 15 Min Limit
                </div>
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" /> ELO K=32 Stakes
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-500" /> First AC Wins
                </div>
              </div>
            </div>

            {/* Matchmaking Queue Card */}
            <div className="w-full sm:w-80 p-6 rounded-2xl bg-surface border border-border flex flex-col items-center justify-center text-center space-y-5 shadow-xl">
              <div className="relative">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isSearching
                      ? 'bg-primary/20 border-primary animate-pulse-live shadow-[0_0_30px_rgba(244,63,94,0.3)]'
                      : 'bg-card border-border'
                  }`}
                >
                  <Swords
                    className={`w-10 h-10 ${
                      isSearching ? 'text-primary animate-bounce' : 'text-muted-foreground'
                    }`}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">
                  {isSearching ? 'Searching Opponent...' : 'Ranked Matchmaking'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {isSearching ? `Time in queue: ${queueTime}s` : 'Standard 1v1 Speed Duel'}
                </p>
                {isSearching && (
                  <div className="mt-2 text-[11px] font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded-full border border-accent/20">
                    Window: {getAllowedRatingWindow(queueTime)}
                  </div>
                )}
              </div>

              {queueError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{queueError}</span>
                </div>
              )}

              <Button
                size="lg"
                onClick={toggleSearch}
                className={`w-full font-bold gap-2 shadow-md h-11 text-sm ${
                  isSearching
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                }`}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Cancel Queue
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" /> Find 1v1 Match
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* ─── COMPETITIVE STATS SUMMARY & RANK CARD ─── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border bg-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium">Rating & Tier</div>
                <div className={`text-xl font-extrabold ${ratingInfo.colorClass}`}>
                  {user?.rating || 1200}
                </div>
                <div className="text-[11px] text-muted-foreground">{ratingInfo.title}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium">Duel Record</div>
                <div className="text-xl font-extrabold text-foreground">
                  {user?.wins || 0}W - {user?.losses || 0}L
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {winRate}% Win Rate
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Swords className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium">Matches Played</div>
                <div className="text-xl font-extrabold text-foreground">
                  {user?.matchesPlayed || 0}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {user?.draws || 0} Draws
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Code2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium">Problems Solved</div>
                <div className="text-xl font-extrabold text-foreground">
                  {user?.problemsSolved || 0}
                </div>
                <div className="text-[11px] text-muted-foreground">Practice & Duels</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── RECENT DUELS HISTORY ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" /> Match History
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchMatchHistory}
              disabled={isLoadingHistory}
              className="gap-1.5 text-xs font-semibold border-border bg-surface"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {isLoadingHistory ? (
            <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-2xl">
              <Loader2 className="w-6 h-6 mx-auto mb-2 text-primary animate-spin" />
              <p className="text-xs font-mono">Loading match history...</p>
            </div>
          ) : matchHistory.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-2xl space-y-3">
              <Swords className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <div className="text-base font-bold text-foreground">No Battle History Yet</div>
              <p className="text-xs max-w-sm mx-auto text-muted-foreground leading-relaxed">
                You haven't completed any 1v1 duels yet. Click "Find 1v1 Match" above to start competing!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {matchHistory.map((match) => {
                const isPlayer1 = match.player1.id === user?.id
                const me = isPlayer1 ? match.player1 : match.player2
                const rival = isPlayer1 ? match.player2 : match.player1

                const isWinner = match.winnerId === user?.id
                const isDraw = match.result === 'DRAW'
                const isAbandoned = match.result === 'ABANDONED'

                let outcomeText = 'DEFEAT'
                let outcomeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                if (isWinner) {
                  outcomeText = 'VICTORY'
                  outcomeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                } else if (isDraw) {
                  outcomeText = 'DRAW'
                  outcomeClass = 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                } else if (isAbandoned && !isWinner) {
                  outcomeText = 'FORFEITED'
                  outcomeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }

                return (
                  <div
                    key={match.id}
                    onClick={() => setSelectedHistoryMatch(match)}
                    className="p-4 rounded-xl border border-border bg-card hover:bg-surface-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* Match Result & Opponent */}
                    <div className="flex items-center gap-4">
                      {/* Outcome Badge */}
                      <div className={`px-3 py-1.5 rounded-lg border font-extrabold text-xs tracking-wide ${outcomeClass}`}>
                        {outcomeText}
                      </div>

                      {/* Opponent Profile */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-sm font-bold text-foreground">
                          {(rival.avatar_url || rival.avatar) ? (
                            <img src={rival.avatar_url || rival.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            rival.username.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground font-mono">VS Rival</div>
                          <div className="text-sm font-bold text-foreground">@{rival.username}</div>
                        </div>
                      </div>
                    </div>

                    {/* Problem Title & Difficulty */}
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground truncate max-w-xs">
                          {match.problem.title}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          Rival Rating: {rival.rating}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          match.problem.difficulty === 'EASY'
                            ? 'bg-easy-subtle text-easy'
                            : match.problem.difficulty === 'MEDIUM'
                            ? 'bg-medium-subtle text-medium'
                            : 'bg-hard-subtle text-hard'
                        }`}
                      >
                        {match.problem.difficulty}
                      </span>
                    </div>

                    {/* Date & Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 text-xs text-muted-foreground font-mono">
                      <span>{new Date(match.createdAt).toLocaleDateString()}</span>
                      <Button size="sm" variant="ghost" className="text-xs text-accent gap-1">
                        View Details <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ─── HISTORICAL MATCH DETAIL MODAL ─── */}
        {selectedHistoryMatch && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-card border border-border rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                  <Swords className="w-4 h-4 text-primary" /> Match Breakdown
                </h3>
                <button
                  onClick={() => setSelectedHistoryMatch(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-surface border border-border space-y-1">
                  <div className="text-muted-foreground font-mono">Problem Statement:</div>
                  <div className="text-sm font-bold text-foreground">
                    {selectedHistoryMatch.problem.title}
                  </div>
                  <div className="text-muted-foreground">
                    Difficulty: <span className="text-accent font-semibold">{selectedHistoryMatch.problem.difficulty}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-surface border border-border space-y-1">
                    <div className="text-muted-foreground font-mono">Player 1:</div>
                    <div className="font-bold text-foreground">@{selectedHistoryMatch.player1.username}</div>
                    <div className="text-muted-foreground">Rating: {selectedHistoryMatch.player1.rating}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-surface border border-border space-y-1">
                    <div className="text-muted-foreground font-mono">Player 2:</div>
                    <div className="font-bold text-foreground">@{selectedHistoryMatch.player2.username}</div>
                    <div className="text-muted-foreground">Rating: {selectedHistoryMatch.player2.rating}</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between">
                  <span className="text-muted-foreground font-mono">Match Winner:</span>
                  <span className="font-bold text-emerald-400">
                    {selectedHistoryMatch.winner ? `@${selectedHistoryMatch.winner.username}` : 'Draw'}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => setSelectedHistoryMatch(null)}
                className="w-full bg-surface hover:bg-surface-2 text-foreground border border-border"
              >
                Close Summary
              </Button>
            </div>
          </div>
        )}
      </main>

    </div>
  )
}
