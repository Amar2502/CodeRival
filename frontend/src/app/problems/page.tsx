'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Search, CheckCircle2, Code2, Sparkles, Filter, ArrowRight, Flame } from 'lucide-react'
import { api } from '@/lib/axios'

interface ProblemItem {
  problemNumber: number
  title: string
  slug: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  topics?: string[]
  solved?: boolean
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<ProblemItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL')
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL')

  useEffect(() => {
    fetchProblems()
  }, [selectedDifficulty])

  const fetchProblems = async () => {
    setIsLoading(true)
    try {
      if (selectedDifficulty === 'ALL') {
        const res = await api.get('/problem/get/get-all/1/50')
        setProblems(res.data.problems || [])
      } else {
        const res = await api.get(`/problem/get/by-difficulty/${selectedDifficulty.toLowerCase()}`)
        setProblems(res.data.problems || [])
      }
    } catch (err) {
      console.error('Failed to fetch problems:', err)
      setProblems([])
    } finally {
      setIsLoading(false)
    }
  }

  // Filter problems locally by search query and topic
  const filteredProblems = problems.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.problemNumber.toString().includes(searchQuery)
    const matchesTopic = selectedTopic === 'ALL' || (p.topics && p.topics.includes(selectedTopic))
    return matchesSearch && matchesTopic
  })

  // Extract unique topics for filter pill bar
  const allTopics = Array.from(
    new Set(problems.flatMap((p) => p.topics || []))
  )

  const getDifficultyBadge = (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => {
    switch (difficulty) {
      case 'EASY':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-easy-subtle text-easy border border-emerald-500/20">Easy</span>
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-medium-subtle text-medium border border-amber-500/20">Medium</span>
      case 'HARD':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-hard-subtle text-hard border border-rose-500/20">Hard</span>
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Banner Section */}
        <div className="relative mb-8 p-6 sm:p-8 rounded-2xl bg-card border border-border overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs font-medium text-accent">
                <Flame className="w-3.5 h-3.5 text-primary" /> Problem Set
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Practice & Master Algorithms</h1>
              <p className="text-muted-foreground text-sm max-w-2xl">
                Solve coding problems curated for competitive programming and tech interviews. Test your logic with instant verdicts.
              </p>
            </div>
            <Link href="/battles">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 shadow-lg">
                <Sparkles className="w-4 h-4" /> 1v1 Battle Arena
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search problem title, # number, or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground focus:ring-accent"
              />
            </div>

            {/* Difficulty Filter Tabs */}
            <div className="flex items-center p-1 bg-card rounded-lg border border-border self-start sm:self-auto">
              {(['ALL', 'EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    selectedDifficulty === diff
                      ? 'bg-surface text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {diff === 'ALL' ? 'All Difficulties' : diff.charAt(0) + diff.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Topic Filter Pills */}
          {allTopics.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3" /> Topics:
              </span>
              <button
                onClick={() => setSelectedTopic('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 border transition-colors ${
                  selectedTopic === 'ALL'
                    ? 'bg-accent/20 border-accent text-accent'
                    : 'bg-surface border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                All Topics
              </button>
              {allTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 border transition-colors ${
                    selectedTopic === topic
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'bg-surface border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Problems List Table */}
        <Card className="border-border bg-card shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface/50 text-xs font-semibold text-muted-foreground">
                    <th className="py-3 px-4 w-16 text-center">Status</th>
                    <th className="py-3 px-4">Problem</th>
                    <th className="py-3 px-4">Topics</th>
                    <th className="py-3 px-4 w-28">Difficulty</th>
                    <th className="py-3 px-4 w-24 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-4 px-4 text-center">
                          <div className="w-5 h-5 mx-auto bg-surface-2 rounded-full" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 bg-surface-2 rounded-xs w-48 mb-1" />
                          <div className="h-3 bg-surface-2 rounded-xs w-24" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 bg-surface-2 rounded-xs w-32" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-5 bg-surface-2 rounded-full w-16" />
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="h-8 bg-surface-2 rounded-lg w-16 ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : filteredProblems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        <Code2 className="w-10 h-10 mx-auto mb-3 opacity-40 text-muted-foreground" />
                        <p className="text-base font-medium">No problems found matching your criteria</p>
                        <p className="text-xs mt-1">Try clearing filters or search term</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProblems.map((problem) => (
                      <tr
                        key={problem.slug}
                        className="hover:bg-surface/60 transition-colors group cursor-pointer"
                      >
                        {/* Status Icon */}
                        <td className="py-3.5 px-4 text-center">
                          {problem.solved ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-border inline-block" />
                          )}
                        </td>

                        {/* Title & Number */}
                        <td className="py-3.5 px-4">
                          <Link href={`/problems/${problem.slug}`} className="block group-hover:text-accent transition-colors font-medium">
                            <span className="text-muted-foreground font-mono mr-2">#{problem.problemNumber}</span>
                            <span>{problem.title}</span>
                          </Link>
                        </td>

                        {/* Topics */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {problem.topics && problem.topics.length > 0 ? (
                              problem.topics.map((t) => (
                                <span key={t} className="px-2 py-0.5 rounded-md text-[11px] bg-surface text-muted-foreground border border-border">
                                  {t}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">Algorithms</span>
                            )}
                          </div>
                        </td>

                        {/* Difficulty */}
                        <td className="py-3.5 px-4">
                          {getDifficultyBadge(problem.difficulty)}
                        </td>

                        {/* Action Link */}
                        <td className="py-3.5 px-4 text-right">
                          <Link href={`/problems/${problem.slug}`}>
                            <Button size="sm" variant="ghost" className="text-accent group-hover:bg-accent/10 transition-colors gap-1">
                              <span>Solve</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

    </div>
  )
}
