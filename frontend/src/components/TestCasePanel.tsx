"use client";

import { useState } from "react";
import { CheckSquare, TerminalSquare, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const CASES = [
  { label: "Case 1", nums: "[2,7,11,15]", target: "9" },
  { label: "Case 2", nums: "[3,2,4]", target: "6" },
  { label: "Case 3", nums: "[3,3]", target: "6" },
];

export default function TestCasePanel() {
  const [tab, setTab] = useState<"testcase" | "result">("testcase");
  const [activeCase, setActiveCase] = useState(0);

  return (
    <div className="flex h-full flex-col bg-[#111827]/90 text-[#F8FAFC]">
      {/* Sub-tab header */}
      <div className="flex items-center gap-4 border-b border-[#334155] px-4 py-2 text-sm">
        <button
          onClick={() => setTab("testcase")}
          className={cn(
            "flex items-center gap-1.5 font-medium",
            tab === "testcase" ? "text-[#F8FAFC]" : "text-[#94A3B8]"
          )}
        >
          <CheckSquare
            className={cn(
              "h-4 w-4",
              tab === "testcase" ? "text-[#10B981]" : "text-[#94A3B8]"
            )}
          />
          Testcase
        </button>
        <span className="text-[#334155]">|</span>
        <button
          onClick={() => setTab("result")}
          className={cn(
            "flex items-center gap-1.5 font-medium",
            tab === "result" ? "text-[#F8FAFC]" : "text-[#94A3B8]"
          )}
        >
          <TerminalSquare className="h-4 w-4" />
          Test Result
        </button>
      </div>

      <div className="lc-scroll flex-1 overflow-y-auto px-4 py-3">
        {tab === "testcase" ? (
          <>
            {/* Case selector pills */}
            <div className="mb-4 flex items-center gap-2">
              {CASES.map((c, i) => (
                <button
                  key={c.label}
                  onClick={() => setActiveCase(i)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    activeCase === i
                      ? "bg-[#1E293B] text-[#F8FAFC]"
                      : "bg-transparent text-[#94A3B8] hover:bg-[#1E293B]"
                  )}
                >
                  {c.label}
                </button>
              ))}
              <button className="flex h-7 w-7 items-center justify-center rounded-md text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC]">
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Inputs for active case */}
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs text-[#94A3B8]">nums =</p>
                <div className="rounded-md border border-[#334155] bg-[#0B1220] px-3 py-2 font-mono text-sm text-[#E2E8F0]">
                  {CASES[activeCase].nums}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs text-[#94A3B8]">target =</p>
                <div className="rounded-md border border-[#334155] bg-[#0B1220] px-3 py-2 font-mono text-sm text-[#E2E8F0]">
                  {CASES[activeCase].target}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#94A3B8]">
            Run your code to see the test result.
          </div>
        )}
      </div>
    </div>
  );
}
