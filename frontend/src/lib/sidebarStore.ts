import { create } from 'zustand'
import { api } from './axios'
import { useAuthStore } from './authStore'

export interface UserProfileData {
  id: string
  name: string
  username: string
  email: string
  avatar_url?: string | null
  avatar_id?: string | null
  avatar?: string
  rating: number
  wins: number
  losses: number
  draws: number
  matchesPlayed: number
  problemsSolved: number
}

export interface FriendItem {
  friendshipId: string
  user: {
    id: string
    username: string
    name?: string
    avatar_url?: string | null
    avatar?: string
    rating: number
    isOnline: boolean
  }
}

export interface RatingPoint {
  id?: string
  rating: number
  createdAt: string
  matchId?: string | null
  delta?: number
}

interface SidebarState {
  profile: UserProfileData | null
  friends: FriendItem[]
  ratingHistory: RatingPoint[]
  userRank: string
  isInitialized: boolean
  isLoading: boolean
  
  fetchSidebarData: (forceRefresh?: boolean) => Promise<void>
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  profile: null,
  friends: [],
  ratingHistory: [],
  userRank: '-',
  isInitialized: false,
  isLoading: false,

  fetchSidebarData: async (forceRefresh = false) => {
    // If already initialized and not forcing refresh, skip fetching to use cache
    if (get().isInitialized && !forceRefresh) return

    set({ isLoading: true })

    try {
      // 1. Fetch user profile & rating history
      const profileRes = await api.get('/user/profile/me')
      if (profileRes.data?.user) {
        set({ profile: profileRes.data.user })
        useAuthStore.getState().setUser(profileRes.data.user)
      }
      if (profileRes.data?.ratingHistory) {
        set({ ratingHistory: profileRes.data.ratingHistory })
      }

      // 2. Fetch friends list
      try {
        const friendsRes = await api.get('/friends')
        set({ friends: friendsRes.data?.friends || [] })
      } catch (e) {
        console.error('Failed to fetch friends for sidebar:', e)
      }

      // 3. Fetch leaderboard rank
      try {
        const rankRes = await api.get('/leaderboard/global?limit=50')
        if (rankRes.data?.currentUserRank?.rank) {
          const r = rankRes.data.currentUserRank.rank
          let rankStr = `${r}th`
          if (r === 1) rankStr = '1st'
          else if (r === 2) rankStr = '2nd'
          else if (r === 3) rankStr = '3rd'
          set({ userRank: rankStr })
        } else {
          set({ userRank: '-' })
        }
      } catch (e) {
        set({ userRank: '-' })
      }

      set({ isInitialized: true })
    } catch (err) {
      console.error('Failed to load sidebar data:', err)
    } finally {
      set({ isLoading: false })
    }
  },
}))
