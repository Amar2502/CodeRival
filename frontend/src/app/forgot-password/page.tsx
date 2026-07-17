'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Check, X, Zap, Mail, Lock } from 'lucide-react'
import { api } from '@/lib/axios'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email')
  const [slideOut, setSlideOut] = useState(false)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [otpError, setOtpError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [token, setToken] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0
    if (pwd.length >= 8) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/[a-z]/.test(pwd)) strength++
    if (/[0-9]/.test(pwd)) strength++
    if (/[^A-Za-z0-9]/.test(pwd)) strength++
    return strength
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value
    setNewPassword(pwd)
    setPasswordStrength(calculatePasswordStrength(pwd))
  }

  const handleSendOtp = async () => {
    if (!email.includes('@')) {
      setOtpError('Please enter a valid email address')
      return
    }

    const response = await api.post('/auth/request-password-reset', { email })

    if (response.status !== 201) {
        setOtpError('Failed to send OTP. Please try again later.')
        return
      }
    
    setOtpError('')
    setSlideOut(true)
    setTimeout(() => {
      setStep('otp')
      setSlideOut(false)
    }, 300)
  }

  const handleVerifyOtp = async () => {

    const response = await api.post('/auth/verify-password-reset-otp', { email, otp })

    if (response.status==200) {
      setToken(response.data.token)
      setOtpError('')
      setSlideOut(true)
      setTimeout(() => {
        setStep('reset')
        setSlideOut(false)
      }, 300)
    } else {
      setOtpError('Invalid OTP. Please try again.')
      setOtp('')
    }
  }

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    const response = await api.post('/auth/reset-password', { email, token, newPassword })

    if (response.status !== 200) {
      setPasswordError('Failed to reset password. Please try again later.')
      return
    }
    
    setPasswordError('')
    router.push('/signin')
  }

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtp(value)
    if (otpError) setOtpError('')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-foreground hover:opacity-80 transition-opacity">
            <div className="p-2 rounded-lg bg-linear-to-br from-primary to-accent">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="bg-linear-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              CodeRival
            </span>
          </Link>
          <Link href="/signin" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          {/* Background decorative elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl opacity-30"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl opacity-30"></div>
          </div>

          {/* Card with sliding content */}
          <Card className="border-border bg-card relative">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">
                {step === 'email' && 'Reset Your Password'}
                {step === 'otp' && 'Verify Your Email'}
                {step === 'reset' && 'Create New Password'}
              </CardTitle>
              <CardDescription>
                {step === 'email' && 'Enter your email address and we&apos;ll send you a code to reset your password'}
                {step === 'otp' && `We've sent a verification code to ${email}`}
                {step === 'reset' && 'Enter your new password'}
              </CardDescription>
            </CardHeader>

            {/* Sliding Content Container */}
            <div className="relative overflow-hidden">
              <CardContent className={`transition-all duration-300 ${slideOut ? 'animate-slide-out-left' : 'animate-slide-in-right'}`}>
                {/* Step 1: Email Entry */}
                {step === 'email' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center mb-6">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Mail className="w-6 h-6 text-primary" />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground block mb-2">Email Address</label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          setOtpError('')
                        }}
                        className="bg-surface border-border text-foreground placeholder:text-muted-foreground"
                      />
                      {otpError && <p className="text-xs text-danger mt-2">{otpError}</p>}
                    </div>

                    <Button
                      onClick={handleSendOtp}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-10 font-semibold mt-6"
                    >
                      Send Reset Code
                      <Mail className="ml-2 w-4 h-4" />
                    </Button>

                    <p className="text-xs text-muted-foreground text-center mt-6">
                      Remember your password?{' '}
                      <Link href="/signin" className="text-primary hover:underline font-medium">
                        Sign in instead
                      </Link>
                    </p>
                  </div>
                )}

                {/* Step 2: OTP Verification */}
                {step === 'otp' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center mb-6">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Lock className="w-6 h-6 text-primary" />
                      </div>
                    </div>

                    <p className="text-center text-foreground mb-4">
                      Enter the 6-digit code we sent to your email.
                    </p>

                    <div>
                      <label className="text-sm font-medium text-foreground block mb-2">Verification Code</label>
                      <Input
                        type="text"
                        placeholder="000000"
                        value={otp}
                        onChange={handleOtpChange}
                        maxLength={6}
                        className={`bg-surface border-border text-foreground placeholder:text-muted-foreground text-center text-2xl tracking-widest font-mono ${
                          otpError ? 'border-danger' : ''
                        }`}
                      />
                      {otpError && <p className="text-xs text-danger mt-2 text-center font-medium">{otpError}</p>}
                    </div>

                    <Button
                      onClick={handleVerifyOtp}
                      disabled={otp.length !== 6}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-10 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Verify Code
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      Try <code className="bg-surface px-2 py-1 rounded text-primary font-mono">123456</code> for demo
                    </p>

                    <button
                      onClick={() => {
                        setSlideOut(true)
                        setTimeout(() => {
                          setStep('email')
                          setSlideOut(false)
                          setOtp('')
                          setOtpError('')
                        }, 300)
                      }}
                      className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-4"
                    >
                      Use a different email
                    </button>
                  </div>
                )}

                {/* Step 3: Password Reset */}
                {step === 'reset' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center mb-6">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Lock className="w-6 h-6 text-primary" />
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-2">New Password</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={handlePasswordChange}
                          className={`bg-surface border-border text-foreground placeholder:text-muted-foreground pr-10 ${
                            passwordError ? 'border-danger' : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
                        >
                          {showPassword ? '✕' : '◉'}
                        </button>
                      </div>

                      {/* Password Strength */}
                      {newPassword && (
                        <div className="mt-2 space-y-2">
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-colors ${
                                  i < passwordStrength ? 'bg-success' : 'bg-surface'
                                }`}
                              />
                            ))}
                          </div>
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            <li className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-success' : ''}`}>
                              <span>
                                {newPassword.length >= 8 ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </span>
                              At least 8 characters
                            </li>
                            <li className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) ? 'text-success' : ''}`}>
                              <span>
                                {/[A-Z]/.test(newPassword) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </span>
                              One uppercase letter
                            </li>
                            <li className={`flex items-center gap-2 ${/[a-z]/.test(newPassword) ? 'text-success' : ''}`}>
                              <span>
                                {/[a-z]/.test(newPassword) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </span>
                              One lowercase letter
                            </li>
                            <li className={`flex items-center gap-2 ${/[0-9]/.test(newPassword) ? 'text-success' : ''}`}>
                              <span>
                                {/[0-9]/.test(newPassword) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </span>
                              One number
                            </li>
                            <li className={`flex items-center gap-2 ${/[^A-Za-z0-9]/.test(newPassword) ? 'text-success' : ''}`}>
                              <span>
                                {/[^A-Za-z0-9]/.test(newPassword) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </span>
                              One special character
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-2">Confirm Password</label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value)
                            setPasswordError('')
                          }}
                          className={`bg-surface border-border text-foreground placeholder:text-muted-foreground pr-10 ${
                            passwordError ? 'border-danger' : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
                        >
                          {showConfirmPassword ? '✕' : '◉'}
                        </button>
                      </div>
                      {passwordError && <p className="text-xs text-danger mt-2">{passwordError}</p>}
                    </div>

                    <Button
                      onClick={handleResetPassword}
                      disabled={!newPassword || !confirmPassword}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-10 font-semibold disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    >
                      Reset Password
                    </Button>

                    <Link href="/signin" className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors mt-4">
                      Back to sign in
                    </Link>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>

          {/* Step Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            <div className={`h-1 w-8 rounded-full transition-colors ${step === 'email' ? 'bg-primary' : 'bg-surface'}`}></div>
            <div className={`h-1 w-8 rounded-full transition-colors ${step === 'otp' ? 'bg-primary' : 'bg-surface'}`}></div>
            <div className={`h-1 w-8 rounded-full transition-colors ${step === 'reset' ? 'bg-primary' : 'bg-surface'}`}></div>
          </div>
        </div>
      </main>
    </div>
  )
}
