'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Zap, Trophy } from 'lucide-react'

export function CTASection() {
  return (
    <section className="py-24 px-4 bg-background relative overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-3xl border border-primary/30 bg-linear-to-b from-card via-surface to-card overflow-hidden p-10 md:p-16 text-center shadow-2xl shadow-primary/10">
          {/* Animated glow orbs */}
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-float-delayed" />

          {/* Content */}
          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 animate-pulse" />
              Join The Arena
            </div>

            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground text-balance leading-[1.15]">
              Ready to Prove Your <span className="bg-linear-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Coding Mastery</span>?
            </h2>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Join thousands of competitive programmers. Match instantly, battle 1v1 in real-time, and claim your place on the global podium.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-13 px-8 text-base font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 group"
                >
                  Create Free Account
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-border hover:bg-surface rounded-xl h-13 px-8 text-base font-semibold text-foreground group"
                >
                  <Trophy className="mr-2 w-5 h-5 text-amber-400" />
                  View Leaderboard
                </Button>
              </Link>
            </div>

            <p className="text-xs text-muted-foreground pt-4">
              Free forever. No credit card required. Start competing in seconds.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
