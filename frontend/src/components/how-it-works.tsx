'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Zap } from 'lucide-react'

const steps = [
  {
    number: '01',
    title: 'Create Your Account',
    description: 'Sign up in seconds. Set your preferred programming languages and get your initial ELO rating.',
  },
  {
    number: '02',
    title: 'Join Matchmaking Queue',
    description: 'Enter 1v1 ranked or casual queue. Our real-time engine pairs you with an equally skilled opponent.',
  },
  {
    number: '03',
    title: 'Receive Problem Statement',
    description: 'Both coders receive the exact same problem simultaneously with custom input/output specifications.',
  },
  {
    number: '04',
    title: 'Code & Execute',
    description: 'Write code in our VSCode-like editor with syntax highlighting, auto-complete, and instant test runs.',
  },
  {
    number: '05',
    title: 'Submit & Get Verdict',
    description: 'Submit your solution. CodeRival judges your submission instantly against exhaustive test cases.',
  },
  {
    number: '06',
    title: 'Gain ELO & Rank Up',
    description: 'First correct submission wins! ELO ratings update live, pushing you up the global leaderboard.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-4 bg-background relative">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold uppercase tracking-wider">
            Step-By-Step
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-balance text-foreground">
            How CodeRival Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Get started in under a minute. Battle, learn algorithms, and rise through the ranks.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <Card
              key={index}
              className="border-border bg-card/60 backdrop-blur-xs hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 group relative overflow-hidden"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl font-black font-mono text-primary/80 group-hover:text-primary transition-colors">
                    {step.number}
                  </span>
                  <div className="p-1.5 rounded-full bg-surface border border-border group-hover:border-primary/40 group-hover:bg-primary/10 transition-colors">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {step.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {step.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Competitive Edge Card */}
        <div className="mt-16 p-8 rounded-2xl border border-primary/20 bg-linear-to-br from-card via-surface to-card relative overflow-hidden shadow-xl shadow-black/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <h3 className="text-2xl font-bold mb-3 flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="w-5 h-5 text-primary animate-pulse" />
            </div>
            The Competitive Edge
          </h3>
          <p className="text-muted-foreground leading-relaxed text-base max-w-4xl">
            Every match pushes you to think faster and code cleaner. You're not just solving static problems—you're competing against real programmers under live pressure. The combination of instant sandbox execution, live test results, and dynamic ELO bands creates an unbeatable environment for rapid skill growth.
          </p>
        </div>
      </div>
    </section>
  )
}
