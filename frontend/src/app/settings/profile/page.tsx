'use client'

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowRight,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
  UserCheck,
  MapPin,
  Globe,
  Share2,
  Trash2,
} from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'
import { api } from '@/lib/axios'
import { toast } from 'sonner'
import { FaGithub, FaXTwitter, FaLinkedin } from 'react-icons/fa6'

export default function SettingsProfilePage() {
  const { user, setUser } = useAuthStore()

  // Avatar upload refs & states
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  // Dialog open states
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false)
  const [isGenderDialogOpen, setIsGenderDialogOpen] = useState(false)
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false)
  const [isWebsiteDialogOpen, setIsWebsiteDialogOpen] = useState(false)
  const [isGithubDialogOpen, setIsGithubDialogOpen] = useState(false)
  const [isTwitterDialogOpen, setIsTwitterDialogOpen] = useState(false)
  const [isLinkedinDialogOpen, setIsLinkedinDialogOpen] = useState(false)

  // Form field states
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [country, setCountry] = useState('')
  const [website, setWebsite] = useState('')
  const [githubHandle, setGithubHandle] = useState('')
  const [twitterHandle, setTwitterHandle] = useState('')
  const [linkedinHandle, setLinkedinHandle] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form state from user
  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setGender(user.gender || '')
      setCountry(user.country || '')
      setWebsite(user.website || '')
      setGithubHandle(user.githubHandle || '')
      setTwitterHandle(user.twitterHandle || '')
      setLinkedinHandle(user.linkedinHandle || '')
    }
  }, [user])

  // Avatar change handler
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
        toast.success('Avatar updated successfully')
      }
    } catch (err: any) {
      console.error('Failed to upload avatar:', err)
      toast.error(err.response?.data?.message || 'Failed to upload avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // Handle generic profile field update
  const handleUpdateProfileField = async (
    payload: Record<string, any>,
    successMessage: string,
    closeModal: () => void
  ) => {
    setIsSubmitting(true)
    try {
      const res = await api.patch('/user/update_profile', payload)
      if (res.data?.user) {
        setUser(res.data.user)
      }
      toast.success(successMessage)
      closeModal()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-10">
        
        {/* ─── TOP CENTER: AVATAR BOX ─── */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative group cursor-pointer"
          >
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border-2 border-border bg-card flex items-center justify-center text-foreground font-black text-4xl sm:text-5xl overflow-hidden shadow-xl relative transition-all group-hover:border-accent">
              {user?.avatar_url || user?.avatar ? (
                <img
                  src={user.avatar_url || user.avatar}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user?.name?.charAt(0) || user?.username?.charAt(0) || 'A'}</span>
              )}

              {/* Hover overlay icon */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity font-mono text-xs gap-1.5">
                {isUploadingAvatar ? (
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-foreground" />
                    <span>Change Photo</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── MAIN CONTENT: GENERAL SECTION ─── */}
        <div className="space-y-4 max-w-2xl mx-auto w-full">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">General</h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-sans">
              Manage your basic profile information.
            </p>
          </div>

          {/* Rounded Container Card */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border shadow-xs">
            
            {/* Item 1: Display Name */}
            <div
              onClick={() => setIsNameDialogOpen(true)}
              className="p-4 sm:p-5 flex items-center justify-between hover:bg-surface-2/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4 sm:gap-12 min-w-0">
                <span className="text-sm font-semibold text-foreground w-28 sm:w-32 shrink-0 flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" /> Display Name
                </span>
                <span className="text-sm font-medium text-foreground/90 truncate">
                  {user?.name || user?.username || 'Not Set'}
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
            </div>

            {/* Item 2: Gender */}
            <div
              onClick={() => setIsGenderDialogOpen(true)}
              className="p-4 sm:p-5 flex items-center justify-between hover:bg-surface-2/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4 sm:gap-12 min-w-0">
                <span className="text-sm font-semibold text-foreground w-28 sm:w-32 shrink-0 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-muted-foreground" /> Gender
                </span>
                <span className="text-sm font-medium text-foreground/90 truncate">
                  {user?.gender || 'Not Set'}
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
            </div>

            {/* Item 3: Location */}
            <div
              onClick={() => setIsLocationDialogOpen(true)}
              className="p-4 sm:p-5 flex items-center justify-between hover:bg-surface-2/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4 sm:gap-12 min-w-0">
                <span className="text-sm font-semibold text-foreground w-28 sm:w-32 shrink-0 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" /> Location
                </span>
                <span className="text-sm font-medium text-foreground/90 truncate">
                  {user?.country || 'Not Set'}
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
            </div>

            {/* Item 4: Website */}
            <div
              onClick={() => setIsWebsiteDialogOpen(true)}
              className="p-4 sm:p-5 flex items-center justify-between hover:bg-surface-2/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4 sm:gap-12 min-w-0">
                <span className="text-sm font-semibold text-foreground w-28 sm:w-32 shrink-0 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" /> Website
                </span>
                <span className="text-sm font-mono text-muted-foreground truncate">
                  {user?.website || 'Not Set'}
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
            </div>

            {/* Item 5: GitHub */}
            <div
              onClick={() => setIsGithubDialogOpen(true)}
              className="p-4 sm:p-5 flex items-center justify-between hover:bg-surface-2/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4 sm:gap-12 min-w-0">
                <span className="text-sm font-semibold text-foreground w-28 sm:w-32 shrink-0 flex items-center gap-2">
                  <FaGithub className="w-4 h-4 text-muted-foreground" /> GitHub
                </span>
                <span className="text-sm font-mono text-muted-foreground truncate">
                  {user?.githubHandle || 'Not Set'}
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
            </div>

            {/* Item 6: X / Twitter */}
            <div
              onClick={() => setIsTwitterDialogOpen(true)}
              className="p-4 sm:p-5 flex items-center justify-between hover:bg-surface-2/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4 sm:gap-12 min-w-0">
                <span className="text-sm font-semibold text-foreground w-28 sm:w-32 shrink-0 flex items-center gap-2">
                  <FaXTwitter className="w-4 h-4 text-muted-foreground" /> X (Twitter)
                </span>
                <span className="text-sm font-mono text-muted-foreground truncate">
                  {user?.twitterHandle || 'Not Set'}
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
            </div>

            {/* Item 7: LinkedIn */}
            <div
              onClick={() => setIsLinkedinDialogOpen(true)}
              className="p-4 sm:p-5 flex items-center justify-between hover:bg-surface-2/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4 sm:gap-12 min-w-0">
                <span className="text-sm font-semibold text-foreground w-28 sm:w-32 shrink-0 flex items-center gap-2">
                  <FaLinkedin className="w-4 h-4 text-muted-foreground" /> LinkedIn
                </span>
                <span className="text-sm font-mono text-muted-foreground truncate">
                  {user?.linkedinHandle || 'Not Set'}
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
            </div>

          </div>
        </div>
      </main>

      {/* ─── DIALOG 1: DISPLAY NAME ─── */}
      <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
        <DialogContent showCloseButton className="bg-card border border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Change Display Name</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your preferred display name
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleUpdateProfileField({ name }, 'Display name updated successfully', () => setIsNameDialogOpen(false))
            }}
            className="space-y-4 py-2"
          >
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="bg-surface border-border text-foreground"
              autoFocus
            />

            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNameDialogOpen(false)}
                className="border-border text-muted-foreground hover:bg-surface-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 font-bold">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Name'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG 2: GENDER ─── */}
      <Dialog open={isGenderDialogOpen} onOpenChange={setIsGenderDialogOpen}>
        <DialogContent showCloseButton className="bg-card border border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Select Gender</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose your gender preference
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleUpdateProfileField({ gender }, 'Gender updated successfully', () => setIsGenderDialogOpen(false))
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              {['Male', 'Female', 'Non-Binary', 'Prefer not to say'].map((option) => (
                <label
                  key={option}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                    gender === option
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-foreground font-bold'
                      : 'border-border bg-surface text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="text-xs">{option}</span>
                  <input
                    type="radio"
                    name="genderOption"
                    value={option}
                    checked={gender === option}
                    onChange={(e) => setGender(e.target.value)}
                    className="accent-emerald-500"
                  />
                </label>
              ))}
            </div>

            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsGenderDialogOpen(false)}
                className="border-border text-muted-foreground hover:bg-surface-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 font-bold">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Gender'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG 3: LOCATION ─── */}
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent showCloseButton className="bg-card border border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent" /> Change Location
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your country, state, or city
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleUpdateProfileField({ country }, 'Location updated successfully', () => setIsLocationDialogOpen(false))
            }}
            className="space-y-4 py-2"
          >
            <Input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. India, Maharashtra, Mumbai"
              className="bg-surface border-border text-foreground"
              autoFocus
            />

            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLocationDialogOpen(false)}
                className="border-border text-muted-foreground hover:bg-surface-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 font-bold">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Location'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG 4: WEBSITE ─── */}
      <Dialog open={isWebsiteDialogOpen} onOpenChange={setIsWebsiteDialogOpen}>
        <DialogContent showCloseButton className="bg-card border border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Globe className="w-5 h-5 text-accent" /> Change Website URL
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your portfolio or personal website link
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleUpdateProfileField({ website }, 'Website updated successfully', () => setIsWebsiteDialogOpen(false))
            }}
            className="space-y-4 py-2"
          >
            <Input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="e.g. amarpandey.in"
              className="bg-surface border-border text-foreground font-mono"
              autoFocus
            />

            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsWebsiteDialogOpen(false)}
                className="border-border text-muted-foreground hover:bg-surface-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 font-bold">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Website'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG 5: GITHUB HANDLE ─── */}
      <Dialog open={isGithubDialogOpen} onOpenChange={setIsGithubDialogOpen}>
        <DialogContent showCloseButton className="bg-card border border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <FaGithub className="w-5 h-5 text-accent" /> GitHub Handle
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your GitHub username
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleUpdateProfileField(
                { githubHandle },
                'GitHub handle updated successfully',
                () => setIsGithubDialogOpen(false)
              )
            }}
            className="space-y-4 py-2"
          >
            <Input
              type="text"
              value={githubHandle}
              onChange={(e) => setGithubHandle(e.target.value)}
              placeholder="e.g. mayur420"
              className="bg-surface border-border text-foreground font-mono"
              autoFocus
            />

            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsGithubDialogOpen(false)}
                className="border-border text-muted-foreground hover:bg-surface-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 font-bold">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save GitHub'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG 6: TWITTER / X HANDLE ─── */}
      <Dialog open={isTwitterDialogOpen} onOpenChange={setIsTwitterDialogOpen}>
        <DialogContent showCloseButton className="bg-card border border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <FaXTwitter className="w-5 h-5 text-accent" /> X (Twitter) Handle
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your X (Twitter) username
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleUpdateProfileField(
                { twitterHandle },
                'Twitter / X handle updated successfully',
                () => setIsTwitterDialogOpen(false)
              )
            }}
            className="space-y-4 py-2"
          >
            <Input
              type="text"
              value={twitterHandle}
              onChange={(e) => setTwitterHandle(e.target.value)}
              placeholder="e.g. amarpandey2502"
              className="bg-surface border-border text-foreground font-mono"
              autoFocus
            />

            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTwitterDialogOpen(false)}
                className="border-border text-muted-foreground hover:bg-surface-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 font-bold">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save X Handle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG 7: LINKEDIN HANDLE ─── */}
      <Dialog open={isLinkedinDialogOpen} onOpenChange={setIsLinkedinDialogOpen}>
        <DialogContent showCloseButton className="bg-card border border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <FaLinkedin className="w-5 h-5 text-accent" /> LinkedIn Handle
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your LinkedIn profile handle
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleUpdateProfileField(
                { linkedinHandle },
                'LinkedIn handle updated successfully',
                () => setIsLinkedinDialogOpen(false)
              )
            }}
            className="space-y-4 py-2"
          >
            <Input
              type="text"
              value={linkedinHandle}
              onChange={(e) => setLinkedinHandle(e.target.value)}
              placeholder="e.g. amar"
              className="bg-surface border-border text-foreground font-mono"
              autoFocus
            />

            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLinkedinDialogOpen(false)}
                className="border-border text-muted-foreground hover:bg-surface-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 font-bold">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save LinkedIn'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
