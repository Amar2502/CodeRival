'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global Error Boundary caught:', error)
  }, [error])

  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100">
      <body className="min-h-full flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            ⚠️
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Critical Application Error</h1>
            <p className="text-xs text-slate-400 font-mono">
              A root-level exception occurred. Please reload the application.
            </p>
          </div>

          <button
            onClick={() => reset()}
            className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-colors text-sm"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  )
}
