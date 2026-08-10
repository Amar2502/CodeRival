"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock } from "lucide-react";
import { api } from "@/lib/axios";
import { Spinner } from "@/components/ui/spinner";

interface FriendButtonProps {
  targetUserId: string;
  targetUsername?: string;
  initialStatus?: "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED";
  size?: "sm" | "default" | "lg" | "xs";
  className?: string;
}

export function FriendButton({
  targetUserId,
  targetUsername,
  initialStatus,
  size = "sm",
  className = "",
}: FriendButtonProps) {
  const [status, setStatus] = useState<"NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED">(
    initialStatus || "NONE"
  );
  const [loading, setLoading] = useState<boolean>(!initialStatus);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialStatus) {
      setStatus(initialStatus);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function fetchStatus() {
      try {
        const res = await api.get(`/friends/status/${targetUserId}`);
        if (isMounted) {
          setStatus(res.data.status);
        }
      } catch (err) {
        console.error("Failed to fetch friendship status:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, [targetUserId, initialStatus]);

  const handleSendRequest = async () => {
    try {
      setActionLoading(true);
      const res = await api.post("/friends/request", {
        targetUserId,
        targetUsername,
      });
      setStatus(res.data.status || "PENDING_SENT");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("friend_request_updated"));
      }
    } catch (err: any) {
      console.error("Failed to send friend request:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      setActionLoading(true);
      await api.post("/friends/accept", { senderId: targetUserId });
      setStatus("ACCEPTED");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("friend_request_updated"));
      }
    } catch (err: any) {
      console.error("Failed to accept friend request:", err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size={size === "xs" ? "sm" : size} disabled className={`gap-1.5 h-8 text-xs ${className}`}>
        <Spinner className="size-3.5" />
      </Button>
    );
  }

  if (status === "ACCEPTED") {
    return (
      <div className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold ${className}`}>
        <UserCheck className="w-3.5 h-3.5" />
        <span>Friends</span>
      </div>
    );
  }

  if (status === "PENDING_SENT") {
    return (
      <Button
        variant="outline"
        size={size === "xs" ? "sm" : size}
        disabled
        className={`gap-1.5 h-8 text-xs text-amber-400 border-amber-500/30 bg-amber-500/10 ${className}`}
      >
        <Clock className="w-3.5 h-3.5 animate-pulse" />
        <span>Request Sent</span>
      </Button>
    );
  }

  if (status === "PENDING_RECEIVED") {
    return (
      <Button
        size={size === "xs" ? "sm" : size}
        onClick={handleAcceptRequest}
        disabled={actionLoading}
        className={`bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5 h-8 text-xs ${className}`}
      >
        {actionLoading ? (
          <Spinner className="size-3.5" />
        ) : (
          <UserCheck className="w-3.5 h-3.5" />
        )}
        <span>Accept Request</span>
      </Button>
    );
  }

  return (
    <Button
      size={size === "xs" ? "sm" : size}
      onClick={handleSendRequest}
      disabled={actionLoading}
      className={`bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 h-8 text-xs ${className}`}
    >
      {actionLoading ? (
        <Spinner className="size-3.5" />
      ) : (
        <UserPlus className="w-3.5 h-3.5" />
      )}
      <span>Add Friend</span>
    </Button>
  );
}
