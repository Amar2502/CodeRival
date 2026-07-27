'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Trophy,
  Users,
  UserPlus,
  Zap,
  CheckCircle2,
  Swords,
  Loader2,
  Clock,
  Sparkles,
  ArrowLeft,
  Eye,
  Check,
  Crown,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { api } from '@/lib/axios'
import { socket } from '@/lib/socket'
import { useAuthStore } from '@/lib/authStore'
import { UserAvatar } from '@/components/UserAvatar'

interface Player {
  id: string
  username: string
  name?: string
  avatar_url?: string
  rating: number
}

interface TournamentMatch {
  id: string
  round: 'QUARTERFINALS' | 'SEMIFINALS' | 'FINALS'
  matchIndex: number
  player1Id?: string
  player1?: Player
  player2Id?: string
  player2?: Player
  winnerId?: string
  winner?: Player
  matchId?: string
}

interface TournamentDetail {
  id: string
  title: string
  status: 'WAITING_FOR_PLAYERS' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'
  creatorId: string
  creator: Player
  winnerId?: string
  winner?: Player
  createdAt: string
  participants: Array<{
    id: string
    userId: string
    seed: number
    user: Player
  }>
  matches: TournamentMatch[]
}

interface FriendItem {
  id: string;
  username: string;
  name?: string;
  avatar_url?: string;
  rating?: number;
}

