'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

const steps = [
  {
    number: '01',
    title: 'Create Your Account',
    description: 'Sign up in seconds with your email. Set your skill level and preferred programming languages.',
  },
  {
    number: '02',
    title: 'Join Matchmaking',
    description: 'Enter the queue for ranked or casual matches. Our system finds an opponent at your level.',
  },
  {
    number: '03',
    title: 'Receive the Problem',
    description: 'Both players get the same coding problem with a time limit. Read, analyze, and code your solution.',
  },
  {
    number: '04',
    title: 'Submit & Compete',
    description: 'Execute your code against multiple test cases. See real-time results and compete live.',
  },
  {
    number: '05',
    title: 'Get Ranked',
    description: 'Winner is determined by correctness and speed. Your ELO rating updates instantly.',
  },
  {
    number: '06',
    title: 'Track Progress',
    description: 'View your match history, statistics, and performance analytics to improve your skills.',
  },
]

export function HowItWorks() {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance text-foreground">
            How CodeRival Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes. Compete, improve, and dominate.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <Card
              key={index}
              className="border-border bg-card hover:border-primary/50 transition-all"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl font-bold bg-linear-to-br from-primary to-accent bg-clip-text text-transparent">
                    {step.number}
                  </div>
                  <CheckCircle className="w-5 h-5 text-primary/50" />
                </div>
                <CardTitle className="text-xl text-foreground">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-muted-foreground">
                  {step.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Connection lines for visual flow - decorative */}
        <div className="mt-16 p-8 rounded-lg border border-border bg-card">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-primary"></span>
            The Competitive Edge
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            Every match pushes you to think faster and code better. You&apos;re not just solving problems—you&apos;re competing against real programmers in real-time. The combination of skill-based matching, instant feedback, and continuous ranking keeps you engaged and motivated to improve. Whether you&apos;re preparing for interviews, sharpening your competitive programming skills, or simply enjoying the thrill of live coding battles, CodeRival is where programmers compete at their best.
          </p>
        </div>
      </div>
    </section>
  )
}
