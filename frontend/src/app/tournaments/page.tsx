'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Trophy,
  Users,
  Plus,
  Zap,
  CheckCircle2,
  Swords,
  Loader2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  UserPlus,
  AlertTriangle,
} from 'lucide-react'
import { api } from '@/lib/axios'
import { socket } from '@/lib/socket'
import { useAuthStore } from '@/lib/authStore'
import { UserAvatar } from '@/components/UserAvatar'

interface TournamentItem {
  id: string
  title: string
  status: 'WAITING_FOR_PLAYERS' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'
  createdAt: string
  creator: { id: string; username: string; avatar_url?: string }
  winner?: { id: string; username: string; avatar_url?: string }
  participants: Array<{ id: string; userId: string }>
}

interface TournamentInviteItem {
  id: string
  tournamentId: string
  senderId: string
  status: string
  createdAt: string
  tournament: {
    id: string
    title: string
    creator: { id: string; username: string; avatar_url?: string }
  }
}

export default function TournamentsLobbyPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  const [tournaments, setTournaments] = useState<TournamentItem[]>([])
  const [invites, setInvites] = useState<TournamentInviteItem[]>([])
  const [friendsCount, setFriendsCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  // Create Tournament Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [tournamentTitle, setTournamentTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  useEffect(() => {
    fetchTournamentsData()

    if (!socket.connected) {
      socket.connect()
    }

    const onInvited = () => {
      fetchTournamentsData()
    }

    socket.on('tournament:invited', onInvited)
    return () => {
      socket.off('tournament:invited', onInvited)
    }
  }, [])

  const fetchTournamentsData = async () => {
    setIsLoading(true)
    try {
      const [tournamentsRes, invitesRes, friendsRes] = await Promise.all([
        api.get('/tournament/list').catch(() => ({ data: { tournaments: [] } })),
        api.get('/tournament/invites').catch(() => ({ data: { invites: [] } })),
        api.get('/friends/list').catch(() => ({ data: { friends: [] } })),
      ])
      setTournaments(tournamentsRes.data?.tournaments || [])
      setInvites(invitesRes.data?.invites || [])
      setFriendsCount((friendsRes.data?.friends || []).length)
    } catch (err) {
      console.error('Failed to load tournaments:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')

    if (friendsCount < 7) {
      setCreateError(`You currently have ${friendsCount} friend(s). You must have at least 7 friends to create an 8-player tournament!`)
      return
    }

    setIsCreating(true)
    try {
      const res = await api.post('/tournament/create', {
        title: tournamentTitle.trim() || undefined,
      })
      if (res.data?.tournament?.id) {
        setIsCreateOpen(false)
        router.push(`/tournaments/${res.data.tournament.id}`)
      }
    } catch (err: any) {
      console.error('Failed to create tournament:', err)
      const msg = err.response?.data?.message || 'Failed to create tournament. Please check your friends list.'
      setCreateError(msg)
    } finally {
      setIsCreating(false)
    }
  }

  const handleAcceptInvite = async (tournamentId: string) => {
    setAcceptingId(tournamentId)
    try {
      const res = await api.post(`/tournament/${tournamentId}/accept`)
      if (res.data?.tournament?.id) {
        router.push(`/tournaments/${res.data.tournament.id}`)
      }
    } catch (err) {
      console.error('Failed to accept invite:', err)
    } finally {
      setAcceptingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full space-y-8">
        {/* Banner Section */}
        <div className="relative rounded-2xl border border-primary/30 bg-linear-to-r from-card via-surface to-card p-8 overflow-hidden shadow-xl shadow-primary/5">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                8-Player Single Elimination
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                Friend Championship Arena
              </h1>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Create a 8-player bracket tournament, invite 7 of your friends, and battle head-to-head.
                Every match counts toward your competitive ELO rating!
              </p>
            </div>

            <Button
              size="lg"
              onClick={() => {
                setCreateError('')
                setIsCreateOpen(true)
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/25 rounded-xl gap-2 px-6 h-12 shrink-0"
            >
              <Plus className="w-5 h-5" />
              Create 8-Player Tournament
            </Button>
          </div>
        </div>

        {/* Pending Invites Alert Section */}
        {invites.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              Pending Tournament Invites ({invites.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invites.map((inv) => (
                <Card key={inv.id} className="border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={inv.tournament.creator.avatar_url}
                        username={inv.tournament.creator.username}
                        size="md"
                      />
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{inv.tournament.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          Invited by <span className="text-primary font-semibold">@{inv.tournament.creator.username}</span>
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvite(inv.tournamentId)}
                      disabled={acceptingId === inv.tournamentId}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1 px-4 shrink-0"
                    >
                      {acceptingId === inv.tournamentId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Accept & Join Bracket</span>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tournaments Grid Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" /> Your Championships
            </h2>
            <Button variant="ghost" size="sm" onClick={fetchTournamentsData} className="text-xs text-muted-foreground">
              Refresh List
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="border-border bg-card">
                  <CardContent className="p-5 space-y-3">
                    <div className="skeleton h-5 w-3/4" />
                    <div className="skeleton h-4 w-1/2" />
                    <div className="skeleton h-8 w-full mt-4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tournaments.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="p-12 text-center space-y-4">
                <Trophy className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
                <div>
                  <h3 className="text-base font-bold text-foreground">No Tournaments Joined Yet</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Create an 8-player tournament, invite 7 of your friends, and compete in a single elimination bracket!
                  </p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-primary text-primary-foreground text-xs font-bold">
                  Create First Tournament
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tournaments.map((t) => (
                <Card key={t.id} className="border-border bg-card/70 backdrop-blur-xs hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                        t.status === 'WAITING_FOR_PLAYERS' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        t.status === 'IN_PROGRESS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse' :
                        'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}>
                        {t.status === 'WAITING_FOR_PLAYERS' ? `Waiting (${t.participants.length}/8)` :
                         t.status === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <CardTitle className="text-lg font-bold text-foreground leading-tight line-clamp-1">
                      {t.title}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Organized by @{t.creator.username}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Champion box if finished */}
                    {t.winner && (
                      <div className="p-2.5 rounded-lg bg-surface border border-amber-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          <span className="text-xs text-muted-foreground">Champion:</span>
                          <span className="text-xs font-bold text-amber-400">@{t.winner.username}</span>
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Roster Slots:</span>
                        <span className="text-foreground font-mono">{t.participants.length} / 8</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${(t.participants.length / 8) * 100}%` }}
                        />
                      </div>
                    </div>

                    <Link href={`/tournaments/${t.id}`} className="block">
                      <Button className="w-full bg-surface hover:bg-surface-2 text-foreground border border-border text-xs font-bold gap-2 group">
                        <span>View Bracket Tree</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Tournament Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="border-border bg-card w-full max-w-md shadow-2xl animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Create 8-Player Tournament
              </CardTitle>
              <CardDescription>
                Set a title and invite 7 friends to start the single elimination bracket.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 7-Friends Requirement Warning Box */}
              {friendsCount < 7 ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 space-y-3">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
                      <span>7 Friends Required to Create Tournament</span>
                    </div>
                    <p className="text-xs text-rose-200/90 leading-relaxed">
                      You currently have <strong className="text-white font-mono">{friendsCount} / 7</strong> accepted friends.
                      Creating an 8-player tournament requires inviting 7 of your friends to fill the bracket.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                      Close
                    </Button>
                    <Link href="/friends">
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-2">
                        <UserPlus className="w-4 h-4" /> Add More Friends
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateTournament} className="space-y-4">
                  {createError && (
                    <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{createError}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground block">
                      Tournament Name
                    </label>
                    <Input
                      placeholder="e.g. Weekend Code Warriors"
                      value={tournamentTitle}
                      onChange={(e) => setTournamentTitle(e.target.value)}
                      required
                      className="bg-surface border-border text-foreground"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-surface border border-border text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between items-center font-semibold text-foreground">
                      <span>Tournament Roster Status:</span>
                      <span className="text-emerald-400 font-mono">{friendsCount} Available Friends ✓</span>
                    </div>
                    <ul className="list-disc ml-4 space-y-0.5 pt-1">
                      <li>Single Elimination (Quarterfinals ➔ Semifinals ➔ Finals)</li>
                      <li>8 Players total (Creator + 7 Invited Friends)</li>
                      <li>All duels update ELO ratings automatically</li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreating || friendsCount < 7}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                    >
                      {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Tournament'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
