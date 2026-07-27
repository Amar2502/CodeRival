'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Zap, Code2, Swords, LayoutDashboard, User, LogOut, Trophy, Users } from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'
import { getRatingInfo } from '@/lib/rating'

import { UserAvatar } from '@/components/UserAvatar'

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    // Clear cookie / session if needed
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    router.push('/signin')
  }

  const ratingInfo = getRatingInfo(user?.rating || 1200)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold text-xl text-foreground hover:opacity-90 transition-opacity">
          <div className="p-1.5 rounded-lg bg-linear-to-br from-primary to-accent">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="bg-linear-to-r from-primary via-primary to-accent bg-clip-text text-transparent tracking-tight">
            CodeRival
          </span>
        </Link>

        {/* Nav Links */}
        {user ? (
          <div className="flex items-center gap-1 sm:gap-2">
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

        {/* CTA / Profile Buttons */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
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
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
