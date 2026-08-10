'use client'

import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { FileText, Shield, ChevronRight } from 'lucide-react'

export default function TermsPage() {
  return (
    <AppLayout showSidebar={false}>
      <div className="max-w-3xl mx-auto py-4 space-y-8 font-sans">
        {/* Header */}
        <div className="space-y-3 pb-6 border-b border-border">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <FileText className="w-3.5 h-3.5" /> LEGAL AGREEMENT
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            CodeRival Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono">
            Last Updated: August 9, 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
          <p className="text-base text-foreground font-medium">
            These Terms of Service ("Terms") govern your access to and use of CodeRival, including our website, applications, coding competitions, real-time 1v1 coding battles, matchmaking services, APIs, and other related services (collectively, the "Services").
          </p>

          <p>
            CodeRival ("CodeRival," "we," "us," or "our") provides an online competitive programming platform where users can solve programming problems, participate in real-time coding battles, compete in tournaments, earn ratings, interact with other users, and use related coding and social features.
          </p>

          <p className="p-4 rounded-xl bg-card border border-border text-foreground font-medium">
            By creating an account, accessing, or using the Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree with these Terms, you may not use the Services.
          </p>

          {/* 1. Eligibility */}
          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">1.</span> Eligibility
            </h2>
            <p>
              You must provide accurate and complete information when creating your CodeRival account.
            </p>
            <p>
              You must be legally capable of entering into these Terms under the laws applicable to you. If you are under the applicable age of majority, you may use CodeRival only with the involvement and consent of a parent or legal guardian where required by applicable law.
            </p>
            <p>
              You are responsible for ensuring that your use of CodeRival complies with all local and international laws and regulations applicable to you.
            </p>
          </section>

          {/* 2. Your CodeRival Account */}
          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">2.</span> Your CodeRival Account
            </h2>
            <p>Some features of CodeRival require you to create an account. You agree to:</p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-primary">
              <li>Provide accurate and current information.</li>
              <li>Maintain the security and confidentiality of your account credentials.</li>
              <li>Keep your account information reasonably up to date.</li>
              <li>Not share, sell, rent, transfer, or otherwise allow another person to use your account.</li>
              <li>Not create accounts for the purpose of manipulating ratings, matchmaking, tournaments, or other competitive systems.</li>
              <li>Notify us immediately if you believe your account has been compromised.</li>
            </ul>
            <p>
              CodeRival may use third-party authentication providers, including services such as Google or GitHub. Your use of those authentication services may also be subject to their respective terms and privacy policies.
            </p>
          </section>

          {/* 3. Use of the Services */}
          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">3.</span> Use of the Services
            </h2>
            <p>You may use CodeRival only for lawful purposes and in accordance with these Terms. You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-primary">
              <li>Use CodeRival for fraudulent, abusive, threatening, harassing, defamatory, or unlawful activities.</li>
              <li>Attempt to gain unauthorized access to another user's account or information.</li>
              <li>Impersonate another person or misrepresent your identity.</li>
              <li>Interfere with or disrupt the operation of CodeRival infrastructure or WebSocket servers.</li>
              <li>Introduce malware, viruses, malicious code, or other harmful software.</li>
              <li>Attempt to bypass authentication, authorization, rate limits, or other security controls.</li>
              <li>Probe, scan, or test the vulnerability of CodeRival without explicit written authorization.</li>
              <li>Reverse engineer, decompile, disassemble, or attempt to discover the source code of CodeRival's proprietary backend and anti-cheat mechanisms.</li>
              <li>Circumvent technical limitations or access restrictions.</li>
              <li>Use automated systems, bots, crawlers, spiders, or scripts to access CodeRival in a manner that places unreasonable load on our infrastructure.</li>
              <li>Scrape or systematically collect CodeRival content, user information, problems, test cases, or ratings data without our written permission.</li>
              <li>Use CodeRival to develop or train a competing service using our proprietary content or data.</li>
            </ul>
          </section>

          {/* 4. Competitive Integrity and Anti-Cheat */}
          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">4.</span> Competitive Integrity and Anti-Cheat
            </h2>
            <p>
              CodeRival is designed to provide fair competitive programming experiences. When participating in a real-time battle, tournament, or ranked match, you agree not to obtain or use an unfair advantage.
            </p>
            <p className="font-semibold text-foreground">Prohibited conduct includes, but is not limited to:</p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-primary">
              <li>Receiving unauthorized assistance from another person or AI tool during a live competition.</li>
              <li>Sharing or receiving problem solutions during an active duel or tournament round.</li>
              <li>Operating multiple accounts to manipulate matchmaking, rankings, or ELO ratings.</li>
              <li>Using bots or automated agents to solve problems during competitive matches.</li>
              <li>Exploiting bugs, glitches, or unintended behavior to obtain a competitive advantage.</li>
              <li>Intentionally losing, surrendering, or throwing matches for the purpose of manipulating ratings ("deranking").</li>
              <li>Colluding with other participants in duels or tournament brackets.</li>
              <li>Bypassing or attempting to disable CodeRival's full-screen enforcement, tab-focus tracking, or anti-cheat detectors.</li>
            </ul>
            <p>
              CodeRival uses automated systems and browser signals to monitor match integrity. Violations may result in immediate duel disqualification, rating resets, temporary competitive bans, or permanent account termination.
            </p>
          </section>

          {/* 5. Matches, Matchmaking, and Ratings */}
          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">5.</span> Matches, Matchmaking, and Ratings
            </h2>
            <p>
              CodeRival provides automated matchmaking systems that pair users based on rating and availability. Matchmaking results are generated automatically.
            </p>
            <p>You acknowledge that:</p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-primary">
              <li>Ratings are platform-generated ELO scores calculated via atomic transactions.</li>
              <li>Ratings may be updated following match completion, anti-cheat reviews, or system corrections.</li>
              <li>CodeRival reserves the right to adjust, recalculate, or reset ratings when technical errors, cheating, or irregularities occur.</li>
              <li>CodeRival may invalidate matches affected by infrastructure failures or cheating.</li>
            </ul>
          </section>

          {/* 6. Coding Competitions and Tournaments */}
          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">6.</span> Coding Competitions and Tournaments
            </h2>
            <p>
              CodeRival hosts single-elimination and custom tournament brackets. Individual competitions may have additional rules, time limits, or eligibility criteria.
            </p>
            <p>CodeRival reserves the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-primary">
              <li>Modify tournament schedules or cancel events when necessary.</li>
              <li>Disqualify participants who violate tournament rules or anti-cheat guidelines.</li>
              <li>Re-run or invalidate matches affected by technical outages or cheating.</li>
            </ul>
          </section>

          {/* 7. Code Execution */}
          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">7.</span> Code Execution
            </h2>
            <p>
              Code submitted to CodeRival is executed using isolated sandbox environments. Execution is subject to resource limits including CPU time, memory limits, and output size bounds.
            </p>
            <p>
              You must not submit malicious code intended to break out of sandboxes, launch denial-of-service attacks, mine cryptocurrency, or access non-public system memory.
            </p>
          </section>

          {/* 8. User Content & Intellectual Property */}
          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">8.</span> User Content & Intellectual Property
            </h2>
            <p>
              You retain ownership of your original source code. By submitting code or content to CodeRival, you grant us a non-exclusive, worldwide, royalty-free license to host, store, execute, display, and process your submissions as necessary to provide the Services.
            </p>
            <p>
              All CodeRival problem sets, test cases, branding, software, and platform assets are the property of CodeRival and protected under intellectual property laws.
            </p>
          </section>

          {/* 9. Privacy & Data Handling */}
          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">9.</span> Privacy & Data Handling
            </h2>
            <p>
              Your privacy is important to us. Please review our{' '}
              <Link href="/privacy" className="text-primary underline hover:opacity-80">
                Privacy Policy
              </Link>{' '}
              to understand how we collect, process, and protect your personal information.
            </p>
          </section>

          {/* 10. Account Suspension and Termination */}
          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">10.</span> Account Suspension & Termination
            </h2>
            <p>
              We reserve the right to suspend, restrict, or permanently delete accounts that violate these Terms, cheat in competitive events, harass other coders, or attempt to harm platform infrastructure.
            </p>
          </section>

          {/* 11. Disclaimer & Limitation of Liability */}
          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">11.</span> Disclaimer & Limitation of Liability
            </h2>
            <p>
              The Services are provided on an "AS IS" and "AS AVAILABLE" basis. CodeRival does not guarantee uninterrupted service uptime, error-free code execution, or immunity from network disconnections.
            </p>
            <p>
              To the maximum extent permitted by law, CodeRival shall not be liable for indirect, incidental, or consequential damages arising out of your use or inability to use the platform.
            </p>
          </section>

          {/* 12. Governing Law */}
          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">12.</span> Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to conflict-of-law principles.
            </p>
          </section>

          {/* 13. Contact Us */}
          <section className="space-y-3 pt-2 border-t border-border pt-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary font-mono text-base">13.</span> Contact Us
            </h2>
            <p>
              If you have any questions or concerns regarding these Terms, please reach out via our{' '}
              <Link href="/help" className="text-primary underline hover:opacity-80 font-medium">
                Help Center & Support Form
              </Link>.
            </p>
          </section>
        </div>
      </div>
    </AppLayout>
  )
}
