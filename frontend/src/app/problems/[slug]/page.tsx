'use client'

import { useEffect, useState, use, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
import type { PanelImperativeHandle } from 'react-resizable-panels'
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
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Dices,
  PanelLeftClose,
  PanelLeftOpen,
  Timer as TimerIcon,
  Maximize2,
  AlertTriangle,
  Menu,
  Search,
  Bell,
  Settings,
  LogOut,
  SquareCheck,
  SquareX,
  Heart,
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

  // Custom Scratch Resizable Workspace State
  const [leftWidth, setLeftWidth] = useState<number>(38) // Percentage of workspace width
  const [bottomHeight, setBottomHeight] = useState<number>(280) // Height in pixels
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(false)
  const [activeLeftTab, setActiveLeftTab] = useState<'description' | 'submissions'>('description')
  const [activeBottomTab, setActiveBottomTab] = useState<'testcase' | 'result'>('testcase')
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0)

  const isDraggingLeftRef = useRef(false)
  const isDraggingBottomRef = useRef(false)

  // Execution / Submission State
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [submissionResult, setSubmissionResult] = useState<ExecutionResult | null>(null)
  const [submissionTestCaseIndex, setSubmissionTestCaseIndex] = useState(0)

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
  const drawerScrollRef = useRef<HTMLDivElement>(null)

  // Refs to avoid stale closures in IntersectionObserver callback
  const drawerPageRef = useRef(1)
  const drawerHasMoreRef = useRef(true)
  const drawerLoadingMoreRef = useRef(false)

  const fetchDrawerProblems = useCallback(async () => {
    setIsDrawerLoading(true)
    setDrawerPage(1)
    drawerPageRef.current = 1
    setDrawerHasMore(true)
    drawerHasMoreRef.current = true
    try {
      const res = await api.get('/problem/get/get-all/1/50')
      const fetched = res.data?.problems || []
      const totalCount = res.data?.totalCount
      setDrawerProblems(fetched)
      if (fetched.length === 0 || fetched.length < 50 || (totalCount && fetched.length >= totalCount)) {
        setDrawerHasMore(false)
        drawerHasMoreRef.current = false
      }
    } catch (err) {
      console.error('Failed to fetch drawer problems:', err)
    } finally {
      setIsDrawerLoading(false)
    }
  }, [])

  const fetchMoreDrawerProblems = useCallback(async () => {
    if (drawerLoadingMoreRef.current || !drawerHasMoreRef.current) return []
    drawerLoadingMoreRef.current = true
    setIsDrawerLoadingMore(true)
    try {
      const nextPage = drawerPageRef.current + 1
      const res = await api.get(`/problem/get/get-all/${nextPage}/50`)
      const newFetched = res.data?.problems || []
      const totalCount = res.data?.totalCount

      if (newFetched.length === 0) {
        setDrawerHasMore(false)
        drawerHasMoreRef.current = false
      } else {
        setDrawerProblems((prev) => {
          const existingSlugs = new Set(prev.map((p) => p.slug))
          const uniqueNew = newFetched.filter(
            (p: { slug: string; problemNumber: number; title: string; difficulty: string }) => !existingSlugs.has(p.slug)
          )
          const updated = [...prev, ...uniqueNew]
          if (newFetched.length < 50 || (totalCount && updated.length >= totalCount)) {
            setDrawerHasMore(false)
            drawerHasMoreRef.current = false
          }
          return updated
        })
        setDrawerPage(nextPage)
        drawerPageRef.current = nextPage
      }
      return newFetched
    } catch (err) {
      console.error('Failed to fetch more drawer problems:', err)
      return []
    } finally {
      setIsDrawerLoadingMore(false)
      drawerLoadingMoreRef.current = false
    }
  }, [])

  const handleDrawerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (drawerLoadingMoreRef.current || !drawerHasMoreRef.current || drawerSearch.trim()) return
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget
    if (scrollTop + clientHeight >= scrollHeight - 250) {
      fetchMoreDrawerProblems()
    }
  }

  // IntersectionObserver for drawer infinite scrolling
  useEffect(() => {
    if (
      !isDrawerOpen ||
      !drawerObserverRef.current ||
      !drawerHasMore ||
      isDrawerLoadingMore ||
      isDrawerLoading ||
      drawerSearch.trim()
    ) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && drawerHasMoreRef.current && !drawerLoadingMoreRef.current) {
          fetchMoreDrawerProblems()
        }
      },
      {
        root: drawerScrollRef.current || null,
        threshold: 0.01,
        rootMargin: '200px',
      }
    )

    const currentTarget = drawerObserverRef.current
    observer.observe(currentTarget)

    return () => {
      if (currentTarget) observer.unobserve(currentTarget)
    }
  }, [isDrawerOpen, drawerPage, drawerHasMore, isDrawerLoadingMore, isDrawerLoading, drawerSearch, fetchMoreDrawerProblems])

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
    if (drawerProblems.length === 0) {
      fetchDrawerProblems()
    }
  }, [slug])

  // Navigation handlers: Previous, Next, Random
  const handlePrevProblem = () => {
    if (drawerProblems.length === 0) {
      fetchDrawerProblems()
      return
    }
    const currentIdx = drawerProblems.findIndex(
      (p) => p.slug === slug || p.problemNumber === problem?.problemNumber
    )
    if (currentIdx > 0) {
      router.push(`/problems/${drawerProblems[currentIdx - 1].slug}`)
    } else if (currentIdx === 0) {
      router.push(`/problems/${drawerProblems[drawerProblems.length - 1].slug}`)
    } else {
      router.push(`/problems/${drawerProblems[0].slug}`)
    }
  }

  const handleNextProblem = async () => {
    if (drawerProblems.length === 0) {
      await fetchDrawerProblems()
      return
    }
    const currentIdx = drawerProblems.findIndex(
      (p) => p.slug === slug || p.problemNumber === problem?.problemNumber
    )
    if (currentIdx >= 0 && currentIdx < drawerProblems.length - 1) {
      router.push(`/problems/${drawerProblems[currentIdx + 1].slug}`)
    } else if (currentIdx === drawerProblems.length - 1) {
      if (drawerHasMore) {
        const newFetched = await fetchMoreDrawerProblems()
        if (newFetched && newFetched.length > 0) {
          router.push(`/problems/${newFetched[0].slug}`)
        } else {
          router.push(`/problems/${drawerProblems[0].slug}`)
        }
      } else {
        router.push(`/problems/${drawerProblems[0].slug}`)
      }
    } else {
      router.push(`/problems/${drawerProblems[0].slug}`)
    }
  }

  const handleRandomProblem = async () => {
    let list = drawerProblems
    if (list.length === 0) {
      try {
        const res = await api.get('/problem/get/get-all/1/50')
        list = res.data?.problems || []
        setDrawerProblems(list)
      } catch (e) {
        console.error('Failed to fetch random problem:', e)
      }
    }
    if (list.length === 0) return
    const pool = list.filter((p) => p.slug !== slug)
    const candidates = pool.length > 0 ? pool : list
    const randomIndex = Math.floor(Math.random() * candidates.length)
    router.push(`/problems/${candidates[randomIndex].slug}`)
  }

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

  const expandLeftPanel = (tab?: 'description' | 'submissions') => {
    if (tab) setActiveLeftTab(tab)
    setIsLeftCollapsed(false)
  }

  const collapseLeftPanel = () => {
    setIsLeftCollapsed(true)
  }

  const expandBottomPanel = (tab?: 'testcase' | 'result') => {
    if (tab) setActiveBottomTab(tab)
    setIsBottomCollapsed(false)
  }

  const collapseBottomPanel = () => {
    setIsBottomCollapsed(true)
  }

  // Scratch-built Custom Drag Resizing Handlers
  const handleLeftMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingLeftRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingLeftRef.current) return
      const container = document.getElementById('main-workspace-container')
      if (!container) return
      const rect = container.getBoundingClientRect()
      const relativeX = moveEvent.clientX - rect.left
      const newWidthPct = (relativeX / rect.width) * 100

      if (newWidthPct < 8) {
        setIsLeftCollapsed(true)
      } else {
        setIsLeftCollapsed(false)
        setLeftWidth(Math.min(Math.max(newWidthPct, 18), 65))
      }
    }

    const onMouseUp = () => {
      isDraggingLeftRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const handleBottomMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingBottomRef.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingBottomRef.current) return
      const rightPane = document.getElementById('right-editor-pane')
      if (!rightPane) return
      const rect = rightPane.getBoundingClientRect()
      const relativeY = rect.bottom - moveEvent.clientY

      if (relativeY < 50) {
        setIsBottomCollapsed(true)
      } else {
        setIsBottomCollapsed(false)
        setBottomHeight(Math.min(Math.max(relativeY, 100), rect.height - 100))
      }
    }

    const onMouseUp = () => {
      isDraggingBottomRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const handleRunCode = async () => {
    if (!problem || isRunning || isSubmitting) return
    setIsRunning(true)
    expandBottomPanel('result')
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
    expandLeftPanel('submissions')
    setSubmissionResult(null)

    try {
      const res = await api.post('/problem/submit', {
        problemId: problem.id,
        language: selectedLanguage,
        sourceCode: code,
      })

      if (res.data?.submissionId) {
        const sub = await subscribeToSubmissionStream(res.data.submissionId)
        setSubmissionResult({
          verdict: sub.verdict,
          passedTestCases: sub.passedTestCases || 0,
          totalTestCases: sub.totalTestCases || 0,
          runtimeMs: sub.runtimeMs || 0,
          stderr: sub.stderr,
          testCaseResults: sub.testCaseResults,
        })
      } else {
        setSubmissionResult(res.data)
      }
      setSubmissionTestCaseIndex(0)
      // Refresh submissions tab list & current user solved count in background
      fetchSubmissionHistory()
      refreshCurrentUser()
    } catch (err: any) {
      console.error('Submit code error:', err)
      setSubmissionResult({
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

  const formatOutputResult = (tcRes: any) => {
    if (!tcRes) return <span className="opacity-60 italic">(no output)</span>
    const rawStr = tcRes.actualOutput ?? (tcRes.actual !== undefined ? String(tcRes.actual) : undefined)
    const expectedVal = tcRes.expected

    if (rawStr === undefined || rawStr === null) {
      return <span className="opacity-60 italic">(no output)</span>
    }

    if (typeof rawStr === 'object') {
      return JSON.stringify(rawStr)
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

    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === 'object') return JSON.stringify(parsed)
    } catch (e) {
      // ignore
    }

    return trimmed
  }

  const renderInputParameters = (inputData: any, paramsSig?: any[]) => {
    if (Array.isArray(inputData) && paramsSig && Array.isArray(paramsSig)) {
      return (
        <div className="space-y-3">
          {paramsSig.map((param: any, idx: number) => {
            const val = inputData[idx]
            const displayVal = val === undefined ? '' : typeof val === 'string' ? val : JSON.stringify(val)
            return (
              <div key={param.name || idx} className="space-y-1.5">
                <div className="text-slate-400 text-xs font-mono">{param.name} =</div>
                <div className="p-3.5 rounded-xl bg-[#242427] border border-[#38383e] text-slate-100 font-mono text-sm font-semibold tracking-tight overflow-x-auto select-text">
                  {displayVal}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    if (typeof inputData === 'object' && inputData !== null && !Array.isArray(inputData)) {
      const keys = Object.keys(inputData)
      return (
        <div className="space-y-3">
          {keys.map((key) => {
            const val = inputData[key]
            const displayVal = val === undefined ? '' : typeof val === 'string' ? val : JSON.stringify(val)
            return (
              <div key={key} className="space-y-1.5">
                <div className="text-slate-400 text-xs font-mono">{key} =</div>
                <div className="p-3.5 rounded-xl bg-[#242427] border border-[#38383e] text-slate-100 font-mono text-sm font-semibold tracking-tight overflow-x-auto select-text">
                  {displayVal}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    const displayVal = typeof inputData === 'string' ? inputData : JSON.stringify(inputData)
    return (
      <div className="p-3.5 rounded-xl bg-[#242427] border border-[#38383e] text-slate-100 font-mono text-sm font-semibold tracking-tight overflow-x-auto select-text">
        {displayVal}
      </div>
    )
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
          {/* Left: (C) logo & Independent Navigation Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Logo Home Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={user ? "/dashboard" : "/"}
                  className="w-8 h-8 rounded-lg border border-border/80 bg-surface/30 hover:bg-surface/80 flex items-center justify-center transition-all shadow-xs shrink-0 overflow-hidden"
                >
                  <Image src="/logo.png" alt="CodeRival Home" width={24} height={24} className="w-6 h-6 object-contain" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                CodeRival Home
              </TooltipContent>
            </Tooltip>

            {/* Standalone Button 1: Problem List (Opens Drawer) */}
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
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 bg-surface/30 hover:bg-surface/80 hover:border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs h-8">
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
                <div ref={drawerScrollRef} onScroll={handleDrawerScroll} className="flex-1 overflow-y-auto p-3 space-y-1">
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

            {/* Standalone Button 2: Previous Problem */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handlePrevProblem}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-surface/30 hover:bg-surface/80 hover:border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs shrink-0"
                  aria-label="Previous Problem"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-medium">
                Previous Problem
              </TooltipContent>
            </Tooltip>

            {/* Standalone Button 3: Next Problem */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleNextProblem}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-surface/30 hover:bg-surface/80 hover:border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs shrink-0"
                  aria-label="Next Problem"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-medium">
                Next Problem
              </TooltipContent>
            </Tooltip>

            {/* Standalone Button 4: Random Problem */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleRandomProblem}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-surface/30 hover:bg-surface/80 hover:border-border text-muted-foreground hover:text-amber-400 transition-all cursor-pointer shadow-xs shrink-0"
                  aria-label="Random Problem"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-medium">
                Random Problem
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Center: Enhanced Action Controls [ ▷ Run | 🚀 Submit ] */}
          <div className="flex items-center">
            <div className="flex items-center rounded-lg border border-border/80 bg-[#161c28]/90 p-0.5 shadow-sm hover:border-border transition-all">
              {/* Play / Run Code Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleRunCode}
                    disabled={isRunning || isSubmitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-[#202738] hover:text-emerald-400 transition-all rounded-l-md cursor-pointer disabled:opacity-50 h-7"
                  >
                    {isRunning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                    )}
                    <span>Run</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-medium">
                  Run Code (Ctrl + Enter)
                </TooltipContent>
              </Tooltip>

              {/* Vertical Divider */}
              <div className="w-px h-4 bg-border/80 mx-0.5" />

              {/* Submit Solution Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSubmitCode}
                    disabled={isRunning || isSubmitting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all rounded-r-md cursor-pointer disabled:opacity-50 h-7 shadow-xs border border-emerald-500/30"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Submitting</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-white" />
                        <span>Submit</span>
                      </div>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-medium">
                  Submit Solution for Evaluation
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
      {/* ─── MAIN SPLIT WORKSPACE (CUSTOM SCRATCH RESIZABLE SYSTEM) ─── */}
      <div id="main-workspace-container" className="flex-1 flex overflow-hidden relative select-none">
        {/* ─── 1. LEFT PANEL: DESCRIPTION & SUBMISSIONS ─── */}
        <div
          style={{ width: isLeftCollapsed ? '48px' : `${leftWidth}%` }}
          className="border border-border bg-card flex flex-col overflow-hidden rounded-xl m-2 shrink-0 transition-[width] duration-150 ease-in-out"
        >
          {isLeftCollapsed ? (
            /* Collapsed Left Sidebar Strip (LeetCode Style) */
            <div className="h-full flex flex-col items-center py-4 bg-[#0d1117]/80 border-r border-border shrink-0 select-none">
              <button
                onClick={() => expandLeftPanel()}
                title="Expand Left Panel"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer mb-4"
              >
                <PanelLeftOpen className="w-4 h-4 text-accent" />
              </button>
              <div className="flex flex-col items-center gap-6 mt-2">
                <button
                  onClick={() => expandLeftPanel('description')}
                  title="Description"
                  className={`flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
                    activeLeftTab === 'description' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span className="[writing-mode:vertical-lr] rotate-180 text-[11px] tracking-wide font-sans">
                    Description
                  </span>
                </button>

                <button
                  onClick={() => expandLeftPanel('submissions')}
                  title="Submissions"
                  className={`flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
                    activeLeftTab === 'submissions' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span className="[writing-mode:vertical-lr] rotate-180 text-[11px] tracking-wide font-sans">
                    Submissions
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Expanded Left Panel */
            <>
              {/* Tab Navigation with Collapse Button */}
              <div className="flex items-center justify-between border-b border-border bg-surface/40 px-2 shrink-0">
                <div className="flex items-center">
                  <button
                    onClick={() => setActiveLeftTab('description')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                      activeLeftTab === 'description'
                        ? 'border-accent text-accent bg-surface/60'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Description
                  </button>
                  <button
                    onClick={() => setActiveLeftTab('submissions')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
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

                <button
                  onClick={() => collapseLeftPanel()}
                  title="Collapse Left Panel"
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors mr-1 cursor-pointer"
                >
                  <PanelLeftClose className="w-4 h-4" />
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
                  /* Submissions History & Details Tab */
                  <div className="space-y-6">
                    {/* Pending / Judging Loading State */}
                    {isSubmitting && (
                      <div className="p-5 rounded-xl border border-accent/30 bg-accent/5 flex flex-col items-center justify-center text-center gap-3 animate-pulse">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                        <div>
                          <h4 className="text-sm font-bold text-foreground">Judging in Progress...</h4>
                          <p className="text-xs text-muted-foreground mt-1 font-mono">
                            Evaluating your solution against full hidden test suite
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Latest Submission Result Card */}
                    {!isSubmitting && submissionResult && (
                      <div className="p-4 rounded-xl border border-border bg-surface space-y-4 shadow-xs">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                          <div className="flex items-center gap-2.5">
                            {getVerdictBadge(submissionResult.verdict)}
                            <span className="text-xs font-mono text-muted-foreground font-bold">
                              {selectedLanguage}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">Latest Run</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                          <div className="p-3 rounded-lg bg-card border border-border flex flex-col gap-1">
                            <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Runtime</span>
                            <span className="text-foreground font-bold text-sm">{submissionResult.runtimeMs} ms</span>
                          </div>
                          <div className="p-3 rounded-lg bg-card border border-border flex flex-col gap-1">
                            <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Testcases Passed</span>
                            <span className="text-foreground font-bold text-sm">
                              {submissionResult.passedTestCases} / {submissionResult.totalTestCases}
                            </span>
                          </div>
                        </div>

                        {/* Stderr Error Log */}
                        {submissionResult.stderr && (
                          <div className="space-y-1">
                            <div className="text-xs font-mono text-rose-400 font-semibold">Error Log:</div>
                            <pre className="p-3 rounded-lg bg-rose-950/30 text-rose-300 text-xs font-mono border border-rose-900/50 overflow-x-auto max-h-48">
                              {submissionResult.stderr}
                            </pre>
                          </div>
                        )}

                        {/* Interactive Failed Testcase Breakdown */}
                        {submissionResult.testCaseResults && submissionResult.testCaseResults.length > 0 && (
                          <div className="space-y-3 pt-2 border-t border-border">
                            <div className="text-xs font-bold text-foreground">Test Case Details:</div>
                            <div className="flex flex-wrap gap-1.5">
                              {submissionResult.testCaseResults.map((tc, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setSubmissionTestCaseIndex(idx)}
                                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                    submissionTestCaseIndex === idx
                                      ? 'bg-card text-foreground border border-border shadow-xs'
                                      : 'text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  <span>Case {idx + 1}</span>
                                  {tc.passed ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  )}
                                </button>
                              ))}
                            </div>

                            {submissionResult.testCaseResults[submissionTestCaseIndex] && (
                              <div className="p-3 rounded-lg bg-card border border-border space-y-2 text-xs font-mono">
                                <div>
                                  <span className="text-muted-foreground text-[11px]">Input: </span>
                                  <span className="text-foreground">
                                    {JSON.stringify(submissionResult.testCaseResults[submissionTestCaseIndex].input)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-[11px]">Your Output: </span>
                                  <span className={submissionResult.testCaseResults[submissionTestCaseIndex].passed ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                                    {formatOutputResult(submissionResult.testCaseResults[submissionTestCaseIndex])}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-[11px]">Expected Output: </span>
                                  <span className="text-emerald-400 font-semibold">
                                    {JSON.stringify(submissionResult.testCaseResults[submissionTestCaseIndex].expected)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Submission History Section */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-foreground">Submission History</h3>
                      {!problem.submissions || problem.submissions.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground text-xs">
                          <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No submissions recorded yet for this problem.
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
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ─── HORIZONTAL RESIZE HANDLE ─── */}
        <div
          onMouseDown={handleLeftMouseDown}
          className="w-1.5 hover:w-2 bg-border/40 hover:bg-accent/60 cursor-col-resize transition-all shrink-0 z-20 flex items-center justify-center group"
          title="Drag to resize panels"
        >
          <div className="w-0.5 h-8 bg-border group-hover:bg-accent rounded-full" />
        </div>

        {/* ─── 2. RIGHT PANE (EDITOR + BOTTOM CONSOLE) ─── */}
        <div id="right-editor-pane" className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* MONACO EDITOR */}
          <div className="flex-1 min-h-0 bg-[#0d1117] flex flex-col overflow-hidden rounded-xl border border-border m-2">
            <NormalMonacoEditor
              language={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              value={code}
              onChange={(v) => setCode(v || '')}
              onResetCode={handleResetCode}
              storageKey={problem ? `coderival_code_prob_${problem.id}_${selectedLanguage}` : undefined}
            />
          </div>

          {/* VERTICAL RESIZE HANDLE */}
          <div
            onMouseDown={handleBottomMouseDown}
            className="h-1.5 hover:h-2 bg-border/40 hover:bg-accent/60 cursor-row-resize transition-all shrink-0 z-20 flex items-center justify-center group"
            title="Drag to resize console"
          >
            <div className="h-0.5 w-8 bg-border group-hover:bg-accent rounded-full" />
          </div>

          {/* BOTTOM CONSOLE PANEL */}
          <div
            style={{ height: isBottomCollapsed ? '36px' : `${bottomHeight}px` }}
            className="border border-border bg-card flex flex-col overflow-hidden rounded-xl m-2 shrink-0 transition-[height] duration-150 ease-in-out"
          >
            {/* Top Bar Header */}
            <div className="h-9 border-b border-border bg-surface/80 px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => expandBottomPanel('testcase')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeBottomTab === 'testcase' && !isBottomCollapsed
                      ? 'bg-[#2a2a2e] text-foreground border border-border/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <SquareCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Testcase</span>
                </button>
                <span className="text-slate-600 font-light mx-0.5 select-none">|</span>
                <button
                  onClick={() => expandBottomPanel('result')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeBottomTab === 'result' && !isBottomCollapsed
                      ? 'bg-[#2a2a2e] text-foreground border border-border/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Test Result</span>
                  {executionResult && (
                    <span className={`w-2 h-2 rounded-full ${
                      executionResult.verdict === 'AC' ? 'bg-emerald-400' : 'bg-rose-500'
                    }`} />
                  )}
                </button>
              </div>

              <button
                onClick={() => (isBottomCollapsed ? expandBottomPanel() : collapseBottomPanel())}
                title={isBottomCollapsed ? "Expand Console" : "Collapse Console"}
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {isBottomCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Content Body (Visible when expanded) */}
            {!isBottomCollapsed && (
              <div className="flex-1 p-5 overflow-y-auto font-mono text-xs space-y-6 bg-card text-foreground">
                {activeBottomTab === 'testcase' ? (
                  /* Sample Test Cases View */
                  <div className="space-y-4">
                    {/* Case Pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {problem.testCases?.map((tc, idx) => (
                        <button
                          key={tc.id || idx}
                          onClick={() => setSelectedTestCaseIndex(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            selectedTestCaseIndex === idx
                              ? 'bg-[#333338] text-white border border-slate-600/50 shadow-xs'
                              : 'bg-transparent text-slate-400 hover:bg-[#28282c] hover:text-slate-200'
                          }`}
                        >
                          <SquareCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Case {idx + 1}</span>
                        </button>
                      ))}
                    </div>

                    {/* Input Section */}
                    {problem.testCases && problem.testCases[selectedTestCaseIndex] && (
                      <div className="space-y-2">
                        <div className="text-slate-400 text-xs font-semibold font-sans mb-2">Input</div>
                        {renderInputParameters(
                          problem.testCases[selectedTestCaseIndex].input,
                          problem.signature?.params as any[]
                        )}
                      </div>
                    )}

                    {/* Contribute Testcase Footer */}
                    <div className="pt-6 pb-2 text-center">
                      <button className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium cursor-pointer font-sans">
                        <Heart className="w-3.5 h-3.5" />
                        <span>Contribute a testcase</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Execution Results View */
                  <div>
                    {isRunning ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400 font-sans">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <p className="text-xs">Running test cases against judge engine...</p>
                      </div>
                    ) : !executionResult ? (
                      <div className="text-center py-10 text-slate-400 text-xs font-sans">
                        Click "Run Code" to execute your solution against sample cases.
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {/* Verdict Header Line */}
                        <div className="flex items-baseline gap-3">
                          <h3 className={`text-xl sm:text-2xl font-bold tracking-tight font-sans ${
                            executionResult.verdict === 'AC' ? 'text-emerald-500' :
                            executionResult.verdict === 'WA' ? 'text-rose-500' :
                            executionResult.verdict === 'TLE' ? 'text-amber-500' : 'text-rose-500'
                          }`}>
                            {executionResult.verdict === 'AC' ? 'Accepted' :
                             executionResult.verdict === 'WA' ? 'Wrong Answer' :
                             executionResult.verdict === 'TLE' ? 'Time Limit Exceeded' :
                             executionResult.verdict === 'CE' ? 'Compile Error' : executionResult.verdict}
                          </h3>
                          <span className="text-slate-400 text-xs sm:text-sm font-sans font-normal">
                            Runtime: {executionResult.runtimeMs || 0} ms
                          </span>
                        </div>

                        {/* Stderr Output if present */}
                        {executionResult.stderr && (
                          <div className="space-y-1.5">
                            <div className="text-rose-400 font-semibold text-xs font-sans">Error Output:</div>
                            <pre className="p-3.5 rounded-xl bg-rose-950/40 text-rose-300 border border-rose-900/50 overflow-x-auto text-xs font-mono">
                              {executionResult.stderr}
                            </pre>
                          </div>
                        )}

                        {/* TestCase Results Tabs & Details */}
                        {executionResult.testCaseResults && executionResult.testCaseResults.length > 0 && (
                          <div className="space-y-5">
                            {/* Case Pills Row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {executionResult.testCaseResults.map((tcRes, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setSelectedTestCaseIndex(idx)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                    selectedTestCaseIndex === idx
                                      ? 'bg-[#333338] text-white border border-slate-600/50 shadow-xs'
                                      : 'bg-transparent text-slate-400 hover:bg-[#28282c] hover:text-slate-200'
                                  }`}
                                >
                                  {tcRes.passed ? (
                                    <SquareCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <SquareX className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  )}
                                  <span>Case {idx + 1}</span>
                                </button>
                              ))}
                            </div>

                            {/* Active Case Details (Input, Output, Expected) */}
                            {executionResult.testCaseResults[selectedTestCaseIndex] && (
                              <div className="space-y-4">
                                {/* Input */}
                                <div>
                                  <div className="text-slate-400 text-xs font-semibold font-sans mb-2">Input</div>
                                  {renderInputParameters(
                                    executionResult.testCaseResults[selectedTestCaseIndex].input,
                                    problem?.signature?.params as any[]
                                  )}
                                </div>

                                {/* Output */}
                                <div>
                                  <div className="text-slate-400 text-xs font-semibold font-sans mb-2">Output</div>
                                  <div className="p-3.5 rounded-xl bg-[#242427] border border-[#38383e] text-slate-100 font-mono text-sm font-semibold tracking-tight overflow-x-auto select-text">
                                    {formatOutputResult(executionResult.testCaseResults[selectedTestCaseIndex])}
                                  </div>
                                </div>

                                {/* Expected */}
                                <div>
                                  <div className="text-slate-400 text-xs font-semibold font-sans mb-2">Expected</div>
                                  <div className="p-3.5 rounded-xl bg-[#242427] border border-[#38383e] text-slate-100 font-mono text-sm font-semibold tracking-tight overflow-x-auto select-text">
                                    {typeof executionResult.testCaseResults[selectedTestCaseIndex].expected === 'string'
                                      ? executionResult.testCaseResults[selectedTestCaseIndex].expected
                                      : JSON.stringify(executionResult.testCaseResults[selectedTestCaseIndex].expected)}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Contribute Testcase Footer */}
                            <div className="pt-6 pb-2 text-center">
                              <button className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium cursor-pointer font-sans">
                                <Heart className="w-3.5 h-3.5" />
                                <span>Contribute a testcase</span>
                              </button>
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
        </div>
      </div>
    </div>
    </div>
  )
}
