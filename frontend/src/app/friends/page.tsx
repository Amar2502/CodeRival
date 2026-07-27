"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  UserPlus,
  Search,
  Swords,
  Check,
  X,
  Clock,
  Trash2,
  Trophy,
  Loader2,
  Sparkles,
  UserCheck,
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

export default function FriendsPage() {
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"friends" | "search" | "pending">("friends");

  // Data states
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  // Fetch friends and requests
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/friends");
      setFriends(res.data.friends || []);
      setIncoming(res.data.incomingRequests || []);
      setOutgoing(res.data.outgoingRequests || []);
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Listen for realtime friend request updates
    const handleRequestReceived = () => fetchData();
    const handleRequestAccepted = () => fetchData();
    const handleFriendRemoved = () => fetchData();

    socket.on("friend:request_received", handleRequestReceived);
    socket.on("friend:request_accepted", handleRequestAccepted);
    socket.on("friend:removed", handleFriendRemoved);

    return () => {
      socket.off("friend:request_received", handleRequestReceived);
      socket.off("friend:request_accepted", handleRequestAccepted);
      socket.off("friend:removed", handleFriendRemoved);
    };
  }, [fetchData]);

  // Handle user search
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
    } catch (err) {
      console.error("Failed to accept request:", err);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await api.post("/friends/decline", { requestId });
      fetchData();
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

  const totalPending = incoming.length + outgoing.length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Page Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-card via-surface to-card border border-border shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-foreground">
                Friends & Rivals
              </h1>
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              Connect with fellow coders, track online status, and challenge friends to live 1v1 duels.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2.5 rounded-xl bg-surface border border-border text-center">
              <div className="text-xs text-muted-foreground font-mono">Total Friends</div>
              <div className="text-xl font-bold text-foreground">{friends.length}</div>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-surface border border-border text-center">
              <div className="text-xs text-muted-foreground font-mono">Pending Requests</div>
              <div className="text-xl font-bold text-amber-400">{incoming.length}</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "friends" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("friends")}
              className="gap-2 font-semibold text-sm h-10 px-4"
            >
              <Users className="w-4 h-4 text-primary" />
              <span>My Friends ({friends.length})</span>
            </Button>

            <Button
              variant={activeTab === "search" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("search")}
              className="gap-2 font-semibold text-sm h-10 px-4"
            >
              <UserPlus className="w-4 h-4 text-accent" />
              <span>Find Coders</span>
            </Button>

            <Button
              variant={activeTab === "pending" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("pending")}
              className="gap-2 font-semibold text-sm h-10 px-4 relative"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Requests</span>
              {incoming.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
                  {incoming.length}
                </span>
              )}
            </Button>
          </div>

          {/* Quick Search bar */}
          <form onSubmit={handleSearch} className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search username..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== "search") setActiveTab("search");
              }}
              className="pl-9 bg-surface border-border text-sm h-10"
            />
          </form>
        </div>

        {/* TAB 1: MY FRIENDS */}
        {activeTab === "friends" && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span>Loading friends list...</span>
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-16 p-8 rounded-2xl bg-card border border-border space-y-4">
                <div className="w-14 h-14 rounded-full bg-surface border border-border flex items-center justify-center mx-auto text-muted-foreground">
                  <Users className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">No Friends Added Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto font-mono">
                    Search for usernames or add opponents after duels to build your rivals list and challenge them anytime!
                  </p>
                </div>
                <Button
                  onClick={() => setActiveTab("search")}
                  className="bg-primary text-primary-foreground font-semibold gap-2"
                >
                  <Search className="w-4 h-4" /> Find Coders
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.map(({ friendshipId, user: friendUser }) => {
                  const ratingInfo = getRatingInfo(friendUser.rating);
                  return (
                    <div
                      key={friendshipId}
                      className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all flex flex-col justify-between gap-4 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {/* Avatar & Online status indicator */}
                          <div className="relative">
                            <UserAvatar
                              src={friendUser.avatar_url || friendUser.avatar}
                              username={friendUser.username}
                              name={friendUser.name}
                              size="lg"
                            />
                            <span
                              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card ${
                                friendUser.isOnline ? "bg-emerald-500 shadow-sm shadow-emerald-500" : "bg-gray-500"
                              }`}
                              title={friendUser.isOnline ? "Online" : "Offline"}
                            />
                          </div>

                          <div>
                            <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                              <span>{friendUser.name || friendUser.username}</span>
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              @{friendUser.username}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
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

                      {/* Action Button: Challenge to Duel */}
                      <Button
                        disabled={!friendUser.isOnline}
                        onClick={() => handleChallenge(friendUser.id)}
                        className={`w-full font-bold gap-2 h-9 text-xs ${
                          friendUser.isOnline
                            ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                            : "bg-surface text-muted-foreground border border-border"
                        }`}
                      >
                        <Swords className="w-4 h-4" />
                        <span>{friendUser.isOnline ? "Challenge to Duel" : "Offline"}</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FIND CODERS / SEARCH */}
        {activeTab === "search" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-card border border-border">
              <h3 className="font-bold text-sm text-foreground mb-1">Search for Coders</h3>
              <p className="text-xs text-muted-foreground font-mono">
                Type a username or display name to find real friends and add them to your duel roster.
              </p>
            </div>

            {searching ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span>Searching user directory...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground font-mono text-xs">
                {searchQuery.trim() ? "No users matching search query." : "Type a username above to start searching."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((user) => {
                  const ratingInfo = getRatingInfo(user.rating);
                  return (
                    <div
                      key={user.id}
                      className="p-4 rounded-xl bg-card border border-border flex items-center justify-between gap-4"
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
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
                              user.isOnline ? "bg-emerald-500" : "bg-gray-500"
                            }`}
                          />
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm">
                            {user.name || user.username}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            @{user.username}
                          </div>
                          <div className={`text-xs font-semibold ${ratingInfo.colorClass}`}>
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

        {/* TAB 3: PENDING REQUESTS */}
        {activeTab === "pending" && (
          <div className="space-y-8">
            {/* Incoming Requests */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <span>Incoming Friend Requests ({incoming.length})</span>
              </h3>

              {incoming.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground font-mono bg-card border border-border rounded-xl">
                  No incoming friend requests right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incoming.map(({ id, sender }) => {
                    const ratingInfo = getRatingInfo(sender.rating);
                    return (
                      <div
                        key={id}
                        className="p-4 rounded-xl bg-card border border-amber-500/30 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400">
                            {sender.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-sm">
                              {sender.name || sender.username}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              @{sender.username}
                            </div>
                            <div className={`text-xs font-semibold ${ratingInfo.colorClass}`}>
                              {sender.rating} ELO
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDecline(id)}
                            className="h-8 text-xs border-border hover:bg-rose-500/10 hover:text-rose-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAccept(id)}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span>Sent Requests ({outgoing.length})</span>
              </h3>

              {outgoing.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground font-mono bg-card border border-border rounded-xl">
                  No pending outgoing requests.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {outgoing.map(({ id, receiver }) => (
                    <div
                      key={id}
                      className="p-4 rounded-xl bg-card border border-border flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-muted-foreground">
                          {receiver.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm">
                            {receiver.name || receiver.username}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            @{receiver.username}
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecline(id)}
                        className="h-8 text-xs text-muted-foreground hover:text-rose-400 border-border"
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
