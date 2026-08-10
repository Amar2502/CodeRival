'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card/50 py-4 px-6 text-xs text-muted-foreground font-mono">
      <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          Copyright © {new Date().getFullYear()} CodeRival
        </div>
        <div className="flex items-center gap-2">
          <Link href="/help" className="hover:text-foreground transition-colors">
            Help Center
          </Link>
          <span className="text-border">|</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <span className="text-border">|</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
