'use client'

import React, { useState, useRef, useEffect } from 'react'
import Editor, { BeforeMount, OnMount } from '@monaco-editor/react'
import { isDevelopment } from '@/lib/config'
import {
  Loader2,
  ShieldCheck,
  Lock,
  Braces,
  RotateCcw,
  Maximize2,
  Minimize2,
  Check,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface SecureMonacoEditorProps {
  language: 'CPP' | 'JAVA' | 'PYTHON' | string
  onLanguageChange?: (lang: 'CPP' | 'JAVA' | 'PYTHON') => void
  value: string
  onChange: (value: string | undefined) => void
  onResetCode?: () => void
  storageKey?: string
  theme?: string
  readOnly?: boolean
  onPasteAttempt?: (pastedTextLength: number) => void
}

export function SecureMonacoEditor({
  language,
  onLanguageChange,
  value,
  onChange,
  onResetCode,
  storageKey,
  readOnly = false,
  onPasteAttempt,
}: SecureMonacoEditorProps) {
  const editorRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Map backend language enum (CPP, JAVA, PYTHON) to Monaco language IDs
  const getMonacoLanguage = (lang: string) => {
    const lower = (lang || '').toLowerCase()
    if (lower === 'cpp' || lower === 'c++') return 'cpp'
    if (lower === 'java') return 'java'
    if (lower === 'python' || lower === 'py') return 'python'
    return 'javascript'
  }

  // Handle LocalStorage Auto-save & status indicator
  useEffect(() => {
    if (!storageKey || !value) return
    setSaveStatus('saving')

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, value)
        setSaveStatus('saved')
      } catch (err) {
        console.error('Auto-save error:', err)
      }
    }, 400)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [value, storageKey])

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run()
    }
  }

  const handleBeforeMount: BeforeMount = (monaco) => {
    if (!monaco || !monaco.editor) return
    try {
      monaco.editor.defineTheme('coderival-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: '', background: '0d1117', foreground: 'e6edf3' },
          { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'ff7b72', fontStyle: 'bold' },
          { token: 'string', foreground: 'a5d6ff' },
          { token: 'number', foreground: '79c0ff' },
          { token: 'type', foreground: 'ffa657' },
          { token: 'class', foreground: 'ffa657' },
          { token: 'function', foreground: 'd2a8ff' },
          { token: 'variable', foreground: 'e6edf3' },
        ],
        colors: {
          'editor.background': '#0d1117',
          'editor.foreground': '#e6edf3',
          'editor.lineHighlightBackground': '#161b22',
          'editorCursor.foreground': '#58a6ff',
          'editorLineNumber.foreground': '#484f58',
          'editorLineNumber.activeForeground': '#e6edf3',
          'editor.selectionBackground': '#264f78',
          'editor.inactiveSelectionBackground': '#264f7866',
        },
      })
    } catch (err) {
      console.error('Failed to define Monaco theme:', err)
    }
  }

  const handleOnMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    if (monaco && monaco.editor) {
      monaco.editor.setTheme('coderival-dark')
    }

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({
        line: e.position.lineNumber,
        col: e.position.column,
      })
    })

    // If DEVELOPMENT mode, completely disable anti-cheat functionality & event listeners
    if (isDevelopment) {
      return
    }

    // 1. Override Monaco Clipboard Paste Command
    try {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
        onPasteAttempt?.(0)
      })
    } catch (err) {
      // ignore
    }

    // 2. Intercept Monaco KeyDown for Ctrl+V / Cmd+V / Shift+Insert
    editor.onKeyDown((e) => {
      const isPasteKey = (e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyV
      const isShiftInsert = e.shiftKey && e.keyCode === monaco.KeyCode.Insert
      if (isPasteKey || isShiftInsert) {
        e.preventDefault()
        e.stopPropagation()
        onPasteAttempt?.(0)
      }
    })

    // 3. Attach DOM Listener for Clipboard Paste & Context Menu Blocking
    const domNode = editor.getDomNode()
    if (domNode) {
      domNode.addEventListener(
        'paste',
        (e: ClipboardEvent) => {
          e.preventDefault()
          e.stopPropagation()
          const text = e.clipboardData?.getData('text') || ''
          onPasteAttempt?.(text.length)
        },
        true
      )

      domNode.addEventListener(
        'contextmenu',
        (e: MouseEvent) => {
          e.preventDefault()
          e.stopPropagation()
        },
        true
      )
    }
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-[#0d1117] flex flex-col"
    >
      {/* ─── LEETCODE STYLE TOP BAR ─── */}
      <div className="h-9 bg-[#181818] border-b border-[#282828] px-3 flex items-center justify-between shrink-0 text-xs text-foreground select-none">
        {/* Left: Language selector & Security Badge */}
        <div className="flex items-center gap-2">
          {onLanguageChange ? (
            <Select
              value={language}
              onValueChange={(val) => onLanguageChange(val as 'CPP' | 'JAVA' | 'PYTHON')}
            >
              <SelectTrigger className="h-6 border-0 bg-transparent hover:bg-[#282828] text-xs font-semibold text-foreground/90 gap-1 px-2 py-0 focus:ring-0 focus:ring-offset-0 shadow-none cursor-pointer">
                <SelectValue placeholder="Language">
                  {language === 'PYTHON' ? 'Python3' : language === 'CPP' ? 'C++' : 'Java'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#1e1e1e] border border-[#2d2d2d] text-foreground z-50">
                <SelectItem value="PYTHON" className="text-xs font-mono cursor-pointer">Python3</SelectItem>
                <SelectItem value="CPP" className="text-xs font-mono cursor-pointer">C++</SelectItem>
                <SelectItem value="JAVA" className="text-xs font-mono cursor-pointer">Java</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs font-semibold text-foreground/90 px-2 py-1">
              {language === 'PYTHON' ? 'Python3' : language === 'CPP' ? 'C++' : 'Java'}
            </span>
          )}

          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#282828] text-[11px] font-medium text-emerald-400">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>{isDevelopment ? 'Anti-Cheat Disabled (DEV)' : 'Anti-Cheat'}</span>
          </div>

          {!isDevelopment && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-amber-400/90 font-mono">
              <Lock className="w-3 h-3" />
              <span>Paste Blocked</span>
            </div>
          )}
        </div>

        {/* Right: Actions toolbar */}
        <TooltipProvider>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleFormatCode}
                  className="p-1.5 rounded hover:bg-[#282828] hover:text-foreground transition-colors cursor-pointer"
                >
                  <Braces className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-[#1e1e1e] border border-[#2d2d2d] text-foreground text-[11px]">
                Format Document ({'{}'})
              </TooltipContent>
            </Tooltip>

            {onResetCode && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onResetCode}
                    className="p-1.5 rounded hover:bg-[#282828] hover:text-foreground transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-[#1e1e1e] border border-[#2d2d2d] text-foreground text-[11px]">
                  Reset Code to Starter Template
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded hover:bg-[#282828] hover:text-foreground transition-colors cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-[#1e1e1e] border border-[#2d2d2d] text-foreground text-[11px]">
                {isFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen'}
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* ─── MONACO EDITOR BODY ─── */}
      <div className="flex-1 relative overflow-hidden">
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          theme="coderival-dark"
          value={value}
          onChange={onChange}
          beforeMount={handleBeforeMount}
          onMount={handleOnMount}
          options={{
            readOnly,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            padding: { top: 12, bottom: 12 },
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            folding: true,
            wordWrap: 'on',
            contextmenu: isDevelopment ? true : false,
          }}
          loading={
            <div className="flex items-center justify-center h-full gap-2 text-sm text-muted-foreground bg-[#0d1117]">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Loading Secure Battle Editor...
            </div>
          }
        />
      </div>

      {/* ─── LEETCODE STYLE FOOTER STATUS BAR ─── */}
      <div className="h-7 bg-[#141414] border-t border-[#242424] px-4 flex items-center justify-between shrink-0 text-[11px] font-mono text-muted-foreground select-none">
        {/* Left: Saved Status Mark */}
        <div className="flex items-center gap-1.5">
          {saveStatus === 'saving' ? (
            <span className="text-amber-400/90 italic flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin text-amber-400" /> Saving...
            </span>
          ) : (
            <span className="text-muted-foreground/80 flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400/80" /> Saved
            </span>
          )}
        </div>

        {/* Right: Cursor Position */}
        <div className="text-muted-foreground/70">
          Ln {cursorPos.line}, Col {cursorPos.col}
        </div>
      </div>
    </div>
  )
}
