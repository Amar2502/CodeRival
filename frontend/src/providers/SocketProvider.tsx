"use client";

import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useAuthStore } from "@/lib/authStore";
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

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
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