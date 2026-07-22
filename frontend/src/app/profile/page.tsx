'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { User, CheckCircle2, AlertCircle, Loader2, Save, Trophy, Swords, ShieldCheck, Mail, MapPin } from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'
import { getRatingInfo } from '@/lib/rating'
import { api } from '@/lib/axios'

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setUsername(user.username || '')
    }
  }, [user])

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
      })

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      if (user) {
        setUser({
          ...user,
          name: res.data.user.name,
          username: res.data.user.username,
        })
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

  const ratingInfo = getRatingInfo(user?.rating || 1200)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Profile Card Showcase */}
        <div className="relative p-6 sm:p-8 rounded-2xl bg-card border border-border overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-primary via-accent to-purple-600 flex items-center justify-center text-white font-black text-3xl shadow-lg shrink-0">
              {user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </div>

            <div className="space-y-1 text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-extrabold">{user?.name || user?.username}</h1>
                <span className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${ratingInfo.bgClass}`}>
                  {ratingInfo.title}
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-mono">@{user?.username}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-accent" /> {user?.email}</span>
                <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-amber-400" /> {user?.rating || 1200} ELO</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {user?.problemsSolved || 0} Solved</span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Settings Form */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-accent" /> Profile Settings
            </CardTitle>
            <CardDescription>Update your personal details and handle</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {message && (
                <div className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{message.text}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Display Name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="bg-surface border-border text-foreground"
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Username</label>
                  {isCheckingUsername && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin text-accent" /> Checking availability...
                    </span>
                  )}
                  {!isCheckingUsername && isUsernameAvailable === true && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Available
                    </span>
                  )}
                  {!isCheckingUsername && isUsernameAvailable === false && (
                    <span className="text-[11px] text-rose-400 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3" /> Taken
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

              {/* Email (Readonly) */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Email Address (Read-only)</label>
                <Input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-surface/50 border-border text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSaving || (isUsernameAvailable === false)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Profile</span>
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
