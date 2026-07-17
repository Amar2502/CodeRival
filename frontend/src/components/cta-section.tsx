'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Zap } from 'lucide-react'

export function CTASection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-2xl border border-border bg-card overflow-hidden p-12 md:p-16">
          {/* Decorative elements */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl opacity-30"></div>

          {/* Content */}
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface mb-6">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary">Limited Time Offer</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance leading-tight text-foreground">
              Ready to Start <span className="text-primary">Competing</span>?
            </h2>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Join thousands of programmers already competing on CodeRival. Get matched instantly, solve problems faster, and climb the global leaderboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-12 px-8 font-semibold group"
                >
                  Join the Competition
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="border-border hover:bg-surface rounded-lg h-12 px-8 font-semibold"
              >
                View Leaderboard
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-8">
              No credit card required. Start competing instantly.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
