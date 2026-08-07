import { create } from "zustand";
import { api } from "./axios";

export type User = {
  id: string;
  name?: string;
  username: string;
  email: string;
  avatar_url?: string | null;
  avatar_id?: string | null;
  avatar?: string;
  rating?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  matchesPlayed?: number;
  problemsSolved?: number;
  country?: string | null;
  gender?: string | null;
  website?: string | null;
  githubHandle?: string | null;
  twitterHandle?: string | null;
  linkedinHandle?: string | null;
  rank?: number | null;
  googleId?: string | null;
  githubId?: string | null;
  hasPassword?: boolean;
  emailVerified?: boolean;
  appearOnLeaderboard?: boolean;
  allowPublicProfile?: boolean;
  notifySiteFriendRequest?: boolean;
  notifySiteDuelChallenge?: boolean;
  notifySiteMatchTournament?: boolean;
  notifyEmailAnnouncements?: boolean;
  notifyEmailPromotions?: boolean;
  createdAt?: string;
};

type AuthStore = {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null }),
}));

export const refreshCurrentUser = async () => {
  try {
    const res = await api.get("/user/me");
    if (res.data?.user) {
      useAuthStore.getState().setUser(res.data.user);
    }
  } catch (err) {
    console.error("Failed to refresh current user:", err);
  }
};