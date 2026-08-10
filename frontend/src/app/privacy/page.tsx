'use client'

import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { ShieldCheck } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <AppLayout showSidebar={false}>
      <div className="max-w-3xl mx-auto py-4 space-y-8 font-sans">
        {/* Header */}
        <div className="space-y-3 pb-6 border-b border-border">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <ShieldCheck className="w-3.5 h-3.5" /> PRIVACY & DATA PROTECTION
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            CodeRival Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono">
            Last Updated: August 9, 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
          <p className="text-base text-foreground font-medium">
            This Privacy Policy explains how CodeRival ("CodeRival," "we," "us," or "our") collects, uses, stores, and protects your information when you access or use our platform, APIs, 1v1 duels, and services.
          </p>

          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">1.</span> Information We Collect
            </h2>
            <p>We collect information you provide directly to us when creating an account, participating in duels, or contacting support:</p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-primary">
              <li><strong>Account Credentials:</strong> Username, email address, display name, hashed passwords, and OAuth profile tokens (Google/GitHub).</li>
              <li><strong>Match & Duel Data:</strong> ELO ratings, match history, problem solutions, submission timestamps, execution statistics, and competitive results.</li>
              <li><strong>Support Communications:</strong> Messages, email inquiries, and feedback sent via our Help & Support contact form.</li>
            </ul>
          </section>

          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">2.</span> How We Use Your Information
            </h2>
            <p>We use collected data to operate, maintain, and secure the CodeRival platform:</p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-primary">
              <li>Facilitate real-time 1v1 matchmaking and tournament brackets.</li>
              <li>Calculate ELO ratings and update global/friend leaderboards.</li>
              <li>Enforce competitive integrity and automated anti-cheat monitoring.</li>
              <li>Send security alerts, transactional updates, and support responses.</li>
            </ul>
          </section>

          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">3.</span> Data Security & Storage
            </h2>
            <p>
              Your passwords are encrypted using bcrypt hashing. Session tokens are securely managed via HTTP-only cookies. Source code submissions are executed inside isolated sandboxes to ensure security and privacy.
            </p>
          </section>

          <section className="space-y-3 pt-2 border-t border-border pt-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">4.</span> Contact Support
            </h2>
            <p>
              If you have questions regarding your data privacy, please contact us via our{' '}
              <Link href="/help" className="text-primary underline hover:opacity-80 font-medium">
                Help & Support Form
              </Link>.
            </p>
          </section>
        </div>
      </div>
    </AppLayout>
  )
}
