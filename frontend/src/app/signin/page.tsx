'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Zap } from 'lucide-react'
import { api } from "../../lib/axios";
import { socket } from '@/lib/socket'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const response = await api.post('/auth/signin', { id: email, password })

    if (response.status !== 200) {
      setIsLoading(false)
      alert('Login failed. Please check your credentials and try again.')
      return
    }

    socket.connect()
    setIsLoading(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground hover:opacity-80 transition-opacity">
            <div className="p-2 rounded-lg bg-linear-to-br from-primary to-accent">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="bg-linear-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              CodeRival
            </span>
          </Link>
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10">
            <Card className="border-border bg-card">
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl text-foreground">Welcome Back</CardTitle>
                <CardDescription>
                  Sign in to your CodeRival account to start competing
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-foreground">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-surface border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-foreground">
                      Password
                    </label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-surface border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* Forgot Password Link */}
                  <div className="flex justify-end">
                    <Link href="/forgot-password" className="text-sm text-primary hover:text-primary/80 transition-colors">
                      Forgot password?
                    </Link>
                  </div>

                  {/* Sign In Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold"
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  {/* OAuth Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-border hover:bg-surface text-foreground"
                    >
                      GitHub
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-border hover:bg-surface text-foreground"
                    >
                      Google
                    </Button>
                  </div>
                </form>

                {/* Sign Up Link */}
                <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground">Don&apos;t have an account? </span>
                  <Link href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
                    Create one
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Additional Info */}
            <p className="text-center text-xs text-muted-foreground mt-4">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
