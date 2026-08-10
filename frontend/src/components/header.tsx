'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Zap, Code2, Swords, LayoutDashboard, User, LogOut, Trophy, Users, Menu, X, Bell, Settings } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/authStore'
import { getRatingInfo } from '@/lib/rating'
import { UserAvatar } from '@/components/UserAvatar'
import { isDevelopment } from '@/lib/config'
import { api } from '@/lib/axios'
import { socket } from '@/lib/socket'

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pendingFriendsCount, setPendingFriendsCount] = useState<number>(0)

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      logout()
      router.push('/signin')
    }
  }

  const handleUserMenuAction = (value: string) => {
    if (value === 'profile') {
      router.push(`/${user?.username || 'me'}`)
    } else if (value === 'settings') {
      router.push('/settings')
    } else if (value === 'logout') {
      handleLogout()
    }
  }

  const ratingInfo = getRatingInfo(user?.rating || 1200)

  const fetchPendingCount = useCallback(async () => {
    if (!user) {
      setPendingFriendsCount(0)
      return
    }
    try {
      const res = await api.get('/friends')
      const incoming = res.data?.incomingRequests || []
      setPendingFriendsCount(incoming.length)
    } catch (err) {
      // Ignore fetch error silently
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    fetchPendingCount()

    const handleUpdate = () => {
      fetchPendingCount()
    }

    socket.on('friend:request_received', handleUpdate)
    socket.on('friend:request_accepted', handleUpdate)
    socket.on('friend:removed', handleUpdate)

    if (typeof window !== 'undefined') {
      window.addEventListener('friend_request_updated', handleUpdate)
    }

    return () => {
      socket.off('friend:request_received', handleUpdate)
      socket.off('friend:request_accepted', handleUpdate)
      socket.off('friend:removed', handleUpdate)
      if (typeof window !== 'undefined') {
        window.removeEventListener('friend_request_updated', handleUpdate)
      }
    }
  }, [user, fetchPendingCount, pathname])

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md transition-all">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 font-black text-xl text-foreground hover:opacity-95 transition-opacity group">
          <div className="p-1.5 rounded-xl bg-gradient-to-br from-primary via-primary to-accent shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-primary via-rose-400 to-accent bg-clip-text text-transparent tracking-tight font-black">
            CodeRival
          </span>
        </Link>

        {/* Desktop Nav Links */}
        {user ? (
          <div className="hidden lg:flex items-center gap-1 sm:gap-2">
            <Link href="/dashboard">
              <Button
                variant={pathname === '/dashboard' ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 text-sm font-medium"
              >
                <LayoutDashboard className="w-4 h-4 text-primary" />
                <span>Home</span>
              </Button>
            </Link>
            <Link href="/battles">
              <Button
                variant={pathname.startsWith('/battles') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 text-sm font-medium"
              >
                <Swords className="w-4 h-4 text-rose-500 animate-pulse" />
                <span>Battle</span>
              </Button>
            </Link>
            <Link href="/friends">
              <Button
                variant={pathname.startsWith('/friends') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 text-sm font-medium relative"
              >
                <Users className="w-4 h-4 text-accent" />
                <span>Friends</span>
                {pendingFriendsCount > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shadow-xs shadow-rose-500/50">
                    {pendingFriendsCount > 99 ? '99+' : pendingFriendsCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button
                variant={pathname.startsWith('/leaderboard') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 text-sm font-medium"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Leaderboard</span>
              </Button>
            </Link>
            <Link href="/tournaments">
              <Button
                variant={pathname.startsWith('/tournaments') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 text-sm font-medium"
              >
                <Trophy className="w-4 h-4 text-purple-400" />
                <span>Tournament</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#modes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Game Modes
            </a>
          </div>
        )}

        {/* CTA / Profile Buttons & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notification Bell Button */}
              <Link href="/friends" title="Notifications">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground hover:text-foreground hover:bg-surface border border-border/60 rounded-xl h-9 w-9"
                >
                  <Bell className="w-4 h-4 text-foreground" />
                  {pendingFriendsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse ring-2 ring-background" />
                  )}
                </Button>
              </Link>

              {/* Avatar Circle Dropdown using shadcn Select */}
              <Select onValueChange={handleUserMenuAction}>
                <SelectTrigger className="w-auto h-auto p-0 border-none bg-transparent hover:opacity-90 focus:ring-0 focus:outline-none rounded-full shadow-none cursor-pointer [&>svg]:hidden">
                  <div className="relative p-0.5 rounded-full border border-border hover:border-primary/50 transition-colors">
                    <UserAvatar src={user.avatar_url || user.avatar} username={user.username} name={user.name} size="md" />
                  </div>
                </SelectTrigger>
                <SelectContent position="popper" align="end" sideOffset={8} className="bg-card/95 backdrop-blur-xl border border-border shadow-2xl min-w-[210px] p-1.5 rounded-2xl z-50 animate-in fade-in-0 zoom-in-95">
                  {/* Clickable Profile Card Item */}
                  <SelectItem 
                    value="profile" 
                    className="cursor-pointer p-2 rounded-xl focus:bg-surface-2 hover:bg-surface-2 text-foreground focus:text-foreground data-[highlighted]:bg-surface-2 data-[highlighted]:text-foreground transition-colors group [&>span:first-child]:hidden"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <UserAvatar src={user.avatar_url || user.avatar} username={user.username} name={user.name} size="md" />
                      <div className="flex flex-col text-left min-w-0">
                        <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          @{user.username}
                        </span>
                        <span className={`text-[10px] font-extrabold ${ratingInfo.colorClass}`}>
                          {user.rating || 1200} ELO
                        </span>
                      </div>
                    </div>
                  </SelectItem>

                  <SelectSeparator className="my-1.5 bg-border/60" />

                  {/* Settings Item */}
                  <SelectItem 
                    value="settings" 
                    className="cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold text-foreground focus:bg-surface-2 hover:bg-surface-2 focus:text-foreground data-[highlighted]:bg-surface-2 data-[highlighted]:text-foreground transition-colors [&>span:first-child]:hidden"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-accent" />
                      <span>Settings</span>
                    </div>
                  </SelectItem>

                  <SelectSeparator className="my-1 bg-border/60" />

                  {/* Logout Item */}
                  <SelectItem 
                    value="logout" 
                    className="cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 focus:bg-rose-500/10 hover:bg-rose-500/10 focus:text-rose-400 data-[highlighted]:bg-rose-500/10 data-[highlighted]:text-rose-400 transition-colors [&>span:first-child]:hidden"
                  >
                    <div className="flex items-center gap-2.5">
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Log Out</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-3">
              <Link href="/signin">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-foreground hover:bg-surface"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold shadow-xs"
                >
                  Get Started
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-foreground hover:bg-surface"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border bg-background/95 backdrop-blur-xl px-4 py-4 space-y-3 animate-fade-in-up">
          {user ? (
            <div className="space-y-2">
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant={pathname === '/dashboard' ? 'secondary' : 'ghost'} className="w-full justify-start gap-3">
                  <LayoutDashboard className="w-4 h-4 text-primary" />
                  <span>Dashboard</span>
                </Button>
              </Link>

              <Link href="/battles" onClick={() => setMobileMenuOpen(false)}>
                <Button variant={pathname.startsWith('/battles') ? 'secondary' : 'ghost'} className="w-full justify-start gap-3">
                  <Swords className="w-4 h-4 text-rose-500 animate-pulse" />
                  <span>1v1 Battles</span>
                </Button>
              </Link>
              <Link href="/friends" onClick={() => setMobileMenuOpen(false)}>
                <Button variant={pathname.startsWith('/friends') ? 'secondary' : 'ghost'} className="w-full justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-accent" />
                    <span>Friends</span>
                  </div>
                  {pendingFriendsCount > 0 && (
                    <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shadow-sm shadow-rose-500/50">
                      {pendingFriendsCount > 99 ? '99+' : pendingFriendsCount}
                    </span>
                  )}
                </Button>
              </Link>
              <Link href="/leaderboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant={pathname.startsWith('/leaderboard') ? 'secondary' : 'ghost'} className="w-full justify-start gap-3">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Leaderboard</span>
                </Button>
              </Link>
              <Link href="/tournaments" onClick={() => setMobileMenuOpen(false)}>
                <Button variant={pathname.startsWith('/tournaments') ? 'secondary' : 'ghost'} className="w-full justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-4 h-4 text-purple-400" />
                    <span>Tournaments</span>
                  </div>
                  {!isDevelopment && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 tracking-wide">
                      Upcoming
                    </span>
                  )}
                </Button>
              </Link>
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <Link href={`/${user.username}`} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                  <UserAvatar src={user.avatar_url || user.avatar} username={user.username} name={user.name} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">@{user.username}</p>
                    <p className={`text-xs ${ratingInfo.colorClass}`}>{user.rating || 1200} ELO</p>
                  </div>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive gap-2">
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                Features
              </a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                How It Works
              </a>
              <a href="#modes" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                Game Modes
              </a>
              <div className="pt-3 border-t border-border flex gap-3">
                <Link href="/signin" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                  <Button variant="outline" className="w-full">Sign In</Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Get Started</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
