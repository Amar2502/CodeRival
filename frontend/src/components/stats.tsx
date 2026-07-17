'use client'

export function Stats() {
  const stats = [
    {
      number: '50K+',
      label: 'Active Programmers',
    },
    {
      number: '1M+',
      label: 'Matches Completed',
    },
    {
      number: '500+',
      label: 'Unique Problems',
    },
    {
      number: '3',
      label: 'Supported Languages',
    },
  ]

  return (
    <section className="py-16 px-4 bg-surface border-y border-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl md:text-5xl font-bold bg-linear-to-r from-primary via-primary to-accent bg-clip-text text-transparent mb-2">
                {stat.number}
              </div>
              <p className="text-sm md:text-base text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
