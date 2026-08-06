'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Zap, AlertCircle } from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import { FaGithub } from 'react-icons/fa6'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { api } from "../../lib/axios";
import { socket } from '@/lib/socket'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui/spinner'
import { useAuthStore, refreshCurrentUser } from '@/lib/authStore'

export default function SignInPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg('')

    try {
      const response = await api.post('/auth/signin', { id: email, password })

      if (response.status !== 200) {
        setIsLoading(false)
        setErrorMsg('Login failed. Please check your credentials and try again.')
        return
      }

      if (response.data?.user) {
        setUser(response.data.user)
      }
      await refreshCurrentUser()

      socket.connect()
      setIsLoading(false)
      router.push('/dashboard')
    } catch (err: any) {
      setIsLoading(false)
      const msg = err.response?.data?.message || 'Login failed. Please check your email and password.'
      setErrorMsg(msg)
    }
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  const handleGoogleSignIn = () => {
    setOauthLoading('google');
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleGitHubSignIn = () => {
    setOauthLoading('github');
    window.location.href = `${API_URL}/auth/github`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float-delayed"></div>
      </div>

      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
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
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md">
          <Card className="border-border bg-card/80 backdrop-blur-md shadow-2xl shadow-black/30">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl text-foreground font-bold tracking-tight">Welcome Back</CardTitle>
              <CardDescription>
                Sign in to your CodeRival account to start competing
              </CardDescription>
            </CardHeader>

            <CardContent>
              {errorMsg && (
                <div className="mb-4 p-3 rounded-lg border border-danger/30 bg-danger/10 text-danger text-xs font-medium flex items-center gap-2 animate-fade-in-up">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

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
                    className="bg-surface border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-surface border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline transition-colors font-medium">
                    Forgot password?
                  </Link>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  disabled={isLoading || oauthLoading !== null}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold h-10 shadow-md shadow-primary/20 transition-all"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="size-4" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                {/* OAuth Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGitHubSignIn}
                    disabled={isLoading || oauthLoading !== null}
                    className="border-border hover:bg-surface text-foreground gap-2 font-medium"
                  >
                    {oauthLoading === 'github' ? (
                      <Spinner className="size-4" />
                    ) : (
                      <FaGithub className="w-4 h-4" />
                    )}
                    GitHub
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading || oauthLoading !== null}
                    className="border-border hover:bg-surface text-foreground gap-2 font-medium"
                  >
                    {oauthLoading === 'google' ? (
                      <Spinner className="size-4" />
                    ) : (
                      <FcGoogle className="w-4 h-4" />
                    )}
                    Google
                  </Button>
                </div>
              </form>

              {/* Sign Up Link */}
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Don't have an account? </span>
                <Link href="/register" className="text-primary hover:underline font-medium transition-colors">
                  Create one
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-4">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </main>
    </div>
  )
}
