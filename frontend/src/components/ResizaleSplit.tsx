"use client";

import { useRef, useState, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SplitProps {
  direction: "horizontal" | "vertical";
  defaultRatio?: number; // 0-1, size of first pane
  minRatio?: number;
  maxRatio?: number;
  first: ReactNode;
  second: ReactNode;
  className?: string;
}

export default function ResizableSplit({
  direction,
  defaultRatio = 0.5,
  minRatio = 0.2,
  maxRatio = 0.8,
  first,
  second,
  className,
}: SplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(defaultRatio);
  const dragging = useRef(false);

  const onMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor =
      direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }, [direction]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newRatio: number;
      if (direction === "horizontal") {
        newRatio = (e.clientX - rect.left) / rect.width;
      } else {
        newRatio = (e.clientY - rect.top) / rect.height;
      }
      newRatio = Math.min(maxRatio, Math.max(minRatio, newRatio));
      setRatio(newRatio);
    },
    [direction, minRatio, maxRatio]
  );

  const stopDragging = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
      className={cn(
        "flex h-full w-full",
        direction === "horizontal" ? "flex-row" : "flex-col",
        className
      )}
    >
      <div
        style={
          direction === "horizontal"
            ? { width: `${ratio * 100}%` }
            : { height: `${ratio * 100}%` }
        }
        className="min-h-0 min-w-0 overflow-hidden"
      >
        {first}
      </div>

      <div
        onMouseDown={onMouseDown}
        className={cn(
          "shrink-0 bg-lc-bg transition-colors hover:bg-lc-accent/40",
          direction === "horizontal"
            ? "w-1 cursor-col-resize"
            : "h-1 cursor-row-resize"
        )}
      />

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{second}</div>
    </div>
  );
}
