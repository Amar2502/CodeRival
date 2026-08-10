'use client'

import { useEffect, useState, use, useCallback, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { getSavedCode, removeSavedCode } from '@/lib/indexedDB'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const NormalMonacoEditor = dynamic(
  () => import('@/components/editor/NormalMonacoEditor').then((m) => m.NormalMonacoEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full gap-2 text-sm text-muted-foreground bg-[#0d1117]">
        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Loading Practice Code Editor...
      </div>
    ),
  }
)
import { api } from '@/lib/axios'
import { socket } from '@/lib/socket'
import {
  ArrowLeft,
  Play,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Code2,
  FileText,
  History,
  Terminal,
  Loader2,
  ChevronUp,
  ChevronDown,
  Timer as TimerIcon,
  Maximize2,
  AlertTriangle,
  Menu,
  Search,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuthStore, refreshCurrentUser } from '@/lib/authStore'
import { UserAvatar } from '@/components/UserAvatar'
import { getRatingInfo } from '@/lib/rating'

interface Example {
  id: string
  input: string
  output: string
  explanation?: string
  order: number
}

interface StarterCode {
  id: string
  language: 'CPP' | 'JAVA' | 'PYTHON'
  code: string
}

interface TestCase {
  id: string
  input: any
  expected: any
  order: number
  isSample: boolean
}

interface SubmissionRecord {
  id: string
  submissionType: 'RUN' | 'SUBMIT'
  language: 'CPP' | 'JAVA' | 'PYTHON'
  verdict: 'AC' | 'WA' | 'TLE' | 'MLE' | 'RTE' | 'CE' | 'IE'
  runtimeMs: number
  passedTestCases: number
  totalTestCases: number
  submittedAt: string
  sourceCode: string
  stderr?: string
  testCaseResults?: any
}

interface ProblemDetail {
  id: string
  problemNumber: number
  title: string
  slug: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  description: string
  constraints: string
  timeLimitMs: number
  memoryLimitMb: number
  examples: Example[]
  topics: Array<{ id: string; name: string }>
  signature?: { functionName: string; returnType: string; params: any }
  starterCodes: StarterCode[]
  testCases: TestCase[]
  submissions?: SubmissionRecord[]
}

interface ExecutionResult {
  submissionId?: string
  verdict: 'AC' | 'WA' | 'TLE' | 'MLE' | 'RTE' | 'CE' | 'IE'
  runtimeMs: number
  memoryKb?: number
  totalTestCases: number
  passedTestCases: number
  stderr?: string
  testCaseResults?: Array<{
    input: any
    expected: any
    actualOutput?: string
    actual?: any
    passed: boolean
    runtimeMs?: number
    error?: string
  }>
}

export default function ProblemWorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const ratingInfo = getRatingInfo(user?.rating || 1200)

  const [problem, setProblem] = useState<ProblemDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Editor State
  const [selectedLanguage, setSelectedLanguage] = useState<'CPP' | 'JAVA' | 'PYTHON'>('PYTHON')
  const [code, setCode] = useState<string>('')

  // UI Tabs & Panels State
  const [activeLeftTab, setActiveLeftTab] = useState<'description' | 'submissions'>('description')
  const [activeBottomTab, setActiveBottomTab] = useState<'testcase' | 'result'>('testcase')
  const [isBottomOpen, setIsBottomOpen] = useState(true)
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0)

  // Execution / Submission State
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)

  // Selected submission in history tab
  const [expandedSubmission, setExpandedSubmission] = useState<SubmissionRecord | null>(null)

  // Notifications State (Kite Button)
  const [pendingFriendsCount, setPendingFriendsCount] = useState<number>(0)

  // Timer State
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  // Fetch pending friend request notifications
  const fetchPendingCount = useCallback(async () => {
    if (!user) {
      setPendingFriendsCount(0)
      return
    }
    try {
      const res = await api.get('/friends')
      const incoming = res.data?.incomingRequests || []
      setPendingFriendsCount(incoming.length)
    } catch (err) {
      // Silently ignore
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchPendingCount()

    const handleUpdate = () => fetchPendingCount()
    socket.on('friend:request_received', handleUpdate)
    socket.on('friend:request_accepted', handleUpdate)
    socket.on('friend:removed', handleUpdate)

    return () => {
      socket.off('friend:request_received', handleUpdate)
      socket.off('friend:request_accepted', handleUpdate)
      socket.off('friend:removed', handleUpdate)
    }
  }, [user, fetchPendingCount])

  // Problem List Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerProblems, setDrawerProblems] = useState<Array<{ problemNumber: number; title: string; slug: string; difficulty: string }>>([])
  const [drawerSearch, setDrawerSearch] = useState('')
  const [isDrawerLoading, setIsDrawerLoading] = useState(false)
  const [drawerPage, setDrawerPage] = useState(1)
  const [drawerHasMore, setDrawerHasMore] = useState(true)
  const [isDrawerLoadingMore, setIsDrawerLoadingMore] = useState(false)
  const drawerObserverRef = useRef<HTMLDivElement>(null)

  const fetchDrawerProblems = async () => {
    setIsDrawerLoading(true)
    setDrawerPage(1)
    setDrawerHasMore(true)
    try {
      const res = await api.get('/problem/get/get-all/1/50')
      const fetched = res.data?.problems || []
      setDrawerProblems(fetched)
      if (res.data?.totalCount && fetched.length >= res.data.totalCount) {
        setDrawerHasMore(false)
      } else if (fetched.length < 50) {
        setDrawerHasMore(false)
      }
    } catch (err) {
      console.error('Failed to fetch drawer problems:', err)
    } finally {
      setIsDrawerLoading(false)
    }
  }

  const fetchMoreDrawerProblems = async () => {
    if (isDrawerLoadingMore || !drawerHasMore) return
    setIsDrawerLoadingMore(true)
    try {
      const nextPage = drawerPage + 1
      const res = await api.get(`/problem/get/get-all/${nextPage}/50`)
      const newFetched = res.data?.problems || []
      const totalCount = res.data?.totalCount

      if (newFetched.length === 0) {
        setDrawerHasMore(false)
      } else {
        setDrawerProblems((prev) => {
          const existingSlugs = new Set(prev.map((p) => p.slug))
          const uniqueNew = newFetched.filter((p: { slug: string; problemNumber: number; title: string; difficulty: string }) => !existingSlugs.has(p.slug))
          const updated = [...prev, ...uniqueNew]
          if (newFetched.length < 50 || (totalCount && updated.length >= totalCount)) {
            setDrawerHasMore(false)
          }
          return updated
        })
        setDrawerPage(nextPage)
      }
    } catch (err) {
      console.error('Failed to fetch more drawer problems:', err)
    } finally {
      setIsDrawerLoadingMore(false)
    }
  }

  // IntersectionObserver for drawer infinite scrolling
  useEffect(() => {
    if (!drawerObserverRef.current || !drawerHasMore || isDrawerLoadingMore || isDrawerLoading || drawerSearch.trim()) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && drawerHasMore && !isDrawerLoadingMore) {
          fetchMoreDrawerProblems()
        }
      },
      { threshold: 0.1, rootMargin: '150px' }
    )

    const currentTarget = drawerObserverRef.current
    observer.observe(currentTarget)

    return () => {
      if (currentTarget) observer.unobserve(currentTarget)
    }
  }, [drawerPage, drawerHasMore, isDrawerLoadingMore, isDrawerLoading, drawerSearch])

  const filteredDrawerProblems = drawerProblems.filter((p) => {
    const query = drawerSearch.toLowerCase()
    return (
      p.title.toLowerCase().includes(query) ||
      p.slug.toLowerCase().includes(query) ||
      p.problemNumber.toString().includes(query)
    )
  })

  useEffect(() => {
    fetchProblemDetails()
  }, [slug])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning) {
      interval = setInterval(() => setSecondsElapsed((prev) => prev + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  // Real-Time Socket Event Listener for Submission Results (Pure Event-Driven Push)
  useEffect(() => {
    if (!socket.connected) {
      socket.connect()
    }

    const onSubmissionResult = (result: any) => {
      setExecutionResult({
        verdict: result.verdict,
        passedTestCases: result.passedTestCases || 0,
        totalTestCases: result.totalTestCases || 0,
        runtimeMs: result.runtimeMs || 0,
        stderr: result.stderr,
        testCaseResults: result.testCaseResults,
      })
      setIsRunning(false)
      setIsSubmitting(false)
      setSelectedTestCaseIndex(0)
      fetchSubmissionHistory()
    }

    socket.on('submission:result', onSubmissionResult)
    return () => {
      socket.off('submission:result', onSubmissionResult)
    }
  }, [problem?.id])

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const fetchProblemDetails = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get(`/problem/get/${slug}`)
      const data: ProblemDetail = res.data.problem
      setProblem(data)

      // Retrieve user's global preferred language, default to 'PYTHON'
      const savedPref = (typeof window !== 'undefined' ? localStorage.getItem('coderival_preferred_language') : null) as 'CPP' | 'JAVA' | 'PYTHON' | null
      const defaultLang: 'CPP' | 'JAVA' | 'PYTHON' = (savedPref && ['CPP', 'JAVA', 'PYTHON'].includes(savedPref)) ? savedPref : 'PYTHON'
      setSelectedLanguage(defaultLang)

      const storageKey = `coderival_code_prob_${data.id}_${defaultLang}`
      const saved = await getSavedCode(storageKey)
      if (saved && saved.trim()) {
        setCode(saved)
      } else {
        const initialStarter = data.starterCodes?.find((sc) => sc.language === defaultLang)
        setCode(initialStarter ? initialStarter.code : getFallbackCode(defaultLang, data))
      }
    } catch (err: any) {
      console.error('Failed to fetch problem:', err)
      setError(err.response?.data?.message || 'Problem not found')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSubmissionHistory = async () => {
    if (!problem?.id) return
    try {
      const res = await api.get(`/problem/submissions/${problem.id}`)
      const submissions = res.data?.submissions
      if (submissions && Array.isArray(submissions)) {
        setProblem((prev) => (prev ? { ...prev, submissions } : prev))
      }
    } catch (err) {
      console.error('Failed to fetch submission history:', err)
    }
  }

  const handleLanguageChange = async (lang: 'CPP' | 'JAVA' | 'PYTHON') => {
    setSelectedLanguage(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('coderival_preferred_language', lang)
    }
    if (!problem) return
    const storageKey = `coderival_code_prob_${problem.id}_${lang}`
    const saved = await getSavedCode(storageKey)
    if (saved && saved.trim()) {
      setCode(saved)
    } else {
      const starter = problem.starterCodes?.find((sc) => sc.language === lang)
      if (starter) {
        setCode(starter.code)
      } else {
        setCode(getFallbackCode(lang, problem))
      }
    }
  }

  const handleResetCode = async () => {
    if (!problem) return
    const storageKey = `coderival_code_prob_${problem.id}_${selectedLanguage}`
    await removeSavedCode(storageKey)
    const starter = problem.starterCodes?.find((sc) => sc.language === selectedLanguage)
    if (starter) {
      setCode(starter.code)
    } else {
      setCode(getFallbackCode(selectedLanguage, problem))
    }
  }

  const getFallbackCode = (lang: string, prob: ProblemDetail) => {
    if (lang === 'PYTHON') {
      return `class Solution:\n    def ${prob.signature?.functionName || 'solve'}(self, ${prob.signature?.params ? (prob.signature.params as any[]).map(p=>p.name).join(', ') : 'nums'}) -> None:\n        # Write your code here\n        pass`
    }
    if (lang === 'CPP') {
      return `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    void ${prob.signature?.functionName || 'solve'}() {\n        // Write your code here\n    }\n};`
    }
    return `class Solution {\n    public void ${prob.signature?.functionName || 'solve'}() {\n        // Write your code here\n    }\n}`
  }

  const subscribeToSubmissionStream = (submissionId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      const eventSource = new EventSource(`${baseUrl}/problem/submission/${submissionId}/stream`, {
        withCredentials: true,
      })

      const timeoutId = setTimeout(() => {
        eventSource.close()
        reject(new Error('Submission execution timed out.'))
      }, 60000)

      eventSource.onmessage = (event) => {
        try {
          clearTimeout(timeoutId)
          const data = JSON.parse(event.data)
          eventSource.close()
          resolve(data)
        } catch (err) {
          clearTimeout(timeoutId)
          eventSource.close()
          reject(err)
        }
      }

      eventSource.onerror = () => {
        clearTimeout(timeoutId)
        eventSource.close()
        reject(new Error('Server-sent event stream failed.'))
      }
    })
  }

  const handleRunCode = async () => {
    if (!problem || isRunning || isSubmitting) return
    setIsRunning(true)
    setIsBottomOpen(true)
    setActiveBottomTab('result')
    setExecutionResult(null)

    try {
      const res = await api.post('/problem/run', {
        problemId: problem.id,
        language: selectedLanguage,
        sourceCode: code,
      })

      if (res.data?.submissionId) {
        const sub = await subscribeToSubmissionStream(res.data.submissionId)
        setExecutionResult({
          verdict: sub.verdict,
          passedTestCases: sub.passedTestCases || 0,
          totalTestCases: sub.totalTestCases || 0,
          runtimeMs: sub.runtimeMs || 0,
          stderr: sub.stderr,
          testCaseResults: sub.testCaseResults,
        })
      } else {
        setExecutionResult(res.data)
      }
      setSelectedTestCaseIndex(0)
    } catch (err: any) {
      console.error('Run code error:', err)
      setExecutionResult({
        verdict: 'IE',
        runtimeMs: 0,
        totalTestCases: 0,
        passedTestCases: 0,
        stderr: err.response?.data?.message || err.message || 'Execution request failed. Check server logs.',
      })
    } finally {
      setIsRunning(false)
    }
  }

  const handleSubmitCode = async () => {
    if (!problem || isRunning || isSubmitting) return
    setIsSubmitting(true)
    setIsBottomOpen(true)
    setActiveBottomTab('result')
    setExecutionResult(null)

    try {
      const res = await api.post('/problem/submit', {
        problemId: problem.id,
        language: selectedLanguage,
        sourceCode: code,
      })

      if (res.data?.submissionId) {
        const sub = await subscribeToSubmissionStream(res.data.submissionId)
        setExecutionResult({
          verdict: sub.verdict,
          passedTestCases: sub.passedTestCases || 0,
          totalTestCases: sub.totalTestCases || 0,
          runtimeMs: sub.runtimeMs || 0,
          stderr: sub.stderr,
          testCaseResults: sub.testCaseResults,
        })
      } else {
        setExecutionResult(res.data)
      }
      setSelectedTestCaseIndex(0)
      // Refresh submissions tab list & current user solved count in background
      fetchSubmissionHistory()
      refreshCurrentUser()
    } catch (err: any) {
      console.error('Submit code error:', err)
      setExecutionResult({
        verdict: 'IE',
        runtimeMs: 0,
        totalTestCases: 0,
        passedTestCases: 0,
        stderr: err.response?.data?.message || err.message || 'Submission request failed. Check server logs.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'AC':
        return <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-xs flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Accepted</span>
      case 'WA':
        return <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 text-xs flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Wrong Answer</span>
      case 'TLE':
        return <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 text-xs flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time Limit Exceeded</span>
      case 'CE':
        return <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 text-xs flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Compilation Error</span>
      case 'RTE':
        return <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 text-xs flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Runtime Error</span>
      default:
        return <span className="px-2.5 py-1 rounded-md bg-gray-500/10 text-gray-400 font-bold border border-gray-500/20 text-xs">{verdict}</span>
    }
  }

  const renderFormattedText = (text: string) => {
    if (!text) return null
    // Simple line-by-line markdown/code rendering helper
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('```')) return null
      if (line.startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-muted-foreground my-1">
            <span dangerouslySetInnerHTML={{ __html: formatInlineCode(line.substring(2)) }} />
          </li>
        )
      }
      return (
        <p key={idx} className="my-2 leading-relaxed">
          <span dangerouslySetInnerHTML={{ __html: formatInlineCode(line) }} />
        </p>
      )
    })
  }

  const formatInlineCode = (str: string) => {
    return str
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface border border-border text-accent font-mono text-xs">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-mono">Loading problem workspace...</p>
      </div>
    )
  }

  if (error || !problem) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-bold text-foreground">{error || 'Problem not found'}</h2>
        <Button onClick={() => router.push('/problems')} className="bg-primary text-primary-foreground">
          Back to Problems List
        </Button>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden select-none">
      {/* ─── WORKSPACE SUB-HEADER ─── */}
      <header className="h-12 border-b border-border bg-[#0d1117] px-4 flex items-center justify-between shrink-0 z-30 font-sans">
        <TooltipProvider>
          {/* Left: (C) logo & ≡ Problem List Drawer */}
          <div className="flex items-center gap-3">
            {/* Circle Logo (C) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={user ? "/dashboard" : "/"}
                  className="w-7 h-7 rounded-full border border-border/80 bg-surface/60 flex items-center justify-center font-bold text-xs text-foreground hover:border-primary/50 hover:bg-surface transition-colors shadow-xs"
                >
                  <span className="text-primary font-bold">C</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                CodeRival Home
              </TooltipContent>
            </Tooltip>

            {/* Menu icon ≡ + Problem List (Opens Drawer) */}
            <Drawer
              direction="left"
              open={isDrawerOpen}
              onOpenChange={(open) => {
                setIsDrawerOpen(open)
                if (open && drawerProblems.length === 0) {
                  fetchDrawerProblems()
                }
              }}
            >
              <DrawerTrigger asChild>
                <button className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface/80 transition-colors cursor-pointer">
                  <Menu className="w-4 h-4 text-foreground/80" />
                  <span>Problem List</span>
                </button>
              </DrawerTrigger>
              <DrawerContent className="bg-[#0d1117] border-r border-border text-foreground flex flex-col h-full max-w-sm sm:max-w-md z-50">
                <DrawerHeader className="border-b border-border/80 pb-4 text-left">
                  <DrawerTitle className="text-base font-extrabold text-foreground flex items-center justify-between">
                    <span>Problem List</span>
                    <span className="text-xs font-mono text-muted-foreground font-normal">
                      {drawerProblems.length} Problems
                    </span>
                  </DrawerTitle>
                  <DrawerDescription className="text-xs text-muted-foreground">
                    Select a problem to solve in the workspace
                  </DrawerDescription>

                  {/* Search Input */}
                  <div className="relative mt-3">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search problems..."
                      value={drawerSearch}
                      onChange={(e) => setDrawerSearch(e.target.value)}
                      className="pl-9 bg-surface/50 border-border text-xs h-9"
                    />
                  </div>
                </DrawerHeader>

                {/* Scrollable Problem List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {isDrawerLoading ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-xs text-muted-foreground font-mono">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Loading problems...</span>
                    </div>
                  ) : filteredDrawerProblems.length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground">
                      No problems found
                    </div>
                  ) : (
                    <>
                      {filteredDrawerProblems.map((p) => {
                        const isCurrent = p.slug === slug
                        return (
                          <div
                            key={p.slug}
                            onClick={() => {
                              setIsDrawerOpen(false)
                              if (!isCurrent) {
                                router.push(`/problems/${p.slug}`)
                              }
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isCurrent
                                ? 'bg-primary/10 border-primary/40 text-primary font-semibold'
                                : 'bg-surface/30 border-border/50 hover:bg-surface text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span className="font-mono text-muted-foreground text-[11px] shrink-0">
                                #{p.problemNumber}
                              </span>
                              <span className="truncate">{p.title}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                p.difficulty === 'EASY'
                                  ? 'bg-easy-subtle text-easy'
                                  : p.difficulty === 'MEDIUM'
                                  ? 'bg-medium-subtle text-medium'
                                  : 'bg-hard-subtle text-hard'
                              }`}
                            >
                              {p.difficulty.charAt(0) + p.difficulty.slice(1).toLowerCase()}
                            </span>
                          </div>
                        )
                      })}

                      {/* Infinite Loading Indicator & Observer Sentinel */}
                      {!isDrawerLoading && drawerHasMore && !drawerSearch.trim() && (
                        <div
                          ref={drawerObserverRef}
                          className="flex items-center justify-center py-4 gap-2 text-xs font-mono text-muted-foreground select-none"
                        >
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          <span>Loading more problems...</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </DrawerContent>
            </Drawer>
          </div>

          {/* Center: Joined Pill [ ▷ | Submit ] */}
          <div className="flex items-center">
            <div className="flex items-center rounded-lg border border-border/80 bg-surface/30 p-0.5 shadow-xs hover:border-border transition-colors">
              {/* Play / Run code side */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleRunCode}
                    disabled={isRunning || isSubmitting}
                    className="flex items-center justify-center px-3 py-1 text-xs font-medium text-foreground hover:bg-surface/80 hover:text-primary transition-colors rounded-l-md cursor-pointer disabled:opacity-50"
                  >
                    {isRunning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-foreground text-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Run Code (Ctrl + Enter)
                </TooltipContent>
              </Tooltip>

              {/* Vertical divider */}
              <div className="w-px h-4 bg-border/80 mx-0.5" />

              {/* Submit side */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSubmitCode}
                    disabled={isRunning || isSubmitting}
                    className="flex items-center justify-center px-4 py-1 text-xs font-semibold text-foreground hover:bg-surface/80 hover:text-emerald-400 transition-colors rounded-r-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        <span>Submitting</span>
                      </div>
                    ) : (
                      <span>Submit</span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Submit Solution
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Right: Clock Timer [ (o) ], Kite Notification Bell ◇, User Avatar (A) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Clock Timer button [ (o) ] */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer text-xs font-mono ${
                    isTimerRunning
                      ? 'border-primary/50 bg-primary/10 text-primary font-semibold'
                      : 'border-border/80 text-muted-foreground hover:text-foreground hover:bg-surface/80'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-current shrink-0" />
                  <span>{formatTimer(secondsElapsed)}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isTimerRunning ? 'Click to pause timer' : 'Click to start timer'}
              </TooltipContent>
            </Tooltip>

            {/* Notification Bell Button (Matching Header style) */}
            <Link href="/friends" title="Notifications">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground hover:bg-surface border border-border/60 rounded-xl h-8 w-8 cursor-pointer"
              >
                <Bell className="w-4 h-4 text-foreground" />
                {pendingFriendsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse ring-2 ring-background" />
                )}
              </Button>
            </Link>

            {/* Avatar Circle Dropdown (Matching Header style) */}
            {user ? (
              <Select onValueChange={(val) => {
                if (val === 'profile') router.push(`/${user?.username || ''}`)
                if (val === 'settings') router.push('/settings')
                if (val === 'logout') {
                  api.post('/auth/logout').catch(() => {})
                  logout()
                  router.push('/signin')
                }
              }}>
                <SelectTrigger className="w-auto h-auto p-0 border-none bg-transparent hover:opacity-90 focus:ring-0 focus:outline-none rounded-full shadow-none cursor-pointer [&>svg]:hidden">
                  <div className="relative p-0.5 rounded-full border border-border hover:border-primary/50 transition-colors">
                    <UserAvatar src={user.avatar_url || user.avatar} username={user.username} name={user.name} size="sm" />
                  </div>
                </SelectTrigger>
                <SelectContent position="popper" align="end" sideOffset={8} className="bg-card/95 backdrop-blur-xl border border-border shadow-2xl min-w-[210px] p-1.5 rounded-2xl z-50 animate-in fade-in-0 zoom-in-95">
                  {/* Clickable Profile Card Item */}
                  <SelectItem 
                    value="profile" 
                    className="cursor-pointer p-2 rounded-xl focus:bg-surface-2 hover:bg-surface-2 text-foreground focus:text-foreground data-[highlighted]:bg-surface-2 data-[highlighted]:text-foreground transition-colors group [&>span:first-child]:hidden"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <UserAvatar src={user.avatar_url || user.avatar} username={user.username} name={user.name} size="md" />
                      <div className="flex flex-col text-left min-w-0">
                        <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          @{user.username}
                        </span>
                        <span className={`text-[10px] font-extrabold ${ratingInfo.colorClass}`}>
                          {user.rating || 1200} ELO
                        </span>
                      </div>
                    </div>
                  </SelectItem>

                  <SelectSeparator className="my-1.5 bg-border/60" />

                  {/* Settings Item */}
                  <SelectItem 
                    value="settings" 
                    className="cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold text-foreground focus:bg-surface-2 hover:bg-surface-2 focus:text-foreground data-[highlighted]:bg-surface-2 data-[highlighted]:text-foreground transition-colors [&>span:first-child]:hidden"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-accent" />
                      <span>Settings</span>
                    </div>
                  </SelectItem>

                  <SelectSeparator className="my-1 bg-border/60" />

                  {/* Logout Item */}
                  <SelectItem 
                    value="logout" 
                    className="cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 focus:bg-rose-500/10 hover:bg-rose-500/10 focus:text-rose-400 data-[highlighted]:bg-rose-500/10 data-[highlighted]:text-rose-400 transition-colors [&>span:first-child]:hidden"
                  >
                    <div className="flex items-center gap-2.5">
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Log Out</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Link href="/signin">
                <div className="w-8 h-8 rounded-full border border-border bg-surface flex items-center justify-center font-bold text-xs text-muted-foreground hover:text-foreground">
                  A
                </div>
              </Link>
            )}
          </div>
        </TooltipProvider>
      </header>

      {/* ─── MAIN SPLIT WORKSPACE ─── */}
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* ─── LEFT PANE: DESCRIPTION & SUBMISSIONS ─── */}
          <ResizablePanel defaultSize="45%" minSize="25%" maxSize="75%" className="border-r border-border bg-card flex flex-col overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex items-center border-b border-border bg-surface/40 px-2 shrink-0">
              <button
                onClick={() => setActiveLeftTab('description')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeLeftTab === 'description'
                    ? 'border-accent text-accent bg-surface/60'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Description
              </button>
              <button
                onClick={() => setActiveLeftTab('submissions')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeLeftTab === 'submissions'
                    ? 'border-accent text-accent bg-surface/60'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <History className="w-3.5 h-3.5" /> Submissions
                {problem.submissions && problem.submissions.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-surface text-[10px] text-muted-foreground border border-border">
                    {problem.submissions.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5 text-sm leading-relaxed space-y-6">
              {activeLeftTab === 'description' ? (
                <>
                  {/* Header Title */}
                  <div>
                    <h2 className="text-xl font-extrabold text-foreground mb-2">
                      {problem.problemNumber}. {problem.title}
                    </h2>
                    {/* Topic Pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {problem.topics?.map((t) => (
                        <span key={t.id} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface text-muted-foreground border border-border">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Problem Description */}
                  <div className="text-foreground/90 space-y-2">
                    {renderFormattedText(problem.description)}
                  </div>

                  {/* Examples Section */}
                  {problem.examples && problem.examples.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-foreground">Examples:</h3>
                      {problem.examples.map((example, idx) => (
                        <div key={example.id || idx} className="rounded-lg border border-border bg-surface p-3.5 space-y-2 font-mono text-xs">
                          <div className="font-semibold text-muted-foreground">Example {idx + 1}:</div>
                          <div>
                            <span className="text-muted-foreground">Input: </span>
                            <span className="text-foreground">{example.input}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Output: </span>
                            <span className="text-emerald-400 font-semibold">{example.output}</span>
                          </div>
                          {example.explanation && (
                            <div className="pt-1 border-t border-border/50 text-muted-foreground">
                              <span>Explanation: </span>
                              <span className="text-foreground/80">{example.explanation}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Constraints Section */}
                  {problem.constraints && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <h3 className="text-sm font-bold text-foreground">Constraints:</h3>
                      <ul className="text-xs space-y-1 font-mono">
                        {renderFormattedText(problem.constraints)}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                /* Submissions History Tab */
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground">Submission History</h3>
                  {!problem.submissions || problem.submissions.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-xs">
                      <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No submissions yet for this problem. Click "Submit" to test your code!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {problem.submissions.map((sub) => (
                        <div
                          key={sub.id}
                          onClick={() => setExpandedSubmission(expandedSubmission?.id === sub.id ? null : sub)}
                          className="p-3 rounded-lg border border-border bg-surface hover:bg-surface-2 transition-colors cursor-pointer space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getVerdictBadge(sub.verdict)}
                              <span className="text-xs font-mono text-muted-foreground">{sub.language}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                            <span>Runtime: {sub.runtimeMs} ms</span>
                            <span>Testcases: {sub.passedTestCases} / {sub.totalTestCases}</span>
                          </div>

                          {/* Expanded Code View */}
                          {expandedSubmission?.id === sub.id && (
                            <div className="pt-2 border-t border-border mt-2 space-y-2">
                              <div className="font-mono text-xs text-muted-foreground font-semibold">Submitted Source Code:</div>
                              <pre className="p-3 rounded bg-[#0d1117] text-xs font-mono text-foreground overflow-x-auto border border-border">
                                {sub.sourceCode}
                              </pre>
                              {sub.stderr && (
                                <div className="space-y-1">
                                  <div className="font-mono text-xs text-rose-400 font-semibold">Error Log:</div>
                                  <pre className="p-2.5 rounded bg-rose-950/30 text-rose-300 text-xs font-mono border border-rose-900/50 overflow-x-auto">
                                    {sub.stderr}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ─── RIGHT PANE: MONACO EDITOR & TESTCASE/RESULTS ─── */}
          <ResizablePanel defaultSize="55%" minSize="25%" className="bg-[#0d1117] flex flex-col overflow-hidden">
            {isBottomOpen ? (
              <ResizablePanelGroup direction="vertical" className="flex-1">
                {/* Monaco Editor Panel */}
                <ResizablePanel defaultSize="65%" minSize="25%" className="flex flex-col relative overflow-hidden">
                  <NormalMonacoEditor
                    language={selectedLanguage}
                    onLanguageChange={handleLanguageChange}
                    value={code}
                    onChange={(v) => setCode(v || '')}
                    onResetCode={handleResetCode}
                    storageKey={problem ? `coderival_code_prob_${problem.id}_${selectedLanguage}` : undefined}
                  />
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Bottom Panel: Testcase & Execution Result */}
                <ResizablePanel defaultSize="35%" minSize="4%" className="border-t border-border bg-card flex flex-col overflow-hidden">
                  {/* Bottom Bar Header */}
                  <div className="h-9 border-b border-border bg-surface/50 px-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setIsBottomOpen(true); setActiveBottomTab('testcase'); }}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                          activeBottomTab === 'testcase' && isBottomOpen
                            ? 'bg-surface text-accent'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Terminal className="w-3.5 h-3.5" /> Testcase
                      </button>
                      <button
                        onClick={() => { setIsBottomOpen(true); setActiveBottomTab('result'); }}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                          activeBottomTab === 'result' && isBottomOpen
                            ? 'bg-surface text-accent'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5" /> Test Result
                        {executionResult && (
                          <span className={`w-2 h-2 rounded-full ${
                            executionResult.verdict === 'AC' ? 'bg-emerald-400' : 'bg-rose-500'
                          }`} />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => setIsBottomOpen(false)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bottom Content Body */}
                  <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-3">
                    {activeBottomTab === 'testcase' ? (
                      /* Sample Test Cases View */
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {problem.testCases?.map((tc, idx) => (
                            <button
                              key={tc.id || idx}
                              onClick={() => setSelectedTestCaseIndex(idx)}
                              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                                selectedTestCaseIndex === idx
                                  ? 'bg-surface text-foreground border border-border'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              Case {idx + 1}
                            </button>
                          ))}
                        </div>

                        {problem.testCases && problem.testCases[selectedTestCaseIndex] && (
                          <div className="space-y-3">
                            <div>
                              <div className="text-muted-foreground text-[11px] mb-1 font-semibold">Input:</div>
                              <div className="p-3 rounded-lg bg-surface border border-border">
                                {Array.isArray(problem.testCases[selectedTestCaseIndex].input) &&
                                problem.signature?.params &&
                                Array.isArray(problem.signature.params) ? (
                                  <div className="space-y-1">
                                    {(problem.signature.params as any[]).map((param: any, idx: number) => (
                                      <div key={param.name || idx} className="flex items-center gap-2">
                                        <span className="text-muted-foreground">{param.name} =</span>
                                        <span className="text-foreground font-semibold">
                                          {JSON.stringify(problem.testCases[selectedTestCaseIndex].input[idx])}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-foreground">
                                    {JSON.stringify(problem.testCases[selectedTestCaseIndex].input)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-[11px] mb-1 font-semibold">Expected Output:</div>
                              <div className="p-3 rounded-lg bg-surface border border-border text-emerald-400 font-semibold">
                                {JSON.stringify(problem.testCases[selectedTestCaseIndex].expected)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Execution Results View */
                      <div>
                        {isRunning || isSubmitting ? (
                          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-xs">Running test cases against judge engine...</p>
                          </div>
                        ) : !executionResult ? (
                          <div className="text-center py-8 text-muted-foreground text-xs">
                            Click "Run" or "Submit" to execute your solution.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Verdict Header Banner */}
                            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
                              <div className="flex items-center gap-3">
                                {getVerdictBadge(executionResult.verdict)}
                                <span className="text-xs text-muted-foreground">
                                  Passed {executionResult.passedTestCases} / {executionResult.totalTestCases} Testcases
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                Runtime: <span className="text-foreground font-semibold">{executionResult.runtimeMs} ms</span>
                              </div>
                            </div>

                            {/* Stderr or Compilation Error Log */}
                            {executionResult.stderr && (
                              <div className="space-y-1">
                                <div className="text-rose-400 font-semibold text-[11px]">Error Output:</div>
                                <pre className="p-3 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-900/50 overflow-x-auto">
                                  {executionResult.stderr}
                                </pre>
                              </div>
                            )}

                            {/* TestCase Results Tabs */}
                            {executionResult.testCaseResults && executionResult.testCaseResults.length > 0 && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  {executionResult.testCaseResults.map((tcRes, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => setSelectedTestCaseIndex(idx)}
                                      className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                        selectedTestCaseIndex === idx
                                          ? 'bg-surface text-foreground border border-border'
                                          : 'text-muted-foreground hover:text-foreground'
                                      }`}
                                    >
                                      <span>Case {idx + 1}</span>
                                      {tcRes.passed ? (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                      ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                      )}
                                    </button>
                                  ))}
                                </div>

                                {executionResult.testCaseResults[selectedTestCaseIndex] && (
                                  <div className="space-y-2">
                                    <div>
                                      <div className="text-muted-foreground text-[11px] mb-1">Input:</div>
                                      <div className="p-2.5 rounded-lg bg-surface border border-border">
                                        {Array.isArray(executionResult.testCaseResults[selectedTestCaseIndex].input) &&
                                        problem?.signature?.params &&
                                        Array.isArray(problem.signature.params) ? (
                                          <div className="space-y-1">
                                            {(problem.signature.params as any[]).map((param: any, idx: number) => (
                                              <div key={param.name || idx} className="flex items-center gap-2">
                                                <span className="text-muted-foreground">{param.name} =</span>
                                                <span className="text-foreground font-semibold">
                                                  {JSON.stringify(
                                                    executionResult.testCaseResults![selectedTestCaseIndex].input[idx]
                                                  )}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-foreground">
                                            {JSON.stringify(executionResult.testCaseResults[selectedTestCaseIndex].input)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <div className="text-muted-foreground text-[11px] mb-1">Your Output:</div>
                                        <div className={`p-2.5 rounded-lg border font-semibold ${
                                          executionResult.testCaseResults[selectedTestCaseIndex].passed
                                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                                            : 'bg-rose-950/20 border-rose-500/30 text-rose-400'
                                        }`}>
                                          {(() => {
                                            const tcRes = executionResult.testCaseResults[selectedTestCaseIndex]
                                            const rawStr = tcRes.actualOutput ?? (tcRes.actual !== undefined ? String(tcRes.actual) : undefined)
                                            const expectedVal = tcRes.expected

                                            if (rawStr === undefined || rawStr === null) {
                                              return <span className="opacity-60 italic">(no output)</span>
                                            }

                                            const trimmed = String(rawStr).trim()
                                            if (trimmed === '') {
                                              if (Array.isArray(expectedVal)) {
                                                return '[]'
                                              }
                                              return <span className="opacity-60 italic">(empty output)</span>
                                            }

                                            // Format space-separated array output like "0 1" -> "[0, 1]" or "[0,1]"
                                            if (Array.isArray(expectedVal) && /^-?\d+(\s+-?\d+)*$/.test(trimmed)) {
                                              const parsed = trimmed.split(/\s+/).map((x) => Number(x))
                                              return JSON.stringify(parsed)
                                            }

                                            return trimmed
                                          })()}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-muted-foreground text-[11px] mb-1">Expected Output:</div>
                                        <div className="p-2.5 rounded-lg bg-surface border border-border text-emerald-400 font-semibold">
                                          {JSON.stringify(executionResult.testCaseResults[selectedTestCaseIndex].expected)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 relative overflow-hidden">
                  <NormalMonacoEditor
                    language={selectedLanguage}
                    onLanguageChange={handleLanguageChange}
                    value={code}
                    onChange={(v) => setCode(v || '')}
                    onResetCode={handleResetCode}
                    storageKey={problem ? `coderival_code_prob_${problem.id}_${selectedLanguage}` : undefined}
                  />
                </div>
                <div className="h-9 border-t border-border bg-card flex items-center justify-between px-3 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setIsBottomOpen(true); setActiveBottomTab('testcase'); }}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Terminal className="w-3.5 h-3.5" /> Testcase
                    </button>
                    <button
                      onClick={() => { setIsBottomOpen(true); setActiveBottomTab('result'); }}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Code2 className="w-3.5 h-3.5" /> Test Result
                      {executionResult && (
                        <span className={`w-2 h-2 rounded-full ${
                          executionResult.verdict === 'AC' ? 'bg-emerald-400' : 'bg-rose-500'
                        }`} />
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => setIsBottomOpen(true)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
