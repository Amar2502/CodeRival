"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Globe,
  Users,
  Swords,
  Crown,
  Medal,
  Award,
  Sparkles,
  Loader2,
  CheckCircle2,
  Search,
} from "lucide-react";
import { api } from "@/lib/axios";
import { socket } from "@/lib/socket";
import { getRatingInfo } from "@/lib/rating";
import { useAuthStore } from "@/lib/authStore";
import { FriendButton } from "@/components/friends/FriendButton";
import { UserAvatar } from "@/components/UserAvatar";

interface LeaderboardUser {
  rank: number;
  id: string;
  username: string;
  name?: string;
  avatar_url?: string | null;
  avatar_id?: string | null;
  avatar?: string;
  country?: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  problemsSolved: number;
  isOnline: boolean;
  isCurrentUser?: boolean;
}

export default function LeaderboardPage() {
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"global" | "friends">("global");

  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardUser[]>([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userRankInfo, setUserRankInfo] = useState<{ rank: number; rating: number } | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      if (activeTab === "global") {
        const res = await api.get("/leaderboard/global");
        setGlobalLeaderboard(res.data.leaderboard || []);
        setUserRankInfo(res.data.currentUserRank || null);
        setTotalPlayers(res.data.totalPlayers || 0);
      } else {
        const res = await api.get("/leaderboard/friends");
        setFriendsLeaderboard(res.data.leaderboard || []);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChallenge = (targetUserId: string) => {
    socket.emit("friend:challenge_send", { targetUserId });
  };

  const currentList = activeTab === "global" ? globalLeaderboard : friendsLeaderboard;
  const top3 = currentList.slice(0, 3);
  const restList = currentList.slice(3);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Page Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-card via-surface to-card border border-border shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Trophy className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-foreground">
                Competitive Leaderboard
              </h1>
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              Powered by Redis sorted sets for real-time ELO rankings and instant standings updates.
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-surface border border-border">
            <Button
              variant={activeTab === "global" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("global")}
              className="gap-2 font-bold text-sm h-10 px-5"
            >
              <Globe className="w-4 h-4 text-primary" />
              <span>Global Top 50</span>
            </Button>
            <Button
              variant={activeTab === "friends" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("friends")}
              className="gap-2 font-bold text-sm h-10 px-5"
            >
              <Users className="w-4 h-4 text-accent" />
              <span>Friends Standing</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <span className="text-sm font-mono">Fetching Redis Leaderboard...</span>
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-16 p-8 rounded-2xl bg-card border border-border space-y-3">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-bold text-foreground">No Standings Found</h3>
            <p className="text-xs text-muted-foreground font-mono">
              {activeTab === "friends"
                ? "Add friends to see how you rank among your friends list!"
                : "No active player ratings registered yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top 3 Podium Display */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                {/* 2nd Place (Silver) */}
                {top3[1] && (
                  <div className="md:order-1 p-6 rounded-2xl bg-card border-2 border-slate-400/40 shadow-xl flex flex-col items-center text-center relative overflow-hidden space-y-3">
                    <div className="absolute top-3 right-3 text-slate-400 font-black text-2xl">
                      #2
                    </div>
                    <div className="relative">
                      <UserAvatar
                        src={top3[1].avatar_url || top3[1].avatar}
                        username={top3[1].username}
                        name={top3[1].name}
                        size="xl"
                      />
                      <Medal className="w-6 h-6 text-slate-400 absolute -bottom-2 -right-1" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-base">
                        {top3[1].name || top3[1].username}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        @{top3[1].username}
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-surface border border-border text-xs font-bold text-slate-300">
                      {top3[1].rating} ELO
                    </div>
                  </div>
                )}

                {/* 1st Place (Gold / Crown) */}
                {top3[0] && (
                  <div className="md:order-2 p-6 rounded-2xl bg-gradient-to-b from-amber-500/20 via-card to-card border-2 border-amber-400 shadow-2xl flex flex-col items-center text-center relative overflow-hidden space-y-3 md:-translate-y-3">
                    <div className="absolute top-3 right-3 text-amber-400 font-black text-3xl">
                      #1
                    </div>
                    <div className="relative">
                      <UserAvatar
                        src={top3[0].avatar_url || top3[0].avatar}
                        username={top3[0].username}
                        name={top3[0].name}
                        size="2xl"
                      />
                      <Crown className="w-7 h-7 text-amber-400 absolute -top-3 left-1/2 -translate-x-1/2" />
                    </div>
                    <div>
                      <div className="font-extrabold text-foreground text-lg flex items-center gap-1.5 justify-center">
                        <span>{top3[0].name || top3[0].username}</span>
                        <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        @{top3[0].username}
                      </div>
                    </div>
                    <div className="px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/40 text-sm font-extrabold text-amber-400">
                      {top3[0].rating} ELO
                    </div>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {top3[2] && (
                  <div className="md:order-3 p-6 rounded-2xl bg-card border-2 border-amber-700/40 shadow-xl flex flex-col items-center text-center relative overflow-hidden space-y-3">
                    <div className="absolute top-3 right-3 text-amber-700 font-black text-2xl">
                      #3
                    </div>
                    <div className="relative">
                      <UserAvatar
                        src={top3[2].avatar_url || top3[2].avatar}
                        username={top3[2].username}
                        name={top3[2].name}
                        size="xl"
                      />
                      <Award className="w-6 h-6 text-amber-700 absolute -bottom-2 -right-1" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-base">
                        {top3[2].name || top3[2].username}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        @{top3[2].username}
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-surface border border-border text-xs font-bold text-amber-600">
                      {top3[2].rating} ELO
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Standings Table */}
            <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xl">
              <div className="p-4 bg-surface border-b border-border font-mono text-xs text-muted-foreground flex items-center justify-between">
                <span>Leaderboard Standings</span>
                {activeTab === "global" && (
                  <span>Total Registered Players: {totalPlayers}</span>
                )}
              </div>

              <div className="divide-y divide-border">
                {currentList.map((player) => {
                  const ratingInfo = getRatingInfo(player.rating);
                  const isMe = player.id === currentUser?.id;
                  return (
                    <div
                      key={player.id}
                      className={`p-4 flex items-center justify-between transition-colors ${
                        isMe
                          ? "bg-primary/10 border-l-4 border-l-primary"
                          : "hover:bg-surface/50"
                      }`}
                    >
                      {/* Rank & User Info */}
                      <div className="flex items-center gap-4">
                        <div className="w-8 text-center font-black font-mono text-sm">
                          {player.rank === 1 ? (
                            <span className="text-amber-400">#1</span>
                          ) : player.rank === 2 ? (
                            <span className="text-slate-300">#2</span>
                          ) : player.rank === 3 ? (
                            <span className="text-amber-600">#3</span>
                          ) : (
                            <span className="text-muted-foreground">#{player.rank}</span>
                          )}
                        </div>

                        <div className="relative">
                          <UserAvatar
                            src={player.avatar_url || player.avatar}
                            username={player.username}
                            name={player.name}
                            size="md"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
                              player.isOnline ? "bg-emerald-500" : "bg-gray-500"
                            }`}
                          />
                        </div>

                        <div>
                          <div className="font-bold text-foreground text-sm flex items-center gap-2">
                            <span>{player.name || player.username}</span>
                            {isMe && (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-primary/20 text-primary font-bold border border-primary/30">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            @{player.username}
                          </div>
                        </div>
                      </div>

                      {/* Right side stats & action */}
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className={`font-extrabold text-sm ${ratingInfo.colorClass}`}>
                            {player.rating} ELO
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {player.wins}W / {player.losses}L
                          </div>
                        </div>

                        {!isMe && (
                          <div className="hidden sm:block">
                            {activeTab === "friends" ? (
                              <Button
                                size="sm"
                                disabled={!player.isOnline}
                                onClick={() => handleChallenge(player.id)}
                                className={`gap-1.5 text-xs font-semibold h-8 ${
                                  player.isOnline
                                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                    : "bg-surface text-muted-foreground border border-border"
                                }`}
                              >
                                <Swords className="w-3.5 h-3.5" />
                                <span>{player.isOnline ? "Challenge" : "Offline"}</span>
                              </Button>
                            ) : (
                              <FriendButton targetUserId={player.id} targetUsername={player.username} size="xs" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