export default function TournamentBracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = use(params)
  const router = useRouter()
  const { user } = useAuthStore()

  const [tournament, setTournament] = useState<TournamentDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Invite Modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [friendsList, setFriendsList] = useState<FriendItem[]>([])
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([])
  const [isInviting, setIsInviting] = useState(false)

  // Cancel Tournament Modal state
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    fetchTournament()

    if (!socket.connected) {
      socket.connect()
    }

    socket.emit('tournament:join_room', { tournamentId })

    const onUpdate = (data: TournamentDetail) => {
      setTournament(data)
    }

    socket.on('tournament:updated', onUpdate)
    socket.on('tournament:started', onUpdate)
    socket.on('tournament:bracket_updated', onUpdate)
    socket.on('tournament:finished', onUpdate)
    socket.on('tournament:cancelled', onUpdate)

    const onMatchReady = (data: { tournamentId: string; matchId?: string }) => {
      if (data.tournamentId === tournamentId) {
        fetchTournament()
      }
    }

    socket.on('tournament:match_ready', onMatchReady)

    return () => {
      socket.emit('tournament:leave_room', { tournamentId })
      socket.off('tournament:updated', onUpdate)
      socket.off('tournament:started', onUpdate)
      socket.off('tournament:bracket_updated', onUpdate)
      socket.off('tournament:finished', onUpdate)
      socket.off('tournament:cancelled', onUpdate)
      socket.off('tournament:match_ready', onMatchReady)
    }
  }, [tournamentId])

  const fetchTournament = async () => {
    setIsLoading(true)
    try {
      const res = await api.get(`/tournament/${tournamentId}`)
      setTournament(res.data?.tournament || null)
    } catch (err) {
      console.error('Failed to fetch tournament:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFriends = async () => {
    try {
      const res = await api.get('/friends/list')
      const friends = res.data?.friends || []
      const participantIds = new Set(tournament?.participants.map((p) => p.userId))
      setFriendsList(friends.filter((f: FriendItem) => !participantIds.has(f.id)))
    } catch (err) {
      console.error('Failed to fetch friends list:', err)
    }
  }

  const handleOpenInviteModal = () => {
    fetchFriends()
    setIsInviteOpen(true)
  }

  const toggleFriendSelect = (friendId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    )
  }

  const handleSendInvites = async () => {
    if (selectedFriendIds.length === 0) return
    setIsInviting(true)
    try {
      await api.post(`/tournament/${tournamentId}/invite`, {
        friendUserIds: selectedFriendIds,
      })
      setIsInviteOpen(false)
      setSelectedFriendIds([])
      fetchTournament()
    } catch (err) {
      console.error('Failed to send invites:', err)
    } finally {
      setIsInviting(false)
    }
  }

  const handleCancelTournament = async () => {
    setIsCancelling(true)
    try {
      await api.post(`/tournament/${tournamentId}/cancel`)
      setIsCancelConfirmOpen(false)
      fetchTournament()
    } catch (err) {
      console.error('Failed to cancel tournament:', err)
    } finally {
      setIsCancelling(false)
    }
  }

  const getMatchByRoundAndIndex = (round: string, index: number) => {
    return tournament?.matches.find((m) => m.round === round && m.matchIndex === index)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-mono text-muted-foreground">Loading Tournament Bracket...</p>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Trophy className="w-12 h-12 text-rose-500" />
          <h2 className="text-xl font-bold text-foreground">Tournament Not Found</h2>
          <Button onClick={() => router.push('/tournaments')}>Back to Tournaments</Button>
        </div>
      </div>
    )
  }

  const isCreator = user?.id === tournament.creatorId
  const qfMatches = [0, 1, 2, 3].map((i) => getMatchByRoundAndIndex('QUARTERFINALS', i))
  const sfMatches = [0, 1].map((i) => getMatchByRoundAndIndex('SEMIFINALS', i))
  const finalMatch = getMatchByRoundAndIndex('FINALS', 0)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      <Header />

      {/* Workspace Sub-Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-md px-4 py-3 sticky top-14 z-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/tournaments" className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">{tournament.title}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  tournament.status === 'WAITING_FOR_PLAYERS' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  tournament.status === 'IN_PROGRESS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse' :
                  tournament.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                  'bg-purple-500/10 text-purple-400 border-purple-500/20'
                }`}>
                  {tournament.status === 'WAITING_FOR_PLAYERS' ? `Waiting (${tournament.participants.length}/8)` :
                   tournament.status === 'IN_PROGRESS' ? 'In Progress' :
                   tournament.status === 'CANCELLED' ? 'Cancelled' : 'Completed'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Organized by @{tournament.creator.username} • 8-Player Single Elimination</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {tournament.status === 'WAITING_FOR_PLAYERS' && (
              <Button
                size="sm"
                onClick={handleOpenInviteModal}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 shadow-md"
              >
                <UserPlus className="w-4 h-4" />
                Invite Friends ({tournament.participants.length}/8)
              </Button>
            )}

            {/* Creator Cancel / End Tournament Button */}
            {isCreator && (tournament.status === 'WAITING_FOR_PLAYERS' || tournament.status === 'IN_PROGRESS') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCancelConfirmOpen(true)}
                className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-bold text-xs gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Cancel Tournament
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Bracket Canvas */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full overflow-x-auto">
        {/* Cancelled Alert Banner */}
        {tournament.status === 'CANCELLED' && (
          <div className="mb-10 p-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-center space-y-2 animate-fade-in-up">
            <div className="flex items-center justify-center gap-2 text-rose-400 font-extrabold text-base">
              <XCircle className="w-5 h-5" />
              <span>TOURNAMENT CANCELLED BY CREATOR</span>
            </div>
            <p className="text-xs text-rose-300/80">
              This tournament session was ended by @{tournament.creator.username}. You can return to the lobby to create or join another tournament.
            </p>
          </div>
        )}

        {/* Champion Winner Banner if Finished */}
        {tournament.winner && (
          <div className="mb-10 p-6 rounded-2xl border border-amber-500/40 bg-linear-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 text-center space-y-3 shadow-2xl shadow-amber-500/10 animate-fade-in-up">
            <div className="p-3 rounded-full bg-amber-500/20 w-fit mx-auto border border-amber-500/40">
              <Crown className="w-8 h-8 text-amber-400 animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-amber-400 tracking-tight">
              🏆 TOURNAMENT CHAMPION: @{tournament.winner.username}! 🏆
            </h2>
            <p className="text-xs text-amber-300/80 font-mono">
              Victorious in 3 consecutive Single Elimination rounds!
            </p>
          </div>
        )}

        {/* 8-Player Bracket Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 items-center min-w-[850px] py-4">

          {/* ─── COLUMN 1: QUARTERFINALS ─── */}
          <div className="space-y-6">
            <div className="text-center font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1.5 pb-2 border-b border-border">
              <Swords className="w-4 h-4 text-primary" /> Quarterfinals (Round 1)
            </div>

            {qfMatches.map((match, idx) => (
              <TournamentMatchCard
                key={match?.id || idx}
                match={match}
                label={`QF Match ${idx + 1}`}
                currentUserId={user?.id}
                onEnterMatch={(mId) => router.push(`/battles/${mId}`)}
              />
            ))}
          </div>

          {/* ─── COLUMN 2: SEMIFINALS ─── */}
          <div className="space-y-16">
            <div className="text-center font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1.5 pb-2 border-b border-border">
              <Zap className="w-4 h-4 text-accent" /> Semifinals (Round 2)
            </div>

            {sfMatches.map((match, idx) => (
              <TournamentMatchCard
                key={match?.id || idx}
                match={match}
                label={`Semifinal ${idx + 1}`}
                currentUserId={user?.id}
                onEnterMatch={(mId) => router.push(`/battles/${mId}`)}
              />
            ))}
          </div>

          {/* ─── COLUMN 3: FINALS & TROPHY ─── */}
          <div className="space-y-8 flex flex-col items-center">
            <div className="text-center space-y-2">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-full bg-linear-to-br from-amber-400/20 to-amber-600/10 border-2 border-amber-400/40 flex items-center justify-center shadow-xl shadow-amber-500/20">
                  <Trophy className="w-10 h-10 text-amber-400" />
                </div>
                <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black">
                  CHAMP
                </div>
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Finals (Championship)
              </div>
            </div>

            <div className="w-full">
              <TournamentMatchCard
                match={finalMatch}
                label="Championship Match"
                isFinals={true}
                currentUserId={user?.id}
                onEnterMatch={(mId) => router.push(`/battles/${mId}`)}
              />
            </div>
          </div>

        </div>
      </main>

      {/* Invite Friends Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="border-border bg-card w-full max-w-md shadow-2xl animate-fade-in-up">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Invite Friends ({tournament.participants.length}/8 Slots Filled)
              </CardTitle>
              <CardDescription>
                Select friends to invite to this 8-player bracket.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {friendsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                  <Users className="w-8 h-8 mx-auto opacity-40" />
                  <p>No eligible friends available to invite.</p>
                  <Link href="/friends" className="text-primary hover:underline font-semibold">
                    Add new friends here
                  </Link>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {friendsList.map((friend) => {
                    const isSelected = selectedFriendIds.includes(friend.id)
                    return (
                      <div
                        key={friend.id}
                        onClick={() => toggleFriendSelect(friend.id)}
                        className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-surface hover:bg-surface-2'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <UserAvatar src={friend.avatar_url} username={friend.username} size="sm" />
                          <div>
                            <p className="text-xs font-bold text-foreground">@{friend.username}</p>
                            <p className="text-[10px] text-muted-foreground">{friend.rating || 1200} ELO</p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setIsInviteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSendInvites}
                  disabled={selectedFriendIds.length === 0 || isInviting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
                >
                  {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Send Invites (${selectedFriendIds.length})`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancel Tournament Confirmation Modal */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="border-rose-500/40 bg-card w-full max-w-md shadow-2xl animate-fade-in-up">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Cancel Tournament?
              </CardTitle>
              <CardDescription>
                Are you sure you want to end this tournament? This will terminate the bracket session and notify all joined players.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 space-y-1">
                <p className="font-semibold text-rose-300">Consequences of Cancelling:</p>
                <ul className="list-disc ml-4 space-y-0.5">
                  <li>Tournament status will be set to CANCELLED.</li>
                  <li>Any active match sessions will be ended.</li>
                  <li>Joined friends will be notified in real-time.</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setIsCancelConfirmOpen(false)}>
                  Keep Tournament
                </Button>
                <Button
                  onClick={handleCancelTournament}
                  disabled={isCancelling}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs gap-1.5"
                >
                  {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> End Tournament</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function TournamentMatchCard({
  match,
  label,
  isFinals = false,
  currentUserId,
  onEnterMatch,
}: {
  match?: TournamentMatch
  label: string
  isFinals?: boolean
  currentUserId?: string
  onEnterMatch: (matchId: string) => void
}) {
  const p1 = match?.player1
  const p2 = match?.player2
  const winnerId = match?.winnerId
  const matchId = match?.matchId

  const isUserPlaying = matchId && (p1?.id === currentUserId || p2?.id === currentUserId)

  return (
    <div
      className={`rounded-xl border transition-all duration-300 overflow-hidden shadow-lg ${
        isFinals
          ? 'border-amber-500/50 bg-linear-to-b from-card via-surface to-card shadow-amber-500/10'
          : winnerId
          ? 'border-border/80 bg-card/90'
          : 'border-border bg-card'
      }`}
    >
      <div className={`px-3.5 py-1.5 text-[11px] font-bold flex items-center justify-between border-b ${
        isFinals ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-surface/60 border-border text-muted-foreground'
      }`}>
        <span>{label}</span>
        {winnerId ? (
          <span className="text-emerald-400 font-extrabold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> MATCH WON
          </span>
        ) : matchId ? (
          <span className="text-rose-400 font-mono animate-pulse flex items-center gap-1">
            <Swords className="w-3 h-3" /> LIVE DUEL
          </span>
        ) : (
          <span>Awaiting</span>
        )}
      </div>

      <div className="p-3.5 grid grid-cols-5 gap-2 items-center text-center">
        <div className="col-span-2 flex flex-col items-center space-y-1.5">
          <div className="relative">
            <UserAvatar src={p1?.avatar_url} username={p1?.username || '?'} size="md" />
            {p1 && winnerId === p1.id && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-black text-[9px] font-extrabold shadow-sm">
                WON
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-foreground truncate max-w-full">
            {p1 ? `@${p1.username}` : 'TBD'}
          </span>
          {p1 && (
            <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.2 rounded bg-surface border border-border">
              {p1.rating} ELO
            </span>
          )}
        </div>

        <div className="col-span-1 flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center font-black text-xs text-primary shadow-inner">
            VS
          </div>
        </div>

        <div className="col-span-2 flex flex-col items-center space-y-1.5">
          <div className="relative">
            <UserAvatar src={p2?.avatar_url} username={p2?.username || '?'} size="md" />
            {p2 && winnerId === p2.id && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-black text-[9px] font-extrabold shadow-sm">
                WON
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-foreground truncate max-w-full">
            {p2 ? `@${p2.username}` : 'TBD'}
          </span>
          {p2 && (
            <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.2 rounded bg-surface border border-border">
              {p2.rating} ELO
            </span>
          )}
        </div>
      </div>

      {matchId && !winnerId && (
        <div className="px-3 py-2 border-t border-border bg-surface/40">
          {isUserPlaying ? (
            <Button
              size="sm"
              onClick={() => onEnterMatch(matchId)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs h-8 gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <Swords className="w-3.5 h-3.5" /> ENTER DUEL ARENA
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEnterMatch(matchId)}
              className="w-full border-border hover:bg-surface-2 text-foreground text-xs h-8 gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-accent" /> Spectate Duel
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
