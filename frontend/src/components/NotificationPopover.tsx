'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Bell,
  UserPlus,
  UserCheck,
  Trophy,
  Sparkles,
  Check,
  X,
  CheckCheck,
  Trash2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/UserAvatar'
import { api } from '@/lib/axios'
import { socket } from '@/lib/socket'
import { toast } from 'sonner'

export interface AppNotification {
  id: string
  userId: string
  type: 'FRIEND_REQUEST_RECEIVED' | 'FRIEND_REQUEST_ACCEPTED' | 'RATING_TIER_UPGRADE'
  title: string
  message: string
  isRead: boolean
  senderId?: string | null
  sender?: {
    id: string
    username: string
    name?: string
    avatar_url?: string | null
    avatar_id?: string | null
    rating?: number
  } | null
  friendshipId?: string | null
  createdAt: string
}

export function NotificationPopover() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  
  const popoverRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notification')
      if (res.data) {
        setNotifications(res.data.notifications || [])
        setUnreadCount(res.data.unreadCount || 0)
      }
    } catch (err) {
      // Ignore background errors
    }
  }, [])

  useEffect(() => {
    fetchNotifications()

    const handleNewNotification = (newNotif?: AppNotification) => {
      fetchNotifications()
      if (newNotif?.message) {
        toast.info(newNotif.message, {
          description: newNotif.title,
        })
      }
    }

    socket.on('notification:new', handleNewNotification)
    socket.on('friend:request_received', fetchNotifications)
    socket.on('friend:request_accepted', fetchNotifications)

    return () => {
      socket.off('notification:new', handleNewNotification)
      socket.off('friend:request_received', fetchNotifications)
      socket.off('friend:request_accepted', fetchNotifications)
    }
  }, [fetchNotifications])

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const togglePopover = () => {
    setIsOpen((prev) => !prev)
    if (!isOpen) {
      fetchNotifications()
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notification/read', {})
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (err) {
      toast.error('Failed to mark notifications read')
    }
  }

  const handleMarkSingleRead = async (id: string) => {
    try {
      await api.patch('/notification/read', { notificationId: id })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      // ignore
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await api.delete(`/notification/${id}`)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      fetchNotifications()
    } catch (err) {
      toast.error('Failed to delete notification')
    }
  }

  const handleAcceptFriendRequest = async (e: React.MouseEvent, notif: AppNotification) => {
    e.stopPropagation()
    if (!notif.senderId && !notif.friendshipId) return
    setActionLoadingId(notif.id)

    try {
      await api.post('/friends/accept', {
        requestId: notif.friendshipId,
        senderId: notif.senderId,
      })
      toast.success(`Accepted friend request from @${notif.sender?.username || 'user'}`)
      
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id
            ? {
                ...n,
                isRead: true,
                message: `You accepted @${notif.sender?.username || 'user'}'s friend request.`,
              }
            : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      fetchNotifications()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('friend_request_updated'))
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept friend request')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeclineFriendRequest = async (e: React.MouseEvent, notif: AppNotification) => {
    e.stopPropagation()
    if (!notif.senderId && !notif.friendshipId) return
    setActionLoadingId(notif.id)

    try {
      await api.post('/friends/decline', {
        requestId: notif.friendshipId,
        senderId: notif.senderId,
      })
      toast.info(`Declined friend request`)

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id
            ? {
                ...n,
                isRead: true,
                message: `You declined @${notif.sender?.username || 'user'}'s friend request.`,
              }
            : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      fetchNotifications()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('friend_request_updated'))
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to decline friend request')
    } finally {
      setActionLoadingId(null)
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const diffSecs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diffSecs < 60) return 'Just now'
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`
    return `${Math.floor(diffSecs / 86400)}d ago`
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button Trigger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePopover}
        title="Notifications"
        className="relative text-muted-foreground hover:text-foreground hover:bg-surface border border-border/60 rounded-xl h-9 w-9 cursor-pointer"
      >
        <Bell className="w-4 h-4 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 min-w-[16px] px-1 rounded-full text-[9px] font-black bg-rose-500 text-white flex items-center justify-center animate-pulse shadow-xs shadow-rose-500/50">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Popover Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card/95 backdrop-blur-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-surface/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-foreground tracking-tight">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-semibold cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Body: Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center mx-auto text-muted-foreground">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">No notifications yet</p>
                <p className="text-[11px] text-muted-foreground">
                  Friend requests and rank upgrades will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isPendingReceived =
                  notif.type === 'FRIEND_REQUEST_RECEIVED' &&
                  notif.message.includes('sent you a friend request') &&
                  !notif.isRead

                const isAccepted = notif.message.includes('accepted')
                const isDeclined = notif.message.includes('declined')

                return (
                  <div
                    key={notif.id}
                    onClick={() => !notif.isRead && handleMarkSingleRead(notif.id)}
                    className={`p-3.5 transition-colors relative flex items-start gap-3 group cursor-pointer ${
                      !notif.isRead ? 'bg-surface/50 hover:bg-surface' : 'hover:bg-surface/30 opacity-90'
                    }`}
                  >
                    {/* Unread indicator bar */}
                    {!notif.isRead && (
                      <span className="absolute left-1 top-4 w-1.5 h-6 rounded-r-full bg-primary" />
                    )}

                    {/* Icon / Avatar Left Column */}
                    <div className="shrink-0 pt-0.5">
                      {notif.type === 'RATING_TIER_UPGRADE' ? (
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xs">
                          <Trophy className="w-4 h-4" />
                        </div>
                      ) : notif.sender ? (
                        <UserAvatar
                          src={notif.sender.avatar_url}
                          username={notif.sender.username}
                          name={notif.sender.name}
                          size="md"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                          {notif.type === 'FRIEND_REQUEST_ACCEPTED' ? (
                            <UserCheck className="w-4 h-4" />
                          ) : (
                            <UserPlus className="w-4 h-4" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content Middle Column */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-foreground font-medium leading-snug">
                        {notif.message}
                      </p>

                      {/* Interactive Action Buttons for Pending FRIEND_REQUEST_RECEIVED */}
                      {notif.type === 'FRIEND_REQUEST_RECEIVED' && (
                        isPendingReceived ? (
                          <div className="pt-2 flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => handleAcceptFriendRequest(e, notif)}
                              disabled={actionLoadingId === notif.id}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] h-7 px-3 rounded-lg gap-1 shadow-xs cursor-pointer"
                            >
                              {actionLoadingId === notif.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              <span>Accept</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleDeclineFriendRequest(e, notif)}
                              disabled={actionLoadingId === notif.id}
                              className="border-border text-muted-foreground hover:bg-surface hover:text-foreground font-semibold text-[11px] h-7 px-3 rounded-lg gap-1 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>Decline</span>
                            </Button>
                          </div>
                        ) : isAccepted ? (
                          <div className="pt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <Check className="w-3 h-3" />
                            <span>Accepted</span>
                          </div>
                        ) : isDeclined ? (
                          <div className="pt-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                            <X className="w-3 h-3" />
                            <span>Declined</span>
                          </div>
                        ) : null
                      )}
                    </div>

                    {/* Delete action button */}
                    <button
                      onClick={(e) => handleDelete(e, notif.id)}
                      title="Delete notification"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 transition-opacity p-1 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-surface/30 text-center">
            <Link
              href="/friends"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors"
            >
              Manage Friends & Requests →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
