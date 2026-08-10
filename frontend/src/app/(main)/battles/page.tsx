'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Swords,
  Search,
  ArrowUpDown,
  CheckCircle2,
  Users,
  TrendingUp,
  Trophy,
  Flame,
  Code2,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Clock,
  Sparkles,
  UserPlus,
  RefreshCw
} from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'
import { getRatingInfo } from '@/lib/rating'
import { api } from '@/lib/axios'
import { socket } from '@/lib/socket'
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
}

interface FriendItem {
  friendshipId: string
  user: {
    id: string
    username: string
    name?: string
    avatar_url?: string | null
    avatar?: string
    rating: number
    isOnline: boolean
  }
}

interface MatchHistoryRecord {
  id: string
  status: 'WAITING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED'
  result: 'PLAYER1' | 'PLAYER2' | 'DRAW' | 'ABANDONED' | null
  reason?: 'SOLUTION_ACCEPTED' | 'OPPONENT_CHEATED' | 'OPPONENT_SURRENDERED' | 'OPPONENT_DISCONNECTED' | 'TIMEOUT' | 'DRAW' | null
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

interface RatingPoint {
  id?: string
  rating: number
  createdAt: string
  matchId?: string | null
}

const getMatchReasonInfo = (match: MatchHistoryRecord, currentUserId?: string) => {
  const isWinner = match.winnerId === currentUserId
  const isDraw = match.result === 'DRAW'
  const reason = match.reason

  if (reason === 'OPPONENT_CHEATED') {
    return {
      title: isWinner ? 'Rival Disqualified' : 'Disqualified',
      badgeClass: isWinner ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      description: isWinner ? 'Rival was disqualified for anti-cheat violation (exited fullscreen).' : 'Disqualified for exiting fullscreen during the match.',
      icon: ShieldAlert,
    }
  }

  if (reason === 'OPPONENT_SURRENDERED') {
    return {
      title: isWinner ? 'Rival Surrendered' : 'Forfeited Match',
      badgeClass: isWinner ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      description: isWinner ? 'Rival voluntarily surrendered and exited the match arena.' : 'You voluntarily surrendered and forfeited the match.',
      icon: AlertCircle,
    }
  }

  if (reason === 'OPPONENT_DISCONNECTED') {
    return {
      title: isWinner ? 'Rival Disconnected' : 'Disconnected',
      badgeClass: isWinner ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      description: isWinner ? 'Rival disconnected and grace period expired.' : 'Disconnected from match session.',
      icon: Clock,
    }
  }

  if (reason === 'SOLUTION_ACCEPTED') {
    return {
      title: isWinner ? 'Accepted Solution' : 'Rival Solved First',
      badgeClass: isWinner ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      description: isWinner ? 'Submitted a 100% Accepted solution before rival!' : 'Opponent submitted an Accepted solution first.',
      icon: CheckCircle2,
    }
  }

  if (reason === 'TIMEOUT') {
    return {
      title: isWinner ? 'Timeout Win' : 'Timeout Loss',
      badgeClass: isWinner ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      description: isWinner ? 'Had higher test cases passed when 15-min timer expired.' : 'Lower test cases passed when match timer expired.',
      icon: Clock,
    }
  }

  if (isDraw) {
    return {
      title: 'Match Draw',
      badgeClass: 'bg-muted/20 text-muted-foreground border-border',
      description: 'Timer expired with equal test cases passed.',
      icon: Sparkles,
    }
  }

  return {
    title: isWinner ? 'Duel Victory' : 'Duel Defeat',
    badgeClass: isWinner ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    description: isWinner ? 'Claimed victory in 1v1 duel.' : 'Opponent claimed victory.',
    icon: Swords,
  }
}

export default function BattlesPage() {
  const router = useRouter()
  const { user: authUser, setUser } = useAuthStore()

  // Profile, Friends & Rating State
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [friends, setFriends] = useState<FriendItem[]>([])
  const [ratingHistory, setRatingHistory] = useState<RatingPoint[]>([])
  const [userRank, setUserRank] = useState<string>('2nd')

  // Matchmaking Queue State
  const [isSearching, setIsSearching] = useState(false)
  const [queueTime, setQueueTime] = useState(0)
  const [queueError, setQueueError] = useState<string | null>(null)

  // Match Found VS Overlay State
  const [matchFoundData, setMatchFoundData] = useState<MatchFoundPayload | null>(null)
  const [matchCountdown, setMatchCountdown] = useState(3)

  // Matches List State & Infinite Scroll Pagination
  const [matchHistory, setMatchHistory] = useState<MatchHistoryRecord[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [historyPage, setHistoryPage] = useState<number>(1)
  const [hasMoreHistory, setHasMoreHistory] = useState<boolean>(true)
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState<boolean>(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const [selectedHistoryMatch, setSelectedHistoryMatch] = useState<MatchHistoryRecord | null>(null)

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedResultFilter, setSelectedResultFilter] = useState<'ALL' | 'VICTORY' | 'DEFEAT' | 'DRAW'>('ALL')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [activeMatchmakers, setActiveMatchmakers] = useState<number>(32)
  const [hoveredPtIndex, setHoveredPtIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchBattlePageData()

    const timer = setInterval(() => {
      setActiveMatchmakers(prev => Math.max(18, prev + Math.floor(Math.random() * 5) - 2))
    }, 5000)

    return () => clearInterval(timer)
  }, [])

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
    const onSearching = () => {
      setIsSearching(true)
      setQueueError(null)
    }

    const onLeft = () => {
      setIsSearching(false)
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

  const fetchBattlePageData = async () => {
    setIsLoadingHistory(true)
    try {
      // 1. User profile & rating history
      const profileRes = await api.get('/user/profile/me')
      if (profileRes.data?.user) {
        setProfile(profileRes.data.user)
        setUser(profileRes.data.user)
      }
      if (profileRes.data?.ratingHistory) {
        setRatingHistory(profileRes.data.ratingHistory)
      }

      // 2. Friends list
      try {
        const friendsRes = await api.get('/friends')
        setFriends(friendsRes.data?.friends || [])
      } catch (e) {
        console.error('Failed to fetch friends:', e)
      }

      // 3. Match History (Page 1, 20 per page)
      try {
        const historyRes = await api.get('/match/history/me?page=1&limit=20')
        setMatchHistory(historyRes.data?.data || [])
        setHistoryPage(1)
        setHasMoreHistory(Boolean(historyRes.data?.hasMore))
      } catch (e) {
        console.error('Failed to fetch match history:', e)
      }

      // 4. Leaderboard rank
      try {
        const rankRes = await api.get('/leaderboard/global?limit=50')
        if (rankRes.data?.currentUserRank) {
          const r = rankRes.data.currentUserRank
          if (r === 1) setUserRank('1st')
          else if (r === 2) setUserRank('2nd')
          else if (r === 3) setUserRank('3rd')
          else setUserRank(`${r}th`)
        }
      } catch (e) {
        console.error('Failed to fetch rank:', e)
      }

      // 5. Active match check
      try {
        const activeRes = await api.get('/match/active')
        if (activeRes.data?.data) {
          router.push(`/battles/${activeRes.data.data.id}`)
        }
      } catch (e) {
        // ignore
      }

    } catch (err) {
      console.error('Failed to load battle page:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const loadMoreMatches = useCallback(async () => {
    if (isLoadingMoreHistory || !hasMoreHistory || isLoadingHistory) return
    setIsLoadingMoreHistory(true)
    const nextPage = historyPage + 1
    try {
      const res = await api.get(`/match/history/me?page=${nextPage}&limit=20`)
      const newMatches = res.data?.data || []
      setMatchHistory((prev) => [...prev, ...newMatches])
      setHistoryPage(nextPage)
      setHasMoreHistory(Boolean(res.data?.hasMore))
    } catch (e) {
      console.error('Failed to load more matches:', e)
    } finally {
      setIsLoadingMoreHistory(false)
    }
  }, [historyPage, hasMoreHistory, isLoadingMoreHistory, isLoadingHistory])

  useEffect(() => {
    const target = observerTarget.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreHistory && !isLoadingMoreHistory && !isLoadingHistory) {
          loadMoreMatches()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(target)
    return () => observer.unobserve(target)
  }, [loadMoreMatches, hasMoreHistory, isLoadingMoreHistory, isLoadingHistory])

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

  const handleChallenge = (targetUserId: string) => {
    socket.emit('friend:challenge_send', { targetUserId })
  }

  // Filter & sort matches
  const filteredMatches = useMemo(() => {
    let list = [...matchHistory]
    const currentUserId = profile?.id || authUser?.id

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((m) => {
        const rival = m.player1.id === currentUserId ? m.player2 : m.player1
        return (
          m.problem.title.toLowerCase().includes(q) ||
          rival.username.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q)
        )
      })
    }

    if (selectedResultFilter !== 'ALL') {
      list = list.filter((m) => {
        const isWinner = m.winnerId === currentUserId
        const isDraw = m.result === 'DRAW'
        if (selectedResultFilter === 'VICTORY') return isWinner
        if (selectedResultFilter === 'DEFEAT') return !isWinner && !isDraw
        if (selectedResultFilter === 'DRAW') return isDraw
        return true
      })
    }

    list.sort((a, b) => {
      const tA = new Date(a.createdAt).getTime()
      const tB = new Date(b.createdAt).getTime()
      return sortDirection === 'desc' ? tB - tA : tA - tB
    })

    return list
  }, [matchHistory, searchQuery, selectedResultFilter, sortDirection, profile, authUser])

  // Stats calculation
  const userRating = profile?.rating || authUser?.rating || 1215
  const wins = profile?.wins || 0
  const losses = profile?.losses || 0
  const totalMatches = profile?.matchesPlayed ?? authUser?.matchesPlayed ?? (wins + losses)
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0

  const displayFriends = useMemo(() => {
    return friends.slice(0, 3)
  }, [friends])

  // SVG Chart points generator
  const chartPoints = useMemo(() => {
    const data = ratingHistory.length >= 2 ? ratingHistory : [
      { rating: 1000 },
      { rating: 1080 },
      { rating: 1150 },
      { rating: 1110 },
      { rating: 1240 },
      { rating: 1215 }
    ]

    const rawMin = Math.min(...data.map(d => d.rating))
    const rawMax = Math.max(...data.map(d => d.rating))
    
    const yMin = Math.max(0, Math.floor((rawMin - 30) / 50) * 50)
    const yMax = Math.ceil((rawMax + 30) / 50) * 50
    const yMid = Math.round((yMin + yMax) / 2)
    const range = Math.max(1, yMax - yMin)

    const width = 240
    const height = 110

    const pts = data.map((d, idx) => {
      const x = (idx / (data.length - 1)) * width
      const y = height - ((d.rating - yMin) / range) * (height - 20) - 10
      return { x, y, rating: d.rating }
    })

    let path = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i]
      const next = pts[i + 1]
      const mx = (curr.x + next.x) / 2
      path += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`
    }

    const areaPath = `${path} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`

    return { path, areaPath, pts, width, height, yMin, yMid, yMax }
  }, [ratingHistory])

  return (
    <>
      {/* ─── MATCH FOUND FULLSCREEN OVERLAY ─── */}
      {matchFoundData && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] pointer-events-none" />

          <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-sm tracking-wider animate-bounce">
              <Swords className="w-4 h-4 text-primary" /> MATCH FOUND! PREPARE FOR DUEL
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-7 gap-4 items-center">
              <div className="sm:col-span-3 p-6 rounded-2xl bg-card border-2 border-accent/40 shadow-xl flex flex-col items-center text-center space-y-2">
                <UserAvatar src={matchFoundData.player1.avatar_url || matchFoundData.player1.avatar} username={matchFoundData.player1.username} size="lg" />
                <h3 className="font-bold text-lg text-foreground truncate max-w-[180px]">
                  {matchFoundData.player1.username}
                </h3>
                <div className="text-xs text-muted-foreground font-mono">
                  Rating: <strong className="text-accent">{matchFoundData.player1.rating}</strong>
                </div>
              </div>

              <div className="sm:col-span-1 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center animate-pulse">
                  <span className="font-extrabold text-lg text-primary">VS</span>
                </div>
              </div>

              <div className="sm:col-span-3 p-6 rounded-2xl bg-card border-2 border-primary/40 shadow-xl flex flex-col items-center text-center space-y-2">
                <UserAvatar src={matchFoundData.player2.avatar_url || matchFoundData.player2.avatar} username={matchFoundData.player2.username} size="lg" />
                <h3 className="font-bold text-lg text-foreground truncate max-w-[180px]">
                  {matchFoundData.player2.username}
                </h3>
                <div className="text-xs text-muted-foreground font-mono">
                  Rating: <strong className="text-primary">{matchFoundData.player2.rating}</strong>
                </div>
              </div>
            </div>

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

      {/* 1. HERO BATTLE BANNER SECTION */}
      <div className="relative rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-lg overflow-hidden flex flex-col justify-between min-h-[220px] gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold font-mono text-primary">
            <Flame className="w-3.5 h-3.5" /> 1v1 REAL-TIME CODE ARENA
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Ranked Matchmaking & Duel Arena
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono max-w-xl">
            Solve algorithms head-to-head against live opponents. First contender to submit an Accepted solution claims victory and ELO rating points.
          </p>
        </div>

        {/* Main Battle Actions */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3">
          <Button 
            size="lg" 
            onClick={toggleSearch}
            className={`w-full sm:w-auto px-8 py-6 text-base font-black rounded-xl shadow-lg hover-lift btn-interactive gap-3 group ${
              isSearching
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
          >
            {isSearching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Searching Opponent ({queueTime}s)...</span>
              </>
            ) : (
              <>
                <Swords className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>Find 1v1 Match</span>
              </>
            )}
          </Button>
        </div>

        {queueError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 z-10">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{queueError}</span>
          </div>
        )}

        {/* Bottom Subtext Row */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-muted-foreground pt-4 border-t border-border/40 z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isSearching ? 'Matchmaking Queue Active...' : 'Global Matchmaking Running...'}</span>
          </div>
          <div>
            <span className="text-foreground font-bold">{activeMatchmakers}</span> Coders currently matchmaking
          </div>
        </div>
      </div>

      {/* MATCH HISTORY SECTION HEADER */}
      <div className="flex items-center justify-between border-b border-border pb-3 pt-2">
        <h2 className="text-lg sm:text-xl font-extrabold text-foreground flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          <span>Match History</span>
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchBattlePageData}
          disabled={isLoadingHistory}
          className="gap-1.5 text-xs font-semibold border-border bg-surface hover:bg-surface-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* 4. RECENT MATCHES LIST TABLE */}
      <div className="border-t border-border pt-4">
        <div className="space-y-2">
          {isLoadingHistory ? (
            <div className="py-12 text-center text-xs text-muted-foreground font-mono bg-card rounded-2xl border border-border p-6 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>Loading match history...</span>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground font-mono bg-card rounded-2xl border border-border p-6">
              <Swords className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No 1v1 duels found matching your criteria.
            </div>
          ) : (
            filteredMatches.map((match) => {
              const currentUserId = profile?.id || authUser?.id
              const isPlayer1 = match.player1.id === currentUserId
              const me = isPlayer1 ? match.player1 : match.player2
              const rival = isPlayer1 ? match.player2 : match.player1

              const isWinner = match.winnerId === currentUserId
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
              } else if (match.reason === 'OPPONENT_CHEATED' && !isWinner) {
                outcomeText = 'DISQUALIFIED'
                outcomeClass = 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              } else if (isAbandoned && !isWinner) {
                outcomeText = 'SURRENDERED'
                outcomeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }

              const reasonInfo = getMatchReasonInfo(match, currentUserId)
              const ReasonIcon = reasonInfo.icon

              const difficultyColor =
                match.problem.difficulty === 'EASY'
                  ? 'text-emerald-400'
                  : match.problem.difficulty === 'MEDIUM'
                  ? 'text-amber-400'
                  : 'text-rose-500'

              return (
                <div
                  key={match.id}
                  onClick={() => setSelectedHistoryMatch(match)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all group cursor-pointer gap-3"
                >
                  {/* Outcome & Rival Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black border tracking-wider shrink-0 ${outcomeClass}`}>
                      {outcomeText}
                    </span>

                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        src={rival.avatar_url || rival.avatar}
                        username={rival.username}
                        size="sm"
                      />
                      <div className="truncate">
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          vs @{rival.username}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono ml-2">
                          ({rival.rating} ELO)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Problem Title & Reason Badge */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 min-w-0 shrink-0">
                    <div className="flex items-center gap-2 text-xs truncate">
                      <Link href={`/problems/${match.problem.slug}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-foreground hover:text-accent truncate">
                        {match.problem.title}
                      </Link>
                      <span className={`text-xs font-extrabold ${difficultyColor}`}>
                        {match.problem.difficulty}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-muted-foreground shrink-0">
                      {new Date(match.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )
            })
          )}

          {hasMoreHistory && !isLoadingHistory && (
            <div ref={observerTarget} className="py-4 text-center text-xs text-muted-foreground font-mono flex items-center justify-center gap-2">
              {isLoadingMoreHistory ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading more matches...</span>
                </>
              ) : (
                <span>Scroll down to load more matches</span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
