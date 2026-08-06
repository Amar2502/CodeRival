'use client'

import { Zap } from 'lucide-react'

export function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/10 rounded-full blur-2xl animate-pulse delay-300" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* Animated Glowing Logo Container */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary via-rose-400 to-accent blur-md opacity-75 animate-pulse" />
          <div className="relative p-4 rounded-2xl bg-surface border border-border shadow-2xl flex items-center justify-center">
            <Zap className="w-10 h-10 text-primary animate-bounce" />
          </div>
        </div>

        {/* Brand Name & Loading Text */}
        <div className="flex flex-col items-center gap-1">
          <span className="font-black text-2xl tracking-tight bg-gradient-to-r from-primary via-rose-400 to-accent bg-clip-text text-transparent">
            CodeRival
          </span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            <span>Initializing session...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
