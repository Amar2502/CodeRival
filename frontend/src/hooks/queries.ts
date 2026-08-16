import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

// Export Query Keys object for clean invalidations
export const queryKeys = {
  currentUser: ["user", "me"] as const,
  userProfile: (identifier: string) => ["user", "profile", identifier] as const,
  friends: ["friends"] as const,
  globalLeaderboard: (page: number, limit: number) => ["leaderboard", "global", page, limit] as const,
  friendsLeaderboard: (page: number, limit: number) => ["leaderboard", "friends", page, limit] as const,
  problems: (page: number, limit: number) => ["problems", "all", page, limit] as const,
  problemsByDifficulty: (difficulty: string) => ["problems", "difficulty", difficulty] as const,
  problem: (slug: string) => ["problem", slug] as const,
  matchHistory: (page: number, limit: number) => ["matches", "history", page, limit] as const,
  activeMatch: ["matches", "active"] as const,
  matchQueue: ["matches", "queue"] as const,
  notifications: ["notifications"] as const,
  tournaments: ["tournaments", "list"] as const,
  tournamentInvites: ["tournaments", "invites"] as const,
};

// 1. Current User Query (/user/me)
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: async () => {
      const res = await api.get("/user/me");
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

// 2. User Profile Query (/user/profile/:identifier)
export function useUserProfile(identifier: string = "me") {
  return useQuery({
    queryKey: queryKeys.userProfile(identifier),
    queryFn: async () => {
      const res = await api.get(`/user/profile/${identifier}`);
      return res.data;
    },
    staleTime: 3 * 60 * 1000, // 3 min
    enabled: !!identifier,
  });
}

// 3. Friends List Query (/friends)
export function useFriends() {
  return useQuery({
    queryKey: queryKeys.friends,
    queryFn: async () => {
      const res = await api.get("/friends");
      return res.data;
    },
    staleTime: 30 * 1000, // 30 sec
  });
}

// 4. Global Leaderboard Query (/leaderboard/global)
export function useGlobalLeaderboard(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.globalLeaderboard(page, limit),
    queryFn: async () => {
      const res = await api.get(`/leaderboard/global?page=${page}&limit=${limit}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

// 5. Friends Leaderboard Query (/leaderboard/friends)
export function useFriendsLeaderboard(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.friendsLeaderboard(page, limit),
    queryFn: async () => {
      const res = await api.get(`/leaderboard/friends?page=${page}&limit=${limit}`);
      return res.data;
    },
    staleTime: 3 * 60 * 1000, // 3 min
  });
}

// 6. Problems List Query (/problem/get/get-all/:page/:limit)
export function useProblems(page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: queryKeys.problems(page, limit),
    queryFn: async () => {
      const res = await api.get(`/problem/get/get-all/${page}/${limit}`);
      return res.data;
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });
}

// 7. Problems by Difficulty (/problem/get/by-difficulty/:difficulty)
export function useProblemsByDifficulty(difficulty: string) {
  return useQuery({
    queryKey: queryKeys.problemsByDifficulty(difficulty),
    queryFn: async () => {
      const res = await api.get(`/problem/get/by-difficulty/${difficulty}`);
      return res.data;
    },
    staleTime: 10 * 60 * 1000, // 10 min
    enabled: !!difficulty && difficulty !== "all",
  });
}

// 8. Single Problem Query (/problem/get/:slug)
export function useProblem(slug: string) {
  return useQuery({
    queryKey: queryKeys.problem(slug),
    queryFn: async () => {
      const res = await api.get(`/problem/get/${slug}`);
      return res.data;
    },
    staleTime: 10 * 60 * 1000, // 10 min
    enabled: !!slug,
  });
}

// 9. Match History Query (/match/history/me)
export function useMatchHistory(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.matchHistory(page, limit),
    queryFn: async () => {
      const res = await api.get(`/match/history/me?page=${page}&limit=${limit}`);
      return res.data;
    },
    staleTime: 1 * 60 * 1000, // 1 min
  });
}

// 10. Active Match Query (/match/active)
export function useActiveMatch() {
  return useQuery({
    queryKey: queryKeys.activeMatch,
    queryFn: async () => {
      const res = await api.get("/match/active");
      return res.data;
    },
    staleTime: 30 * 1000, // 30 sec
  });
}

// 11. Match Queue Query (/match/queue)
export function useMatchQueue() {
  return useQuery({
    queryKey: queryKeys.matchQueue,
    queryFn: async () => {
      const res = await api.get("/match/queue");
      return res.data;
    },
    staleTime: 10 * 1000, // 10 sec
  });
}

// 12. Notifications Query (/notification)
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const res = await api.get("/notification");
      return res.data;
    },
    staleTime: 30 * 1000, // 30 sec
  });
}

// 13. Tournaments Query (/tournament/list)
export function useTournaments() {
  return useQuery({
    queryKey: queryKeys.tournaments,
    queryFn: async () => {
      const res = await api.get("/tournament/list");
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

// 14. Tournament Invites Query (/tournament/invites)
export function useTournamentInvites() {
  return useQuery({
    queryKey: queryKeys.tournamentInvites,
    queryFn: async () => {
      const res = await api.get("/tournament/invites");
      return res.data;
    },
    staleTime: 1 * 60 * 1000, // 1 min
  });
}
