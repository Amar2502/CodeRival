'use client'

import Link from 'next/link'
import { Zap } from 'lucide-react'
import { FaGithub, FaXTwitter, FaDiscord } from 'react-icons/fa6'

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/95 relative">
      {/* Top accent line */}
      <div className="h-[1px] w-full bg-linear-to-r from-transparent via-primary/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-foreground hover:opacity-90 transition-opacity">
              <div className="p-2 rounded-lg bg-linear-to-br from-primary to-accent shadow-sm shadow-primary/20">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="bg-linear-to-r from-primary via-primary to-accent bg-clip-text text-transparent tracking-tight">
                CodeRival
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Real-time 1v1 competitive programming platform. Challenge peers, rank up on live leaderboards, and sharpen algorithmic speed.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                <FaGithub className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
                <FaXTwitter className="w-4 h-4" />
              </a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Discord">
                <FaDiscord className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Navigation Columns */}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-foreground mb-4">Platform</h3>
            <ul className="space-y-2.5">
              <li><a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">Features</a></li>
              <li><a href="#modes" className="text-sm text-muted-foreground hover:text-primary transition-colors">Game Modes</a></li>
              <li><Link href="/problems" className="text-sm text-muted-foreground hover:text-primary transition-colors">Problem Set</Link></li>
              <li><Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Leaderboard</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-foreground mb-4">Community</h3>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Discord Server</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Twitter Updates</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Open Source</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-foreground mb-4">Legal & System</h3>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Security Sandbox</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">API Status</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CodeRival Inc. All rights reserved. Built for competitive coders.
          </p>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
