import { Header } from '@/components/header'
import { Hero } from '@/components/hero'
import { Stats } from '@/components/stats'
import { Features } from '@/components/features'
import { GameModes } from '@/components/game-modes'
import { HowItWorks } from '@/components/how-it-works'
import { CTASection } from '@/components/cta-section'
import { Footer } from '@/components/footer'

export default function Page() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Stats />
      <Features />
      <GameModes />
      <HowItWorks />
      <CTASection />
      <Footer />
    </main>
  )
}
