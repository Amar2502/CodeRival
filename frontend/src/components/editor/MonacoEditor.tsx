'use client'

import React from 'react'
import { NormalMonacoEditor, NormalMonacoEditorProps } from './NormalMonacoEditor'
import { SecureMonacoEditor, SecureMonacoEditorProps } from './SecureMonacoEditor'

export { NormalMonacoEditor, SecureMonacoEditor }
export type { NormalMonacoEditorProps, SecureMonacoEditorProps }

// Default export uses NormalMonacoEditor for standard problem solving
export const MonacoEditor = NormalMonacoEditor
