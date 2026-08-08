'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
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
  Activity,
  Flame,
  Code2,
  Sparkles,
  ChevronRight,
  Loader2,
  UserPlus
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

interface ProblemItem {
  problemNumber: number
  title: string
  slug: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  topics?: string[]
  solved?: boolean
  status?: 'SOLVED' | 'ATTEMPTED' | 'UNSOLVED'
}

interface RatingPoint {
  id?: string
  rating: number
  createdAt: string
  matchId?: string | null
}

export default function DashboardPage() {
  const { user: authUser, setUser } = useAuthStore()
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [friends, setFriends] = useState<FriendItem[]>([])
  const [ratingHistory, setRatingHistory] = useState<RatingPoint[]>([])
  const [problems, setProblems] = useState<ProblemItem[]>([])
  const [userRank, setUserRank] = useState<string>('-')
  
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'number' | 'difficulty' | 'title'>('number')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [activeMatchmakers, setActiveMatchmakers] = useState<number>(32)
  const [hoveredPtIndex, setHoveredPtIndex] = useState<number | null>(null)

  // Infinite Scroll Pagination State
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(() => {
    fetchDashboardData()

    // Randomize matchmaking counter slightly to keep it feeling live & dynamic
    const timer = setInterval(() => {
      setActiveMatchmakers(prev => Math.max(18, prev + Math.floor(Math.random() * 5) - 2))
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  // Window scroll listener for infinite loading when user reaches bottom
  useEffect(() => {
    const handleScroll = () => {
      if (isLoadingMore || !hasMore || isLoading || searchQuery.trim() || selectedTopic) return
      
      const scrollHeight = document.documentElement.scrollHeight
      const currentScroll = window.innerHeight + window.scrollY
      
      if (currentScroll >= scrollHeight - 300) {
        fetchMoreProblems()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [page, hasMore, isLoadingMore, isLoading, searchQuery, selectedTopic, problems])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      // 1. Fetch user profile & recent matches & rating history
      const profileRes = await api.get('/user/profile/me')
      if (profileRes.data?.user) {
        setProfile(profileRes.data.user)
        setUser(profileRes.data.user)
      }
      if (profileRes.data?.ratingHistory) {
        setRatingHistory(profileRes.data.ratingHistory)
      }

      // 2. Fetch friends list
      try {
        const friendsRes = await api.get('/friends')
        setFriends(friendsRes.data?.friends || [])
      } catch (e) {
        console.error('Failed to fetch friends:', e)
      }

      // 3. Fetch initial problems set (Page 1)
      try {
        const problemsRes = await api.get('/problem/get/get-all/1/50')
        const fetched = problemsRes.data?.problems || []
        setProblems(fetched)
        setPage(1)
        if (problemsRes.data?.totalCount && fetched.length >= problemsRes.data.totalCount) {
          setHasMore(false)
        } else if (fetched.length < 50) {
          setHasMore(false)
        }
      } catch (e) {
        console.error('Failed to fetch problems:', e)
      }

      // 4. Fetch leaderboard rank
      try {
        const rankRes = await api.get('/leaderboard/global?limit=50')
        if (rankRes.data?.currentUserRank?.rank) {
          const r = rankRes.data.currentUserRank.rank
          if (r === 1) setUserRank('1st')
          else if (r === 2) setUserRank('2nd')
          else if (r === 3) setUserRank('3rd')
          else setUserRank(`${r}th`)
        } else {
          setUserRank('-')
        }
      } catch (e) {
        setUserRank('-')
      }

    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMoreProblems = async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await api.get(`/problem/get/get-all/${nextPage}/50`)
      const newFetched = res.data?.problems || []
      
      if (newFetched.length === 0) {
        setHasMore(false)
      } else {
        setProblems(prev => {
          const existingSlugs = new Set(prev.map(p => p.slug))
          const uniqueNew = newFetched.filter((p: ProblemItem) => !existingSlugs.has(p.slug))
          return [...prev, ...uniqueNew]
        })
        setPage(nextPage)
        if (newFetched.length < 50 || (res.data?.totalCount && problems.length + newFetched.length >= res.data.totalCount)) {
          setHasMore(false)
        }
      }
    } catch (err) {
      console.error('Failed to fetch next problems:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleChallenge = (targetUserId: string) => {
    socket.emit('friend:challenge_send', { targetUserId })
  }

  // Filter & sort problem list
  const filteredProblems = useMemo(() => {
    let list = [...problems]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.problemNumber.toString().includes(q)
      )
    }

    if (selectedTopic) {
      list = list.filter(p => p.topics && p.topics.includes(selectedTopic))
    }

    list.sort((a, b) => {
      let comp = 0
      if (sortOrder === 'number') {
        comp = a.problemNumber - b.problemNumber
      } else if (sortOrder === 'title') {
        comp = a.title.localeCompare(b.title)
      } else if (sortOrder === 'difficulty') {
        const diffWeight = { EASY: 1, MEDIUM: 2, HARD: 3 }
        comp = diffWeight[a.difficulty] - diffWeight[b.difficulty]
      }
      return sortDirection === 'asc' ? comp : -comp
    })

    return list
  }, [problems, searchQuery, selectedTopic, sortOrder, sortDirection])

  // Fallback problem items if none loaded from API yet
  const displayedProblems = useMemo(() => {
    if (problems.length > 0) return filteredProblems

    // Fallback sample data matching Excalidraw screenshot
    const samples: ProblemItem[] = [
      { problemNumber: 1, title: 'Two Sum', slug: 'two-sum', difficulty: 'EASY', topics: ['Array', 'Two Pointers'], solved: true },
      { problemNumber: 2, title: 'Reverse Integer', slug: 'reverse-integer', difficulty: 'MEDIUM', topics: ['Math'], solved: false },
      { problemNumber: 3, title: 'Palindrome Number', slug: 'palindrome-number', difficulty: 'HARD', topics: ['Math'], solved: false },
      { problemNumber: 4, title: 'Median of Two Sorted Arrays', slug: 'median-of-two-sorted-arrays', difficulty: 'MEDIUM', topics: ['Array', 'Binary Search'], solved: false },
      { problemNumber: 5, title: 'Longest Palindromic Substring', slug: 'longest-palindromic-substring', difficulty: 'EASY', topics: ['Math', 'Strings'], solved: true },
    ]

    return samples.filter(p => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.topics?.some(t => t.toLowerCase().includes(q))
      const matchesTopic = !selectedTopic || p.topics?.includes(selectedTopic)
      return matchesSearch && matchesTopic
    })
  }, [problems, filteredProblems, searchQuery, selectedTopic])

  // Dynamically extract unique topics from fetched problem set
  const dynamicTopics = useMemo(() => {
    const list = Array.from(new Set(problems.flatMap(p => p.topics || [])))
    if (list.length > 0) return list
    // Fallback topics from sample list if database hasn't loaded yet
    return ['Array', 'Binary Search', 'Recursion', 'Math', 'Hash Map', 'Strings', 'Bit Manipulation', 'Heap']
  }, [problems])

  // Stats calculation
  const userRating = profile?.rating ?? authUser?.rating ?? 1200
  const wins = profile?.wins ?? 0
  const losses = profile?.losses ?? 0
  const totalMatches = profile?.matchesPlayed ?? (wins + losses)
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0

  // Displayed friends (up to 3 for widget)
  const displayFriends = useMemo(() => {
    return friends.slice(0, 3)
  }, [friends])

  // Chart path generator for Rating History SVG graph
  const chartPoints = useMemo(() => {
    const data = ratingHistory.length >= 2 ? ratingHistory : []
    if (data.length < 2) {
      return { path: '', areaPath: '', pts: [], width: 240, height: 110, yMin: 1200, yMid: 1200, yMax: 1200 }
    }

    const rawMin = Math.min(...data.map(d => d.rating))
    const rawMax = Math.max(...data.map(d => d.rating))
    
    // Round bounds nicely to nearest 50 ELO
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

    // Construct smooth cubic bezier path string
    let path = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i]
      const next = pts[i + 1]
      const mx = (curr.x + next.x) / 2
      path += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`
    }

    // Area path closing down to x-axis
    const areaPath = `${path} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`

    return { path, areaPath, pts, width, height, yMin, yMid, yMax }
  }, [ratingHistory])

  const toggleSort = () => {
    if (sortOrder === 'number') {
      setSortOrder('difficulty')
    } else if (sortOrder === 'difficulty') {
      setSortOrder('title')
    } else {
      setSortOrder('number')
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    }
  }

  return (
    <>
      {/* 1. HERO BATTLE BANNER SECTION */}
      <div className="relative rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-lg overflow-hidden flex flex-col justify-between min-h-[220px] gap-6">
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Headline & Description */}
        <div className="relative z-10 space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold font-mono text-primary">
            <Flame className="w-3.5 h-3.5" /> 1v1 REAL-TIME CODE ARENA
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Outcode Your Rival in Head-to-Head Duels
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono max-w-xl">
            Solve algorithms head-to-head against live opponents. First to pass all test cases wins the duel and claims ELO rating points.
          </p>
        </div>

        {/* Main Battle Actions */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3">
          <Link href="/battles" className="w-full sm:w-auto">
            <Button 
              size="lg" 
              className="w-full sm:w-auto px-8 py-6 text-base font-black rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover-lift btn-interactive gap-3 group"
            >
              <Swords className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span>Enter 1v1 Battle</span>
            </Button>
          </Link>
        </div>

        {/* Bottom Subtext Row */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-muted-foreground pt-4 border-t border-border/40 z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Global Matchmaking Running...</span>
          </div>
          <div>
            <span className="text-foreground font-bold">{activeMatchmakers}</span> Coders currently matchmaking
          </div>
        </div>
      </div>

      {/* 2. TOPIC FILTER BADGES ROW */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {dynamicTopics.map(topic => {
          const isSelected = selectedTopic === topic
          return (
            <button
              key={topic}
              onClick={() => setSelectedTopic(isSelected ? null : topic)}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide shrink-0 border transition-all btn-interactive ${
                isSelected
                  ? 'bg-accent/20 border-accent text-accent shadow-xs'
                  : 'bg-card border-border text-foreground hover:bg-surface hover:border-border-muted'
              }`}
            >
              {topic}
            </button>
          )
        })}
      </div>

      {/* 3. SEARCH & SORT BAR */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl text-xs font-mono focus:border-accent shadow-xs"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleSort}
          className="h-10 px-3.5 bg-card border-border hover:bg-surface text-foreground font-bold text-xs gap-2 rounded-xl"
          title={`Sort by ${sortOrder}`}
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-accent" />
          <span className="capitalize">{sortOrder}</span>
          <span className="text-[10px] text-muted-foreground font-mono">↓</span>
        </Button>
      </div>

      {/* 4. PROBLEM LIST TABLE */}
      <div className="border-t border-border pt-4">
        <div className="space-y-1">
          {displayedProblems.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground font-mono bg-card rounded-2xl border border-border p-6">
              <Code2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No problems found matching your criteria.
            </div>
          ) : (
            displayedProblems.map((prob) => {
              const difficultyColor = 
                prob.difficulty === 'EASY'
                  ? 'text-emerald-400'
                  : prob.difficulty === 'MEDIUM'
                  ? 'text-amber-400'
                  : 'text-rose-500'

              const difficultyLabel =
                prob.difficulty === 'EASY'
                  ? 'Easy'
                  : prob.difficulty === 'MEDIUM'
                  ? 'Med.'
                  : 'Hard'

              return (
                <Link
                  key={prob.slug || prob.problemNumber}
                  href={`/problems/${prob.slug}`}
                  className="flex items-center justify-between p-3.5 rounded-xl hover:bg-card/80 transition-colors group border border-transparent hover:border-border cursor-pointer"
                >
                  {/* Solved checkmark & Title */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {prob.status === 'SOLVED' || (prob.solved && !prob.status) ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : prob.status === 'ATTEMPTED' ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" title="In Progress" />
                      ) : null}
                    </div>

                    <div className="truncate font-semibold text-sm text-foreground group-hover:text-accent transition-colors flex items-center gap-2">
                      <span className="text-muted-foreground font-mono font-normal">{prob.problemNumber}.</span>
                      <span className="truncate">{prob.title}</span>
                    </div>
                  </div>

                  {/* Topics & Difficulty */}
                  <div className="flex items-center gap-6 shrink-0 ml-4">
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      {prob.topics && prob.topics.length > 0 ? (
                        prob.topics.slice(0, 2).join(', ')
                      ) : (
                        'Math'
                      )}
                    </div>

                    <div className={`text-xs font-extrabold w-12 text-right ${difficultyColor}`}>
                      {difficultyLabel}
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>

        {/* Infinite Loading Indicator */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-6 gap-2 text-xs font-mono text-muted-foreground animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            <span>Loading next 50 problems...</span>
          </div>
        )}

        {!isLoadingMore && hasMore && !searchQuery && !selectedTopic && problems.length >= 50 && (
          <div className="text-center pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchMoreProblems}
              className="text-xs font-mono text-muted-foreground hover:text-foreground"
            >
              Load next 50 problems...
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
