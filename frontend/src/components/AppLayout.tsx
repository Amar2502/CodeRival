'use client'

import React from 'react'
import { Header } from '@/components/header'
import { RightSidebar } from '@/components/RightSidebar'
import { Footer } from '@/components/footer'

interface AppLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
}

export function AppLayout({ children, showSidebar = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {showSidebar ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left & Center Main Content Area (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
              {children}
            </div>

            {/* Right Sidebar (4 Cols) */}
            <RightSidebar />
          </div>
        ) : (
          <div className="w-full">
            {children}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
