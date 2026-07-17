'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Zap } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden bg-background">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Real-Time 1v1 Coding Battles</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold text-balance leading-tight mb-6">
          <span className="text-foreground">Compete. </span>
          <span className="bg-linear-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            Code. Win.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto mb-8 leading-relaxed">
          Challenge other programmers in real-time coding battles. Solve problems faster, climb the global leaderboard, and prove your competitive edge.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link href="/register">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-12 px-8 font-semibold group"
            >
              Start Competing Now
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="border-border hover:bg-surface rounded-lg h-12 px-8 font-semibold"
          >
            Watch Demo
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-border">
          <div>
            <div className="text-3xl font-bold text-primary">50K+</div>
            <p className="text-sm text-muted-foreground mt-2">Active Players</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">1M+</div>
            <p className="text-sm text-muted-foreground mt-2">Matches Played</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">3</div>
            <p className="text-sm text-muted-foreground mt-2">Languages</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">24/7</div>
            <p className="text-sm text-muted-foreground mt-2">Live Ranking</p>
          </div>
        </div>
      </div>
    </section>
  )
}
