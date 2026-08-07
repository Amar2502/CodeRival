'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Trophy,
  Swords,
  Mail,
  MapPin,
  TrendingUp,
  Globe,
  Link2,
  Code2,
  BadgeCheck,
  Camera,
  Trash2,
  X,
  Check,
  Edit3,
  ExternalLink,
} from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'
import { getRatingInfo } from '@/lib/rating'
import { api } from '@/lib/axios'
import { RatingChart } from '@/components/RatingChart'

import { FcGoogle } from 'react-icons/fc'
import { FaGithub, FaXTwitter, FaLinkedin } from 'react-icons/fa6'

interface RatingHistoryItem {
  id: string
  rating: number
  delta: number
  createdAt: string
  matchId: string | null
}

interface RecentSubmissionItem {
  id: string
  submittedAt: string
  status: string
  verdict: string | null
  problem: {
    title: string
    slug: string
    difficulty?: string
  }
}

interface RecentMatchItem {
  id: string
  createdAt: string
  status: string
  win: boolean
  reason: string | null
  opponent?: {
    username: string
    name: string
  } | null
  problem: {
    title: string
    slug: string
    difficulty?: string
  }
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()

  // Profile Form States
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('')
  const [website, setWebsite] = useState('')
  const [githubHandle, setGithubHandle] = useState('')
  const [twitterHandle, setTwitterHandle] = useState('')
  const [linkedinHandle, setLinkedinHandle] = useState('')

  // Modals & UI Tab States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'matches' | 'submissions'>('matches')

