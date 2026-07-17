'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flame, Lightbulb } from 'lucide-react'

const modes = [
  {
    icon: Flame,
    title: 'Ranked Matches',
    subtitle: 'Competitive',
    badge: 'High Stakes',
    description: 'Play competitive matches where your rating is on the line. Win to climb the global leaderboard, lose to learn what went wrong. Every match counts.',
    features: [
      'ELO rating system',
      'Global ranking',
      'Skill-based matchmaking',
      'Match history tracking',
      'Performance analytics',
    ],
    color: 'from-primary/20 to-primary/5',
  },
  {
    icon: Lightbulb,
    title: 'Casual Matches',
    subtitle: 'Practice',
    badge: 'No Pressure',
    description: 'Practice against other programmers without affecting your rating. Great for learning new problem types, testing strategies, and having fun.',
    features: [
      'Zero rating impact',
      'Skill-based pairing',
      'Instant feedback',
      'Problem variety',
      'Friendly community',
    ],
    color: 'from-accent/20 to-accent/5',
  },
]

export function GameModes() {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance text-foreground">
            Choose Your Challenge
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you want to compete for glory or practice new skills, we&apos;ve got the right mode for you.
          </p>
        </div>

        {/* Game Modes */}
        <div className="grid md:grid-cols-2 gap-8">
          {modes.map((mode, index) => {
            const Icon = mode.icon
            return (
              <Card
                key={index}
                className={`border-border bg-card overflow-hidden group hover:border-primary/50 transition-all`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg bg-surface group-hover:bg-primary/10 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <Badge variant="secondary" className="bg-surface text-foreground hover:bg-primary/20">
                      {mode.badge}
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-foreground">{mode.title}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-1">
                      {mode.subtitle}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground mb-6">
                    {mode.description}
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground">Features:</p>
                    <ul className="space-y-2">
                      {mode.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-center gap-2 text-sm text-foreground">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
                          {feature}
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
