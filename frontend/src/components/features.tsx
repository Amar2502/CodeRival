'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Zap,
  Users,
  Trophy,
  Code2,
  BarChart3,
  Shield,
  Layers,
  Gauge,
} from 'lucide-react'

const features = [
  {
    icon: Zap,
    title: 'Real-Time Battles',
    description: 'Get matched with opponents instantly and compete live on the same problem simultaneously.',
    gradient: 'from-primary/20 to-accent/10',
  },
  {
    icon: Users,
    title: 'Skill-Based Matchmaking',
    description: 'Our intelligent matchmaking pairs you with programmers at your skill level for fair competition.',
    gradient: 'from-accent/20 to-primary/10',
  },
  {
    icon: Code2,
    title: 'Multi-Language Support',
    description: 'Code in C++, Java, Python, and JavaScript. Choose your preferred language and show your expertise.',
    gradient: 'from-emerald-500/20 to-accent/10',
  },
  {
    icon: Shield,
    title: 'Secure Sandbox',
    description: 'All code executes in an isolated, secure container. Your submissions are tested instantly against multiple test cases.',
    gradient: 'from-amber-500/20 to-primary/10',
  },
  {
    icon: Trophy,
    title: 'ELO Rating System',
    description: 'Track your progress with a dynamic ELO rating system. Climb ranks from Bronze to Legendary Master.',
    gradient: 'from-amber-400/20 to-primary/10',
  },
  {
    icon: BarChart3,
    title: 'Performance Analytics',
    description: 'Detailed statistics on your wins, losses, speed, and test pass rates to help you systematically improve.',
    gradient: 'from-accent/20 to-emerald-500/10',
  },
  {
    icon: Gauge,
    title: 'Multiple Game Modes',
    description: 'Choose between ranked matches for serious ladder competition or casual 1v1 duels for warmups.',
    gradient: 'from-primary/20 to-amber-500/10',
  },
  {
    icon: Layers,
    title: 'Global Leaderboard',
    description: 'See where you stand globally. Compete against top programmers worldwide and claim your spot on the podium.',
    gradient: 'from-purple-500/20 to-accent/10',
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 px-4 bg-background relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/3 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs font-semibold uppercase tracking-wider">
            Powerful Features
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-balance text-foreground">
            Built for Competitive Programmers
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Everything you need to challenge rivals, master algorithms, and dominate the global rankings.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card
                key={index}
                className="border-border bg-card/60 backdrop-blur-xs hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 group relative overflow-hidden"
              >
                {/* Subtle hover gradient background */}
                <div className={`absolute inset-0 bg-linear-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                <CardHeader className="relative z-10 pb-2">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 rounded-xl bg-surface border border-border group-hover:border-primary/30 group-hover:bg-primary/10 transition-all duration-300 shadow-xs">
                      <Icon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {feature.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <CardDescription className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
