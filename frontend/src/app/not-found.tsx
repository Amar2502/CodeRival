import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Zap, Home, LayoutDashboard, Swords, FileCode2 } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-80 transition-opacity">
            <Image
              src="/logo.png"
              alt="CodeRival Logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
              priority
            />
            <span className="bg-gradient-to-r from-primary via-rose-400 to-accent bg-clip-text text-transparent tracking-tight font-black text-xl">
              CodeRival
            </span>
          </Link>
        </div>
      </header>

      {/* 404 Main Body */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 relative z-10 text-center">
        <div className="max-w-md w-full space-y-6">
          <div className="relative inline-block">
            <h1 className="text-8xl font-black tracking-tighter bg-linear-to-b from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent select-none font-mono">
              404
            </h1>
          </div>

          <div className="space-y-2 pt-4">
            <h2 className="text-2xl font-bold text-foreground">Lost in the Arena?</h2>
            <p className="text-sm text-muted-foreground font-mono">
              The match route or problem page you are trying to access doesn&apos;t exist or has been relocated.
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Link href="/dashboard">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/battles">
              <Button variant="outline" className="w-full border-border hover:bg-surface text-foreground font-semibold h-10 gap-2">
                <Swords className="w-4 h-4 text-accent" />
                1v1 Battles
              </Button>
            </Link>
            <Link href="/problems">
              <Button variant="outline" className="w-full border-border hover:bg-surface text-foreground font-semibold h-10 gap-2">
                <FileCode2 className="w-4 h-4 text-emerald-400" />
                Problems
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full border-border hover:bg-surface text-foreground font-semibold h-10 gap-2">
                <Home className="w-4 h-4" />
                Home Page
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
