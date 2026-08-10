'use client'

import { useState } from 'react'
import { Search, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { useAuthStore } from '@/lib/authStore'
import { api } from '@/lib/axios'
import { toast } from 'sonner'

const FAQS = [
  {
    id: 'faq-1',
    question: 'How does 1v1 real-time matchmaking work?',
    answer:
      'Click "Find 1v1 Match" on the Battles page to join the queue. Our system matches you with another player of similar rating and redirects both of you into a live duel arena with a problem to solve.',
  },
  {
    id: 'faq-2',
    question: 'What happens if my opponent surrenders or disconnects?',
    answer:
      'If your opponent surrenders, you win immediately. If they disconnect, a 60-second timer allows them to rejoin. If they fail to return, you win by default.',
  },
  {
    id: 'faq-3',
    question: 'How are ELO ratings calculated?',
    answer:
      'CodeRival uses an ELO rating system (K=32). Defeating higher-rated players grants more rating points, while losing to lower-rated opponents deducts points accordingly.',
  },
  {
    id: 'faq-4',
    question: 'Which programming languages are supported?',
    answer:
      'CodeRival supports JavaScript, TypeScript, Python, C++, Java, and Go with instant execution and test case verification.',
  },
  {
    id: 'faq-5',
    question: 'How does anti-cheat enforcement work?',
    answer:
      'Duels require full-screen mode and monitor window focus. Leaving full-screen or switching tabs during an active duel triggers disqualification.',
  },
  {
    id: 'faq-6',
    question: 'How do I link OAuth accounts (Google / GitHub)?',
    answer:
      'Go to Settings > Profile or Settings > Security to link or unlink your Google and GitHub single sign-on accounts.',
  },
]

export default function HelpPage() {
  const { user } = useAuthStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: user?.name || user?.username || '',
    email: user?.email || '',
    subject: '',
    message: '',
  })
  const [isSending, setIsSending] = useState(false)
  const [sentSuccess, setSentSuccess] = useState(false)

  const filteredFaqs = FAQS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      toast.error('Please fill out all fields.')
      return
    }

    setIsSending(true)
    try {
      await api.post('/user/contact', formData)
      toast.success('Your message has been sent!')
      setSentSuccess(true)
      setFormData({
        name: user?.name || user?.username || '',
        email: user?.email || '',
        subject: '',
        message: '',
      })
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.message || 'Failed to send message.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <AppLayout showSidebar={false}>
      <div className="max-w-2xl mx-auto py-4 space-y-10 font-sans">
        {/* Simple Header */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Help & Support
          </h1>
          <p className="text-sm text-muted-foreground">
            Find answers to common questions or reach out to us directly.
          </p>
        </div>

        {/* FAQs Accordion */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Frequently Asked Questions</h2>

          {filteredFaqs.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono py-4">
              No articles found matching "{searchQuery}".
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full divide-y divide-border">
              {filteredFaqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id} className="py-1">
                  <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-3">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-3 pt-1 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        {/* Simple Contact Form */}
        <div className="space-y-6 pt-6 border-t border-border">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">Send Us a Message</h2>
            <p className="text-xs text-muted-foreground">
              Need more help? Fill out the form and we'll reply to your email.
            </p>
          </div>

          {sentSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Message sent successfully! We will get back to you soon.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Name</label>
                <Input
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="text-xs h-9 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="text-xs h-9 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Subject</label>
              <Input
                type="text"
                placeholder="What do you need help with?"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                className="text-xs h-9 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Message</label>
              <textarea
                rows={4}
                placeholder="Write your message here..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                className="w-full border border-border bg-background text-foreground text-xs rounded-lg p-3 placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <Button type="submit" disabled={isSending} className="h-9 px-6 text-xs font-semibold rounded-lg gap-2">
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message</span>
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
