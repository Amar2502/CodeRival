'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Swords, ShieldAlert, Zap, Trophy, Users, Clock, Flame, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'
import { getRatingInfo } from '@/lib/rating'
import { socket } from '@/lib/socket'

export default function BattlesPage() {
  const { user } = useAuthStore()
  const [isSearching, setIsSearching] = useState(false)
  const [queueTime, setQueueTime] = useState(0)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isSearching) {
      timer = setInterval(() => setQueueTime((prev) => prev + 1), 1000)
    } else {
      setQueueTime(0)
    }
    return () => clearInterval(timer)
  }, [isSearching])

  const toggleSearch = () => {
    if (isSearching) {
      socket.emit('leaveMatchmakingQueue')
      setIsSearching(false)
    } else {
      socket.emit('joinMatchmakingQueue')
      setIsSearching(true)
    }
  }

  const ratingInfo = getRatingInfo(user?.rating || 1200)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Arena Header Hero */}
        <div className="relative p-8 rounded-3xl bg-card border border-border overflow-hidden text-center sm:text-left">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs font-semibold text-rose-400">
                <Swords className="w-3.5 h-3.5 text-primary animate-pulse" /> Live Ranked Duels
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">1v1 Code Battle Arena</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Compete against rival developers in real-time. Both players receive the exact same problem statement. First to submit an Accepted solution wins the duel and rating ELO!
              </p>
            </div>

            {/* Matchmaking Queue Trigger Card */}
            <div className="w-full sm:w-80 p-6 rounded-2xl bg-surface border border-border flex flex-col items-center justify-center text-center space-y-4 shadow-lg">
              <div className="relative">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                  isSearching ? 'bg-primary/20 border-primary animate-pulse-live' : 'bg-card border-border'
                }`}>
                  <Swords className={`w-8 h-8 ${isSearching ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">
                  {isSearching ? 'Searching Opponent...' : 'Ranked Matchmaking'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  {isSearching ? `Time in queue: ${queueTime}s` : 'Standard 1v1 Speed Duel'}
                </p>
              </div>

              <Button
                size="lg"
                onClick={toggleSearch}
                className={`w-full font-bold gap-2 shadow-md ${
                  isSearching
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                }`}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Cancel Search
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

        {/* Duel Rules & Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> ELO Rating Stakes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>Your Current Rating: <strong className={`font-mono text-sm ${ratingInfo.colorClass}`}>{user?.rating || 1200} ({ratingInfo.title})</strong></p>
              <p className="leading-relaxed">Win duels to gain +25 ELO. Defeats will deduct rating points based on relative opponent skill.</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" /> Match Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>• 15-30 minute time limit per duel</p>
              <p>• Supported Languages: C++, Java, Python 3</p>
              <p>• Instant verdict checking on every submission</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" /> Private Custom Duels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <p>Want to duel a specific friend? Share a direct room code or challenge from problem page.</p>
              <Link href="/problems">
                <Button size="sm" variant="outline" className="w-full border-border bg-surface text-xs font-semibold gap-1">
                  Practice Problems First <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
