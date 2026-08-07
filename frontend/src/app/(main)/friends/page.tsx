"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  UserPlus,
  Search,
  Swords,
  Check,
  X,
  Clock,
  Trash2,
  Loader2,
  TrendingUp,
  Flame,
  Zap,
} from "lucide-react";
import { api } from "@/lib/axios";
import { socket } from "@/lib/socket";
import { getRatingInfo } from "@/lib/rating";
import { FriendButton } from "@/components/friends/FriendButton";
import { useAuthStore } from "@/lib/authStore";
import { UserAvatar } from "@/components/UserAvatar";

interface FriendUser {
  id: string;
  username: string;
  name?: string;
  avatar_url?: string | null;
  avatar_id?: string | null;
  avatar?: string;
  rating: number;
  wins?: number;
  losses?: number;
  isOnline: boolean;
}

interface FriendItem {
  friendshipId: string;
  user: FriendUser;
  since: string;
}

interface IncomingRequest {
  id: string;
  sender: FriendUser;
  createdAt: string;
}

interface OutgoingRequest {
  id: string;
  receiver: FriendUser;
  createdAt: string;
}

interface SearchUserResult extends FriendUser {
  relationshipStatus: "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED";
}

interface RatingPoint {
  id?: string;
  rating: number;
  createdAt: string;
  matchId?: string | null;
}

