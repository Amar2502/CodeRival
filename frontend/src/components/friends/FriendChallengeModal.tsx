"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Swords, Check, X, Shield, Clock, AlertCircle } from "lucide-react";
import { getRatingInfo } from "@/lib/rating";
import { Spinner } from "@/components/ui/spinner";

interface IncomingChallenge {
  challengeId: string;
  challenger: {
    id: string;
    username: string;
    name?: string;
    avatar?: string;
    rating: number;
  };
  difficulty: string;
  expiresInMs: number;
}

interface OutgoingChallenge {
  challengeId: string;
  targetUserId: string;
}

export function FriendChallengeModal() {
  const router = useRouter();
  const [incoming, setIncoming] = useState<IncomingChallenge | null>(null);
  const [outgoing, setOutgoing] = useState<OutgoingChallenge | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [accepting, setAccepting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleChallengeReceived = (data: IncomingChallenge) => {
      setIncoming(data);
      setTimeLeft(Math.floor((data.expiresInMs || 30000) / 1000));
      setErrorMsg(null);
    };

    const handleChallengeSent = (data: OutgoingChallenge) => {
      setOutgoing(data);
      setErrorMsg(null);
    };

    const handleChallengeExpired = () => {
      setIncoming(null);
      setOutgoing(null);
      setAccepting(false);
    };

    const handleChallengeDeclined = () => {
      setOutgoing(null);
      setErrorMsg("Challenge was declined by opponent");
      setTimeout(() => setErrorMsg(null), 4000);
    };

    const handleChallengeCancelled = () => {
      setIncoming(null);
      setOutgoing(null);
      setAccepting(false);
      setErrorMsg("Challenge was cancelled by sender");
      setTimeout(() => setErrorMsg(null), 4000);
    };

    const handleChallengeError = (data: { message: string }) => {
      setAccepting(false);
      setErrorMsg(data.message || "Challenge failed");
      setTimeout(() => setErrorMsg(null), 4000);
    };

    const handleMatchStart = (data: { matchId: string }) => {
      setIncoming(null);
      setOutgoing(null);
      setAccepting(false);
      if (data.matchId) {
        router.push(`/battles/${data.matchId}`);
      }
    };

    socket.on("friend:challenge_received", handleChallengeReceived);
    socket.on("friend:challenge_sent", handleChallengeSent);
    socket.on("friend:challenge_expired", handleChallengeExpired);
    socket.on("friend:challenge_declined", handleChallengeDeclined);
    socket.on("friend:challenge_cancelled", handleChallengeCancelled);
    socket.on("friend:challenge_error", handleChallengeError);
    socket.on("match:start", handleMatchStart);
    socket.on("match:found", handleMatchStart);

    return () => {
      socket.off("friend:challenge_received", handleChallengeReceived);
      socket.off("friend:challenge_sent", handleChallengeSent);
      socket.off("friend:challenge_expired", handleChallengeExpired);
      socket.off("friend:challenge_declined", handleChallengeDeclined);
      socket.off("friend:challenge_cancelled", handleChallengeCancelled);
      socket.off("friend:challenge_error", handleChallengeError);
      socket.off("match:start", handleMatchStart);
      socket.off("match:found", handleMatchStart);
    };
  }, [router]);

  // Countdown timer for incoming challenge
  useEffect(() => {
    if (!incoming) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIncoming(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [incoming]);

  const handleAccept = () => {
    if (!incoming) return;
    setAccepting(true);
    socket.emit("friend:challenge_accept", { challengeId: incoming.challengeId });
  };

  const handleDecline = () => {
    if (!incoming) return;
    socket.emit("friend:challenge_decline", { challengeId: incoming.challengeId });
    setIncoming(null);
  };

  const handleCancelOutgoing = () => {
    if (!outgoing) return;
    socket.emit("friend:challenge_cancel", { challengeId: outgoing.challengeId });
    setOutgoing(null);
  };

  if (!incoming && !outgoing && !errorMsg) return null;

  const ratingInfo = incoming ? getRatingInfo(incoming.challenger.rating) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Incoming Challenge Modal */}
      {incoming && (
        <div className="w-full max-w-md bg-card border-2 border-primary/50 rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Top pulse accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-primary animate-pulse" />

          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto text-primary animate-bounce">
              <Swords className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              Duel Challenge Received!
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              You have been challenged to an instant 1v1 battle!
            </p>
          </div>

          {/* Challenger info card */}
          <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/20 border border-primary flex items-center justify-center font-bold text-lg text-primary">
                {incoming.challenger.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-foreground text-sm">
                  {incoming.challenger.name || incoming.challenger.username}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  @{incoming.challenger.username}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className={`text-xs font-bold ${ratingInfo?.colorClass}`}>
                {incoming.challenger.rating} ELO
              </div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase">
                {incoming.difficulty} Difficulty
              </div>
            </div>
          </div>

          {/* Countdown & Timer bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Time to respond
              </span>
              <span className="font-bold text-amber-400">{timeLeft}s</span>
            </div>
            <div className="w-full bg-surface h-2 rounded-full overflow-hidden border border-border">
              <div
                className="bg-amber-400 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / 30) * 100}%` }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={accepting}
              className="h-11 font-semibold border-border hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 gap-1.5"
            >
              <X className="w-4 h-4" /> Decline
            </Button>
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="h-11 font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-lg shadow-primary/25"
            >
              {accepting ? (
                <Spinner className="size-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Accept & Battle</span>
            </Button>
          </div>
        </div>
      )}

      {/* Outgoing Challenge Modal */}
      {outgoing && !incoming && (
        <div className="w-full max-w-sm bg-card border border-primary/40 rounded-2xl p-6 shadow-2xl text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-primary/20 border border-primary flex items-center justify-center mx-auto text-primary">
            <Spinner className="size-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-foreground">Waiting for Friend...</h3>
            <p className="text-xs text-muted-foreground font-mono">
              Challenge sent! Waiting for your friend to accept.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleCancelOutgoing}
            className="w-full border-border text-muted-foreground hover:text-foreground h-10 text-xs"
          >
            Cancel Challenge
          </Button>
        </div>
      )}

      {/* Error Toast */}
      {errorMsg && !incoming && !outgoing && (
        <div className="w-full max-w-sm bg-card border border-rose-500/40 rounded-xl p-4 shadow-xl flex items-center gap-3 text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-medium">{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
