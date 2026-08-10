'use client'

import { useEffect, useState, useRef, use } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { getSavedCode, removeSavedCode } from '@/lib/indexedDB'
import { toast } from 'sonner'
import { isDevelopment } from '@/lib/config'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { UserAvatar } from '@/components/UserAvatar'

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
  avatar_url?: string | null
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
  reason?: 'SOLUTION_ACCEPTED' | 'OPPONENT_CHEATED' | 'OPPONENT_SURRENDERED' | 'OPPONENT_DISCONNECTED' | 'TIMEOUT' | 'DRAW' | null
  tournamentId?: string | null
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
  const [isTournamentMatch, setIsTournamentMatch] = useState(false)
  const [tournamentId, setTournamentId] = useState<string | null>(null)

  // Disconnect & Reconnect State
  const [opponentDisconnected, setOpponentDisconnected] = useState(false)
  const [disconnectTimer, setDisconnectTimer] = useState<number>(30)

  // Editor State
  const [selectedLanguage, setSelectedLanguage] = useState<'CPP' | 'JAVA' | 'PYTHON'>('PYTHON')
  const [code, setCode] = useState<string>('')

  // Live Activity Feed State
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])

  // UI Tabs & Panels State
  const [activeLeftTab, setActiveLeftTab] = useState<'problem' | 'feed'>('problem')
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
  const [antiCheatDisqualified, setAntiCheatDisqualified] = useState(false)
  const isMatchFinishedRef = useRef(false)
  const [antiCheatBanner, setAntiCheatBanner] = useState<{
    show: boolean
    message: string
    type: 'FULLSCREEN_EXIT' | 'PASTE_ATTEMPT'
  } | null>(null)
  const [showFullscreenExitDialog, setShowFullscreenExitDialog] = useState(false)
  const lastAntiCheatTimeRef = useRef<number>(0)

  const isParticipant = !!(user?.id && (player1?.id === user.id || player2?.id === user.id))
  const isSpectator = !isParticipant && isTournamentMatch

  // Pre-Battle Rules Acceptance Modal State
  const [showPreBattleRulesModal, setShowPreBattleRulesModal] = useState(false)
  const [showDeclineConfirmModal, setShowDeclineConfirmModal] = useState(false)

  // Always show rules modal — user MUST click "Accept & Enter Fullscreen" (requestFullscreen requires a user gesture)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isParticipant && matchStatus !== 'FINISHED') {
      setShowPreBattleRulesModal(true)
    }
  }, [isParticipant, matchStatus, matchId])

  const handleAcceptRules = () => {
    if (typeof window !== 'undefined') {
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {})
        }
      } catch {}
    }
    setShowPreBattleRulesModal(false)
    toast.success('Battle guidelines accepted. Entering fullscreen!')
  }

  const handleDeclineRules = () => {
    setShowDeclineConfirmModal(true)
  }

  const handleConfirmLeaveMatch = () => {
    setShowDeclineConfirmModal(false)
    setShowPreBattleRulesModal(false)
    if (matchStatus === 'ACTIVE') {
      socket.emit('match:surrender', { matchId })
    }
    router.push('/battles')
  }

  const handleCancelLeaveMatch = () => {
    setShowDeclineConfirmModal(false)
  }

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

    const onOpponentSubmitted = (data: { userId: string }) => {
      if (data.userId !== user?.id) {
        toast.info('⚡ Opponent submitted a solution! Judging in progress...')
        addActivityLog('⚡ Rival submitted a solution for judging...', 'rival')
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

        if (result.verdict === 'AC') {
          toast.success('🎉 Accepted! All test cases passed!')
        } else if (result.verdict === 'WA') {
          toast.error(`❌ Wrong Answer (${result.passedTestCases}/${result.totalTestCases} passed)`)
        } else if (result.verdict === 'TLE') {
          toast.warning('⏱️ Time Limit Exceeded')
        } else if (result.verdict === 'CE') {
          toast.error('⚠️ Compilation Error')
        } else {
          toast.error(`Execution Result: ${result.verdict}`)
        }
      } else {
        // Opponent submission result
        if (result.verdict === 'AC') {
          toast.error('💀 Opponent solved the problem! Match ending...')
        } else {
          toast.info(`Opponent result: ${result.verdict} (${result.passedTestCases}/${result.totalTestCases} passed)`)
        }
      }
    }

    const onOpponentStatus = (data: { status: 'DISCONNECTED' | 'CONNECTED'; gracePeriodMs?: number }) => {
      if (data.status === 'DISCONNECTED') {
        setOpponentDisconnected(true)
        setDisconnectTimer(Math.round((data.gracePeriodMs || 30000) / 1000))
        addActivityLog('⚠️ Rival disconnected! 30-second grace period started.', 'warning')
        toast.warning('⚠️ Rival disconnected! 30-second grace period started.')
      } else {
        setOpponentDisconnected(false)
        addActivityLog('🟢 Rival reconnected to the arena!', 'success')
        toast.success('🟢 Rival reconnected to the arena!')
      }
    }

    const onOpponentAntiCheatWarning = (data: {
      userId: string
      type: 'TAB_SWITCH' | 'PASTE_ATTEMPT' | 'WINDOW_RESIZE' | 'FULLSCREEN_EXIT'
      details?: string
      warningCount?: number
    }) => {
      const typeLabel =
        data.type === 'FULLSCREEN_EXIT'
          ? 'Exited Fullscreen (DISQUALIFIED)'
          : data.type === 'TAB_SWITCH'
          ? 'Tab Switch / Background Focus'
          : data.type === 'PASTE_ATTEMPT'
          ? `Paste Attempt (${data.details || ''})`
          : 'Window Resized Below Threshold'
      addActivityLog(
        `⚠️ Rival Anti-Cheat Violation: ${typeLabel}`,
        'warning'
      )
      toast.warning(`⚠️ Rival Anti-Cheat Violation: ${typeLabel}`)
    }

    const onMatchEnded = async (payload: MatchEndedPayload) => {
      isMatchFinishedRef.current = true
      setMatchStatus('FINISHED')
      setMatchEndedData(payload)
      if (payload.tournamentId) {
        setTournamentId(payload.tournamentId)
      }

      // Exit fullscreen automatically when match ends
      try {
        if (typeof document !== 'undefined' && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        }
      } catch {}

      const isWinner = payload.winnerId === user?.id
      if (isWinner) {
        addActivityLog('🏆 VICTORY! You won the 1v1 duel!', 'success')
        toast.success('🏆 VICTORY! You won the 1v1 duel!')
      } else if (payload.result === 'DRAW') {
        addActivityLog('🤝 Match ended in a DRAW.', 'info')
        toast.info('🤝 Match ended in a DRAW.')
      } else {
        addActivityLog('💀 DEFEAT! Opponent claimed victory.', 'warning')
        toast.error('💀 DEFEAT! Opponent claimed victory.')
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
      toast.error(`Error: ${data.message}`)
      if (data.message && data.message.includes('Access denied')) {
        router.replace('/battles')
      }
    }

    socket.on('match:start', onStart)
    socket.on('match:found', onStart)
    socket.on('match:sync_state', onSyncState)
    socket.on('match:opponent_submitted', onOpponentSubmitted)
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
      socket.off('match:opponent_submitted', onOpponentSubmitted)
      socket.off('match:submission_result', onSubmissionResult)
      socket.off('submission:result', onSubmissionResult)
      socket.off('match:opponent_status', onOpponentStatus)
      socket.off('match:opponent_anti_cheat_warning', onOpponentAntiCheatWarning)
      socket.off('match:ended', onMatchEnded)
      socket.off('match:error', onError)
    }
  }, [matchId, user?.id, router])

  // Hydrate state from socket or REST payload
  const hydrateMatch = (data: any) => {
    if (!data) return
    setMatchStatus('ACTIVE')
    if (data.problem) setProblem(data.problem)
    if (data.player1) setPlayer1(data.player1)
    if (data.player2) setPlayer2(data.player2)
    if (data.startedAt) setStartedAt(data.startedAt)
    if (data.durationMs) setDurationMs(data.durationMs)
    if (data.tournamentMatches && data.tournamentMatches.length > 0) {
      setIsTournamentMatch(true)
      if (data.tournamentMatches[0]?.tournamentId) {
        setTournamentId(data.tournamentMatches[0].tournamentId)
      }
    }

    // Set initial starter code if not set (checking IndexedDB first)
    if (data.problem?.starterCodes && !code) {
      const savedPref = (typeof window !== 'undefined' ? localStorage.getItem('coderival_preferred_language') : null) as 'CPP' | 'JAVA' | 'PYTHON' | null
      const defaultLang: 'CPP' | 'JAVA' | 'PYTHON' = (savedPref && ['CPP', 'JAVA', 'PYTHON'].includes(savedPref)) ? savedPref : 'PYTHON'
      setSelectedLanguage(defaultLang)

      const storageKey = `coderival_code_battle_${matchId}_${defaultLang}`
      getSavedCode(storageKey).then((saved) => {
        if (saved && saved.trim()) {
          setCode(saved)
        } else {
          const defaultStarter = data.problem.starterCodes.find((sc: StarterCode) => sc.language === defaultLang)
          if (defaultStarter) {
            setCode(defaultStarter.code)
          } else {
            setCode(getFallbackCode(defaultLang, data.problem))
          }
        }
      })
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
        if (m.tournamentMatches && m.tournamentMatches.length > 0) {
          setIsTournamentMatch(true)
          if (m.tournamentMatches[0]?.tournamentId) {
            setTournamentId(m.tournamentMatches[0].tournamentId)
          }
        }
        if (m.status === 'FINISHED') {
          isMatchFinishedRef.current = true
          setMatchStatus('FINISHED')
        } else {
          setMatchStatus('ACTIVE')
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch REST match:', err)
      if (err.response?.status === 403) {
        toast.error(err.response.data?.message || 'Access denied to this 1v1 battle.')
        router.replace('/battles')
      }
    }
  }

  // Auto-exit fullscreen when matchStatus transitions to FINISHED
  useEffect(() => {
    if (matchStatus === 'FINISHED') {
      isMatchFinishedRef.current = true
      try {
        if (typeof document !== 'undefined' && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        }
      } catch {}
    }
  }, [matchStatus])

  // Check authorization for non-participants (redirect if regular 1v1)
  useEffect(() => {
    if (user?.id && player1?.id && player2?.id) {
      const isPart = user.id === player1.id || user.id === player2.id
      if (!isPart && !isTournamentMatch) {
        toast.error('Access denied: You are not a participant in this 1v1 battle.')
        router.replace('/battles')
      }
    }
  }, [user?.id, player1?.id, player2?.id, isTournamentMatch, router])

  // 2. Countdown Timer Effect
  useEffect(() => {
    if (!startedAt || matchStatus !== 'ACTIVE') return

    let timeoutEmitted = false

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const remaining = Math.max(0, durationMs - elapsed)
      setRemainingMs(remaining)

      if (remaining <= 0 && !timeoutEmitted) {
        timeoutEmitted = true
        socket.emit('match:timeout', { matchId })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [startedAt, durationMs, matchStatus, matchId])

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

  // 4. Anti-Cheat: Fullscreen Exit / Window Blur = Instant Disqualification
  useEffect(() => {
    if (isSpectator) return
    if (matchStatus !== 'ACTIVE' || isMatchFinishedRef.current) return

    // Shared disqualification logic — called by both fullscreen exit & blur
    const triggerInstantDisqualification = (
      reason: 'FULLSCREEN_EXIT' | 'WINDOW_BLUR',
      displayMsg: string
    ) => {
      if (isMatchFinishedRef.current) return

      // Prevent duplicate DQ if already disqualified
      setAntiCheatDisqualified((already) => {
        if (already) return true

        const disqMsg = `💀 DISQUALIFIED: ${displayMsg}`
        addActivityLog(disqMsg, 'warning')

        setAntiCheatBanner({
          show: true,
          message: `💀 DISQUALIFIED! ${displayMsg}`,
          type: 'FULLSCREEN_EXIT',
        })
        setShowFullscreenExitDialog(true)

        socket.emit('match:anti_cheat_warning', {
          matchId,
          type: reason,
          warningCount: 1,
          details: `DISQUALIFIED — ${displayMsg}`,
        })

        socket.emit('match:cheat_disqualify', { matchId, type: reason, details: displayMsg })

        return true
      })
    }

    const handleFullscreenChange = () => {
      if (isMatchFinishedRef.current || matchStatus !== 'ACTIVE') return
      if (!document.fullscreenElement) {
        triggerInstantDisqualification('FULLSCREEN_EXIT', 'Exited fullscreen mode! Match forfeited.')
      }
    }

    const handleWindowBlur = () => {
      if (isMatchFinishedRef.current || matchStatus !== 'ACTIVE') return
      // Catches Linux desktop switching, Alt+Tab on some WMs, etc.
      // where fullscreen stays active but the window loses focus
      triggerInstantDisqualification('WINDOW_BLUR', 'Window lost focus (desktop switch detected)! Match forfeited.')
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const message = '⚠️ WARNING: Leaving or closing this tab will disqualify you from the active match!'
      e.preventDefault()
      e.returnValue = message
      return message
    }

    const handlePageHide = () => {
      socket.emit('match:cheat_disqualify', { matchId, type: 'TAB_SWITCH', details: 'TAB_CLOSED_OR_UNLOADED' })
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [matchStatus, matchId, isSpectator])


  // Handle Code Editor Paste Interception
  const handlePasteAttempt = (pastedLength: number) => {
    if (isSpectator) return
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

  // Handle Code Changes
  const handleCodeChange = (val: string | undefined) => {
    if (val === undefined) return
    setCode(val)
  }

  // Handle Language Switch
  const handleLanguageChange = async (lang: 'CPP' | 'JAVA' | 'PYTHON') => {
    setSelectedLanguage(lang)
    const storageKey = `coderival_code_battle_${matchId}_${lang}`
    const saved = await getSavedCode(storageKey)
    if (saved && saved.trim()) {
      setCode(saved)
    } else {
      const starter = problem?.starterCodes?.find((sc) => sc.language === lang)
      if (starter) {
        setCode(starter.code)
      } else if (problem) {
        setCode(getFallbackCode(lang, problem))
      }
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

  const handleResetCode = async () => {
    const storageKey = `coderival_code_battle_${matchId}_${selectedLanguage}`
    await removeSavedCode(storageKey)
    const starter = problem?.starterCodes?.find((sc) => sc.language === selectedLanguage)
    if (starter) {
      setCode(starter.code)
    } else if (problem) {
      setCode(getFallbackCode(selectedLanguage, problem))
    }
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

  // Run Code Action (Sample Testcases)
  const handleRunCode = async () => {
    if (!problem || isRunning || isSubmitting) return
    setIsRunning(true)
    setIsBottomOpen(true)
    setActiveBottomTab('result')
    setExecutionResult(null)

    addActivityLog('💡 Executing code against sample test cases...', 'you')
    toast.info('💡 Executing code against sample test cases...')

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
        if (sub.verdict === 'AC') {
          toast.success('Sample test cases passed!')
        } else {
          toast.error(`Sample run result: ${sub.verdict}`)
        }
      } else {
        setExecutionResult(res.data)
      }
      setSelectedTestCaseIndex(0)
    } catch (err: any) {
      console.error('Run code error:', err)
      const errorMsg = err.response?.data?.message || err.message || 'Execution error. Check backend server logs.'
      setExecutionResult({
        verdict: 'IE',
        runtimeMs: 0,
        totalTestCases: 0,
        passedTestCases: 0,
        stderr: errorMsg,
      })
      toast.error(`Execution error: ${errorMsg}`)
    } finally {
      setIsRunning(false)
    }
  }

  // Submit Code Action (Emits to Match Engine)
  const handleSubmitCode = () => {
    if (!problem || isRunning || isSubmitting || matchStatus !== 'ACTIVE' || isSpectator) return
    setIsSubmitting(true)
    setIsBottomOpen(true)
    setActiveBottomTab('result')
    setExecutionResult(null)

    addActivityLog('⚡ Submitting solution to competitive judge engine...', 'you')
    toast.info('⚡ Submitting solution to competitive judge engine...')

    socket.emit('match:submit', {
      matchId,
      problemId: problem.id,
      code,
      language: selectedLanguage,
    })
  }

  // Forfeit / Leave Match Action
  const handleForfeitMatch = () => {
    socket.emit('match:surrender', { matchId })
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



  const me = player1?.id === user?.id ? player1 : player2?.id === user?.id ? player2 : player1
  const rival = player1?.id === user?.id ? player2 : player2?.id === user?.id ? player1 : player2

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
        <TooltipProvider>
          {/* Left: Exit & Problem Info */}
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={tournamentId ? `/tournaments/${tournamentId}` : '/battles'}
                  className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Leave duel to battles lobby
              </TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border" />

            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-primary animate-pulse" />
              <h1 className="text-sm font-extrabold text-foreground truncate max-w-xs sm:max-w-sm">
                {problem.title}
              </h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold cursor-help ${
                      problem.difficulty === 'EASY'
                        ? 'bg-easy-subtle text-easy'
                        : problem.difficulty === 'MEDIUM'
                        ? 'bg-medium-subtle text-medium'
                        : 'bg-hard-subtle text-hard'
                    }`}
                  >
                    {problem.difficulty}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Problem Difficulty: {problem.difficulty}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Center: VERSUS PLAYER CARDS & DUEL TIMER */}
          <div className="flex items-center gap-4">
            {/* You */}
            <div className="flex items-center gap-2">
              <UserAvatar
                src={me?.avatar_url || me?.avatar}
                username={me?.username || 'You'}
                name={me?.name}
                size="sm"
              />
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-accent truncate max-w-[100px]">{me?.username}</div>
                <div className="text-[10px] text-muted-foreground font-mono">{me?.rating} ELO</div>
              </div>
            </div>

            {/* Countdown Timer */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`px-3 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs cursor-help ${
                    remainingMs < 180000
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                      : 'bg-surface border-border text-foreground'
                  }`}
                >
                  <TimerIcon className="w-3.5 h-3.5 text-primary" />
                  <span>{formatTimer(remainingMs)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                1v1 Duel Match Time Remaining
              </TooltipContent>
            </Tooltip>

            {/* Rival */}
            <div className="flex items-center gap-2">
              <div className="hidden md:block text-right">
                <div className="text-xs font-bold text-primary truncate max-w-[100px]">{rival?.username}</div>
                <div className="text-[10px] text-muted-foreground font-mono">{rival?.rating} ELO</div>
              </div>
              <div className="relative">
                <UserAvatar
                  src={rival?.avatar_url || rival?.avatar}
                  username={rival?.username || 'Rival'}
                  name={rival?.name}
                  size="sm"
                />
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
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border cursor-help ${
                    antiCheatDisqualified
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  {antiCheatDisqualified ? (
                    <ShieldAlert className="w-3.5 h-3.5" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {antiCheatDisqualified
                      ? '💀 Disqualified'
                      : isDevelopment
                      ? 'Anti-Cheat Disabled (DEV)'
                      : 'Fullscreen Enforced'}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-xs">
                {isDevelopment
                  ? 'Anti-Cheat Disabled: NEXT_PUBLIC_APP_ENV is set to DEVELOPMENT'
                  : 'Fullscreen mode is enforced — exiting fullscreen will result in instant disqualification'}
              </TooltipContent>
            </Tooltip>

            {/* Surrender Button */}
            {matchStatus === 'ACTIVE' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSurrenderModal(true)}
                    className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 font-bold text-xs h-8 px-3 gap-1 cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Surrender</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Forfeit 1v1 duel & surrender match
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
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
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* ─── LEFT PANE: PROBLEM STATEMENT & LIVE FEED ─── */}
          <ResizablePanel defaultSize="45%" minSize="25%" maxSize="75%" className="border-r border-border bg-card flex flex-col overflow-hidden">
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
              ) : (
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
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ─── RIGHT PANE: MONACO EDITOR & RUN/SUBMIT ─── */}
          <ResizablePanel defaultSize="55%" minSize="25%" className="bg-[#0d1117] flex flex-col overflow-hidden">
            {isBottomOpen ? (
              <ResizablePanelGroup direction="vertical" className="flex-1">
                {/* Monaco Editor Panel */}
                <ResizablePanel defaultSize="65%" minSize="25%" className="flex flex-col overflow-hidden">
                  {/* Top Bar Controls */}
                  <div className="h-10 border-b border-border bg-card px-3 flex items-center justify-between shrink-0">

                    {/* Actions: Reset, Run, Submit */}
                    <div className="flex items-center gap-2">

                      <Button
                        size="sm"
                        onClick={handleRunCode}
                        disabled={isRunning || isSubmitting || isSpectator}
                        className="bg-surface hover:bg-surface-2 text-foreground border border-border text-xs font-semibold gap-1.5 h-7 px-3"
                      >
                        {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" /> : <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />}
                        <span>Run Code</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={handleSubmitCode}
                        disabled={isRunning || isSubmitting || matchStatus !== 'ACTIVE' || isSpectator}
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
                      onLanguageChange={handleLanguageChange}
                      value={code}
                      onChange={handleCodeChange}
                      onResetCode={handleResetCode}
                      onPasteAttempt={handlePasteAttempt}
                      readOnly={isSpectator}
                      storageKey={`coderival_code_battle_${matchId}_${selectedLanguage}`}
                    />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Bottom Panel: Testcases & Output */}
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
                          {((problem.testCases && problem.testCases.length > 0)
                            ? problem.testCases
                            : problem.examples?.map((ex, idx) => ({
                                id: ex.id || String(idx),
                                input: ex.input,
                                expected: ex.output,
                                order: idx,
                                isSample: true,
                              }))
                          )?.map((tc: any, idx: number) => (
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

                        {((problem.testCases && problem.testCases.length > 0)
                          ? problem.testCases
                          : problem.examples?.map((ex, idx) => ({
                              id: ex.id || String(idx),
                              input: ex.input,
                              expected: ex.output,
                              order: idx,
                              isSample: true,
                            }))
                        )?.[selectedTestCaseIndex] && (
                          <div className="space-y-3">
                            <div>
                              <div className="text-muted-foreground text-[11px] mb-1 font-semibold">Input:</div>
                              <div className="p-3 rounded-lg bg-surface border border-border">
                                {Array.isArray(
                                  ((problem.testCases && problem.testCases.length > 0) ? problem.testCases : problem.examples)?.[selectedTestCaseIndex]?.input
                                ) &&
                                problem.signature?.params &&
                                Array.isArray(problem.signature.params) ? (
                                  <div className="space-y-1">
                                    {(problem.signature.params as any[]).map((param: any, idx: number) => (
                                      <div key={param.name || idx} className="flex items-center gap-2">
                                        <span className="text-muted-foreground">{param.name} =</span>
                                        <span className="text-foreground font-semibold">
                                          {JSON.stringify(
                                            ((problem.testCases && problem.testCases.length > 0) ? problem.testCases : problem.examples)?.[selectedTestCaseIndex]?.input[idx]
                                          )}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-foreground">
                                    {typeof ((problem.testCases && problem.testCases.length > 0) ? problem.testCases : problem.examples)?.[selectedTestCaseIndex]?.input === 'string'
                                      ? ((problem.testCases && problem.testCases.length > 0) ? problem.testCases : problem.examples)?.[selectedTestCaseIndex]?.input
                                      : JSON.stringify(((problem.testCases && problem.testCases.length > 0) ? problem.testCases : problem.examples)?.[selectedTestCaseIndex]?.input)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-[11px] mb-1 font-semibold">Expected Output:</div>
                              <div className="p-3 rounded-lg bg-surface border border-border text-emerald-400 font-semibold">
                                {typeof (((problem.testCases && problem.testCases.length > 0) ? problem.testCases : problem.examples)?.[selectedTestCaseIndex] as any)?.expected === 'string'
                                  ? (((problem.testCases && problem.testCases.length > 0) ? problem.testCases : problem.examples)?.[selectedTestCaseIndex] as any)?.expected
                                  : typeof (((problem.testCases && problem.testCases.length > 0) ? problem.testCases : problem.examples)?.[selectedTestCaseIndex] as any)?.output === 'string'
                                  ? (((problem.testCases && problem.testCases.length > 0) ? problem.testCases : problem.examples)?.[selectedTestCaseIndex] as any)?.output
                                  : JSON.stringify((((problem.testCases && problem.testCases.length > 0) ? problem.testCases : problem.examples)?.[selectedTestCaseIndex] as any)?.expected ?? (((problem.testCases && problem.testCases.length > 0) ? problem.testCases : problem.examples)?.[selectedTestCaseIndex] as any)?.output)}
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
                            Click "Run Code" or "SUBMIT SOLUTION" to execute your solution.
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
                              {executionResult.runtimeMs !== undefined && (
                                <div className="text-xs text-muted-foreground font-mono">
                                  Runtime: <span className="text-foreground font-semibold">{executionResult.runtimeMs} ms</span>
                                </div>
                              )}
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
                                  {executionResult.testCaseResults.map((tcRes: any, idx: number) => (
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
                                      <div className="text-muted-foreground text-[11px] mb-1 font-semibold">Input:</div>
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
                                            {typeof executionResult.testCaseResults[selectedTestCaseIndex].input === 'string'
                                              ? executionResult.testCaseResults[selectedTestCaseIndex].input
                                              : JSON.stringify(executionResult.testCaseResults[selectedTestCaseIndex].input)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <div className="text-muted-foreground text-[11px] mb-1 font-semibold">Your Output:</div>
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

                                            if (Array.isArray(expectedVal) && /^-?\d+(\s+-?\d+)*$/.test(trimmed)) {
                                              const parsed = trimmed.split(/\s+/).map((x) => Number(x))
                                              return JSON.stringify(parsed)
                                            }

                                            return trimmed
                                          })()}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-muted-foreground text-[11px] mb-1 font-semibold">Expected Output:</div>
                                        <div className="p-2.5 rounded-lg bg-surface border border-border text-emerald-400 font-semibold">
                                          {typeof executionResult.testCaseResults[selectedTestCaseIndex].expected === 'string'
                                            ? executionResult.testCaseResults[selectedTestCaseIndex].expected
                                            : JSON.stringify(executionResult.testCaseResults[selectedTestCaseIndex].expected)}
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
                {/* Top Bar Controls */}
                <div className="h-10 border-b border-border bg-card px-3 flex items-center justify-between shrink-0">
                  <Select
                    value={selectedLanguage}
                    onValueChange={(val) => handleLanguageChange(val as 'CPP' | 'JAVA' | 'PYTHON')}
                  >
                    <SelectTrigger className="h-7 w-[130px] bg-surface border border-border text-xs font-semibold text-foreground focus:ring-1 focus:ring-accent rounded-lg">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border text-foreground">
                      <SelectItem value="PYTHON" className="text-xs font-mono">Python 3</SelectItem>
                      <SelectItem value="CPP" className="text-xs font-mono">C++ (GCC 9.2)</SelectItem>
                      <SelectItem value="JAVA" className="text-xs font-mono">Java (OpenJDK 17)</SelectItem>
                    </SelectContent>
                  </Select>

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
                      disabled={isRunning || isSubmitting || isSpectator}
                      className="bg-surface hover:bg-surface-2 text-foreground border border-border text-xs font-semibold gap-1.5 h-7 px-3"
                    >
                      {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" /> : <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />}
                      <span>Run Code</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleSubmitCode}
                      disabled={isRunning || isSubmitting || matchStatus !== 'ACTIVE' || isSpectator}
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
                    onLanguageChange={handleLanguageChange}
                    value={code}
                    onChange={handleCodeChange}
                    onResetCode={handleResetCode}
                    onPasteAttempt={handlePasteAttempt}
                    readOnly={isSpectator}
                    storageKey={`coderival_code_battle_${matchId}_${selectedLanguage}`}
                  />
                </div>

                <div className="h-8 border-t border-border bg-card flex items-center justify-between px-3 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setIsBottomOpen(true); setActiveBottomTab('testcase'); }}
                      className="flex items-center gap-1.5 px-3 py-0.5 text-xs font-semibold rounded-md text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Terminal className="w-3.5 h-3.5" /> Testcase
                    </button>
                    <button
                      onClick={() => { setIsBottomOpen(true); setActiveBottomTab('result'); }}
                      className="flex items-center gap-1.5 px-3 py-0.5 text-xs font-semibold rounded-md text-muted-foreground hover:text-foreground transition-colors"
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
                  : matchEndedData.reason === 'OPPONENT_CHEATED' && matchEndedData.winnerId !== user?.id
                  ? 'DISQUALIFIED'
                  : matchEndedData.reason === 'OPPONENT_SURRENDERED' && matchEndedData.winnerId !== user?.id
                  ? 'SURRENDERED'
                  : 'DEFEAT'}
              </h2>

              <p className="text-xs md:text-sm font-semibold max-w-md mx-auto px-4 py-2.5 rounded-xl bg-surface border border-border/80 text-foreground">
                {(() => {
                  const isWinner = matchEndedData.winnerId === user?.id
                  const isDraw = matchEndedData.result === 'DRAW'
                  const reason = matchEndedData.reason

                  if (isWinner) {
                    if (reason === 'OPPONENT_CHEATED') return '🏆 Won: Opponent was disqualified for cheating / anti-cheat violation.'
                    if (reason === 'OPPONENT_SURRENDERED') return '🏆 Won: Opponent surrendered the duel.'
                    if (reason === 'OPPONENT_DISCONNECTED') return '🏆 Won: Opponent disconnected from the match.'
                    if (reason === 'TIMEOUT') return '🏆 Won: Higher test case score at match timeout.'
                    return '🏆 Won: Submitted an Accepted solution first!'
                  } else if (isDraw) {
                    return '🤝 Draw: Match ended with equal score at timeout.'
                  } else {
                    if (reason === 'OPPONENT_CHEATED' || antiCheatDisqualified) return '💀 Lost: You were disqualified for exiting fullscreen.'
                    if (reason === 'OPPONENT_SURRENDERED') return '💀 Lost: You surrendered the duel.'
                    if (reason === 'OPPONENT_DISCONNECTED') return '💀 Lost: You disconnected from the match.'
                    if (reason === 'TIMEOUT') return '💀 Lost: Opponent had higher score at match timeout.'
                    return '💀 Lost: Opponent submitted an Accepted solution first.'
                  }
                })()}
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
              {tournamentId || matchEndedData?.tournamentId ? (
                <Button
                  size="lg"
                  onClick={() => router.push(`/tournaments/${tournamentId || matchEndedData?.tournamentId}`)}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-extrabold h-12 gap-2 shadow-lg shadow-amber-600/20"
                >
                  <Trophy className="w-4 h-4 text-amber-300" /> Return to Tournament Bracket
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => router.push('/battles')}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold h-12 gap-2"
                >
                  <Zap className="w-4 h-4 fill-white" /> Find Next 1v1 Duel
                </Button>
              )}
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

      {/* ─── FULLSCREEN EXIT DISQUALIFICATION ALERT DIALOG ─── */}
      <AlertDialog open={showFullscreenExitDialog}>
        <AlertDialogContent className="bg-[#141416] border border-rose-500/50 text-white max-w-md shadow-2xl">
          <AlertDialogHeader className="sm:text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-bold text-rose-400">
                  💀 Disqualified — Exited Fullscreen
                </AlertDialogTitle>
                <span className="text-[11px] font-mono text-rose-300/80">MATCH FORFEITED</span>
              </div>
            </div>
            <AlertDialogDescription asChild>
              <div className="text-slate-300 text-sm leading-relaxed space-y-3 pt-2">
                <p>
                  You exited fullscreen mode during an active battle. This is a direct violation of the anti-cheat policy.
                </p>
                <div className="bg-rose-950/60 border border-rose-500/40 rounded-lg p-3 text-xs text-rose-200 space-y-1.5">
                  <p className="font-bold text-rose-300">💀 You have been immediately disqualified.</p>
                  <p>The match has been forfeited and recorded as a loss. Your opponent has been awarded the victory.</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 sm:justify-end">
            <AlertDialogAction
              onClick={() => setShowFullscreenExitDialog(false)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-lg shadow-rose-900/40 cursor-pointer"
            >
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── PRE-BATTLE RULES & ANTI-CHEAT GUIDELINES MODAL ─── */}
      <AlertDialog open={showPreBattleRulesModal && !showDeclineConfirmModal}>
        <AlertDialogContent size="3xl" className="bg-[#121214] border border-[#2a2a30] text-white w-[92vw] shadow-2xl p-0 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="py-4 px-6 border-b border-[#2a2a30] text-center">
            <h2 className="text-xl font-bold text-white tracking-wide">
              Rules & Regulations
            </h2>
          </div>

          {/* Body with full-width stacked rows */}
          <AlertDialogDescription asChild>
            <div className="divide-y divide-[#2a2a30] text-slate-200">
              {/* Row 1: Fullscreen Mode */}
              <div className="px-6 py-4 space-y-1">
                <div className="flex items-center justify-between text-sm sm:text-base font-bold">
                  <span className="text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    1. Fullscreen Mode (Mandatory)
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/20">
                    Instant Disqualification
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pl-6">
                  The battle runs in fullscreen mode. Exiting fullscreen (Esc, F11, or any method) or switching desktops / Alt+Tab will result in <strong className="text-rose-300">instant disqualification with no warnings or second chances</strong>.
                </p>
              </div>

              {/* Row 2: Paste Blocking */}
              <div className="px-6 py-4 space-y-1">
                <div className="flex items-center justify-between text-sm sm:text-base font-bold">
                  <span className="text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    2. Paste Blocking
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                    Blocked
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pl-6">
                  Pasting code from the clipboard is strictly blocked during competitive duels. All solutions must be typed manually.
                </p>
              </div>

              {/* Row 3: Internet Drop */}
              <div className="px-6 py-4 space-y-1">
                <div className="flex items-center justify-between text-sm sm:text-base font-bold">
                  <span className="text-white flex items-center gap-2">
                    <WifiOff className="w-4 h-4 text-sky-400 shrink-0" />
                    3. Internet Disconnection
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded border border-sky-500/20">
                    30s Grace Period
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pl-6">
                  If your internet connection drops, you are granted a 30-second window to reconnect before the match is forfeited.
                </p>
              </div>

              {/* Row 4: Page Refresh */}
              <div className="px-6 py-4 space-y-1">
                <div className="flex items-center justify-between text-sm sm:text-base font-bold">
                  <span className="text-white flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-emerald-400 shrink-0" />
                    4. Page Refresh
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                    Safe (Allowed)
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pl-6">
                  You can safely refresh the page if an error occurs — refreshing does NOT disqualify you from the match.
                </p>
              </div>
            </div>
          </AlertDialogDescription>

          {/* Footer */}
          <div className="px-6 py-4 bg-[#16161a] border-t border-[#2a2a30] flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleDeclineRules}
                className="border-[#3a3a42] text-slate-300 hover:bg-[#222228] hover:text-white text-xs sm:text-sm font-semibold h-10 px-4 rounded-xl cursor-pointer"
              >
                Decline & Leave
              </Button>
              <AlertDialogAction
                onClick={handleAcceptRules}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm h-10 px-5 rounded-xl shadow-lg cursor-pointer border-0"
              >
                Accept & Enter Fullscreen
              </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── DECLINE CONFIRMATION ALERT DIALOG ─── */}
      <AlertDialog open={showDeclineConfirmModal}>
        <AlertDialogContent className="bg-[#141416] border border-rose-500/50 text-white max-w-md shadow-2xl p-6 rounded-xl">
          <AlertDialogHeader className="sm:text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-full bg-rose-500/20 text-rose-400 shrink-0 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-rose-400">
                Sure you want to leave?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="text-slate-300 text-xs leading-relaxed pt-1">
                If you leave now, your match will be forfeited and recorded as a loss. Are you sure?
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 flex-row justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleCancelLeaveMatch}
              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs font-semibold h-10 px-4 cursor-pointer"
            >
              No, I don't want to leave
            </Button>
            <AlertDialogAction
              onClick={handleConfirmLeaveMatch}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-4 shadow-lg shadow-rose-950/50 cursor-pointer border-0"
            >
              OK, Leave Match
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
