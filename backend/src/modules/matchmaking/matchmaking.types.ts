export interface QueuePlayer {
  userId: string;
  username?: string;
  name?: string | null;
  socketId: string;
  avatar_url?: string | null;
  avatar_id?: string | null;
  avatar?: string;
  rating: number;
  joinedAt: number;
}

export interface MatchmakingResult {
  success: boolean;
  message?: string;
  matched?: boolean;
  opponent?: QueuePlayer;
}