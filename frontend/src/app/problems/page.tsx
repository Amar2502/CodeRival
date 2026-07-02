import { Suspense } from "react";
import ProblemsBrowser from "./problems-browser";

export default function ProblemsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F172A] text-[#CBD5E1]">Loading problems...</div>}>
      <ProblemsBrowser />
    </Suspense>
  );
}