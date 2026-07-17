'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Zap } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-foreground hover:opacity-80 transition-opacity">
          <div className="p-2 rounded-lg bg-linear-to-br from-primary to-accent">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="bg-linear-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            CodeRival
          </span>
        </Link>

        {/* Nav Links */}
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

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
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
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  )
}
