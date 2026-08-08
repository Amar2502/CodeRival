'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, UserPlus, TrendingUp } from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'
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

interface RatingPoint {
  id?: string
  rating: number
  createdAt: string
  matchId?: string | null
  delta?: number
}

import { useSidebarStore } from '@/lib/sidebarStore'

export function RightSidebar() {
  const { user: authUser } = useAuthStore()
  const { profile, friends, ratingHistory, userRank, fetchSidebarData } = useSidebarStore()
  const [hoveredPtIndex, setHoveredPtIndex] = useState<number | null>(null)

  useEffect(() => {
    // Initial fetch uses cached store if already initialized
    fetchSidebarData(false)

    // Force refresh store on real-time socket updates
    const handleUpdate = () => {
      fetchSidebarData(true)
    }

    socket.on('friend:request_accepted', handleUpdate)
    socket.on('friend:removed', handleUpdate)
    socket.on('match:ended', handleUpdate)

    return () => {
      socket.off('friend:request_accepted', handleUpdate)
      socket.off('friend:removed', handleUpdate)
      socket.off('match:ended', handleUpdate)
    }
  }, [fetchSidebarData])

  const handleChallenge = (targetUserId: string) => {
    socket.emit('friend:challenge_send', { targetUserId })
  }

  // Calculated stats
  const userRating = profile?.rating ?? authUser?.rating ?? 1200
  const wins = profile?.wins ?? 0
  const losses = profile?.losses ?? 0
  const totalMatches = profile?.matchesPlayed ?? (wins + losses)
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0

  const displayFriends = useMemo(() => {
    return friends.slice(0, 3)
  }, [friends])

  // SVG Chart points generator
  const chartPoints = useMemo(() => {
    let data: RatingPoint[] = [...ratingHistory]

    if (data.length === 1 && data[0].matchId && data[0].delta !== undefined) {
      const startingRating = data[0].rating - data[0].delta
      data = [
        { id: 'initial', rating: startingRating, createdAt: data[0].createdAt, delta: 0 },
        ...data,
      ]
    } else if (data.length > 0 && data[0].matchId && data[0].delta !== undefined) {
      const startingRating = data[0].rating - data[0].delta
      data = [
        { id: 'initial', rating: startingRating, createdAt: data[0].createdAt, delta: 0 },
        ...data,
      ]
    }

    if (data.length < 2) {
      return { path: '', areaPath: '', pts: [], width: 240, height: 110, yMin: 1200, yMax: 1200 }
    }

    const rawMin = Math.min(...data.map(d => d.rating))
    const rawMax = Math.max(...data.map(d => d.rating))
    
    const yMin = Math.max(0, Math.floor((rawMin - 30) / 50) * 50)
    const yMax = Math.ceil((rawMax + 30) / 50) * 50
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

    return { path, areaPath, pts, width, height, yMin, yMax }
  }, [ratingHistory])

  return (
    <aside className="lg:col-span-4 space-y-6">

      {/* 1. STATS GRID (2x2) */}
      <div className="grid grid-cols-2 gap-px bg-border rounded-2xl overflow-hidden border border-border shadow-md">
        <div className="bg-card p-5 text-center flex flex-col items-center justify-center">
          <div className="text-3xl font-black text-foreground tracking-tight">{userRating}</div>
          <div className="text-xs text-muted-foreground font-medium mt-1">Rating</div>
        </div>

        <div className="bg-card p-5 text-center flex flex-col items-center justify-center">
          <div className="text-3xl font-black text-foreground tracking-tight">{totalMatches}</div>
          <div className="text-xs text-muted-foreground font-medium mt-1">Matches</div>
        </div>

        <div className="bg-card p-5 text-center flex flex-col items-center justify-center">
          <div className="text-3xl font-black text-foreground tracking-tight">{winRate}%</div>
          <div className="text-xs text-muted-foreground font-medium mt-1">Win Rate</div>
        </div>

        <div className="bg-card p-5 text-center flex flex-col items-center justify-center">
          <div className="text-3xl font-black text-foreground tracking-tight">{userRank}</div>
          <div className="text-xs text-muted-foreground font-medium mt-1">Rank</div>
        </div>
      </div>

      {/* 2. FRIENDS WIDGET */}
      <Card className="border-border bg-card shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              <span>Friends ({friends.length})</span>
            </h3>
          </div>

          {displayFriends.length === 0 ? (
            <div className="py-4 px-2 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto text-accent">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">No Friends Added Yet</p>
                <p className="text-[11px] text-muted-foreground font-mono leading-relaxed max-w-[230px] mx-auto">
                  Make friends to challenge them to 1v1 code duels & play with your colleagues!
                </p>
              </div>
              <Link href="/friends" className="block pt-1">
                <Button className="w-full h-10 text-xs font-bold rounded-2xl bg-accent hover:bg-accent/90 text-accent-foreground gap-2 shadow-md hover-lift btn-interactive">
                  <UserPlus className="w-4 h-4" />
                  <span>Find & Add Friends</span>
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {displayFriends.map(({ friendshipId, user: friendUser }) => (
                  <div
                    key={friendshipId}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface/50 border border-border/50 hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <UserAvatar
                          src={friendUser.avatar_url || friendUser.avatar}
                          username={friendUser.username}
                          name={friendUser.name}
                          size="sm"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-card ${
                            friendUser.isOnline ? 'bg-emerald-500' : 'bg-gray-500'
                          }`}
                        />
                      </div>
                      <span className="text-xs font-bold text-foreground truncate">
                        {friendUser.name || friendUser.username}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleChallenge(friendUser.id)}
                      className="h-8 px-3 rounded-xl text-xs font-bold border-border bg-surface hover:bg-surface-2 text-foreground shrink-0 btn-interactive"
                    >
                      Challenge
                    </Button>
                  </div>
                ))}
              </div>

              <div className="text-right pt-1">
                <Link href="/friends" className="text-xs text-muted-foreground hover:text-accent transition-colors font-medium">
                  see more...
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 3. RATING HISTORY WIDGET */}
      <Card className="border-border bg-card shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Rating History</span>
            </h3>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                Peak: {Math.max(...chartPoints.pts.map(p => p.rating), userRating)}
              </span>
            </div>
          </div>

          {chartPoints.pts.length === 0 ? (
            <div className="py-6 px-2 text-center text-xs font-mono text-muted-foreground">
              No rating history recorded yet.
            </div>
          ) : (
            <div className="relative pt-2 pb-6 px-3 h-[150px] flex items-center justify-center">
              <svg 
                className="w-full h-full overflow-visible" 
                viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`}
              >
                <defs>
                  <linearGradient id="sidebarRatingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#58a6ff" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#58a6ff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1="0" y1="10" x2={chartPoints.width} y2="10" stroke="currentColor" className="text-border/30" strokeDasharray="3 3" />
                <line x1="0" y1={chartPoints.height / 2} x2={chartPoints.width} y2={chartPoints.height / 2} stroke="currentColor" className="text-border/30" strokeDasharray="3 3" />
                <line x1="0" y1={chartPoints.height - 10} x2={chartPoints.width} y2={chartPoints.height - 10} stroke="currentColor" className="text-border/30" strokeDasharray="3 3" />

                <path
                  d={chartPoints.areaPath}
                  fill="url(#sidebarRatingGradient)"
                />

                <path
                  d={chartPoints.path}
                  fill="none"
                  stroke="#58a6ff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {chartPoints.pts.map((pt, idx) => {
                  const isHovered = hoveredPtIndex === idx
                  return (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPtIndex(idx)}
                      onMouseLeave={() => setHoveredPtIndex(null)}
                    >
                      <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6 : 4}
                        className="stroke-accent stroke-[2.5px] transition-all"
                        fill={isHovered ? '#58a6ff' : '#0d1117'}
                      />

                      {isHovered && (
                        <g className="pointer-events-none">
                          <rect
                            x={Math.max(0, Math.min(chartPoints.width - 65, pt.x - 32))}
                            y={Math.max(0, pt.y - 32)}
                            width="64"
                            height="22"
                            rx="6"
                            className="fill-popover stroke-border stroke-1 shadow-lg"
                          />
                          <text
                            x={Math.max(0, Math.min(chartPoints.width - 65, pt.x - 32)) + 32}
                            y={Math.max(0, pt.y - 32) + 15}
                            textAnchor="middle"
                            className="text-[10px] font-mono font-bold fill-foreground"
                          >
                            {pt.rating} ELO
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}
              </svg>

              <div className="absolute bottom-0 left-3 right-3 flex justify-between text-[10px] font-mono text-muted-foreground select-none">
                {chartPoints.pts.map((_, idx) => (
                  <span key={idx}>
                    {idx === 0 ? 'Start' : idx === chartPoints.pts.length - 1 ? 'Now' : `M${idx}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </aside>
  )
}
