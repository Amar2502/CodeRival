'use client'

import React from 'react'
import Editor, { BeforeMount, OnMount } from '@monaco-editor/react'
import { Loader2 } from 'lucide-react'

export interface NormalMonacoEditorProps {
  language: string // 'cpp' | 'java' | 'python'
  value: string
  onChange: (value: string | undefined) => void
  theme?: string
  readOnly?: boolean
}

export function NormalMonacoEditor({
  language,
  value,
  onChange,
  readOnly = false,
}: NormalMonacoEditorProps) {
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
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0d1117]">
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
          contextmenu: true,
        }}
        loading={
          <div className="flex items-center justify-center h-full gap-2 text-sm text-muted-foreground bg-[#0d1117]">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Loading Practice Code Editor...
          </div>
        }
      />
    </div>
  )
}
