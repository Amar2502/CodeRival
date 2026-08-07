'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  ArrowRight,
  User,
  Shield,
  Bell,
  UserCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Mail,
  Trash2,
  Check,
  BadgeCheck,
  UserPlus,
  Swords,
  Trophy,
  Megaphone,
  Sparkles,
  BellRing,
  ExternalLink,
  AtSign,
  Eye,
} from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import { FaGithub } from 'react-icons/fa6'
import { useAuthStore } from '@/lib/authStore'
import { api } from '@/lib/axios'
import { toast } from 'sonner'

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, setUser, logout } = useAuthStore()

  // Active Tab state defaulting naturally to 'accounts'
  const [activeTab, setActiveTab] = useState<'accounts' | 'privacy' | 'notification'>('accounts')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'privacy') setActiveTab('privacy')
    else if (tab === 'notification') setActiveTab('notification')
    else setActiveTab('accounts')
  }, [searchParams])

  // Dialog open states
  const [isIdDialogOpen, setIsIdDialogOpen] = useState(false)
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false)

  // Form & action loading states
  const [newUsername, setNewUsername] = useState('')
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [dialogSuccess, setDialogSuccess] = useState('')

  // Email verification OTP modal state
  const [otp, setOtp] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)

  // Privacy Preference states
  const [appearOnLeaderboard, setAppearOnLeaderboard] = useState<boolean>(user?.appearOnLeaderboard ?? true)
  const [allowPublicProfile, setAllowPublicProfile] = useState<boolean>(user?.allowPublicProfile ?? true)

  // Notification Preference states
  const [notifySiteFriendRequest, setNotifySiteFriendRequest] = useState<boolean>(user?.notifySiteFriendRequest ?? true)
  const [notifySiteDuelChallenge, setNotifySiteDuelChallenge] = useState<boolean>(user?.notifySiteDuelChallenge ?? true)
  const [notifySiteMatchTournament, setNotifySiteMatchTournament] = useState<boolean>(user?.notifySiteMatchTournament ?? true)
  const [notifyEmailAnnouncements, setNotifyEmailAnnouncements] = useState<boolean>(user?.notifyEmailAnnouncements ?? true)
  const [notifyEmailPromotions, setNotifyEmailPromotions] = useState<boolean>(user?.notifyEmailPromotions ?? true)

  useEffect(() => {
    if (user) {
      if (user.appearOnLeaderboard !== undefined) setAppearOnLeaderboard(user.appearOnLeaderboard)
      if (user.allowPublicProfile !== undefined) setAllowPublicProfile(user.allowPublicProfile)
      if (user.notifySiteFriendRequest !== undefined) setNotifySiteFriendRequest(user.notifySiteFriendRequest)
      if (user.notifySiteDuelChallenge !== undefined) setNotifySiteDuelChallenge(user.notifySiteDuelChallenge)
      if (user.notifySiteMatchTournament !== undefined) setNotifySiteMatchTournament(user.notifySiteMatchTournament)
      if (user.notifyEmailAnnouncements !== undefined) setNotifyEmailAnnouncements(user.notifyEmailAnnouncements)
      if (user.notifyEmailPromotions !== undefined) setNotifyEmailPromotions(user.notifyEmailPromotions)
    }
  }, [user])

  const handleToggleLeaderboard = async (checked: boolean) => {
    setAppearOnLeaderboard(checked)
    try {
      const res = await api.patch('/user/update_profile', { appearOnLeaderboard: checked })
      if (res.data?.user) setUser(res.data.user)
      toast.success('Study plan leaderboard preference updated successfully')
    } catch (err: any) {
      console.error('Failed to update leaderboard preference:', err)
      setAppearOnLeaderboard(!checked)
      toast.error(err.response?.data?.message || 'Failed to update setting')
    }
  }

  const handleTogglePublicProfile = async (checked: boolean) => {
    setAllowPublicProfile(checked)
    try {
      const res = await api.patch('/user/update_profile', { allowPublicProfile: checked })
      if (res.data?.user) setUser(res.data.user)
      toast.success('Public profile preference updated successfully')
    } catch (err: any) {
      console.error('Failed to update public profile preference:', err)
      setAllowPublicProfile(!checked)
      toast.error(err.response?.data?.message || 'Failed to update setting')
    }
  }

  const handleToggleNotifyField = async (
    field:
      | 'notifySiteFriendRequest'
      | 'notifySiteDuelChallenge'
      | 'notifySiteMatchTournament'
      | 'notifyEmailAnnouncements'
      | 'notifyEmailPromotions',
    checked: boolean
  ) => {
    if (field === 'notifySiteFriendRequest') setNotifySiteFriendRequest(checked)
    else if (field === 'notifySiteDuelChallenge') setNotifySiteDuelChallenge(checked)
    else if (field === 'notifySiteMatchTournament') setNotifySiteMatchTournament(checked)
    else if (field === 'notifyEmailAnnouncements') setNotifyEmailAnnouncements(checked)
    else if (field === 'notifyEmailPromotions') setNotifyEmailPromotions(checked)

    const labelMap: Record<string, string> = {
      notifySiteFriendRequest: 'Friend request notification setting',
      notifySiteDuelChallenge: '1v1 duel challenge notification setting',
      notifySiteMatchTournament: 'Match & tournament notification setting',
      notifyEmailAnnouncements: 'Announcement notification setting',
      notifyEmailPromotions: 'Promotional event notification setting',
    }

    try {
      const res = await api.patch('/user/update_profile', { [field]: checked })
      if (res.data?.user) setUser(res.data.user)
      toast.success(`${labelMap[field] || 'Notification setting'} updated successfully`)
    } catch (err: any) {
      console.error(`Failed to update ${field}:`, err)
      if (field === 'notifySiteFriendRequest') setNotifySiteFriendRequest(!checked)
      else if (field === 'notifySiteDuelChallenge') setNotifySiteDuelChallenge(!checked)
      else if (field === 'notifySiteMatchTournament') setNotifySiteMatchTournament(!checked)
      else if (field === 'notifyEmailAnnouncements') setNotifyEmailAnnouncements(!checked)
      else if (field === 'notifyEmailPromotions') setNotifyEmailPromotions(!checked)
      toast.error(err.response?.data?.message || 'Failed to update setting')
    }
  }

  // Sync initial values when dialogs open
  useEffect(() => {
    if (isIdDialogOpen && user?.username) {
      setNewUsername(user.username)
      setIsUsernameAvailable(null)
      setDialogError('')
      setDialogSuccess('')
    }
  }, [isIdDialogOpen, user?.username])

  // Debounced username availability checker
  useEffect(() => {
    if (!newUsername || newUsername === user?.username) {
      setIsUsernameAvailable(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true)
      try {
        const res = await api.get(`/user/check_username?username=${encodeURIComponent(newUsername)}`)
        setIsUsernameAvailable(res.data.available)
      } catch (err) {
        setIsUsernameAvailable(null)
      } finally {
        setIsCheckingUsername(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [newUsername, user?.username])

  // Handle Username Update
  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUsername || newUsername === user?.username || isUsernameAvailable === false) return
    setIsSubmitting(true)
    setDialogError('')
    setDialogSuccess('')
    try {
      const res = await api.patch('/user/update_profile', { username: newUsername })
      if (res.data?.user) {
        setUser(res.data.user)
      }
      setDialogSuccess('CodeRival ID updated successfully!')
      toast.success('CodeRival ID updated successfully')
      setTimeout(() => {
        setIsIdDialogOpen(false)
        setDialogSuccess('')
      }, 1200)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update CodeRival ID'
      setDialogError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Password Update
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setDialogError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setDialogError('New passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setDialogError('')
    setDialogSuccess('')
    try {
      await api.post('/user/change_password', {
        oldPassword,
        newPassword,
      })
      setDialogSuccess('Password updated successfully!')
      toast.success('Password updated successfully')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setIsPasswordDialogOpen(false)
        setDialogSuccess('')
      }, 1200)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update password'
      setDialogError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Send OTP
  const handleSendEmailOtp = async () => {
    if (!user?.email) return
    setIsSendingOtp(true)
    setDialogError('')
    try {
      await api.post('/auth/verify-email', { email: user.email })
      setDialogSuccess('Verification code sent to your email!')
      toast.success('Verification code sent to your email')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send OTP'
      setDialogError(msg)
      toast.error(msg)
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Handle Verify OTP Submit
  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp || otp.length < 6 || !user?.email) {
      setDialogError('Please enter a valid 6-digit code.')
      return
    }
    setIsVerifyingOtp(true)
    setDialogError('')
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
      setDialogSuccess('Email verified successfully!')
      toast.success('Email verified successfully')
      setTimeout(() => {
        setIsEmailDialogOpen(false)
        setDialogSuccess('')
        setOtp('')
      }, 1200)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP code.'
      setDialogError(msg)
      toast.error(msg)
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Handle Delete Account
  const handleDeleteAccount = async () => {
    setIsSubmitting(true)
    setDialogError('')
    try {
      await api.delete('/user/delete_account')
      logout()
      router.push('/signin')
    } catch (err: any) {
      setDialogError(err.response?.data?.message || 'Failed to delete account')
      setIsSubmitting(false)
    }
  }

  // OAuth Link Action
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
  const handleLinkOAuth = (provider: 'google' | 'github') => {
    window.location.href = `${API_URL}/auth/${provider}?redirect=/settings`
  }

  // Helper to mask email (e.g. amarpandey****@gmail.com)
  const formatMaskedEmail = (emailStr?: string) => {
    if (!emailStr) return 'Not Set'
    const parts = emailStr.split('@')
    if (parts.length < 2) return emailStr
    const namePart = parts[0]
    const domainPart = parts[1]
    if (namePart.length <= 4) {
      return `${namePart}****@${domainPart}`
    }
    return `${namePart.slice(0, 4)}****@${domainPart}`
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ─── LEFT SIDEBAR: SETTINGS MENU ─── */}
          <div className="lg:col-span-3 space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground px-1 font-sans">
              Settings
            </h1>

            <nav className="space-y-1">
              {/* Accounts Tab (Default / Active) */}
              <button
                onClick={() => setActiveTab('accounts')}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer border ${
                  activeTab === 'accounts'
                    ? 'border-border bg-surface-2 text-foreground shadow-xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface/50'
                }`}
              >
                <span>Accounts</span>
              </button>

              {/* Privacy Tab */}
              <button
                onClick={() => setActiveTab('privacy')}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer border ${
                  activeTab === 'privacy'
                    ? 'border-border bg-surface-2 text-foreground shadow-xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface/50'
                }`}
              >
                <span>Privacy</span>
              </button>

              {/* Notification Tab */}
              <button
                onClick={() => setActiveTab('notification')}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer border ${
                  activeTab === 'notification'
                    ? 'border-border bg-surface-2 text-foreground shadow-xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface/50'
                }`}
              >
                <span>Notification</span>
              </button>

              {/* Profile Navigation Link */}
              <Link href="/settings/profile" className="block group">
                <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-surface/50 transition-colors border border-transparent">
                  <span>Profile</span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                </div>
              </Link>
            </nav>
          </div>

          {/* ─── RIGHT MAIN PANEL: CONTENT (ACCOUNTS DEFAULT) ─── */}
          <div className="lg:col-span-9 space-y-8">
            
            {activeTab === 'accounts' && (
              <>
                {/* 1. GENERAL SECTION */}
                <div className="space-y-3">
                  <div>
                    <h2 className="text-lg font-bold text-foreground tracking-tight">General</h2>
                    <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                      You can log in using your email or CodeRival ID.
                    </p>
                  </div>

                  {/* Rounded Container Box */}
                  <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border shadow-xs">
                    
                    {/* Item 1: CodeRival ID */}
                    <div
                      onClick={() => setIsIdDialogOpen(true)}
                      className="p-4 sm:p-5 flex items-center justify-between hover:bg-surface-2/60 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4 sm:gap-8 min-w-0">
                        <span className="text-sm font-semibold text-foreground w-28 sm:w-36 shrink-0 flex items-center gap-2">
                          <AtSign className="w-4 h-4 text-muted-foreground" /> CodeRival ID
                        </span>
                        <span className="text-sm font-mono text-muted-foreground truncate">
                          {user?.username || 'amarpandey2502'}
                        </span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
                    </div>

                    {/* Item 2: Email */}
                    <div
                      onClick={() => setIsEmailDialogOpen(true)}
                      className="p-4 sm:p-5 flex items-center justify-between hover:bg-surface-2/60 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4 sm:gap-8 min-w-0">
                        <span className="text-sm font-semibold text-foreground w-28 sm:w-36 shrink-0 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" /> Email
                        </span>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-mono text-muted-foreground truncate">
                            {formatMaskedEmail(user?.email)}
                          </span>
                          {user?.emailVerified && (
                            <span title="Verified Email">
                              <BadgeCheck className="w-4 h-4 text-blue-400 fill-blue-500/20 shrink-0" />
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
                    </div>

                    {/* Item 3: Password */}
                    <div
                      onClick={() => setIsPasswordDialogOpen(true)}
                      className="p-4 sm:p-5 flex items-center justify-between hover:bg-surface-2/60 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4 sm:gap-8 min-w-0">
                        <span className="text-sm font-semibold text-foreground w-28 sm:w-36 shrink-0 flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-muted-foreground" /> Password
                        </span>
                        <span className="text-sm font-mono text-muted-foreground truncate">
                          {user?.hasPassword ? '••••••••' : 'Not Set'}
                        </span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
                    </div>

                  </div>
                </div>

                {/* 2. SOCIAL ACCOUNTS SECTION */}
                <div className="space-y-3">
                  <div>
                    <h2 className="text-lg font-bold text-foreground tracking-tight">Social Accounts</h2>
                    <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                      Connect a social account to sign in to CodeRival.
                    </p>
                  </div>

                  {/* Rounded Container Box */}
                  <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border shadow-xs">
                    
                    {/* Google */}
                    <div className="p-4 sm:p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FcGoogle className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-semibold text-foreground">Google</span>
                      </div>

                      {user?.googleId ? (
                        <span className="px-4 py-1.5 rounded-xl bg-surface border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                          Connected
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLinkOAuth('google')}
                          className="border-border bg-surface hover:bg-surface-2 text-foreground text-xs font-semibold px-5 rounded-xl"
                        >
                          Connect
                        </Button>
                      )}
                    </div>

                    {/* GitHub */}
                    <div className="p-4 sm:p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FaGithub className="w-5 h-5 shrink-0 text-foreground" />
                        <span className="text-sm font-semibold text-foreground">Github</span>
                      </div>

                      {user?.githubId ? (
                        <span className="px-4 py-1.5 rounded-xl bg-surface border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                          Connected
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLinkOAuth('github')}
                          className="border-border bg-surface hover:bg-surface-2 text-foreground text-xs font-semibold px-5 rounded-xl"
                        >
                          Connect
                        </Button>
                      )}
                    </div>

                  </div>
                </div>

                {/* 3. DANGER ZONE SECTION */}
                <div className="space-y-3 pt-2">
                  <div>
                    <h2 className="text-lg font-bold text-foreground tracking-tight">Danger Zone</h2>
                  </div>

                  {/* Rounded Container Box */}
                  <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                    <div
                      onClick={() => setIsDeleteAccountDialogOpen(true)}
                      className="p-4 sm:p-5 flex items-center justify-between hover:bg-rose-500/5 transition-colors cursor-pointer group"
                    >
                      <span className="text-sm font-semibold text-rose-500 flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-rose-500" /> Delete Account
                      </span>
                      <ArrowRight className="w-5 h-5 text-rose-500 group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* PRIVACY TAB CONTENT */}
            {activeTab === 'privacy' && (
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">Profile Visibility</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                    We respect your privacy and never share your data without consent.
                  </p>
                </div>

                {/* Rounded Container Box */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border shadow-xs">
                  {/* Item 1: Leaderboard */}
                  <div className="p-4 sm:p-5 flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-muted-foreground" /> Appear on the Study Plan Leaderboard
                    </span>
                    <Switch
                      checked={appearOnLeaderboard}
                      onCheckedChange={handleToggleLeaderboard}
                    />
                  </div>

                  {/* Item 2: Public Profile */}
                  <div className="p-4 sm:p-5 flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Eye className="w-4 h-4 text-muted-foreground" /> Allow other people to see your profile
                    </span>
                    <Switch
                      checked={allowPublicProfile}
                      onCheckedChange={handleTogglePublicProfile}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATION TAB CONTENT */}
            {activeTab === 'notification' && (
              <div className="space-y-8">
                {/* SUBSECTION 1: SITE NOTIFICATION */}
                <div className="space-y-3">
                  <div>
                    <h2 className="text-lg font-bold text-foreground tracking-tight">Site Notification</h2>
                    <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                      Receive Website / Browser Notifications
                    </p>
                  </div>

                  {/* Rounded Container Box */}
                  <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border shadow-xs">
                    {/* Item 1: Friend Requests */}
                    <div className="p-4 sm:p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserPlus className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-sm font-semibold text-foreground">Friend Requests</span>
                      </div>
                      <Switch
                        checked={notifySiteFriendRequest}
                        onCheckedChange={(val) => handleToggleNotifyField('notifySiteFriendRequest', val)}
                      />
                    </div>

                    {/* Item 2: 1v1 Duel Challenges */}
                    <div className="p-4 sm:p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Swords className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-sm font-semibold text-foreground">1v1 Duel Challenges</span>
                      </div>
                      <Switch
                        checked={notifySiteDuelChallenge}
                        onCheckedChange={(val) => handleToggleNotifyField('notifySiteDuelChallenge', val)}
                      />
                    </div>

                    {/* Item 3: Match & Tournament Updates */}
                    <div className="p-4 sm:p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-sm font-semibold text-foreground">Match & Tournament Updates</span>
                      </div>
                      <Switch
                        checked={notifySiteMatchTournament}
                        onCheckedChange={(val) => handleToggleNotifyField('notifySiteMatchTournament', val)}
                      />
                    </div>
                  </div>
                </div>

                {/* SUBSECTION 2: EMAIL */}
                <div className="space-y-3">
                  <div>
                    <h2 className="text-lg font-bold text-foreground tracking-tight">Email</h2>
                    <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                      Receive notifications via your primary email.
                    </p>
                  </div>

                  {/* Rounded Container Box */}
                  <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border shadow-xs">
                    {/* Item 1: Important Announcements */}
                    <div className="p-4 sm:p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Megaphone className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="text-sm font-semibold text-foreground">Important Announcements</span>
                      </div>
                      <Switch
                        checked={notifyEmailAnnouncements}
                        onCheckedChange={(val) => handleToggleNotifyField('notifyEmailAnnouncements', val)}
                      />
                    </div>

                    {/* Item 2: Promotional Events */}
                    <div className="p-4 sm:p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
                        <span className="text-sm font-semibold text-foreground">Promotional Events & Community Updates</span>
                      </div>
                      <Switch
                        checked={notifyEmailPromotions}
                        onCheckedChange={(val) => handleToggleNotifyField('notifyEmailPromotions', val)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </main>

      {/* ─── DIALOG 1: CODERIVAL ID (USERNAME) DIALOG ─── */}
      <Dialog open={isIdDialogOpen} onOpenChange={setIsIdDialogOpen}>
        <DialogContent showCloseButton className="bg-card border border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
              Change CodeRival ID
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update your unique CodeRival display handle
            </DialogDescription>
          </DialogHeader>

          {dialogError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{dialogError}</span>
            </div>
          )}

          {dialogSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{dialogSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpdateUsername} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">CodeRival ID</label>
                {isCheckingUsername && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                    <Loader2 className="w-3 h-3 animate-spin text-accent" /> Checking...
                  </span>
                )}
                {!isCheckingUsername && isUsernameAvailable === true && (
                  <span className="text-[11px] text-emerald-400 font-semibold">Available</span>
                )}
                {!isCheckingUsername && isUsernameAvailable === false && (
                  <span className="text-[11px] text-rose-400 font-semibold">Handle Taken</span>
                )}
              </div>
              <Input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter handle"
                className="bg-surface border-border text-foreground font-mono"
                autoFocus
              />
            </div>

            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsIdDialogOpen(false)}
                className="border-border text-muted-foreground hover:bg-surface-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isUsernameAvailable === false || newUsername === user?.username}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save ID'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG 2: EMAIL SETTINGS & VERIFICATION DIALOG ─── */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent showCloseButton className="bg-card border border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <Mail className="w-5 h-5 text-accent" /> Email Settings
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Your registered email address and verification status
            </DialogDescription>
          </DialogHeader>

          {dialogError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{dialogError}</span>
            </div>
          )}

          {dialogSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{dialogSuccess}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Registered Email</label>
              <Input
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-surface/50 border-border text-muted-foreground font-mono cursor-not-allowed"
              />
            </div>

            {user?.emailVerified ? (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 fill-blue-500 text-background shrink-0" />
                <span>Your email is verified! Blue badge active.</span>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Email unverified. Verify to unlock blue tick badge.</span>
                </div>

                <form onSubmit={handleVerifyEmailOtp} className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                      className="bg-surface border-border text-foreground font-mono text-center tracking-widest text-lg h-10"
                    />
                    <Button
                      type="button"
                      onClick={handleSendEmailOtp}
                      disabled={isSendingOtp}
                      variant="outline"
                      className="border-border bg-surface hover:bg-surface-2 text-foreground text-xs shrink-0"
                    >
                      {isSendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Code'}
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isVerifyingOtp || otp.length < 6}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-10"
                  >
                    {isVerifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Code'}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG 3: PASSWORD DIALOG ─── */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent showCloseButton className="bg-card border border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-accent" />
              <span>{user?.hasPassword ? 'Change Password' : 'Set Account Password'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {user?.hasPassword
                ? 'Update your account security password'
                : 'Set a password to log in directly with your email'}
            </DialogDescription>
          </DialogHeader>

          {dialogError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{dialogError}</span>
            </div>
          )}

          {dialogSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{dialogSuccess}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 py-2">
            {user?.hasPassword && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Current Password</label>
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="bg-surface border-border text-foreground"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="bg-surface border-border text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Confirm New Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="bg-surface border-border text-foreground"
              />
            </div>

            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(false)}
                className="border-border text-muted-foreground hover:bg-surface-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !newPassword}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG 4: DELETE ACCOUNT CONFIRMATION DIALOG ─── */}
      <Dialog open={isDeleteAccountDialogOpen} onOpenChange={setIsDeleteAccountDialogOpen}>
        <DialogContent showCloseButton className="bg-card border border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-500 tracking-tight flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" /> Delete Account Permanently
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete your account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {dialogError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{dialogError}</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs leading-relaxed space-y-2">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" /> Danger: Data Loss Warning
            </p>
            <p>
              Deleting your CodeRival account will erase your rating history, submissions, tournament entries, and friends list.
            </p>
          </div>

          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteAccountDialogOpen(false)}
              className="border-border text-muted-foreground hover:bg-surface-2"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Delete My Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
