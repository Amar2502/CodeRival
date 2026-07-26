'use client'

import React from 'react'
import Editor, { BeforeMount, OnMount } from '@monaco-editor/react'
import { Loader2, ShieldCheck, Lock } from 'lucide-react'

export interface SecureMonacoEditorProps {
  language: string // 'cpp' | 'java' | 'python'
  value: string
  onChange: (value: string | undefined) => void
  theme?: string
  readOnly?: boolean
  onPasteAttempt?: (pastedTextLength: number) => void
}

export function SecureMonacoEditor({
  language,
  value,
  onChange,
  readOnly = false,
  onPasteAttempt,
}: SecureMonacoEditorProps) {
  // Map backend language enum (CPP, JAVA, PYTHON) to Monaco language IDs
  const getMonacoLanguage = (lang: string) => {
    const lower = (lang || '').toLowerCase()
    if (lower === 'cpp' || lower === 'c++') return 'cpp'
    if (lower === 'java') return 'java'
    if (lower === 'python' || lower === 'py') return 'python'
    return 'javascript'
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
    if (monaco && monaco.editor) {
      monaco.editor.setTheme('coderival-dark')
    }

    // 1. Override Monaco Clipboard Paste Command
    try {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
        onPasteAttempt?.(0)
      })
    } catch (err) {
      // ignore command override error
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
    <div className="w-full h-full relative overflow-hidden bg-[#0d1117] flex flex-col">
      {/* Secure Battle Editor Header Tag */}
      <div className="bg-surface/80 border-b border-border px-3 py-1 flex items-center justify-between text-[11px] font-mono text-muted-foreground shrink-0 select-none">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Secure Anti-Cheat Arena Editor</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-amber-400">
          <Lock className="w-3 h-3" />
          <span>Paste Blocked</span>
        </div>
      </div>

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
            contextmenu: false,
          }}
          loading={
            <div className="flex items-center justify-center h-full gap-2 text-sm text-muted-foreground bg-[#0d1117]">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Loading Secure Battle Editor...
            </div>
          }
        />
      </div>
    </div>
  )
}
