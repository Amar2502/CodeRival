'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { socket } from '@/lib/socket'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/UserAvatar'
import { Trophy, Check, X, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface IncomingTournamentInvite {
  tournamentId: string
  tournamentTitle: string
  sender: {
    id: string
    username: string
    name?: string
    avatar_url?: string
  }
}

export function TournamentInviteModal() {
  const router = useRouter()
  const [incomingInvite, setIncomingInvite] = useState<IncomingTournamentInvite | null>(null)
  const [accepting, setAccepting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const checkPendingInvites = useCallback(async () => {
    try {
      const res = await api.get('/tournament/invites')
      const pending = res.data?.invites || []
      if (pending.length > 0) {
        const first = pending[0]
        setIncomingInvite({
          tournamentId: first.tournamentId,
          tournamentTitle: first.tournament.title,
          sender: first.tournament.creator,
        })
      }
    } catch (err) {
      // Silently fail if not authenticated or error
    }
  }, [])

  useEffect(() => {
    checkPendingInvites()

    const handleTournamentInvited = (data: IncomingTournamentInvite) => {
      setIncomingInvite(data)
      setErrorMsg(null)
    }

    const handleTournamentCancelled = (data: { id?: string; tournamentId?: string }) => {
      setIncomingInvite((prev) => {
        if (!prev) return null
        const cancelledId = data.id || data.tournamentId
        if (cancelledId === prev.tournamentId) {
          toast.error(`Tournament "${prev.tournamentTitle}" was cancelled by creator.`)
          return null
        }
        return prev
      })
    }

    socket.on('tournament:invited', handleTournamentInvited)
    socket.on('tournament:cancelled', handleTournamentCancelled)

    return () => {
      socket.off('tournament:invited', handleTournamentInvited)
      socket.off('tournament:cancelled', handleTournamentCancelled)
    }
  }, [checkPendingInvites])

  const handleAccept = async () => {
    if (!incomingInvite) return
    const targetId = incomingInvite.tournamentId
    const title = incomingInvite.tournamentTitle
    setAccepting(true)
    setErrorMsg(null)

    try {
      const res = await api.post(`/tournament/${targetId}/accept`)
      setIncomingInvite(null)
      toast.success(`Joined tournament "${title}"!`)
      if (res.data?.tournament?.id) {
        router.push(`/tournaments/${res.data.tournament.id}`)
      }
    } catch (err: any) {
      console.error('Failed to accept tournament invite:', err)
      const msg = err.response?.data?.message || 'Failed to join tournament. It may be full or cancelled.'
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(null), 4000)
    } finally {
      setAccepting(false)
    }
  }

  const handleDecline = async () => {
    if (!incomingInvite) return
    const targetId = incomingInvite.tournamentId
    setIncomingInvite(null)
    setErrorMsg(null)

    try {
      await api.post(`/tournament/${targetId}/decline`)
      // Check if there are any remaining pending invites
      await checkPendingInvites()
    } catch (err) {
      console.error('Failed to decline tournament invite:', err)
    }
  }

  if (!incomingInvite && !errorMsg) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      {incomingInvite && (
        <div className="w-full max-w-md bg-card border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Top glowing accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-primary to-amber-500 animate-pulse" />

          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-400 animate-bounce shadow-lg shadow-amber-500/20">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Tournament Invite Received
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              Bracket Championship Invite!
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              You have been invited to compete in a single elimination tournament!
            </p>
          </div>

          {/* Tournament & Sender Details */}
          <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Tournament</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                Single Elimination
              </span>
            </div>
            <div className="text-base font-extrabold text-foreground truncate">
              {incomingInvite.tournamentTitle}
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center gap-3">
              <UserAvatar
                src={incomingInvite.sender.avatar_url}
                username={incomingInvite.sender.username}
                name={incomingInvite.sender.name}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-muted-foreground font-mono">Organized & Invited by</div>
                <div className="text-sm font-bold text-foreground truncate">
                  @{incomingInvite.sender.username}
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={accepting}
              className="h-11 font-semibold border-border hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" /> Decline
            </Button>
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="h-11 font-bold bg-amber-500 hover:bg-amber-600 text-black gap-1.5 shadow-lg shadow-amber-500/25 cursor-pointer"
            >
              {accepting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Accept & Join</span>
            </Button>
          </div>
        </div>
      )}

      {/* Error Popup */}
      {errorMsg && !incomingInvite && (
        <div className="w-full max-w-sm bg-card border border-rose-500/40 rounded-xl p-4 shadow-xl flex items-center gap-3 text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-medium">{errorMsg}</span>
        </div>
      )}
    </div>
  )
}
