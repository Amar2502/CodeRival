"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  TrendingUp,
  UserPlus,
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

interface FriendItem {
  friendshipId: string;
  user: {
    id: string;
    username: string;
    name?: string;
    avatar_url?: string | null;
    avatar?: string;
    rating: number;
    isOnline: boolean;
  };
}

interface RatingPoint {
  id?: string;
  rating: number;
  createdAt: string;
  matchId?: string | null;
}

interface UserProfileData {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar_url?: string | null;
  avatar_id?: string | null;
  avatar?: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed: number;
  problemsSolved: number;
}

export default function LeaderboardPage() {
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"global" | "friends">("global");

  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardUser[]>([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<string>("2nd");
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Pagination & Infinite Scroll state
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchLeaderboard(1, true);
  }, [activeTab]);

  const fetchLeaderboard = async (targetPage: number = 1, isReset: boolean = false) => {
    if (isReset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const endpoint = activeTab === "global" 
        ? `/leaderboard/global?page=${targetPage}&limit=20` 
        : `/leaderboard/friends?page=${targetPage}&limit=20`;
      const res = await api.get(endpoint);
      const newItems: LeaderboardUser[] = res.data.leaderboard || [];

      if (activeTab === "global") {
        setGlobalLeaderboard((prev) => (isReset ? newItems : [...prev, ...newItems]));
        if (res.data.currentUserRank) {
          const r = typeof res.data.currentUserRank === "object" ? res.data.currentUserRank.rank : res.data.currentUserRank;
          const s = ["th", "st", "nd", "rd"];
          const v = r % 100;
          setUserRank(`${r}${s[(v - 20) % 10] || s[v] || s[0]}`);
        }
        setTotalPlayers(res.data.totalPlayers || 0);
        setHasMore(Boolean(res.data.hasMore));
      } else {
        setFriendsLeaderboard((prev) => (isReset ? newItems : [...prev, ...newItems]));
        setHasMore(Boolean(res.data.hasMore));
      }
      setPage(targetPage);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreLeaderboard = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    fetchLeaderboard(page + 1, false);
  }, [loading, loadingMore, hasMore, page, activeTab]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreLeaderboard();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.unobserve(target);
  }, [loadMoreLeaderboard, hasMore, loadingMore, loading]);

  const handleChallenge = (targetUserId: string) => {
    socket.emit("friend:challenge_send", { targetUserId });
  };

  const currentList = activeTab === "global" ? globalLeaderboard : friendsLeaderboard;
  const top3 = currentList.slice(0, 3);

  return (
    <>
      {/* Page Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-lg relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Competitive Leaderboard
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono max-w-xl">
            Real-time ELO standings & standings powered by Redis sorted sets.
          </p>
        </div>

        {/* Toggle Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-surface border border-border z-10">
          <Button
            variant={activeTab === "global" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("global")}
            className="gap-2 font-bold text-xs sm:text-sm h-9 px-4 rounded-lg"
          >
            <Globe className="w-4 h-4 text-primary" />
            <span>Global Top 50</span>
          </Button>
          <Button
            variant={activeTab === "friends" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("friends")}
            className="gap-2 font-bold text-xs sm:text-sm h-9 px-4 rounded-lg"
          >
            <Users className="w-4 h-4 text-accent" />
            <span>Friends Standing</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground bg-card border border-border rounded-2xl">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <span className="text-xs font-mono">Fetching Redis Leaderboard...</span>
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
        <>
          {/* TOP 3 PODIUM CARDS (Only on Page 1) */}
          {page === 1 && top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* RANK 2 - SILVER (Placed on Left) */}
              {top3[1] && (
                <div className="p-6 rounded-2xl bg-card border border-border shadow-lg flex flex-col items-center text-center relative overflow-hidden order-2 md:order-1 mt-0 md:mt-4">
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-400/20 text-gray-300 border border-gray-400/30 flex items-center gap-1">
                    <Medal className="w-3 h-3 text-gray-300" /> #{top3[1].rank} RANK
                  </div>

                  <UserAvatar
                    src={top3[1].avatar_url || top3[1].avatar}
                    username={top3[1].username}
                    name={top3[1].name}
                    size="lg"
                    className="border-2 border-gray-400 shadow-md my-2"
                  />

                  <div className="space-y-1 mt-2">
                    <h3 className="font-bold text-base text-foreground truncate max-w-[180px]">
                      {top3[1].name || top3[1].username}
                    </h3>
                    <div className="text-xs text-muted-foreground font-mono">@{top3[1].username}</div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/60 w-full flex items-center justify-around text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Rating</div>
                      <div className="font-black text-gray-300 text-sm">{top3[1].rating} ELO</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">W/L</div>
                      <div className="font-bold text-foreground">{top3[1].wins}/{top3[1].losses}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* RANK 1 - GOLD (Placed Center & Highlighted) */}
              {top3[0] && (
                <div className="p-6 sm:p-7 rounded-2xl bg-card border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10 flex flex-col items-center text-center relative overflow-hidden order-1 md:order-2">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                    <Crown className="w-3 h-3 text-amber-400" /> #{top3[0].rank === 1 ? '1 CHAMPION' : `${top3[0].rank} RANK`}
                  </div>

                  <UserAvatar
                    src={top3[0].avatar_url || top3[0].avatar}
                    username={top3[0].username}
                    name={top3[0].name}
                    size="lg"
                    className="border-4 border-amber-400 shadow-xl my-2"
                  />

                  <div className="space-y-1 mt-2">
                    <h3 className="font-extrabold text-lg text-foreground truncate max-w-[200px] flex items-center gap-1.5 justify-center">
                      <span>{top3[0].name || top3[0].username}</span>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </h3>
                    <div className="text-xs text-muted-foreground font-mono">@{top3[0].username}</div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-amber-500/20 w-full flex items-center justify-around text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-amber-400/80 uppercase font-semibold">Rating</div>
                      <div className="font-black text-amber-400 text-base">{top3[0].rating} ELO</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Solves</div>
                      <div className="font-bold text-foreground">{top3[0].problemsSolved}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* RANK 3 - BRONZE (Placed on Right) */}
              {top3[2] && (
                <div className="p-6 rounded-2xl bg-card border border-border shadow-lg flex flex-col items-center text-center relative overflow-hidden order-3 mt-0 md:mt-6">
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-700/20 text-amber-600 border border-amber-700/30 flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-600" /> #{top3[2].rank} RANK
                  </div>

                  <UserAvatar
                    src={top3[2].avatar_url || top3[2].avatar}
                    username={top3[2].username}
                    name={top3[2].name}
                    size="lg"
                    className="border-2 border-amber-700 shadow-md my-2"
                  />

                  <div className="space-y-1 mt-2">
                    <h3 className="font-bold text-base text-foreground truncate max-w-[180px]">
                      {top3[2].name || top3[2].username}
                    </h3>
                    <div className="text-xs text-muted-foreground font-mono">@{top3[2].username}</div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/60 w-full flex items-center justify-around text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Rating</div>
                      <div className="font-black text-amber-600 text-sm">{top3[2].rating} ELO</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">W/L</div>
                      <div className="font-bold text-foreground">{top3[2].wins}/{top3[2].losses}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FULL LEADERBOARD TABLE */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <Swords className="w-4 h-4 text-primary" />
                <span>Leaderboard Roster ({currentList.length})</span>
              </h2>
              <span className="text-xs text-muted-foreground font-mono">
                Showing top contenders
              </span>
            </div>

            <div className="space-y-2">
              {currentList.map((player) => {
                const isMe = player.id === currentUser?.id;
                const ratingInfo = getRatingInfo(player.rating);

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                      isMe
                        ? "bg-primary/10 border-primary/40 shadow-xs"
                        : "bg-card border-border hover:border-border-muted"
                    }`}
                  >
                    {/* Rank & User Details */}
                    <Link href={`/${player.username}`} className="flex items-center gap-3.5 min-w-0 group hover:opacity-80 transition-opacity">
                      <div className="w-7 text-center font-mono font-extrabold text-xs text-muted-foreground shrink-0">
                        {player.rank === 1 ? (
                          <span className="text-amber-400">#1</span>
                        ) : player.rank === 2 ? (
                          <span className="text-gray-300">#2</span>
                        ) : player.rank === 3 ? (
                          <span className="text-amber-600">#3</span>
                        ) : (
                          `#${player.rank}`
                        )}
                      </div>

                      <div className="relative shrink-0">
                        <UserAvatar
                          src={player.avatar_url || player.avatar}
                          username={player.username}
                          name={player.name}
                          size="sm"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-card ${
                            player.isOnline ? "bg-emerald-500" : "bg-gray-500"
                          }`}
                        />
                      </div>

                      <div className="truncate">
                        <div className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2 truncate group-hover:underline">
                          <span className="truncate">{player.name || player.username}</span>
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded bg-primary/20 text-primary text-[10px] font-mono font-extrabold uppercase">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate">
                          @{player.username}
                        </div>
                      </div>
                    </Link>

                    {/* Stats & Actions */}
                    <div className="flex items-center gap-4 shrink-0 ml-2">
                      <div className="hidden sm:block text-right font-mono text-[11px] text-muted-foreground">
                        <div>{player.problemsSolved} Solved</div>
                        <div>{player.wins}W / {player.losses}L</div>
                      </div>

                      <div className={`text-xs sm:text-sm font-black w-20 text-right ${ratingInfo.colorClass}`}>
                        {player.rating} ELO
                      </div>

                      {!isMe && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!player.isOnline}
                          onClick={() => handleChallenge(player.id)}
                          className="h-8 px-2.5 rounded-xl text-xs font-bold border-border bg-surface hover:bg-surface-2 text-foreground shrink-0 btn-interactive"
                        >
                          Challenge
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && !loading && (
              <div ref={observerTarget} className="py-4 text-center text-xs text-muted-foreground font-mono flex items-center justify-center gap-2">
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Loading more contenders...</span>
                  </>
                ) : (
                  <span>Scroll down to load more contenders</span>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
