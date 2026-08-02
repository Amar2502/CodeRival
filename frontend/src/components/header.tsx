'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Zap, Code2, Swords, LayoutDashboard, User, LogOut, Trophy, Users, Menu, X } from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'
import { getRatingInfo } from '@/lib/rating'
import { UserAvatar } from '@/components/UserAvatar'
import { isDevelopment } from '@/lib/config'

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    router.push('/signin')
  }

  const ratingInfo = getRatingInfo(user?.rating || 1200)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md transition-all">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold text-xl text-foreground hover:opacity-90 transition-opacity">
          <div className="p-1.5 rounded-lg bg-linear-to-br from-primary to-accent shadow-sm shadow-primary/20">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="bg-linear-to-r from-primary via-primary to-accent bg-clip-text text-transparent tracking-tight">
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
                <span>Dashboard</span>
              </Button>
            </Link>
            <Link href="/problems">
              <Button
                variant={pathname.startsWith('/problems') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 text-sm font-medium"
              >
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>Problems</span>
              </Button>
            </Link>
            <Link href="/battles">
              <Button
                variant={pathname.startsWith('/battles') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 text-sm font-medium"
              >
                <Swords className="w-4 h-4 text-rose-500 animate-pulse" />
                <span>1v1 Battles</span>
              </Button>
            </Link>
            <Link href="/friends">
              <Button
                variant={pathname.startsWith('/friends') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 text-sm font-medium"
              >
                <Users className="w-4 h-4 text-accent" />
                <span>Friends</span>
              </Button>
            </Link>
            <Link href="/tournaments">
              <Button
                variant={pathname.startsWith('/tournaments') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 text-sm font-medium"
              >
                <Trophy className="w-4 h-4 text-purple-400" />
                <span>Tournaments</span>
                {!isDevelopment && (
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 tracking-wide">
                    Upcoming
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
              <Link href="/profile" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 transition-colors">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className={`text-xs font-semibold ${ratingInfo.colorClass}`}>
                  {user.rating || 1200}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  @{user.username}
                </span>
              </Link>
              <Link href="/profile">
                <UserAvatar src={user.avatar_url || user.avatar} username={user.username} name={user.name} size="sm" />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Log out"
                className="hidden sm:flex text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4" />
              </Button>
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
              <Link href="/problems" onClick={() => setMobileMenuOpen(false)}>
                <Button variant={pathname.startsWith('/problems') ? 'secondary' : 'ghost'} className="w-full justify-start gap-3">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span>Problems</span>
                </Button>
              </Link>
              <Link href="/battles" onClick={() => setMobileMenuOpen(false)}>
                <Button variant={pathname.startsWith('/battles') ? 'secondary' : 'ghost'} className="w-full justify-start gap-3">
                  <Swords className="w-4 h-4 text-rose-500 animate-pulse" />
                  <span>1v1 Battles</span>
                </Button>
              </Link>
              <Link href="/friends" onClick={() => setMobileMenuOpen(false)}>
                <Button variant={pathname.startsWith('/friends') ? 'secondary' : 'ghost'} className="w-full justify-start gap-3">
                  <Users className="w-4 h-4 text-accent" />
                  <span>Friends</span>
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
              <Link href="/leaderboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant={pathname.startsWith('/leaderboard') ? 'secondary' : 'ghost'} className="w-full justify-start gap-3">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Leaderboard</span>
                </Button>
              </Link>
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
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
