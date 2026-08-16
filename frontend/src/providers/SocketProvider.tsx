"use client";

import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useAuthStore } from "@/lib/authStore";
import { getQueryClient } from "./QueryProvider";
import { FriendChallengeModal } from "@/components/friends/FriendChallengeModal";
import { TournamentInviteModal } from "@/components/tournaments/TournamentInviteModal";

export default function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (loading) return;

    if (user) {
      if (!socket.connected) {
        socket.connect();
      }
    } else {
      if (socket.connected) {
        socket.disconnect();
      }
    }

    const onConnect = () => {
      console.log("Connected:", socket.id);
    };

    const onDisconnect = (reason: string) => {
      console.log("Disconnected:", reason);
    };

    // Automatic TanStack Query Cache Invalidation on socket events
    const onMatchEnded = () => {
      try {
        const qc = getQueryClient();
        qc.invalidateQueries({ queryKey: ["matches"] });
        qc.invalidateQueries({ queryKey: ["user"] });
        qc.invalidateQueries({ queryKey: ["leaderboard"] });
      } catch {}
    };

    const onFriendUpdated = () => {
      try {
        const qc = getQueryClient();
        qc.invalidateQueries({ queryKey: ["friends"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["leaderboard", "friends"] });
      } catch {}
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("match:ended", onMatchEnded);
    socket.on("friend:request_received", onFriendUpdated);
    socket.on("friend:request_accepted", onFriendUpdated);
    socket.on("friend:removed", onFriendUpdated);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("match:ended", onMatchEnded);
      socket.off("friend:request_received", onFriendUpdated);
      socket.off("friend:request_accepted", onFriendUpdated);
      socket.off("friend:removed", onFriendUpdated);
    };
  }, [user, loading]);

  return (
    <>
      {children}
      {user && (
        <>
          <FriendChallengeModal />
          <TournamentInviteModal />
        </>
      )}
    </>
  );
}