'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Trophy,
  Users,
  Plus,
  CheckCircle2,
  Swords,
  Loader2,
  Sparkles,
  ArrowRight,
  UserPlus,
  AlertTriangle,
} from 'lucide-react'
import { api } from '@/lib/axios'
import { socket } from '@/lib/socket'
import { useAuthStore } from '@/lib/authStore'
import { UserAvatar } from '@/components/UserAvatar'
import { isDevelopment } from '@/lib/config'

interface TournamentItem {
  id: string
  title: string
  maxPlayers?: number
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
  const [maxPlayers, setMaxPlayers] = useState<4 | 8>(8)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)

  useEffect(() => {
    fetchTournamentsData()

    if (!socket.connected) {
      socket.connect()
    }

    const onRefresh = () => {
      fetchTournamentsData()
    }

    socket.on('tournament:invited', onRefresh)
    socket.on('tournament:cancelled', onRefresh)
    socket.on('tournament:started', onRefresh)
    socket.on('tournament:updated', onRefresh)
    socket.on('tournament:invite_declined', onRefresh)

    return () => {
      socket.off('tournament:invited', onRefresh)
      socket.off('tournament:cancelled', onRefresh)
      socket.off('tournament:started', onRefresh)
      socket.off('tournament:updated', onRefresh)
      socket.off('tournament:invite_declined', onRefresh)
    }
  }, [])

  const fetchTournamentsData = async () => {
    setIsLoading(true)
    try {
      const [tournamentsRes, invitesRes, friendsRes] = await Promise.all([
        api.get('/tournament/list').catch(() => ({ data: { tournaments: [] } })),
        api.get('/tournament/invites').catch(() => ({ data: { invites: [] } })),
        api.get('/friends').catch(() => ({ data: { friends: [] } })),
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

    const requiredFriends = maxPlayers - 1
    if (friendsCount < requiredFriends) {
      setCreateError(`You currently have ${friendsCount} friend(s). You must have at least ${requiredFriends} friends to create a ${maxPlayers}-player tournament!`)
      return
    }

    setIsCreating(true)
    try {
      const res = await api.post('/tournament/create', {
        title: tournamentTitle.trim() || undefined,
        maxPlayers,
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
    setInvites((prev) => prev.filter((inv) => inv.tournamentId !== tournamentId))
    try {
      const res = await api.post(`/tournament/${tournamentId}/accept`)
      if (res.data?.tournament?.id) {
        router.push(`/tournaments/${res.data.tournament.id}`)
      }
    } catch (err) {
      console.error('Failed to accept invite:', err)
      fetchTournamentsData()
    } finally {
      setAcceptingId(null)
    }
  }

  const handleDeclineInvite = async (tournamentId: string) => {
    setDecliningId(tournamentId)
    setInvites((prev) => prev.filter((inv) => inv.tournamentId !== tournamentId))
    try {
      await api.post(`/tournament/${tournamentId}/decline`)
    } catch (err) {
      console.error('Failed to decline invite:', err)
      fetchTournamentsData()
    } finally {
      setDecliningId(null)
    }
  }

  if (!isDevelopment) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-linear-to-br from-primary/20 via-surface to-accent/20 border border-primary/30 flex items-center justify-center shadow-2xl">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          Upcoming Feature
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Tournament Arena
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Bracket-style single-elimination championships and tournament coding duels are coming soon.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/battles">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md rounded-xl gap-2 px-6 h-11 text-xs cursor-pointer">
              <Swords className="w-4 h-4" />
              <span>Go to 1v1 Battles</span>
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8">
        {/* Banner Section */}
        <div className="relative rounded-2xl border border-primary/30 bg-linear-to-r from-card via-surface to-card p-6 sm:p-8 overflow-hidden shadow-xl shadow-primary/5">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                4 or 8-Player Single Elimination
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Friend Championship Arena
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Create a 4-player or 8-player bracket tournament, invite your friends, and battle head-to-head.
                Every match counts toward your competitive ELO rating!
              </p>
            </div>

            <Button
              size="lg"
              onClick={() => {
                setCreateError('')
                setIsCreateOpen(true)
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/25 rounded-xl gap-2 px-6 h-11 shrink-0 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              Create Tournament
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {invites.map((inv) => (
                <Card key={inv.id} className="border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        src={inv.tournament.creator.avatar_url}
                        username={inv.tournament.creator.username}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-foreground truncate">{inv.tournament.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          Invited by <span className="text-primary font-semibold">@{inv.tournament.creator.username}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineInvite(inv.tournamentId)}
                        disabled={decliningId === inv.tournamentId || acceptingId === inv.tournamentId}
                        className="border-border text-muted-foreground hover:text-rose-400 hover:border-rose-500/40 text-xs font-semibold px-3 h-8 cursor-pointer"
                      >
                        {decliningId === inv.tournamentId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Decline'
                        )}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleAcceptInvite(inv.tournamentId)}
                        disabled={acceptingId === inv.tournamentId || decliningId === inv.tournamentId}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1 px-3 h-8 cursor-pointer"
                      >
                        {acceptingId === inv.tournamentId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Accept</span>
                      </Button>
                    </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-8">
              {[...Array(4)].map((_, i) => (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tournaments.map((t) => (
                <Card key={t.id} className="border-border bg-card/70 backdrop-blur-xs hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                        t.status === 'WAITING_FOR_PLAYERS' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        t.status === 'IN_PROGRESS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse' :
                        'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}>
                        {t.status === 'WAITING_FOR_PLAYERS' ? `Waiting (${t.participants.length}/${t.maxPlayers || 8})` :
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
                        <span className="text-foreground font-mono">{t.participants.length} / {t.maxPlayers || 8}</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${(t.participants.length / (t.maxPlayers || 8)) * 100}%` }}
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
      </div>

      {/* Create Tournament Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="border-border bg-card w-full max-w-md shadow-2xl animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Create Tournament
              </CardTitle>
              <CardDescription>
                Choose format, set a title, and invite your friends to start the bracket.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tournament Size Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground block">
                  Tournament Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMaxPlayers(4)
                      setCreateError('')
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      maxPlayers === 4
                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                        : 'border-border bg-surface text-muted-foreground hover:border-border/80 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-sm text-foreground">
                      <span>4 Players</span>
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      2 Rounds • Needs 3 Friends
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMaxPlayers(8)
                      setCreateError('')
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      maxPlayers === 8
                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                        : 'border-border bg-surface text-muted-foreground hover:border-border/80 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-sm text-foreground">
                      <span>8 Players</span>
                      <Trophy className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      3 Rounds • Needs 7 Friends
                    </p>
                  </button>
                </div>
              </div>

              {/* Friends Requirement Warning Box */}
              {friendsCount < maxPlayers - 1 ? (
                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 space-y-3">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
                      <span>{maxPlayers - 1} Friends Required to Create {maxPlayers}-Player Tournament</span>
                    </div>
                    <p className="text-xs text-rose-200/90 leading-relaxed">
                      You currently have <strong className="text-white font-mono">{friendsCount} / {maxPlayers - 1}</strong> accepted friends.
                      Creating a {maxPlayers}-player tournament requires inviting {maxPlayers - 1} of your friends to fill the bracket.
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
                <form onSubmit={handleCreateTournament} className="space-y-4 pt-1">
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
                      placeholder={`e.g. ${maxPlayers}-Player Speed Duel`}
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
                      <li>
                        Single Elimination ({maxPlayers === 4 ? 'Semifinals ➔ Finals' : 'Quarterfinals ➔ Semifinals ➔ Finals'})
                      </li>
                      <li>{maxPlayers} Players total (Creator + {maxPlayers - 1} Invited Friends)</li>
                      <li>All duels update ELO ratings automatically</li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreating || friendsCount < maxPlayers - 1}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer"
                    >
                      {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : `Create ${maxPlayers}-Player Tournament`}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
