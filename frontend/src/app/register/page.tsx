'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Check, X, Zap, Mail, Lock, AlertCircle } from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import { FaGithub } from 'react-icons/fa6'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { api } from "../../lib/axios";
import { socket } from '@/lib/socket'
import { Spinner } from '@/components/ui/spinner'
import { useAuthStore, refreshCurrentUser } from '@/lib/authStore'

export default function RegisterPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [step, setStep] = useState<'signup' | 'verify' | 'otp'>('signup')
  const [slideOut, setSlideOut] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  })
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isCheckingOtp, setIsCheckingOtp] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null)

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
    setFormData({ ...formData, password: pwd })
    setPasswordStrength(calculatePasswordStrength(pwd))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Full name is required'
    if (!formData.email.includes('@')) newErrors.email = 'Valid email is required'
    if (!formData.username.trim()) newErrors.username = 'Username is required'
    if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters'
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateAccount = async () => {
    setGeneralError('')
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const response = await api.post('/auth/register', formData)
      if (response.status !== 201) {
        setGeneralError(response.data?.message || 'Registration failed. Please try again.')
        return
      }

      if (response.data?.user) {
        useAuthStore.getState().setUser(response.data.user)
      }
      await refreshCurrentUser()
      
      socket.connect()

      setSlideOut(true)
      setTimeout(() => {
        setStep('verify')
        setSlideOut(false)
      }, 300)
    } catch (error: any) {
      console.error('Registration error:', error)
      const data = error.response?.data
      const msg = data?.message || 'Registration failed. Please try again.'

      if (data?.errors && Array.isArray(data.errors)) {
        const fieldErrors: Record<string, string> = {}
        data.errors.forEach((err: { field: string; message: string }) => {
          if (err.field) {
            const fieldName = err.field.replace('body.', '')
            fieldErrors[fieldName] = err.message
          }
        })
        setErrors(prev => ({ ...prev, ...fieldErrors }))
      } else if (msg.toLowerCase().includes('email')) {
        setErrors(prev => ({ ...prev, email: msg }))
      } else if (msg.toLowerCase().includes('username')) {
        setErrors(prev => ({ ...prev, username: msg }))
      }

      setGeneralError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerify = async () => {
    setIsVerifying(true)
    try {
      // sending an OTP is an action, not a resource creation -> 200, not 201
      const response = await api.post('/auth/verify-email', { email: formData.email })

      if (response.status !== 200) {
        console.log('OTP send failed:', response.data)
        return
      }

      setSlideOut(true)
      setTimeout(() => {
        setStep('otp')
        setSlideOut(false)
        setOtpError('')
      }, 300)
    } catch (error) {
      console.error('Verify email error:', error)
      setOtpError('Something went wrong sending the code. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleOtpSubmit = async () => {
    setIsCheckingOtp(true)
    try {
      const response = await api.post('/auth/check-verify-email-otp', { email: formData.email, otp })
      if (response.status === 200) {
        await refreshCurrentUser()
        router.push('/dashboard')
      } else {
        setOtpError('Invalid OTP. Please try again.')
        setOtp('')
      }
    } catch (error) {
      console.error('OTP verification error:', error)
      setOtpError('Invalid OTP. Please try again.')
      setOtp('')
    } finally {
      setIsCheckingOtp(false)
    }
  }

  const handleSkip = async () => {
    await refreshCurrentUser()
    router.push('/dashboard')
  }

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtp(value)
    if (otpError) setOtpError('')
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

  useEffect(() => {
    const username = formData.username.trim()

    if (!username || username.length < 3) {
      setUsernameStatus('idle')
      setErrors(prev => {
        const { username, ...rest } = prev
        return rest
      })
      return
    }

    let ignore = false
    setUsernameStatus('checking')

    const checkUsername = async () => {
      try {
        const response = await api.get(`/user/check_username?username=${encodeURIComponent(username)}`)
        if (ignore) return

        if (!response.data.available) {
          setUsernameStatus('taken')
          setErrors(prev => ({ ...prev, username: 'Username is already taken' }))
        } else {
          setUsernameStatus('available')
          setErrors(prev => {
            const { username, ...rest } = prev
            return rest
          })
        }
      } catch (error: any) {
        if (!ignore) {
          const errMsg = error.response?.data?.errors?.[0]?.message || error.response?.data?.message || 'Invalid or taken username'
          setUsernameStatus('taken')
          setErrors(prev => ({ ...prev, username: errMsg }))
        }
      }
    }

    const timeoutId = setTimeout(checkUsername, 400)

    return () => {
      ignore = true
      clearTimeout(timeoutId)
    }
  }, [formData.username])

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
                {step === 'signup' && 'Create Your Account'}
                {step === 'verify' && 'Verify Your Account'}
                {step === 'otp' && 'Enter Verification Code'}
              </CardTitle>
              <CardDescription>
                {step === 'signup' && 'Join CodeRival and start competing'}
                {step === 'verify' && 'Choose how you want to verify your account'}
                {step === 'otp' && `We've sent a code to ${formData.email}`}
              </CardDescription>
            </CardHeader>

            {/* Sliding Content Container */}
            <div className="relative overflow-hidden">
              <CardContent className={`transition-all duration-300 ${slideOut ? 'animate-slide-out-left' : 'animate-slide-in-right'}`}>
                {/* Step 1: Signup Form */}
                {step === 'signup' && (
                  <div className="space-y-4">
                    {generalError && (
                      <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-danger text-xs font-medium flex items-center gap-2 animate-fade-in-up">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{generalError}</span>
                      </div>
                    )}
                    {/* Full Name */}
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1">Full Name</label>
                      <Input
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`bg-surface border-border text-foreground placeholder:text-muted-foreground ${errors.name ? 'border-danger' : ''}`}
                      />
                      {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1">Email</label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`bg-surface border-border text-foreground placeholder:text-muted-foreground ${errors.email ? 'border-danger' : ''}`}
                      />
                      {errors.email && <p className="text-xs text-danger mt-1">{errors.email}</p>}
                    </div>

                    {/* Username */}
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1">Username</label>
                      <Input
                        placeholder="johndoe"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className={`bg-surface border-border text-foreground placeholder:text-muted-foreground ${errors.username ? 'border-danger' : ''}`}
                      />
                      {errors.username && <p className="text-xs text-danger mt-1">{errors.username}</p>}
                      {!errors.username && usernameStatus === 'checking' && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                          <Spinner className="size-3" />
                          <span>Checking availability...</span>
                        </p>
                      )}
                      {!errors.username && usernameStatus === 'available' && (
                        <p className="text-xs text-success mt-1 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Username is available
                        </p>
                      )}
                    </div>

                    {/* Password */}
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1">Password</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={handlePasswordChange}
                          className={`bg-surface border-border text-foreground placeholder:text-muted-foreground pr-10 ${errors.password ? 'border-danger' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-danger mt-1">{errors.password}</p>}

                      {/* Password Strength */}
                      {formData.password && (
                        <div className="mt-2 space-y-2">
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-colors ${i < passwordStrength ? 'bg-success' : 'bg-surface'
                                  }`}
                              />
                            ))}
                          </div>
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            <li className={`flex items-center gap-2 ${formData.password.length >= 8 ? 'text-success' : ''}`}>
                              <span>
                                {formData.password.length >= 8 ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </span>
                              At least 8 characters
                            </li>
                            <li className={`flex items-center gap-2 ${/[A-Z]/.test(formData.password) ? 'text-success' : ''}`}>
                              <span>
                                {/[A-Z]/.test(formData.password) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </span>
                              One uppercase letter
                            </li>
                            <li className={`flex items-center gap-2 ${/[a-z]/.test(formData.password) ? 'text-success' : ''}`}>
                              <span>
                                {/[a-z]/.test(formData.password) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </span>
                              One lowercase letter
                            </li>
                            <li className={`flex items-center gap-2 ${/[0-9]/.test(formData.password) ? 'text-success' : ''}`}>
                              <span>
                                {/[0-9]/.test(formData.password) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </span>
                              One number
                            </li>
                            <li className={`flex items-center gap-2 ${/[^A-Za-z0-9]/.test(formData.password) ? 'text-success' : ''}`}>
                              <span>
                                {/[^A-Za-z0-9]/.test(formData.password) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </span>
                              One special character
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1">Confirm Password</label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className={`bg-surface border-border text-foreground placeholder:text-muted-foreground pr-10 ${errors.confirmPassword ? 'border-danger' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && <p className="text-xs text-danger mt-1">{errors.confirmPassword}</p>}
                    </div>

                    {/* Create Account Button */}
                    <Button
                      onClick={handleCreateAccount}
                      disabled={isSubmitting || oauthLoading !== null}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-10 font-semibold group mt-6"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Spinner className="size-4" />
                          Creating Account...
                        </span>
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>

                    {/* OAuth Divider */}
                    <div className="relative my-6">
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
                        disabled={isSubmitting || oauthLoading !== null}
                        className="border-border hover:bg-surface rounded-lg h-10 gap-2 font-medium"
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
                        disabled={isSubmitting || oauthLoading !== null}
                        className="border-border hover:bg-surface rounded-lg h-10 gap-2 font-medium"
                      >
                        {oauthLoading === 'google' ? (
                          <Spinner className="size-4" />
                        ) : (
                          <FcGoogle className="w-4 h-4" />
                        )}
                        Google
                      </Button>
                    </div>

                    {/* Sign In Link */}
                    <p className="text-center text-sm text-muted-foreground mt-6">
                      Already have an account?{' '}
                      <Link href="/signin" className="text-primary hover:underline font-medium">
                        Sign in here
                      </Link>
                    </p>
                  </div>
                )}

                {/* Step 2: Verify Account */}
                {step === 'verify' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center mb-6">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Mail className="w-6 h-6 text-primary" />
                      </div>
                    </div>

                    <p className="text-center text-foreground mb-6">
                      We need to verify your email to secure your account.
                    </p>

                    <div className="space-y-3">
                      <Button
                        onClick={handleVerify}
                        disabled={isVerifying}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-10 font-semibold"
                      >
                        {isVerifying ? (
                          <span className="flex items-center gap-2">
                            <Spinner className="size-4" />
                            Sending Code...
                          </span>
                        ) : (
                          <>
                            Verify with Email
                            <Mail className="ml-2 w-4 h-4" />
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={handleSkip}
                        variant="outline"
                        className="w-full border-border hover:bg-surface rounded-lg h-10 font-semibold"
                      >
                        Skip for Now
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center mt-6">
                      You can verify your email anytime from your account settings.
                    </p>
                  </div>
                )}

                {/* Step 3: OTP Input */}
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
                        className={`bg-surface border-border text-foreground placeholder:text-muted-foreground text-center text-2xl tracking-widest font-mono ${otpError ? 'border-danger' : ''
                          }`}
                      />
                      {otpError && <p className="text-xs text-danger mt-2 text-center font-medium">{otpError}</p>}
                    </div>

                    <Button
                      onClick={handleOtpSubmit}
                      disabled={otp.length !== 6 || isCheckingOtp}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-10 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCheckingOtp ? (
                        <span className="flex items-center gap-2">
                          <Spinner className="size-4" />
                          Verifying...
                        </span>
                      ) : (
                        'Verify Code'
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      Try <code className="bg-surface px-2 py-1 rounded text-primary font-mono">123456</code> for demo
                    </p>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>

          {/* Step Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            <div className={`h-1 w-8 rounded-full transition-colors ${step === 'signup' ? 'bg-primary' : 'bg-surface'}`}></div>
            <div className={`h-1 w-8 rounded-full transition-colors ${step === 'verify' ? 'bg-primary' : 'bg-surface'}`}></div>
            <div className={`h-1 w-8 rounded-full transition-colors ${step === 'otp' ? 'bg-primary' : 'bg-surface'}`}></div>
          </div>
        </div>
      </main>
    </div>
  )
}
