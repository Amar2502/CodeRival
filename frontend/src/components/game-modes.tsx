'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flame, Sparkles, Check } from 'lucide-react'

const modes = [
  {
    icon: Flame,
    title: 'Ranked Matches',
    subtitle: 'Competitive Ladder',
    badge: 'High Stakes',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
    description: 'Play competitive matches where your ELO rating is on the line. Win to climb the global leaderboard; lose and learn. Every submission counts.',
    features: [
      'Live ELO rating gain & loss',
      'Global leaderboard ranking',
      'Strict skill-based matchmaking',
      'Exhaustive match history & analytics',
      'Custom seasonal badges',
    ],
    borderHover: 'hover:border-primary/60',
    iconBg: 'bg-primary/10 text-primary',
  },
  {
    icon: Sparkles,
    title: 'Casual Matches',
    subtitle: 'Practice & Warmup',
    badge: 'No Pressure',
    badgeClass: 'bg-accent/10 text-accent border-accent/20',
    description: 'Practice against other programmers without affecting your rating. Test algorithms, try new languages, and sharpen your speed with zero risk.',
    features: [
      'Zero rating impact',
      'Instant skill-balanced pairing',
      'Full test case feedback',
      'Wide problem pool variety',
      'Friendly competitive environment',
    ],
    borderHover: 'hover:border-accent/60',
    iconBg: 'bg-accent/10 text-accent',
  },
]

export function GameModes() {
  return (
    <section id="modes" className="py-24 px-4 bg-background relative">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold uppercase tracking-wider">
            Game Modes
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-balance text-foreground">
            Choose Your Arena
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Whether you want to climb the global ranks or warm up with casual practice, CodeRival has the right mode for you.
          </p>
        </div>

        {/* Game Modes Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {modes.map((mode, index) => {
            const Icon = mode.icon
            return (
              <Card
                key={index}
                className={`border-border bg-card/60 backdrop-blur-xs overflow-hidden group transition-all duration-300 ${mode.borderHover} hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 relative`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3.5 rounded-xl ${mode.iconBg} transition-transform group-hover:scale-110 duration-300 shadow-xs`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <Badge variant="outline" className={`px-3 py-1 font-semibold ${mode.badgeClass}`}>
                      {mode.badge}
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground">{mode.title}</CardTitle>
                    <CardDescription className="text-sm font-medium text-muted-foreground mt-1">
                      {mode.subtitle}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground leading-relaxed text-base">
                    {mode.description}
                  </p>
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mode Highlights:</p>
                    <ul className="space-y-2.5">
                      {mode.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-center gap-3 text-sm text-foreground">
                          <div className="p-0.5 rounded-full bg-primary/10 text-primary">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
