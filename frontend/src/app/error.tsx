'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Home, LayoutDashboard } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled App Runtime Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-2xl space-y-6 text-center relative z-10">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Unexpected Arena Error</h2>
          <p className="text-xs text-muted-foreground font-mono">
            Something went wrong while rendering this component.
          </p>
        </div>

        {error.digest && (
          <div className="p-2.5 rounded-lg bg-surface border border-border text-[11px] font-mono text-muted-foreground">
            Error Digest: {error.digest}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Link href="/dashboard">
            <Button
              variant="outline"
              className="w-full border-border hover:bg-surface text-foreground font-semibold h-10 gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