  // Validation & Loading States
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false)
  const [linkingProvider, setLinkingProvider] = useState<'google' | 'github' | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  // Avatar Upload Refs & State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  // Message Feedback State
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Profile Extended Data
  const [ratingHistory, setRatingHistory] = useState<RatingHistoryItem[]>([])
  const [recentMatches, setRecentMatches] = useState<RecentMatchItem[]>([])
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmissionItem[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)

  // Email Verification OTP Modal States
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false)
  const [otp, setOtp] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isCheckingOtp, setIsCheckingOtp] = useState(false)
  const [otpError, setOtpError] = useState('')

  // Fetch complete profile on mount
  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    setIsLoadingProfile(true)
    try {
      const res = await api.get('/user/profile/me')
      if (res.data?.user) {
        const u = res.data.user
        setUser(u)
        setName(u.name || '')
        setUsername(u.username || '')
        setCountry(u.country || '')
        setWebsite(u.website || '')
        setGithubHandle(u.githubHandle || '')
        setTwitterHandle(u.twitterHandle || '')
        setLinkedinHandle(u.linkedinHandle || '')
        if (u.rank) setUserRank(u.rank)
      }
      setRatingHistory(res.data?.ratingHistory || [])
      setRecentMatches(res.data?.formattedRecentMatches || [])
      setRecentSubmissions(res.data?.user?.submissions || [])
    } catch (err) {
      console.error('Failed to load profile data:', err)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  // Handle avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('avatar', file)

    try {
      setIsUploadingAvatar(true)
      const res = await api.post('/user/upload_avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data?.user) {
        setUser(res.data.user)
        setMessage({ type: 'success', text: 'Avatar uploaded successfully!' })
      }
    } catch (err: any) {
      console.error('Failed to upload avatar:', err)
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to upload avatar' })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your avatar?')) return
    try {
      setIsUploadingAvatar(true)
      const res = await api.delete('/user/remove_avatar')
      if (res.data?.user) {
        setUser(res.data.user)
        setMessage({ type: 'success', text: 'Avatar removed successfully.' })
      }
    } catch (err: any) {
      console.error('Failed to remove avatar:', err)
      setMessage({ type: 'error', text: 'Failed to remove avatar' })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // Debounced username availability checker
  useEffect(() => {
    if (!username || username === user?.username) {
      setIsUsernameAvailable(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true)
      try {
        const res = await api.get(`/user/check_username?username=${encodeURIComponent(username)}`)
        setIsUsernameAvailable(res.data.available)
      } catch (err) {
        setIsUsernameAvailable(null)
      } finally {
        setIsCheckingUsername(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [username, user?.username])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      const res = await api.patch('/user/update_profile', {
        name,
        username,
        country,
        website,
        githubHandle,
        twitterHandle,
        linkedinHandle,
      })

      setMessage({ type: 'success', text: 'Profile details saved successfully!' })
      if (res.data?.user) {
        setUser(res.data.user)
      }
      setIsEditModalOpen(false)
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update profile.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleVerifyEmail = async () => {
    if (!user?.email) return
    setIsVerifyingEmail(true)
    setMessage(null)
    setOtpError('')
    try {
      await api.post('/auth/verify-email', { email: user.email })
      setIsOtpModalOpen(true)
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to send OTP code. Please try again.',
      })
    } finally {
      setIsVerifyingEmail(false)
    }
  }

  const handleVerifyOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!otp || otp.length < 6 || !user?.email) {
      setOtpError('Please enter a valid 6-digit verification code.')
      return
    }

    setIsCheckingOtp(true)
    setOtpError('')
    try {
      const res = await api.post('/auth/check-verify-email-otp', {
        email: user.email,
        otp,
      })

      if (res.data?.user) {
        setUser(res.data.user)
      } else {
        setUser({ ...user, emailVerified: true })
      }

      setIsOtpModalOpen(false)
      setOtp('')
      setMessage({
        type: 'success',
        text: 'Email verified successfully!',
      })
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Invalid or expired OTP. Please try again.')
    } finally {
      setIsCheckingOtp(false)
    }
  }

  const handleResendOtp = async () => {
    if (!user?.email) return
    setIsSendingOtp(true)
    setOtpError('')
    try {
      await api.post('/auth/verify-email', { email: user.email })
      setMessage({ type: 'success', text: 'New verification OTP sent to your email.' })
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Failed to resend code.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

  const handleLinkOAuth = (provider: 'google' | 'github') => {
    setLinkingProvider(provider)
    window.location.href = `${API_URL}/auth/${provider}`
  }

  // Exact real stats without fake hardcoded defaults
  const userRating = user?.rating ?? 1200
  const ratingInfo = getRatingInfo(userRating)

  const wins = user?.wins ?? 0
  const losses = user?.losses ?? 0
  const draws = user?.draws ?? 0
  const matchesPlayed = user?.matchesPlayed ?? (wins + losses + draws)
  const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0
  const problemsSolved = user?.problemsSolved ?? 0

  // Format match result reasons
  const formatMatchReason = (reason: string | null, win: boolean) => {
    if (!reason) return win ? 'Victory' : 'Defeat'
    switch (reason) {
      case 'OPPONENT_CHEATED':
        return 'Rival Disqualified (Cheating)'
      case 'OPPONENT_SURRENDERED':
        return 'Rival Surrendered'
      case 'OPPONENT_DISCONNECTED':
        return 'Rival Disconnected'
      case 'SOLUTION_ACCEPTED':
        return win ? 'Victory (AC)' : 'Defeat (AC)'
      case 'TIMEOUT':
        return 'Time Limit Exceeded'
      case 'DRAW':
        return 'Draw'
      default:
        return reason.replace(/_/g, ' ')
    }
  }

  // Format date as M/D/YY (e.g., 8/6/26)
  const formatDateString = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return '-'
      const month = d.getMonth() + 1
      const day = d.getDate()
      const year = String(d.getFullYear()).slice(-2)
      return `${month}/${day}/${year}`
    } catch (e) {
      return '-'
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ─── LEFT SIDEBAR: PROFILE CARD & DETAILED INFO ─── */}
          <div className="lg:col-span-4 flex flex-col items-start space-y-5">
            
            {/* Avatar & Basic Identity Side-by-Side */}
            <div className="flex flex-row items-center gap-4 sm:gap-5 w-full">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-border bg-surface flex items-center justify-center text-foreground font-extrabold text-3xl sm:text-4xl overflow-hidden shadow-xl shrink-0">
                {user?.avatar_url || user?.avatar ? (
                  <img
                    src={user.avatar_url || user.avatar}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}</span>
                )}
              </div>

              {/* Display Name, Handle, Rank beside photo */}
              <div className="space-y-1 text-left min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                    {user?.name || user?.username || 'User'}
                  </h1>
                  {user?.emailVerified && (
                    <span title="Verified Coder">
                      <BadgeCheck className="w-5 h-5 fill-blue-500 text-background shrink-0" />
                    </span>
                  )}
                </div>

                <p className="text-sm font-mono text-muted-foreground truncate">
                  @{user?.username || 'username'}
                </p>
                <p className="text-sm font-semibold text-foreground/90 pt-0.5">
                  Rank {userRank ? `#${userRank}` : user?.rank ? `#${user.rank}` : '-'}
                </p>
              </div>
            </div>

            {/* Edit Profile Button */}
            <Link
              href="/settings/profile"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all cursor-pointer text-sm font-sans tracking-wide text-center block"
            >
              Edit Profile
            </Link>

            {/* Profile Info Details List */}
            <div className="w-full space-y-3 text-sm font-sans text-foreground/90 pt-1 text-left">
              {/* 1. Location Pin: Country */}
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className={user?.country ? 'text-foreground' : 'text-muted-foreground italic text-xs'}>
                  {user?.country || 'No location set'}
                </span>
              </div>

              {/* 2. Website Globe: Website */}
              <div className="flex items-center gap-2.5 font-mono text-accent">
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                {user?.website ? (
                  <a
                    href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline hover:text-accent/90 truncate"
                  >
                    {user.website.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic text-xs font-sans">No website set</span>
                )}
              </div>

              {/* 3. GitHub */}
              <div className="flex items-center gap-2.5 font-mono text-foreground/90">
                <FaGithub className="w-4 h-4 text-muted-foreground shrink-0" />
                {user?.githubHandle ? (
                  <a
                    href={`https://github.com/${user.githubHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline hover:text-accent truncate"
                  >
                    {user.githubHandle}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic text-xs font-sans">No GitHub handle</span>
                )}
              </div>

              {/* 4. Twitter / X */}
              <div className="flex items-center gap-2.5 font-mono text-foreground/90">
                <FaXTwitter className="w-4 h-4 text-muted-foreground shrink-0" />
                {user?.twitterHandle ? (
                  <a
                    href={`https://x.com/${user.twitterHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline hover:text-accent truncate"
                  >
                    {user.twitterHandle}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic text-xs font-sans">No Twitter handle</span>
                )}
              </div>

              {/* 5. LinkedIn */}
              <div className="flex items-center gap-2.5 font-mono text-foreground/90">
                <FaLinkedin className="w-4 h-4 text-muted-foreground shrink-0" />
                {user?.linkedinHandle ? (
                  <a
                    href={`https://linkedin.com/in/${user.linkedinHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline hover:text-accent truncate"
                  >
                    {user.linkedinHandle}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic text-xs font-sans">No LinkedIn handle</span>
                )}
              </div>
            </div>
          </div>

          {/* ─── RIGHT MAIN COLUMN: STAT CARDS, CHART & TABS ─── */}
          <div className="lg:col-span-8 space-y-6">

            {/* 4 Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Rating */}
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
                <span className="text-sm font-sans text-muted-foreground font-medium">Rating</span>
                <span className="text-2xl sm:text-3xl font-black text-foreground mt-3 tracking-tight font-sans">
                  {userRating}
                </span>
              </div>

              {/* Card 2: Problems */}
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
                <span className="text-sm font-sans text-muted-foreground font-medium">problems</span>
                <span className="text-2xl sm:text-3xl font-black text-foreground mt-3 tracking-tight font-sans">
                  {problemsSolved}
                </span>
              </div>

              {/* Card 3: Matches Played */}
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
                <span className="text-sm font-sans text-muted-foreground font-medium">Matches Played</span>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight block font-sans">
                    {matchesPlayed}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono block mt-1">
                    {wins} W / {losses} L / {draws} D
                  </span>
                </div>
              </div>

              {/* Card 4: Win Ratio */}
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
                <span className="text-sm font-sans text-muted-foreground font-medium">Win Ratio</span>
                <span className="text-2xl sm:text-3xl font-black text-foreground mt-3 tracking-tight font-sans">
                  {winRate} %
                </span>
              </div>

            </div>

            {/* Rating Chart Box */}
            <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-foreground font-sans tracking-wide">Rating Chart</h2>
              <div className="pt-2">
                <RatingChart history={ratingHistory} currentRating={userRating} />
              </div>
            </div>

            {/* Tabs & Content Box */}
            <div className="space-y-4">
              
              {/* Tab Header Selector */}
              <div className="flex items-center gap-2 border-b border-border/80 pb-3">
                <button
                  onClick={() => setActiveTab('matches')}
                  className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer border ${
                    activeTab === 'matches'
                      ? 'border-border bg-surface-2 text-foreground shadow-xs'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Recent Matches
                </button>
                <button
                  onClick={() => setActiveTab('submissions')}
                  className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer border ${
                    activeTab === 'submissions'
                      ? 'border-border bg-surface-2 text-foreground shadow-xs'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Submissions
                </button>
              </div>

              {/* Tab 1 Content: Recent Matches List */}
              {activeTab === 'matches' && (
                <div className="space-y-3 pt-1">
                  {recentMatches.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-card border border-border text-muted-foreground text-sm font-mono">
                      No recent matches played yet.
                    </div>
                  ) : (
                    recentMatches.map((match) => (
                      <div
                        key={match.id}
                        className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-border/80 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {match.win ? (
                            <Check className="w-5 h-5 text-emerald-400 shrink-0 font-extrabold stroke-[3]" />
                          ) : (
                            <X className="w-5 h-5 text-rose-400 shrink-0 font-bold" />
                          )}
                          <span className="text-sm font-mono text-foreground w-28 truncate">
                            @{match.opponent?.username || 'Opponent'}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                              {match.problem?.difficulty?.toLowerCase() || 'Easy'}
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {match.problem?.title || 'Problem'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 font-mono">
                          <span className="px-3.5 py-1 rounded-xl border border-border bg-surface text-xs text-foreground/90">
                            {formatMatchReason(match.reason, match.win)}
                          </span>
                          <span className="text-xs text-muted-foreground font-sans">
                            {formatDateString(match.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 2 Content: Submissions List */}
              {activeTab === 'submissions' && (
                <div className="space-y-3 pt-1">
                  {recentSubmissions.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-card border border-border text-muted-foreground text-sm font-mono">
                      No recent submissions recorded yet.
                    </div>
                  ) : (
                    recentSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-border/80 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                              sub.verdict === 'AC'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {sub.verdict || sub.status || 'SUBMITTED'}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                              {sub.problem?.difficulty?.toLowerCase() || 'Easy'}
                            </span>
                            <span className="text-sm font-medium text-foreground">{sub.problem?.title}</span>
                          </div>
                        </div>

                        <span className="text-xs text-muted-foreground font-mono">
                          {formatDateString(sub.submittedAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>

          </div>

        </div>
      </main>

      {/* ─── EDIT PROFILE MODAL DIALOG ─── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-accent" /> Edit Profile Settings
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Update your public details and account parameters</p>
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Display Name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  className="bg-surface border-border text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Username Handle</label>
                  {isCheckingUsername && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                      <Loader2 className="w-3 h-3 animate-spin text-accent" /> Checking...
                    </span>
                  )}
                  {!isCheckingUsername && isUsernameAvailable === true && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Available
                    </span>
                  )}
                  {!isCheckingUsername && isUsernameAvailable === false && (
                    <span className="text-[11px] text-rose-400 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3" /> Handle Taken
                    </span>
                  )}
                </div>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter handle"
                  className="bg-surface border-border text-foreground font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Country / Region</label>
                <Input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. India"
                  className="bg-surface border-border text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Website URL</label>
                <Input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="e.g. amarpandey.in"
                  className="bg-surface border-border text-foreground font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">GitHub Handle</label>
                  <Input
                    type="text"
                    value={githubHandle}
                    onChange={(e) => setGithubHandle(e.target.value)}
                    placeholder="e.g. mayur420"
                    className="bg-surface border-border text-foreground font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Twitter Handle</label>
                  <Input
                    type="text"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value)}
                    placeholder="e.g. amarpandey2502"
                    className="bg-surface border-border text-foreground font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">LinkedIn Handle</label>
                  <Input
                    type="text"
                    value={linkedinHandle}
                    onChange={(e) => setLinkedinHandle(e.target.value)}
                    placeholder="e.g. amar"
                    className="bg-surface border-border text-foreground font-mono"
                  />
                </div>
              </div>

              {/* Connected Accounts */}
              <div className="pt-2 border-t border-border space-y-2">
                <label className="text-xs font-medium text-muted-foreground block">Connected OAuth Accounts</label>
                <div className="flex flex-wrap gap-2">
                  {user?.googleId ? (
                    <span className="px-3 py-1.5 rounded-xl bg-surface border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                      <FcGoogle className="w-4 h-4" /> Google Connected
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => handleLinkOAuth('google')}
                      disabled={linkingProvider === 'google'}
                      className="border-border bg-surface hover:bg-surface-2 text-foreground text-xs gap-1.5"
                    >
                      {linkingProvider === 'google' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FcGoogle className="w-4 h-4" />}
                      <span>Link Google</span>
                    </Button>
                  )}

                  {user?.githubId ? (
                    <span className="px-3 py-1.5 rounded-xl bg-surface border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                      <FaGithub className="w-4 h-4" /> GitHub Connected
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => handleLinkOAuth('github')}
                      disabled={linkingProvider === 'github'}
                      className="border-border bg-surface hover:bg-surface-2 text-foreground text-xs gap-1.5"
                    >
                      {linkingProvider === 'github' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FaGithub className="w-4 h-4" />}
                      <span>Link GitHub</span>
                    </Button>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  className="border-border text-muted-foreground hover:bg-surface-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || isUsernameAvailable === false}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 px-6"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Changes</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EMAIL VERIFICATION OTP MODAL ─── */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl bg-card border border-border p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <button
              onClick={() => {
                setIsOtpModalOpen(false)
                setOtp('')
                setOtpError('')
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Mail className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">Verify Your Email</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter 6-digit code sent to <span className="font-mono text-foreground font-semibold">{user?.email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtpSubmit} className="w-full space-y-4 pt-2">
                <Input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setOtp(value)
                    if (otpError) setOtpError('')
                  }}
                  placeholder="000000"
                  className="bg-surface border-border text-center font-mono text-2xl tracking-[0.5em] h-12 text-foreground font-bold"
                  autoFocus
                />

                {otpError && (
                  <p className="text-xs text-rose-400 flex items-center justify-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> {otpError}
                  </p>
                )}

                <div className="space-y-2 pt-2">
                  <Button
                    type="submit"
                    disabled={isCheckingOtp || otp.length < 6}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold gap-2 shadow-md h-11"
                  >
                    {isCheckingOtp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <BadgeCheck className="w-4 h-4 fill-white text-blue-600" />
                    )}
                    <span>Verify Code</span>
                  </Button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isSendingOtp}
                      className="text-accent hover:underline font-medium disabled:opacity-50"
                    >
                      {isSendingOtp ? 'Sending...' : "Didn't receive code? Resend"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOtpModalOpen(false)
                        setOtp('')
                        setOtpError('')
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
