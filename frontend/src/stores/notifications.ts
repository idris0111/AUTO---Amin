import { create } from 'zustand'
import { api } from '../lib/api'
import type { NotificationItem, NotificationListResponse, UnreadCountResponse } from '../types'

type NotificationsState = {
  items: NotificationItem[]
  unreadCount: number
  loading: boolean
  error: string | null
  loadNotifications: (unreadOnly?: boolean) => Promise<void>
  loadUnreadCount: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  clear: () => void
}

export const useNotifications = create<NotificationsState>((set, get) => ({
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,

  async loadNotifications(unreadOnly = false) {
    set({ loading: true, error: null })
    try {
      const data = await api.get<NotificationListResponse>('/notifications', {
        unread_only: unreadOnly ? true : undefined,
        limit: 30,
      })
      set({ items: data.items, unreadCount: data.unread_count })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load notifications' })
    } finally {
      set({ loading: false })
    }
  },

  async loadUnreadCount() {
    try {
      const data = await api.get<UnreadCountResponse>('/notifications/unread-count')
      set({ unreadCount: data.unread_count })
    } catch {
      // quiet fail if unauthenticated
    }
  },

  async markAsRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`)
      set({
        items: get().items.map((it) => (it.id === id ? { ...it, is_read: true } : it)),
        unreadCount: Math.max(0, get().unreadCount - 1),
      })
    } catch (err) {
      console.error('Failed to mark notification as read', err)
    }
  },

  async markAllAsRead() {
    try {
      await api.post('/notifications/mark-all-read')
      set({
        items: get().items.map((it) => ({ ...it, is_read: true })),
        unreadCount: 0,
      })
    } catch (err) {
      console.error('Failed to mark all as read', err)
    }
  },

  async deleteNotification(id: string) {
    try {
      await api.delete(`/notifications/${id}`)
      const wasUnread = get().items.find((it) => it.id === id)?.is_read === false
      set({
        items: get().items.filter((it) => it.id !== id),
        unreadCount: wasUnread ? Math.max(0, get().unreadCount - 1) : get().unreadCount,
      })
    } catch (err) {
      console.error('Failed to delete notification', err)
    }
  },

  clear() {
    set({ items: [], unreadCount: 0, loading: false, error: null })
  },
}))

