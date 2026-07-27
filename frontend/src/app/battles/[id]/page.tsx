'use client'

import { useEffect, useState, useRef, use } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
  AlertTriangle,
  Swords,
  Trophy,
  Flame,
  Wifi,
  WifiOff,
  Eye,
  Flag,
  Sparkles,
  Zap,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'
import { socket } from '@/lib/socket'
import { api } from '@/lib/axios'
import { FriendButton } from '@/components/friends/FriendButton'

const SecureMonacoEditor = dynamic(
  () => import('@/components/editor/SecureMonacoEditor').then((m) => m.SecureMonacoEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full gap-2 text-sm text-muted-foreground bg-[#0d1117]">
        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Loading Secure Battle Editor...
      </div>
    ),
  }
)

interface Player {
  id: string
  username: string
  name?: string
  avatar?: string
  rating: number
}

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

interface ProblemDetail {
  id: string
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
  testCases?: TestCase[]
}

interface ActivityLog {
  id: string
  timestamp: string
  text: string
  type: 'info' | 'you' | 'rival' | 'success' | 'warning'
}

interface SubmissionResult {
  userId: string
  verdict: 'AC' | 'WA' | 'TLE' | 'MLE' | 'RTE' | 'CE' | 'IE'
  passedTestCases: number
  totalTestCases: number
  runtimeMs: number
}

interface MatchEndedPayload {
  matchId: string
  winnerId: string | null
  result: 'PLAYER1' | 'PLAYER2' | 'DRAW' | 'ABANDONED'
  player1: { id: string; username: string; oldRating: number; newRating: number; delta: number }
  player2: { id: string; username: string; oldRating: number; newRating: number; delta: number }
}

