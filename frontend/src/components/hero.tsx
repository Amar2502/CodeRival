'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Zap, Play } from 'lucide-react'

function AnimatedCounter({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          let start = 0
          const step = Math.ceil(end / (duration / 16))
          const timer = setInterval(() => {
            start += step
            if (start >= end) {
              setCount(end)
              clearInterval(timer)
            } else {
              setCount(start)
            }
          }, 16)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [end, duration])

  return (
    <div ref={ref} className="text-3xl md:text-4xl font-black bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
      {count.toLocaleString()}{suffix}
    </div>
  )
}

export function Hero() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden bg-background">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--border-muted) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Floating gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/8 rounded-full blur-[100px] animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className={`relative z-10 max-w-5xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8 backdrop-blur-sm">
          <Zap className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-medium text-primary">Real-Time 1v1 Coding Battles</span>
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary">NEW</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-balance leading-[1.1] mb-6 tracking-tight">
          <span className="text-foreground">Compete. </span>
          <span className="bg-linear-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient-text bg-[length:200%_200%]">
            Code. Win.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto mb-10 leading-relaxed">
          Challenge other programmers in real-time coding battles. Solve problems faster,
          climb the global leaderboard, and prove your competitive edge.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link href="/register">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-13 px-8 font-semibold group shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300"
            >
              Start Competing Now
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/battles">
            <Button
              variant="outline"
              size="lg"
              className="border-border hover:bg-surface rounded-lg h-13 px-8 font-semibold group"
            >
              <Play className="mr-2 w-4 h-4 text-primary" />
              Watch Live Battles
            </Button>
          </Link>
        </div>

        {/* Code Preview Window */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="editor-chrome overflow-hidden shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-2/50">
              <span className="text-xs text-muted-foreground font-mono">battle.py — CodeRival Duel</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-success px-2 py-0.5 rounded bg-success/10">● LIVE</span>
              </div>
            </div>
            <pre className="text-left p-5 text-sm leading-relaxed overflow-hidden">
              <code className="font-mono">
                <span className="text-muted-foreground">{'# Solve faster than your rival'}</span>{'\n'}
                <span className="text-accent">def</span>{' '}
                <span className="text-warning">two_sum</span>
                <span className="text-foreground">(nums, target):</span>{'\n'}
                {'    '}<span className="text-foreground">seen = {'{}'}</span>{'\n'}
                {'    '}<span className="text-accent">for</span>{' '}
                <span className="text-foreground">i, n</span>{' '}
                <span className="text-accent">in</span>{' '}
                <span className="text-warning">enumerate</span>
                <span className="text-foreground">(nums):</span>{'\n'}
                {'        '}<span className="text-accent">if</span>{' '}
                <span className="text-foreground">target - n</span>{' '}
                <span className="text-accent">in</span>{' '}
                <span className="text-foreground">seen:</span>{'\n'}
                {'            '}<span className="text-accent">return</span>{' '}
                <span className="text-foreground">[seen[target-n], i]</span>{'\n'}
                {'        '}<span className="text-foreground">seen[n] = i</span>
                <span className="animate-blink text-primary">|</span>
              </code>
            </pre>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-border/50">
          <div className="space-y-1">
            <AnimatedCounter end={50000} suffix="+" />
            <p className="text-sm text-muted-foreground">Active Players</p>
          </div>
          <div className="space-y-1">
            <AnimatedCounter end={1000000} suffix="+" />
            <p className="text-sm text-muted-foreground">Matches Played</p>
          </div>
          <div className="space-y-1">
            <AnimatedCounter end={3} />
            <p className="text-sm text-muted-foreground">Languages</p>
          </div>
          <div className="space-y-1">
            <div className="text-3xl md:text-4xl font-black bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">24/7</div>
            <p className="text-sm text-muted-foreground">Live Ranking</p>
          </div>
        </div>
      </div>
    </section>
  )
}
