"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import {
  Lock,
  List,
  Code2,
  Bookmark,
  RotateCcw,
  Maximize2,
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const LANGUAGES = [
  { value: "java", label: "Java" },
  { value: "python", label: "Python3" },
  { value: "cpp", label: "C++" }
];

const languageDefaults: Record<string, string> = {
  java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        return new int[0];\n    }\n}",
  python: "class Solution:\n    def twoSum(self, nums, target):\n        pass",
  cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {};\n    }\n};",
} as const;

export default function CodeEditor() {
  const [language, setLanguage] = useState("java");
  const [code, setCode] = useState<string>(languageDefaults.java);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  function handleLanguageChange(value: string) {
    setLanguage(value);
    setCode(languageDefaults[value as keyof typeof languageDefaults]);
  }

  return (
    <div className="flex h-full flex-col bg-[#111827]/90 text-[#F8FAFC]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[#334155] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-[#94A3B8]" />
          <span className="text-sm font-medium text-[#F8FAFC]">Code</span>
        </div>

        <div className="flex items-center gap-1">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#94A3B8]">
            <Lock className="h-3 w-3" />
            Auto
          </span>
        </div>
      </div>

      {/* Editor sub-toolbar (icons row like the screenshot) */}
      <div className="flex items-center justify-end gap-1 border-b border-[#334155] px-2 py-1">
        <Button variant="icon" size="icon" className="h-7 w-7 text-white">
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button variant="icon" size="icon" className="h-7 w-7 text-white">
          <Bookmark className="h-3.5 w-3.5" />
        </Button>
        <Button variant="icon" size="icon" className="h-7 w-7 text-white">
          <Code2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="icon" size="icon" className="h-7 w-7 text-white">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <Button variant="icon" size="icon" className="h-7 w-7 text-white">
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Monaco editor */}
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language={language === "cpp" ? "cpp" : language}
          value={code}
          theme="vs-dark"
          onChange={(value) => setCode(value ?? "")}
          onMount={(editor) => {
            editor.onDidChangeCursorPosition((e) => {
              setCursor({
                line: e.position.lineNumber,
                col: e.position.column,
              });
            });
          }}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontFamily: "Menlo, Monaco, Consolas, monospace",
            padding: { top: 12 },
            lineNumbersMinChars: 3,
            renderLineHighlight: "gutter",
            automaticLayout: true,
          }}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-[#334155] px-3 py-1 text-xs text-[#94A3B8]">
        <span>Saved</span>
        <span>
          Ln {cursor.line}, Col {cursor.col}
        </span>
      </div>
    </div>
  );
}
