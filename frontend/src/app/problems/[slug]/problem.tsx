import Navbar from "@/components/Navbar";
import ProblemPanel from "@/components/ProblemPanel";
import CodeEditor from "@/components/CodeEditor";
import TestCasePanel from "@/components/TestCasePanel";
import ResizableSplit from "@/components/ResizaleSplit";

type ProblemProps = {
	slug: string;
}

export default function Home( { slug }: ProblemProps) {

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0F172A] text-[#F8FAFC] selection:bg-[#4F46E5]/40">
      <Navbar />
      <div className="min-h-0 flex-1 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.08),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,1))] p-1">
        <ResizableSplit
          direction="horizontal"
          defaultRatio={0.45}
          first={
            <div className="h-full overflow-hidden rounded-lg border border-[#334155] bg-[#111827]/80 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.85)]">
              <ProblemPanel slug={slug} />
            </div>
          }
          second={
            <div className="h-full pl-1">
              <ResizableSplit
                direction="vertical"
                defaultRatio={0.6}
                first={
                  <div className="h-full overflow-hidden rounded-lg border border-[#334155] bg-[#111827]/80 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.85)]">
                    <CodeEditor />
                  </div>
                }
                second={
                  <div className="h-full overflow-hidden rounded-lg border border-[#334155] bg-[#111827]/80 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.85)]">
                    <TestCasePanel />
                  </div>
                }
              />
            </div>
          }
        />
      </div>
    </div>
  );
}