export default function FriendsPage() {
  const { user: currentUser, setUser } = useAuthStore();

  // Data states
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [ratingHistory, setRatingHistory] = useState<RatingPoint[]>([]);
  const [userRank, setUserRank] = useState<string>("2nd");
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<"all" | "online">("all");
  const [showOutgoing, setShowOutgoing] = useState<boolean>(false);
  const [hoveredPtIndex, setHoveredPtIndex] = useState<number | null>(null);

  // Fetch friends, requests, profile & rating history
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch friends & requests
      const res = await api.get("/friends");
      setFriends(res.data.friends || []);
      setIncoming(res.data.incomingRequests || []);
      setOutgoing(res.data.outgoingRequests || []);

      // 2. Fetch rating history & user profile
      try {
        const profileRes = await api.get("/user/profile/me");
        if (profileRes.data?.user) {
          setUser(profileRes.data.user);
        }
        if (profileRes.data?.ratingHistory) {
          setRatingHistory(profileRes.data.ratingHistory);
        }
      } catch (e) {
        console.error("Failed to fetch profile history:", e);
      }

      // 3. Fetch global rank
      try {
        const rankRes = await api.get("/leaderboard/global?limit=50");
        if (rankRes.data?.currentUserRank) {
          const r = rankRes.data.currentUserRank;
          if (r === 1) setUserRank("1st");
          else if (r === 2) setUserRank("2nd");
          else if (r === 3) setUserRank("3rd");
          else setUserRank(`${r}th`);
        }
      } catch (e) {
        console.error("Failed to fetch rank:", e);
      }

    } catch (err) {
      console.error("Failed to fetch friends:", err);
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    fetchData();

    const handleUpdate = () => {
      fetchData();
    };

    socket.on("friend:request_received", handleUpdate);
    socket.on("friend:request_sent", handleUpdate);
    socket.on("friend:request_accepted", handleUpdate);
    socket.on("friend:request_declined", handleUpdate);
    socket.on("friend:removed", handleUpdate);

    return () => {
      socket.off("friend:request_received", handleUpdate);
      socket.off("friend:request_sent", handleUpdate);
      socket.off("friend:request_accepted", handleUpdate);
      socket.off("friend:request_declined", handleUpdate);
      socket.off("friend:removed", handleUpdate);
    };
  }, [fetchData]);

  // Handle user directory search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const res = await api.get(`/friends/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(res.data.results || []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAccept = async (requestId: string) => {
    try {
      await api.post("/friends/accept", { requestId });
      fetchData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("friend_request_updated"));
      }
    } catch (err) {
      console.error("Failed to accept request:", err);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await api.post("/friends/decline", { requestId });
      fetchData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("friend_request_updated"));
      }
    } catch (err) {
      console.error("Failed to decline request:", err);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm("Are you sure you want to remove this friend?")) return;
    try {
      await api.post("/friends/remove", { friendId });
      fetchData();
    } catch (err) {
      console.error("Failed to remove friend:", err);
    }
  };

  const handleChallenge = (targetUserId: string) => {
    socket.emit("friend:challenge_send", { targetUserId });
  };

  const onlineFriends = useMemo(() => friends.filter((f) => f.user.isOnline), [friends]);

  const filteredFriends = useMemo(() => {
    let list = filterMode === "online" ? onlineFriends : friends;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (f) =>
          f.user.username.toLowerCase().includes(q) ||
          (f.user.name && f.user.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [friends, onlineFriends, filterMode, searchQuery]);

  const displayFriends = useMemo(() => {
    return friends.slice(0, 3);
  }, [friends]);

  // Stats calculation
  const userRating = currentUser?.rating || 1215;
  const wins = currentUser?.wins || 0;
  const losses = currentUser?.losses || 0;
  const totalMatches = currentUser?.matchesPlayed || (wins + losses > 0 ? wins + losses : 6);
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 50;

  // SVG Rating Chart points generator
  const chartPoints = useMemo(() => {
    const data = ratingHistory.length >= 2 ? ratingHistory : [
      { rating: 1000 },
      { rating: 1080 },
      { rating: 1150 },
      { rating: 1110 },
      { rating: 1240 },
      { rating: 1215 }
    ];

    const rawMin = Math.min(...data.map(d => d.rating));
    const rawMax = Math.max(...data.map(d => d.rating));
    
    const yMin = Math.max(0, Math.floor((rawMin - 30) / 50) * 50);
    const yMax = Math.ceil((rawMax + 30) / 50) * 50;
    const range = Math.max(1, yMax - yMin);

    const width = 240;
    const height = 110;

    const pts = data.map((d, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((d.rating - yMin) / range) * (height - 20) - 10;
      return { x, y, rating: d.rating };
    });

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const mx = (curr.x + next.x) / 2;
      path += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`;
    }

    const areaPath = `${path} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`;

    return { path, areaPath, pts, width, height, yMin, yMax };
  }, [ratingHistory]);

  return (
    <>
      {/* Page Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-lg relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Friends & Rivals
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono max-w-xl">
            Connect with fellow competitive coders, track who is online, and challenge your rivals to live 1v1 duels.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 flex-wrap sm:flex-nowrap">
          {/* Total Friends */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/80 border border-border/80 text-left min-w-[130px] flex-1 sm:flex-none shadow-xs">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-semibold">Total</div>
              <div className="text-lg font-black text-foreground">{friends.length}</div>
            </div>
          </div>

          {/* Online Now */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/80 border border-border/80 text-left min-w-[130px] flex-1 sm:flex-none shadow-xs">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 relative">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1 right-1 animate-pulse" />
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-semibold">Online</div>
              <div className="text-lg font-black text-emerald-400">{onlineFriends.length}</div>
            </div>
          </div>

          {/* Pending Requests */}
          {incoming.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left min-w-[140px] flex-1 sm:flex-none animate-pulse shadow-xs">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-amber-400/90 font-mono uppercase tracking-wider font-bold">Requests</div>
                <div className="text-lg font-black text-amber-400">{incoming.length}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global User Directory Search Bar */}
      <div className="relative space-y-4">
        <form onSubmit={handleSearch} className="relative w-full">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search user directory by handle or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 pr-10 bg-card border-border text-foreground font-mono h-11 rounded-xl text-xs shadow-xs focus:border-accent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Inline Search Directory Results */}
        {searchQuery.trim().length > 0 && (
          <div className="p-4 sm:p-6 rounded-2xl bg-card border border-primary/30 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <span>User Directory Search Results</span>
              </h3>
              <span className="text-xs text-muted-foreground font-mono">
                {searching ? "Searching..." : `${searchResults.length} user(s) found`}
              </span>
            </div>

            {searching ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-xs font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Searching CodeRival directory...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground font-mono">
                No coders found matching &quot;{searchQuery}&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.map((user) => {
                  const ratingInfo = getRatingInfo(user.rating);
                  return (
                    <div
                      key={user.id}
                      className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <UserAvatar
                            src={user.avatar_url || user.avatar}
                            username={user.username}
                            name={user.name}
                            size="md"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface ${
                              user.isOnline ? "bg-emerald-500" : "bg-gray-500"
                            }`}
                          />
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-xs sm:text-sm">
                            {user.name || user.username}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            @{user.username}
                          </div>
                          <div className={`text-[11px] font-semibold ${ratingInfo.colorClass}`}>
                            {user.rating} ELO
                          </div>
                        </div>
                      </div>

                      <FriendButton
                        targetUserId={user.id}
                        targetUsername={user.username}
                        initialStatus={user.relationshipStatus}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── INCOMING FRIEND REQUESTS SECTION ─── */}
      {incoming.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-amber-500/5 border border-amber-500/30 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-sm text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-spin-slow" />
              <span>Pending Friend Requests</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black">
                {incoming.length}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {incoming.map(({ id, sender }) => {
              const ratingInfo = getRatingInfo(sender.rating);
              return (
                <div
                  key={id}
                  className="p-3.5 rounded-xl bg-card border border-amber-500/20 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={sender.avatar_url || sender.avatar}
                      username={sender.username}
                      name={sender.name}
                      size="md"
                    />
                    <div>
                      <div className="font-bold text-foreground text-xs">
                        {sender.name || sender.username}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        @{sender.username}
                      </div>
                      <div className={`text-[11px] font-semibold ${ratingInfo.colorClass}`}>
                        {sender.rating} ELO
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(id)}
                      className="h-7 px-2 text-xs border-border hover:bg-rose-500/10 hover:text-rose-400"
                      title="Decline"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(id)}
                      className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── OUTGOING SENT REQUESTS COLLAPSIBLE ─── */}
      {outgoing.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowOutgoing(!showOutgoing)}
            className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-2"
          >
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Sent Pending Requests ({outgoing.length}) {showOutgoing ? "▲ Hide" : "▼ Show"}</span>
          </button>

          {showOutgoing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {outgoing.map(({ id, receiver }) => (
                <div
                  key={id}
                  className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={receiver.avatar_url || receiver.avatar}
                      username={receiver.username}
                      name={receiver.name}
                      size="sm"
                    />
                    <div>
                      <div className="font-bold text-foreground text-xs">
                        {receiver.name || receiver.username}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        @{receiver.username}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecline(id)}
                    className="h-7 text-[11px] text-muted-foreground hover:text-rose-400 border-border"
                  >
                    Cancel Request
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MY FRIENDS LIST SECTION ─── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-base sm:text-lg text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span>My Friends ({friends.length})</span>
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filterMode === "all" ? "secondary" : "ghost"}
              onClick={() => setFilterMode("all")}
              className="text-xs h-8 font-semibold"
            >
              All Friends ({friends.length})
            </Button>
            <Button
              size="sm"
              variant={filterMode === "online" ? "secondary" : "ghost"}
              onClick={() => setFilterMode("online")}
              className="text-xs h-8 font-semibold gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Online ({onlineFriends.length})
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground font-mono text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Loading friends directory...</span>
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="text-center py-14 p-6 rounded-2xl bg-card border border-border space-y-3">
            <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mx-auto text-muted-foreground">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {filterMode === "online" ? "No Friends Online Right Now" : "No Friends Found"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto font-mono">
                {filterMode === "online"
                  ? "Check back later or invite your friends to get online for a duel!"
                  : "Use the search bar above to find coders by handle and build your rival roster."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredFriends.map(({ friendshipId, user: friendUser }) => {
              const ratingInfo = getRatingInfo(friendUser.rating);
              return (
                <div
                  key={friendshipId}
                  className="p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all flex flex-col justify-between gap-4 group shadow-xs hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <UserAvatar
                          src={friendUser.avatar_url || friendUser.avatar}
                          username={friendUser.username}
                          name={friendUser.name}
                          size="md"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
                            friendUser.isOnline
                              ? "bg-emerald-500 shadow-xs shadow-emerald-500"
                              : "bg-gray-500"
                          }`}
                          title={friendUser.isOnline ? "Online" : "Offline"}
                        />
                      </div>

                      <div>
                        <div className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-1.5">
                          <span>{friendUser.name || friendUser.username}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          @{friendUser.username}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs font-bold ${ratingInfo.colorClass}`}>
                            {friendUser.rating} ELO
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ({friendUser.wins || 0}W / {friendUser.losses || 0}L)
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFriend(friendUser.id)}
                      title="Remove Friend"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Challenge Action Button */}
                  <Button
                    disabled={!friendUser.isOnline}
                    onClick={() => handleChallenge(friendUser.id)}
                    className={`w-full font-bold gap-2 h-8 text-xs rounded-xl ${
                      friendUser.isOnline
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                        : "bg-surface text-muted-foreground border border-border"
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>{friendUser.isOnline ? "Challenge to Duel" : "Offline"}</span>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
