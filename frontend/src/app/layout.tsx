import type { Metadata } from "next";
import "./globals.css";

import QueryProvider from "@/providers/QueryProvider";
import AuthProvider from "@/providers/authProvider";
import SocketProvider from "../providers/SocketProvider";

import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: {
    default: "CodeRival — 1v1 Competitive Coding Battles",
    template: "%s | CodeRival",
  },
  description:
    "Challenge rivals to real-time 1v1 coding duels. Solve problems head-to-head, climb the ranked ladder, and prove your skills with live verdicts.",
  keywords: [
    "competitive programming",
    "coding battles",
    "1v1 coding",
    "algorithm challenges",
    "ranked coding",
    "live coding duels",
  ],
  openGraph: {
    title: "CodeRival — 1v1 Competitive Coding Battles",
    description:
      "Challenge rivals to real-time coding duels. Ranked matches, live verdicts, and ELO ratings.",
    type: "website",
    siteName: "CodeRival",
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeRival — 1v1 Competitive Coding Battles",
    description:
      "Challenge rivals to real-time coding duels. Ranked matches, live verdicts, and ELO ratings.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans">
        <QueryProvider>
          <AuthProvider>
            <SocketProvider>
              {children}
              <Toaster position="bottom-right" richColors />
            </SocketProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