export default function BattleRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = use(params)
  const router = useRouter()
  const { user, setUser } = useAuthStore()

  // Match Details State
  const [matchStatus, setMatchStatus] = useState<'LOADING' | 'ACTIVE' | 'FINISHED'>('LOADING')
  const [problem, setProblem] = useState<ProblemDetail | null>(null)
  const [player1, setPlayer1] = useState<Player | null>(null)
  const [player2, setPlayer2] = useState<Player | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [durationMs, setDurationMs] = useState<number>(15 * 60 * 1000)

  // Disconnect & Reconnect State
  const [opponentDisconnected, setOpponentDisconnected] = useState(false)
  const [disconnectTimer, setDisconnectTimer] = useState<number>(30)

  // Editor State
  const [selectedLanguage, setSelectedLanguage] = useState<'CPP' | 'JAVA' | 'PYTHON'>('PYTHON')
  const [code, setCode] = useState<string>('')
  const [opponentCode, setOpponentCode] = useState<string>('')
  const [opponentLanguage, setOpponentLanguage] = useState<string>('PYTHON')

  // Live Activity Feed State
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])

  // UI Tabs & Panels State
  const [activeLeftTab, setActiveLeftTab] = useState<'problem' | 'feed' | 'opponent'>('problem')
  const [activeBottomTab, setActiveBottomTab] = useState<'testcase' | 'result'>('testcase')
  const [isBottomOpen, setIsBottomOpen] = useState(true)
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0)

  // Execution & Verdict State
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [executionResult, setExecutionResult] = useState<any | null>(null)

  // Match Ended Modal State
  const [matchEndedData, setMatchEndedData] = useState<MatchEndedPayload | null>(null)
  const [showSurrenderModal, setShowSurrenderModal] = useState(false)

  // Remaining Match Time Countdown (ms)
  const [remainingMs, setRemainingMs] = useState<number>(15 * 60 * 1000)

  // Anti-Cheat State
  const [antiCheatWarnings, setAntiCheatWarnings] = useState<number>(0)
  const [antiCheatBanner, setAntiCheatBanner] = useState<{
    show: boolean
    message: string
    type: 'TAB_SWITCH' | 'PASTE_ATTEMPT' | 'WINDOW_RESIZE'
  } | null>(null)
  const lastAntiCheatTimeRef = useRef<number>(0)

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Initialize Match & Socket Listeners
  useEffect(() => {
    if (!matchId) return

    if (!socket.connected) {
      socket.connect()
    }

    // Join match room and attempt reconnect sync
    socket.emit('match:join_room', { matchId })
    socket.emit('match:reconnect', { matchId })

    // Also fetch match via REST as fallback / hydration
    fetchMatchREST()

    // Socket Event Handlers
    const onStart = (data: any) => {
      hydrateMatch(data)
      addActivityLog('⚔️ 1v1 Battle Commenced! First Accepted submission wins!', 'info')
    }

    const onSyncState = (data: any) => {
      hydrateMatch(data)
      addActivityLog('🔄 Match state synchronized.', 'info')
    }

    const onOpponentCodeSync = (data: { userId: string; code: string; language: string }) => {
      if (data.userId !== user?.id) {
        setOpponentCode(data.code)
        if (data.language) setOpponentLanguage(data.language)
      }
    }

    const onSubmissionResult = (result: SubmissionResult) => {
      const isMe = result.userId === user?.id
      const pName = isMe ? 'You' : 'Rival'
      const logType = result.verdict === 'AC' ? 'success' : isMe ? 'you' : 'rival'

      addActivityLog(
        `${pName} submitted solution: ${result.passedTestCases}/${result.totalTestCases} Passed (${result.verdict})`,
        logType
      )

      if (isMe) {
        setExecutionResult({
          verdict: result.verdict,
          passedTestCases: result.passedTestCases,
          totalTestCases: result.totalTestCases,
          runtimeMs: result.runtimeMs,
        })
        setIsSubmitting(false)
        setIsBottomOpen(true)
        setActiveBottomTab('result')
      }
    }

    const onOpponentStatus = (data: { status: 'DISCONNECTED' | 'CONNECTED'; gracePeriodMs?: number }) => {
      if (data.status === 'DISCONNECTED') {
        setOpponentDisconnected(true)
        setDisconnectTimer(Math.round((data.gracePeriodMs || 30000) / 1000))
        addActivityLog('⚠️ Rival disconnected! 30-second grace period started.', 'warning')
      } else {
        setOpponentDisconnected(false)
        addActivityLog('🟢 Rival reconnected to the arena!', 'success')
      }
    }

    const onOpponentAntiCheatWarning = (data: {
      userId: string
      type: 'TAB_SWITCH' | 'PASTE_ATTEMPT' | 'WINDOW_RESIZE'
      details?: string
      warningCount?: number
    }) => {
      const typeLabel =
        data.type === 'TAB_SWITCH'
          ? 'Tab Switch / Background Focus'
          : data.type === 'PASTE_ATTEMPT'
          ? `Paste Attempt (${data.details || ''})`
          : 'Window Resized Below Threshold'
      addActivityLog(
        `⚠️ Rival received Anti-Cheat Warning: ${typeLabel} (Warning ${data.warningCount || 1}/3)`,
        'warning'
      )
    }

    const onMatchEnded = async (payload: MatchEndedPayload) => {
      setMatchStatus('FINISHED')
      setMatchEndedData(payload)

      const isWinner = payload.winnerId === user?.id
      if (isWinner) {
        addActivityLog('🏆 VICTORY! You won the 1v1 duel!', 'success')
      } else if (payload.result === 'DRAW') {
        addActivityLog('🤝 Match ended in a DRAW.', 'info')
      } else {
        addActivityLog('💀 DEFEAT! Opponent claimed victory.', 'warning')
      }

      try {
        const res = await api.get('/user/me')
        if (res.data?.user) {
          setUser(res.data.user)
        }
      } catch (err) {
        // ignore
      }
    }

    const onError = (data: { message: string }) => {
      console.error('Match socket error:', data)
      addActivityLog(`Error: ${data.message}`, 'warning')
    }

    socket.on('match:start', onStart)
    socket.on('match:found', onStart)
    socket.on('match:sync_state', onSyncState)
    socket.on('match:opponent_code_sync', onOpponentCodeSync)
    socket.on('match:submission_result', onSubmissionResult)
    socket.on('submission:result', onSubmissionResult)
    socket.on('match:opponent_status', onOpponentStatus)
    socket.on('match:opponent_anti_cheat_warning', onOpponentAntiCheatWarning)
    socket.on('match:ended', onMatchEnded)
    socket.on('match:error', onError)

    return () => {
      socket.off('match:start', onStart)
      socket.off('match:found', onStart)
      socket.off('match:sync_state', onSyncState)
      socket.off('match:opponent_code_sync', onOpponentCodeSync)
      socket.off('match:submission_result', onSubmissionResult)
      socket.off('submission:result', onSubmissionResult)
      socket.off('match:opponent_status', onOpponentStatus)
      socket.off('match:opponent_anti_cheat_warning', onOpponentAntiCheatWarning)
      socket.off('match:ended', onMatchEnded)
      socket.off('match:error', onError)
    }
  }, [matchId, user?.id])

  // Hydrate state from socket or REST payload
  const hydrateMatch = (data: any) => {
    if (!data) return
    setMatchStatus('ACTIVE')
    if (data.problem) setProblem(data.problem)
    if (data.player1) setPlayer1(data.player1)
    if (data.player2) setPlayer2(data.player2)
    if (data.startedAt) setStartedAt(data.startedAt)
    if (data.durationMs) setDurationMs(data.durationMs)

    // Set initial starter code if not set
    if (data.problem?.starterCodes) {
      const defaultStarter = data.problem.starterCodes.find((sc: StarterCode) => sc.language === 'PYTHON')
      if (defaultStarter && !code) {
        setCode(defaultStarter.code)
      }
    }
  }

  // REST API Fallback
  const fetchMatchREST = async () => {
    try {
      const res = await api.get(`/match/${matchId}`)
      const m = res.data.data
      if (m) {
        setProblem(m.problem)
        setPlayer1(m.player1)
        setPlayer2(m.player2)
        if (m.startedAt) setStartedAt(new Date(m.startedAt).getTime())
        if (m.status === 'FINISHED') {
          setMatchStatus('FINISHED')
        } else {
          setMatchStatus('ACTIVE')
        }
      }
    } catch (err) {
      console.error('Failed to fetch REST match:', err)
    }
  }

  // 2. Countdown Timer Effect
  useEffect(() => {
    if (!startedAt || matchStatus !== 'ACTIVE') return

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const remaining = Math.max(0, durationMs - elapsed)
      setRemainingMs(remaining)
    }, 1000)

    return () => clearInterval(interval)
  }, [startedAt, durationMs, matchStatus])

  // 3. Disconnect Grace Period Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (opponentDisconnected && disconnectTimer > 0) {
      interval = setInterval(() => {
        setDisconnectTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [opponentDisconnected, disconnectTimer])

  // 4. Anti-Cheat Event Listeners (Tab Switch, Focus Loss, Window Resize)
  useEffect(() => {
    if (matchStatus !== 'ACTIVE') return

    const triggerAntiCheatWarning = (
      type: 'TAB_SWITCH' | 'WINDOW_RESIZE',
      msg: string
    ) => {
      const now = Date.now()
      if (now - lastAntiCheatTimeRef.current < 2500) return
      lastAntiCheatTimeRef.current = now

      setAntiCheatWarnings((prev) => {
        const nextCount = prev + 1

        if (nextCount === 1) {
          // 1st Violation: Warning 1/1 (Final Warning)
          const warningMsg = `⚠️ Anti-Cheat Warning (1/1): ${msg} NEXT SWITCH WILL RESULT IN IMMEDIATE MATCH DISQUALIFICATION!`
          addActivityLog(warningMsg, 'warning')

          setAntiCheatBanner({
            show: true,
            message: `⚠️ WARNING (1/1): ${msg} Next switch = INSTANT DISQUALIFICATION & LOSS!`,
            type,
          })

          socket.emit('match:anti_cheat_warning', {
            matchId,
            type,
            warningCount: 1,
            details: 'FINAL WARNING',
          })

          return 1
        } else {
          // 2nd Violation: INSTANT DISQUALIFICATION & MATCH LOSS
          const disqMsg = `💀 DISQUALIFIED: Repeated tab switch / focus loss! Match forfeited.`
          addActivityLog(disqMsg, 'warning')

          setAntiCheatBanner({
            show: true,
            message: `💀 DISQUALIFIED! Match forfeited due to anti-cheat violation.`,
            type,
          })

          socket.emit('match:anti_cheat_warning', {
            matchId,
            type,
            warningCount: 2,
            details: 'DISQUALIFIED',
          })

          // Forfeit match immediately
          socket.emit('match:leave', { matchId })

          return 2
        }
      })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerAntiCheatWarning(
          'TAB_SWITCH',
          'Tab switch / background app detected!'
        )
      }
    }

    const handleWindowBlur = () => {
      triggerAntiCheatWarning(
        'TAB_SWITCH',
        'Window lost focus / application switched!'
      )
    }

    const handleWindowResize = () => {
      if (window.innerWidth < 800 || window.innerHeight < 500) {
        triggerAntiCheatWarning(
          'WINDOW_RESIZE',
          'Window dimensions reduced below competitive threshold!'
        )
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('resize', handleWindowResize)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [matchStatus, matchId])

  // Handle Code Editor Paste Interception
  const handlePasteAttempt = (pastedLength: number) => {
    if (matchStatus !== 'ACTIVE') return
    const now = Date.now()
    if (now - lastAntiCheatTimeRef.current < 2000) return
    lastAntiCheatTimeRef.current = now

    const msg = `🚫 Pasting code is strictly blocked during 1v1 ranked duels!`
    addActivityLog(`⚠️ Anti-Cheat Notice: ${msg}`, 'warning')

    setAntiCheatBanner({
      show: true,
      message: msg,
      type: 'PASTE_ATTEMPT',
    })

    socket.emit('match:anti_cheat_warning', {
      matchId,
      type: 'PASTE_ATTEMPT',
      details: 'Paste Blocked',
    })
  }

  // Activity Log Helper
  const addActivityLog = (text: string, type: ActivityLog['type']) => {
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text,
      type,
    }
    setActivityLogs((prev) => [newLog, ...prev])
  }

  // Handle Code Editor Changes & Throttled Socket Sync
  const handleCodeChange = (newCode: string | undefined) => {
    const val = newCode || ''
    setCode(val)

    // Emit live code sync to opponent
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    syncTimeoutRef.current = setTimeout(() => {
      socket.emit('match:code_sync', {
        matchId,
        code: val,
        language: selectedLanguage,
      })
    }, 500)
  }

  // Handle Language Switch
  const handleLanguageChange = (lang: 'CPP' | 'JAVA' | 'PYTHON') => {
    setSelectedLanguage(lang)
    const starter = problem?.starterCodes?.find((sc) => sc.language === lang)
    if (starter) {
      setCode(starter.code)
    } else if (problem) {
      setCode(getFallbackCode(lang, problem))
    }
  }

  const getFallbackCode = (lang: string, prob: ProblemDetail) => {
    if (lang === 'PYTHON') {
      return `class Solution:\n    def solve(self) -> None:\n        # Write Python solution here\n        pass`
    }
    if (lang === 'CPP') {
      return `#include <iostream>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        // Write C++ solution here\n    }\n};`
    }
    return `class Solution {\n    public void solve() {\n        // Write Java solution here\n    }\n}`
  }

  const handleResetCode = () => {
    const starter = problem?.starterCodes?.find((sc) => sc.language === selectedLanguage)
    if (starter) {
      setCode(starter.code)
    }
  }

  const pollSubmissionStatus = async (submissionId: string) => {
    let attempts = 0
    const maxAttempts = 30
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      attempts++
      try {
        const res = await api.get(`/problem/submission/${submissionId}`)
        const sub = res.data?.submission
        if (sub && (sub.status === 'FINISHED' || sub.verdict)) {
          return sub
        }
      } catch (err) {
        console.error('Polling submission error:', err)
      }
    }
    throw new Error('Submission execution timed out.')
  }

  // Run Code Action (Sample Testcases)
  const handleRunCode = async () => {
    if (!problem || isRunning || isSubmitting) return
    setIsRunning(true)
    setIsBottomOpen(true)
    setActiveBottomTab('result')
    setExecutionResult(null)

    addActivityLog('💡 Executing code against sample test cases...', 'you')

    try {
      const res = await api.post('/problem/run', {
        problemId: problem.id,
        language: selectedLanguage,
        sourceCode: code,
      })

      if (res.data?.submissionId) {
        const sub = await pollSubmissionStatus(res.data.submissionId)
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
        stderr: err.response?.data?.message || 'Execution error. Check backend server logs.',
      })
    } finally {
      setIsRunning(false)
    }
  }

  // Submit Code Action (Emits to Match Engine)
  const handleSubmitCode = () => {
    if (!problem || isRunning || isSubmitting || matchStatus !== 'ACTIVE') return
    setIsSubmitting(true)
    setIsBottomOpen(true)
    setActiveBottomTab('result')
    setExecutionResult(null)

    addActivityLog('⚡ Submitting solution to competitive judge engine...', 'you')

    socket.emit('match:submit', {
      matchId,
      problemId: problem.id,
      code,
      language: selectedLanguage,
    })
  }

  // Forfeit / Leave Match Action
  const handleForfeitMatch = () => {
    socket.emit('match:leave', { matchId })
    setShowSurrenderModal(false)
  }

  const formatTimer = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000)
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'AC':
        return <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-xs flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Accepted</span>
      case 'WA':
        return <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 text-xs flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Wrong Answer</span>
      case 'TLE':
        return <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 text-xs flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time Limit Exceeded</span>
      default:
        return <span className="px-2.5 py-1 rounded-md bg-gray-500/10 text-gray-400 font-bold border border-gray-500/20 text-xs">{verdict}</span>
    }
  }

  const rival = player1?.id === user?.id ? player2 : player1
  const me = player1?.id === user?.id ? player1 : player2

  if (!problem || !player1 || !player2) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-3 text-foreground">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-mono text-muted-foreground">Connecting to 1v1 Battle Arena...</p>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden select-none">
      {/* ─── 1. TOP ARENA HEADER & VERSUS BAR ─── */}
      <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 z-30 shadow-md">
        {/* Left: Exit & Problem Info */}
        <div className="flex items-center gap-3">
          <Link
            href="/battles"
            className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
            title="Leave duel to battles lobby"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary animate-pulse" />
            <h1 className="text-sm font-extrabold text-foreground truncate max-w-xs sm:max-w-sm">
              {problem.title}
            </h1>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                problem.difficulty === 'EASY'
                  ? 'bg-easy-subtle text-easy'
                  : problem.difficulty === 'MEDIUM'
                  ? 'bg-medium-subtle text-medium'
                  : 'bg-hard-subtle text-hard'
              }`}
            >
              {problem.difficulty}
            </span>
          </div>
        </div>

        {/* Center: VERSUS PLAYER CARDS & DUEL TIMER */}
        <div className="flex items-center gap-4">
          {/* You */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent flex items-center justify-center text-xs font-bold text-accent">
              {me?.username.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-accent truncate max-w-[100px]">{me?.username}</div>
              <div className="text-[10px] text-muted-foreground font-mono">{me?.rating} ELO</div>
            </div>
          </div>

          {/* Countdown Timer */}
          <div
            className={`px-3 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs ${
              remainingMs < 180000
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                : 'bg-surface border-border text-foreground'
            }`}
          >
            <TimerIcon className="w-3.5 h-3.5 text-primary" />
            <span>{formatTimer(remainingMs)}</span>
          </div>

          {/* Rival */}
          <div className="flex items-center gap-2">
            <div className="hidden md:block text-right">
              <div className="text-xs font-bold text-primary truncate max-w-[100px]">{rival?.username}</div>
              <div className="text-[10px] text-muted-foreground font-mono">{rival?.rating} ELO</div>
            </div>
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-xs font-bold text-primary relative">
              {rival?.username.charAt(0).toUpperCase()}
              {opponentDisconnected && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
            {rival?.id && <FriendButton targetUserId={rival.id} targetUsername={rival.username} size="xs" />}
          </div>
        </div>

        {/* Right: Controls & Surrender */}
        <div className="flex items-center gap-3">
          {/* Anti-Cheat Status Badge */}
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border ${
              antiCheatWarnings > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
            title="Anti-Cheat Active: Tab focus, paste control, and window dimensions are monitored"
          >
            {antiCheatWarnings > 0 ? (
              <ShieldAlert className="w-3.5 h-3.5" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>
              {antiCheatWarnings >= 2
                ? '💀 Disqualified'
                : antiCheatWarnings === 1
                ? '⚠️ Warning 1/1 (Final)'
                : 'Anti-Cheat Active'}
            </span>
          </div>

          {/* Rival Status Indicator */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border ${
              opponentDisconnected
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {opponentDisconnected ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span>{opponentDisconnected ? `Reconnecting (${disconnectTimer}s)` : 'Live'}</span>
          </div>

          {/* Surrender Button */}
          {matchStatus === 'ACTIVE' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSurrenderModal(true)}
              className="text-xs font-semibold text-rose-400 border-rose-500/30 hover:bg-rose-500/10 gap-1 h-8"
            >
              <Flag className="w-3.5 h-3.5" /> Forfeit
            </Button>
          )}
        </div>
      </header>

      {/* Disconnect Warning Banner */}
      {opponentDisconnected && (
        <div className="bg-rose-500/20 border-b border-rose-500/40 px-4 py-2 text-center text-xs text-rose-300 font-semibold flex items-center justify-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>
            Opponent lost connection! Waiting for reconnection. Forfeit victory will be granted in{' '}
            <strong>{disconnectTimer} seconds</strong>.
          </span>
        </div>
      )}

      {/* Anti-Cheat Warning Banner */}
      {antiCheatBanner?.show && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-center text-xs text-amber-300 font-semibold flex items-center justify-between gap-2 animate-pulse shrink-0 z-40">
          <div className="flex items-center gap-2 mx-auto">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{antiCheatBanner.message}</span>
          </div>
          <button
            onClick={() => setAntiCheatBanner(null)}
            className="text-amber-400 hover:text-white text-xs underline font-mono shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ─── 2. MAIN BATTLE SPLIT WORKSPACE ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── LEFT PANE: PROBLEM STATEMENT & LIVE FEED ─── */}
        <div className="w-[45%] border-r border-border bg-card flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="flex items-center border-b border-border bg-surface/40 px-2 shrink-0">
            <button
              onClick={() => setActiveLeftTab('problem')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeLeftTab === 'problem'
                  ? 'border-accent text-accent bg-surface/60'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Problem
            </button>

            <button
              onClick={() => setActiveLeftTab('feed')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeLeftTab === 'feed'
                  ? 'border-accent text-accent bg-surface/60'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Swords className="w-3.5 h-3.5 text-rose-400" /> Battle Feed
              {activityLogs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-[10px] text-rose-400 font-bold border border-rose-500/30">
                  {activityLogs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveLeftTab('opponent')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeLeftTab === 'opponent'
                  ? 'border-accent text-accent bg-surface/60'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Rival Preview
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 text-sm leading-relaxed space-y-6">
            {activeLeftTab === 'problem' ? (
              <>
                <div>
                  <h2 className="text-xl font-extrabold text-foreground mb-2">
                    {problem.title}
                  </h2>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {problem.topics?.map((t) => (
                      <span key={t.id} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface text-muted-foreground border border-border">
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="text-foreground/90 space-y-3 whitespace-pre-line text-xs font-sans">
                  {problem.description}
                </div>

                {/* Examples */}
                {problem.examples && problem.examples.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Sample Examples:</h3>
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

                {/* Constraints */}
                {problem.constraints && (
                  <div className="space-y-2 pt-3 border-t border-border">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Constraints:</h3>
                    <pre className="text-xs font-mono text-muted-foreground whitespace-pre-line">
                      {problem.constraints}
                    </pre>
                  </div>
                )}
              </>
            ) : activeLeftTab === 'feed' ? (
              /* Battle Activity Feed Tab */
              <div className="space-y-3 font-mono text-xs">
                <div className="text-xs text-muted-foreground font-semibold flex items-center justify-between border-b border-border pb-2">
                  <span>Live Event Log</span>
                  <span className="text-[10px] text-accent">Real-Time Sync</span>
                </div>

                {activityLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs">
                    No activity recorded yet. Events will log live during duel!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-3 rounded-lg border flex items-start gap-3 ${
                          log.type === 'success'
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                            : log.type === 'warning'
                            ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                            : log.type === 'you'
                            ? 'bg-accent/10 border-accent/30 text-accent'
                            : 'bg-surface border-border text-foreground/90'
                        }`}
                      >
                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                          {log.timestamp}
                        </span>
                        <div className="leading-relaxed">{log.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Opponent Code Preview Tab */
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-border bg-surface flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary flex items-center justify-center font-bold text-primary">
                      {rival?.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">@{rival?.username}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        Active Language: <strong className="text-accent">{opponentLanguage}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-muted-foreground">
                    Code Length: <strong className="text-foreground">{opponentCode.length} chars</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-accent" /> Live Sync Code Preview:
                  </div>
                  {opponentCode ? (
                    <pre className="p-4 rounded-xl bg-[#0d1117] border border-border text-xs font-mono text-foreground/90 overflow-x-auto max-h-[400px]">
                      {opponentCode}
                    </pre>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-xs bg-surface rounded-xl border border-border">
                      Rival code will preview here as they type...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT PANE: MONACO EDITOR & RUN/SUBMIT ─── */}
        <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
          {/* Top Bar Controls */}
          <div className="h-10 border-b border-border bg-card px-3 flex items-center justify-between shrink-0">
            {/* Language Selector */}
            <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
              {(['CPP', 'JAVA', 'PYTHON'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition-colors ${
                    selectedLanguage === lang
                      ? 'bg-card text-accent shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {lang === 'CPP' ? 'C++' : lang === 'JAVA' ? 'Java' : 'Python 3'}
                </button>
              ))}
            </div>

            {/* Actions: Reset, Run, Submit */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetCode}
                title="Reset to starter code"
                className="p-1.5 rounded-lg border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <Button
                size="sm"
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting}
                className="bg-surface hover:bg-surface-2 text-foreground border border-border text-xs font-semibold gap-1.5 h-7 px-3"
              >
                {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" /> : <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />}
                <span>Run Code</span>
              </Button>

              <Button
                size="sm"
                onClick={handleSubmitCode}
                disabled={isRunning || isSubmitting || matchStatus !== 'ACTIVE'}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-extrabold gap-1.5 h-7 px-4 shadow-md"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5 fill-white" />}
                <span>SUBMIT SOLUTION</span>
              </Button>
            </div>
          </div>

          {/* Secure Monaco Editor Component */}
          <div className="flex-1 relative overflow-hidden">
            <SecureMonacoEditor
              language={selectedLanguage}
              value={code}
              onChange={handleCodeChange}
              onPasteAttempt={handlePasteAttempt}
            />
          </div>

          {/* ─── BOTTOM PANEL: CONSOLE / EXECUTION RESULTS ─── */}
          <div className={`border-t border-border bg-card flex flex-col transition-all duration-200 ${
            isBottomOpen ? 'h-[260px]' : 'h-8'
          }`}>
            <div className="h-8 border-b border-border bg-surface/50 px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setIsBottomOpen(true); setActiveBottomTab('testcase'); }}
                  className={`flex items-center gap-1.5 px-3 py-0.5 text-xs font-semibold rounded-md transition-colors ${
                    activeBottomTab === 'testcase' && isBottomOpen
                      ? 'bg-surface text-accent'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" /> Sample Inputs
                </button>
                <button
                  onClick={() => { setIsBottomOpen(true); setActiveBottomTab('result'); }}
                  className={`flex items-center gap-1.5 px-3 py-0.5 text-xs font-semibold rounded-md transition-colors ${
                    activeBottomTab === 'result' && isBottomOpen
                      ? 'bg-surface text-accent'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" /> Output & Verdict
                  {executionResult && (
                    <span className={`w-2 h-2 rounded-full ${
                      executionResult.verdict === 'AC' ? 'bg-emerald-400' : 'bg-rose-500'
                    }`} />
                  )}
                </button>
              </div>

              <button
                onClick={() => setIsBottomOpen(!isBottomOpen)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {isBottomOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {isBottomOpen && (
              <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-3">
                {activeBottomTab === 'testcase' ? (
                  <div className="space-y-3">
                    {problem.examples && problem.examples.length > 0 ? (
                      problem.examples.map((ex, idx) => (
                        <div key={ex.id || idx} className="p-3 rounded-lg bg-surface border border-border space-y-1">
                          <div className="text-[11px] text-muted-foreground font-semibold">Sample {idx + 1}:</div>
                          <div><span className="text-muted-foreground">Input: </span><span className="text-foreground">{ex.input}</span></div>
                          <div><span className="text-muted-foreground">Expected: </span><span className="text-emerald-400 font-semibold">{ex.output}</span></div>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground text-xs">No sample testcases provided.</div>
                    )}
                  </div>
                ) : (
                  <div>
                    {isRunning || isSubmitting ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <p className="text-xs">Processing solution through judge engine...</p>
                      </div>
                    ) : !executionResult ? (
                      <div className="text-center py-6 text-muted-foreground text-xs">
                        Click "Run Code" or "SUBMIT SOLUTION" to test your implementation.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
                          <div className="flex items-center gap-3">
                            {getVerdictBadge(executionResult.verdict)}
                            <span className="text-xs text-muted-foreground">
                              Testcases Passed: {executionResult.passedTestCases} / {executionResult.totalTestCases}
                            </span>
                          </div>
                          {executionResult.runtimeMs !== undefined && (
                            <div className="text-xs text-muted-foreground font-mono">
                              Runtime: <span className="text-foreground font-semibold">{executionResult.runtimeMs} ms</span>
                            </div>
                          )}
                        </div>

                        {executionResult.stderr && (
                          <div className="space-y-1">
                            <div className="text-rose-400 font-semibold text-[11px]">Execution Error Output:</div>
                            <pre className="p-3 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-900/50 overflow-x-auto">
                              {executionResult.stderr}
                            </pre>
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

      {/* ─── 3. FORFEIT CONFIRMATION MODAL ─── */}
      {showSurrenderModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-rose-500/40 rounded-2xl p-6 space-y-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center mx-auto text-rose-400">
              <Flag className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="font-extrabold text-lg text-foreground">Forfeit Duel?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to surrender this match? Your opponent will be awarded victory and ELO rating will be deducted from your account.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSurrenderModal(false)}
                className="flex-1 bg-surface border-border text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleForfeitMatch}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                Confirm Forfeit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. POST-MATCH VICTORY / DEFEAT OVERLAY ─── */}
      {matchEndedData && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fadeIn">
          {/* Radial Glow */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none ${
              matchEndedData.winnerId === user?.id
                ? 'bg-emerald-500/20'
                : matchEndedData.result === 'DRAW'
                ? 'bg-sky-500/20'
                : 'bg-rose-500/20'
            }`}
          />

          <div className="relative z-10 max-w-xl w-full text-center space-y-8">
            {/* Victory / Defeat Header */}
            <div className="space-y-3">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto border-2 ${
                  matchEndedData.winnerId === user?.id
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 animate-bounce'
                    : matchEndedData.result === 'DRAW'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-400'
                    : 'bg-rose-500/20 border-rose-500 text-rose-400'
                }`}
              >
                {matchEndedData.winnerId === user?.id ? (
                  <Trophy className="w-10 h-10" />
                ) : matchEndedData.result === 'DRAW' ? (
                  <Sparkles className="w-10 h-10" />
                ) : (
                  <XCircle className="w-10 h-10" />
                )}
              </div>

              <h2 className="text-4xl font-black tracking-tight text-foreground">
                {matchEndedData.winnerId === user?.id
                  ? 'VICTORY!'
                  : matchEndedData.result === 'DRAW'
                  ? 'MATCH DRAW'
                  : antiCheatWarnings >= 2
                  ? 'DISQUALIFIED'
                  : 'DEFEAT'}
              </h2>

              <p className="text-xs text-muted-foreground font-mono">
                {matchEndedData.winnerId === user?.id
                  ? 'You submitted an Accepted solution first and won the duel!'
                  : matchEndedData.result === 'DRAW'
                  ? 'Both contenders finished with equal score.'
                  : antiCheatWarnings >= 2
                  ? 'Disqualified from match due to repeated tab switching / anti-cheat violation.'
                  : 'Opponent claimed the duel victory.'}
              </p>
            </div>

            {/* ELO Rating Changes Breakdown */}
            {(() => {
              const isP1 = matchEndedData.player1.id === user?.id
              const myRatingInfo = isP1 ? matchEndedData.player1 : matchEndedData.player2
              const rivalRatingInfo = isP1 ? matchEndedData.player2 : matchEndedData.player1

              return (
                <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-card border border-border shadow-xl">
                  {/* You */}
                  <div className="p-4 rounded-xl bg-surface border border-accent/30 text-center space-y-1">
                    <div className="text-xs text-muted-foreground font-mono">Your ELO</div>
                    <div className="text-xl font-extrabold text-foreground">
                      {myRatingInfo.newRating}{' '}
                      <span
                        className={`text-sm font-bold ${
                          myRatingInfo.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        ({myRatingInfo.delta >= 0 ? `+${myRatingInfo.delta}` : myRatingInfo.delta})
                      </span>
                    </div>
                  </div>

                  {/* Opponent */}
                  <div className="p-4 rounded-xl bg-surface border border-primary/30 text-center space-y-2">
                    <div className="text-xs text-muted-foreground font-mono">Rival ({rival?.username}) ELO</div>
                    <div className="text-xl font-extrabold text-foreground">
                      {rivalRatingInfo.newRating}{' '}
                      <span
                        className={`text-sm font-bold ${
                          rivalRatingInfo.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        ({rivalRatingInfo.delta >= 0 ? `+${rivalRatingInfo.delta}` : rivalRatingInfo.delta})
                      </span>
                    </div>
                    {rival?.id && (
                      <div className="pt-1 flex justify-center">
                        <FriendButton targetUserId={rival.id} targetUsername={rival.username} size="xs" />
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <Button
                size="lg"
                onClick={() => router.push('/battles')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold h-12 gap-2"
              >
                <Zap className="w-4 h-4 fill-white" /> Find Next 1v1 Duel
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setMatchEndedData(null)}
                className="w-full bg-surface border-border text-foreground font-semibold h-12"
              >
                Review Solutions
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
