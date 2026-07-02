"use client";

import {
  List,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Play,
  CloudUpload,
  NotebookText,
  Sparkles,
  LayoutGrid,
  Settings,
  Flame,
  Timer,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <div className="flex h-11 items-center justify-between border-b border-[#334155] bg-[#111827]/90 px-3 text-[#F8FAFC] backdrop-blur-sm">
      {/* Left cluster */}
      <div className="flex items-center gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-[#FB923C] text-sm font-bold text-black">
          C
        </div>
        <button className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-[#CBD5E1] transition hover:bg-[#1E293B] hover:text-[#F8FAFC]">
          <List className="h-4 w-4" />
          Problem List
        </button>
      </div>

      {/* Center cluster */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1.5 text-[#10B981] hover:bg-[#052E16]/40 hover:text-[#34D399]">
          <Play className="h-3.5 w-3.5 fill-current" />
          Run
        </Button>
        <Button
          size="sm"
          className="gap-1.5 bg-[#10B981] text-white hover:bg-[#059669]"
        >
          <CloudUpload className="h-3.5 w-3.5" />
          Submit
        </Button>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-1 text-[#94A3B8]">
        <Button variant="icon" size="icon" className="h-7 w-7 text-[#CBD5E1] hover:bg-[#1E293B] hover:text-[#F8FAFC]">
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="icon" size="icon" className="h-7 w-7 text-[#CBD5E1] hover:bg-[#1E293B] hover:text-[#F8FAFC]">
          <UserPlus className="h-4 w-4" />
        </Button>
        <div className="h-6 w-6 rounded-full bg-linear-to-br from-[#4F46E5] to-[#FB923C]" />
      </div>
    </div>
  );
}
