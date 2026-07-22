import { create } from "zustand";

export type User = {
  id: string;
  name?: string;
  username: string;
  email: string;
  avatar?: string;
  rating?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  matchesPlayed?: number;
  problemsSolved?: number;
  country?: string;
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