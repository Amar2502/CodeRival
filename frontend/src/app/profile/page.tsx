'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
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
  Sparkles,
  Code2,
  BadgeCheck,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Camera,
  Trash2,
} from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'
import { getRatingInfo } from '@/lib/rating'
import { api } from '@/lib/axios'
import { RatingChart } from '@/components/RatingChart'

const GoogleIcon = () => (
  <svg className="w-3.5 h-3.5 fill-current text-rose-400" viewBox="0 0 24 24">
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
  </svg>
)

const GithubIcon = () => (
  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
)

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
  }
}

interface RecentMatchItem {
  id: string
  createdAt: string
  status: string
  win: boolean
  problem: {
    title: string
    slug: string
  }
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()

  // Profile Form States
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('')

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
        setMessage({ type: 'success', text: 'Avatar uploaded successfully to ImageKit!' })
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

  // Profile Extended Data
  const [ratingHistory, setRatingHistory] = useState<RatingHistoryItem[]>([])
  const [recentMatches, setRecentMatches] = useState<RecentMatchItem[]>([])
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmissionItem[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Fetch complete profile on mount
  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    setIsLoadingProfile(true)
    try {
      const res = await api.get('/user/profile/me')
      if (res.data?.user) {
        setUser(res.data.user)
        setName(res.data.user.name || '')
        setUsername(res.data.user.username || '')
        setCountry(res.data.user.country || '')
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
      })

      setMessage({ type: 'success', text: 'Profile details saved successfully!' })
      if (res.data?.user) {
        setUser(res.data.user)
      }
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
    setIsVerifyingEmail(true)
    setMessage(null)
    try {
      const res = await api.post('/user/verify_email')
      if (res.data?.user) {
        setUser(res.data.user)
      }
      setMessage({
        type: 'success',
        text: res.data?.message || 'Email verified! Blue badge unlocked.',
      })
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to verify email.',
      })
    } finally {
      setIsVerifyingEmail(false)
    }
  }

  const handleLinkOAuth = async (provider: 'google' | 'github') => {
    setLinkingProvider(provider)
    setMessage(null)
    try {
      const res = await api.post('/user/link_oauth', { provider })
      if (res.data?.user) {
        setUser(res.data.user)
      }
      setMessage({
        type: 'success',
        text: res.data?.message || `${provider === 'google' ? 'Google' : 'GitHub'} linked successfully!`,
      })
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || `Failed to link ${provider}.`,
      })
    } finally {
      setLinkingProvider(null)
    }
  }

  const userRating = user?.rating || 1200
  const ratingInfo = getRatingInfo(userRating)

  const wins = user?.wins || 0
  const losses = user?.losses || 0
  const draws = user?.draws || 0
  const matchesPlayed = user?.matchesPlayed || wins + losses + draws
  const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0
  const problemsSolved = user?.problemsSolved || 0

  // Calculation for SVG rating trajectory line
  const chartPoints = useMemo(() => {
    if (ratingHistory.length === 0) return ''
    const maxR = Math.max(...ratingHistory.map((h) => h.rating), 1600)
    const minR = Math.min(...ratingHistory.map((h) => h.rating), 1000)
    const range = maxR - minR || 1

    return ratingHistory
      .map((h, idx) => {
        const x = (idx / Math.max(ratingHistory.length - 1, 1)) * 300
        const y = 80 - ((h.rating - minR) / range) * 60
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }, [ratingHistory])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ─── PROFILE HERO BANNER ─── */}
        <div className="relative p-6 sm:p-8 rounded-3xl bg-card border border-border overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              {/* Avatar Box with ImageKit Upload */}
              <div className="relative flex flex-col items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />

                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-linear-to-br from-primary via-accent to-purple-600 flex items-center justify-center text-white font-black text-4xl shadow-xl border-2 border-background shrink-0">
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

                  {/* Camera Upload Button Overlay */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl flex flex-col items-center justify-center text-white transition-opacity font-bold text-xs gap-1 cursor-pointer"
                    title="Upload new avatar to ImageKit"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-primary" />
                        <span className="text-[10px] uppercase font-mono">Upload</span>
                      </>
                    )}
                  </button>

                  {user?.emailVerified && (
                    <div className="absolute -bottom-1.5 -right-1.5 p-1 bg-blue-600 rounded-full text-white shadow-md border-2 border-background z-10" title="Verified Coder">
                      <BadgeCheck className="w-5 h-5 fill-white text-blue-600" />
                    </div>
                  )}
                </div>

                {(user?.avatar_url || user?.avatar_id) && (
                  <button
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className="text-[11px] text-muted-foreground hover:text-rose-400 flex items-center gap-1 font-mono hover:underline"
                  >
                    <Trash2 className="w-3 h-3" /> Remove Avatar
                  </button>
                )}
              </div>

              {/* Identity & Badges */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{user?.name || user?.username}</h1>
                  
                  {/* Verified Blue Tick Badge */}
                  {user?.emailVerified ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-xs">
                      <BadgeCheck className="w-3.5 h-3.5 fill-blue-400 text-background" /> Verified Coder
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <AlertCircle className="w-3.5 h-3.5" /> Unverified Email
                    </span>
                  )}

                  {/* Rating Rank Badge */}
                  <span className={`px-3 py-0.5 rounded-full text-xs font-bold border ${ratingInfo.bgClass}`}>
                    {ratingInfo.title}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground font-mono">@{user?.username}</p>

                {/* Sub Metadata Row */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1.5 text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1 text-foreground">
                    <Mail className="w-3.5 h-3.5 text-accent shrink-0" /> {user?.email}
                  </span>
                  {user?.country && (
                    <span className="flex items-center gap-1 text-foreground">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {user.country}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-foreground">
                    <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {userRating} ELO
                  </span>
                  <span className="flex items-center gap-1 text-foreground">
                    <Code2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {problemsSolved} Solved
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Social Integration Panel */}
            <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto border-t md:border-t-0 border-border pt-4 md:pt-0">
              {/* Email Verification Action */}
              {!user?.emailVerified && (
                <Button
                  size="sm"
                  onClick={handleVerifyEmail}
                  disabled={isVerifyingEmail}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold gap-2 shadow-sm text-xs"
                >
                  {isVerifyingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5 fill-white text-blue-600" />}
                  <span>Verify Email for Blue Tick</span>
                </Button>
              )}

              {/* OAuth Account Integrations */}
              <div className="flex flex-wrap items-center gap-2 w-full justify-center md:justify-end">
                {/* Google Integration */}
                {user?.googleId ? (
                  <span className="px-3 py-1.5 rounded-xl bg-surface border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                    <GoogleIcon /> Google Linked
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLinkOAuth('google')}
                    disabled={linkingProvider === 'google'}
                    className="border-border bg-surface hover:bg-surface-2 text-foreground text-xs gap-1.5"
                  >
                    {linkingProvider === 'google' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GoogleIcon />}
                    <span>Link Google Account</span>
                  </Button>
                )}

                {/* GitHub Integration */}
                {user?.githubId ? (
                  <span className="px-3 py-1.5 rounded-xl bg-surface border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                    <GithubIcon /> GitHub Linked
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLinkOAuth('github')}
                    disabled={linkingProvider === 'github'}
                    className="border-border bg-surface hover:bg-surface-2 text-foreground text-xs gap-1.5"
                  >
                    {linkingProvider === 'github' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GithubIcon />}
                    <span>Link GitHub Account</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── COMPETITIVE STATS CARDS GRID ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Competitive ELO</p>
                <h3 className={`text-2xl font-black mt-1 ${ratingInfo.colorClass}`}>
                  {userRating}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{ratingInfo.title} tier</p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Problems Solved</p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">
                  {problemsSolved}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Accepted submissions</p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border">
                <Code2 className="w-6 h-6 text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Matches Played</p>
                <h3 className="text-2xl font-black text-accent mt-1">
                  {matchesPlayed}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {wins} W / {losses} L / {draws} D
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border">
                <Swords className="w-6 h-6 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Win Ratio</p>
                <h3 className="text-2xl font-black text-rose-500 mt-1">
                  {winRate}%
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">1v1 Arena victory rate</p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border">
                <TrendingUp className="w-6 h-6 text-rose-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── RATING HISTORY TRAJECTORY & DELTA LOG ─── */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent" /> Competitive Rating History & Progress
                </CardTitle>
                <CardDescription className="text-xs">
                  Visual ELO trajectory and match rating adjustments
                </CardDescription>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-surface border border-border text-accent font-semibold">
                Current Rating: {userRating} ELO
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Rating Trajectory Line Chart */}
            <RatingChart history={ratingHistory} currentRating={userRating} />

            {/* Rating History List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Rating Adjustments</h4>
              
              {ratingHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No rating history available.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {[...ratingHistory].reverse().map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        {item.delta > 0 ? (
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ArrowUpRight className="w-4 h-4" />
                          </div>
                        ) : item.delta < 0 ? (
                          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <ArrowDownRight className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-lg bg-muted/20 text-muted-foreground border border-border">
                            <Minus className="w-4 h-4" />
                          </div>
                        )}

                        <div>
                          <p className="font-bold text-foreground">
                            {item.matchId ? '1v1 Duel Match' : 'Account Initial Rating'}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="font-bold text-foreground text-sm">{item.rating} ELO</span>
                        {item.delta !== 0 && (
                          <p className={`text-[11px] font-bold ${item.delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.delta > 0 ? `+${item.delta}` : item.delta}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── PROFILE EDIT FORM ─── */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-accent" /> Profile Settings & Personal Details
            </CardTitle>
            <CardDescription className="text-xs">Update your display handle, name, and country</CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {message && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
                    message.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Display Name</label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="bg-surface border-border text-foreground"
                  />
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Country / Region</label>
                  <Input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. India, United States, Japan"
                    className="bg-surface border-border text-foreground"
                  />
                </div>
              </div>

              {/* Username Handle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Username Handle</label>
                  {isCheckingUsername && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                      <Loader2 className="w-3 h-3 animate-spin text-accent" /> Checking availability...
                    </span>
                  )}
                  {!isCheckingUsername && isUsernameAvailable === true && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Available
                    </span>
                  )}
                  {!isCheckingUsername && isUsernameAvailable === false && (
                    <span className="text-[11px] text-rose-400 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" /> Handle Taken
                    </span>
                  )}
                </div>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter unique handle"
                  className="bg-surface border-border text-foreground font-mono"
                />
              </div>

              {/* Read-only Email field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Email Address (Read-only)</label>
                  {user?.emailVerified && (
                    <span className="text-[11px] text-blue-400 font-bold flex items-center gap-1">
                      <BadgeCheck className="w-3.5 h-3.5 fill-blue-400 text-background" /> Verified Email
                    </span>
                  )}
                </div>
                <Input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-surface/50 border-border text-muted-foreground cursor-not-allowed font-mono"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSaving || isUsernameAvailable === false}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 px-6 shadow-md"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Changes</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
