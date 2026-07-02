import { Suspense } from "react";
import VerifyEmailClient from "./verify-email-client";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F172A] text-[#CBD5E1]">Loading verification...</div>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
