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
  },
  {
    icon: Users,
    title: 'Skill-Based Matching',
    description: 'Our intelligent matchmaking pairs you with programmers at your skill level for fair competition.',
  },
  {
    icon: Code2,
    title: 'Multi-Language Support',
    description: 'Code in C++, Java, Python, and more. Choose your preferred language and show your expertise.',
  },
  {
    icon: Shield,
    title: 'Secure Sandbox',
    description: 'All code executes in an isolated, secure environment. Your submissions are tested instantly against multiple test cases.',
  },
  {
    icon: Trophy,
    title: 'ELO Rating System',
    description: 'Track your progress with a dynamic ELO rating. Climb the ranks as you win more matches.',
  },
  {
    icon: BarChart3,
    title: 'Performance Analytics',
    description: 'Detailed statistics on your wins, losses, speed, and accuracy to help you improve over time.',
  },
  {
    icon: Gauge,
    title: 'Multiple Game Modes',
    description: 'Choose between ranked matches for serious competition or casual games for practice and fun.',
  },
  {
    icon: Layers,
    title: 'Global Leaderboard',
    description: 'See where you stand globally. Compete against the best programmers from around the world.',
  },
]

export function Features() {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance text-foreground">
            Built for Competitive Programmers
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to compete, learn, and dominate the rankings.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card
                key={index}
                className="border-border bg-card hover:border-primary/50 transition-colors group"
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-surface group-hover:bg-primary/10 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-xl text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-muted-foreground">
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
