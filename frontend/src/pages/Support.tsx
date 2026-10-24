import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Clock,
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Wrench,
  X,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../stores/auth'
import type { TicketCategory, TicketDetail, TicketListResponse, TicketStatus, TicketSummary } from '../types'

const CATEGORY_LABELS: Record<TicketCategory, { label: string; icon: any }> = {
  order: { label: 'Вопрос по заказу', icon: Package },
  part_selection: { label: 'Подбор запчасти / VIN', icon: Wrench },
  delivery: { label: 'Доставка и получение', icon: Clock },
  return: { label: 'Возврат и гарантия', icon: ShieldAlert },
  payment: { label: 'Оплата и счета', icon: HelpCircle },
  other: { label: 'Общий вопрос', icon: LifeBuoy },
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string }> = {
  open: { label: 'Новое обращение', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  in_progress: { label: 'В работе у специалиста', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  awaiting_customer: { label: 'Ожидает вашего ответа', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  resolved: { label: 'Решено', color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30' },
  closed: { label: 'Закрыто', color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/30' },
}

export default function Support() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTicketId = searchParams.get('ticket')

  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [activeTicketId, setActiveTicketId] = useState<string | null>(initialTicketId)
  const [activeTicket, setActiveTicket] = useState<TicketDetail | null>(null)
  const [loadingActive, setLoadingActive] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  // New Ticket Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newCategory, setNewCategory] = useState<TicketCategory>('part_selection')
  const [newMessage, setNewMessage] = useState('')
  const [newOrderId, setNewOrderId] = useState<string>('')
  const [customerOrders, setCustomerOrders] = useState<Array<{ id: string; number: string }>>([])
  const [creatingTicket, setCreatingTicket] = useState(false)

  // Filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all')

  const loadTickets = async () => {
    try {
      setLoadingTickets(true)
      const data = await api.get<TicketListResponse>('/support/tickets')
      setTickets(data.items)
      if (!activeTicketId && data.items.length > 0) {
        setActiveTicketId(data.items[0].id)
      }
    } catch (err) {
      console.error('Failed to load tickets', err)
    } finally {
      setLoadingTickets(false)
    }
  }

  const loadActiveTicket = async (id: string) => {
    try {
      setLoadingActive(true)
      const detail = await api.get<TicketDetail>(`/support/tickets/${id}`)
      setActiveTicket(detail)
      // update unread state locally
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, unread: false } : t)))
    } catch (err) {
      console.error('Failed to load ticket detail', err)
    } finally {
      setLoadingActive(false)
    }
  }

  const loadCustomerOrders = async () => {
    try {
      const data = await api.get<{ items: Array<{ id: string; number: string }> }>('/orders?limit=20')
      setCustomerOrders(data.items || [])
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (user) {
      void loadTickets()
      void loadCustomerOrders()
    }
  }, [user])

  useEffect(() => {
    if (activeTicketId) {
      void loadActiveTicket(activeTicketId)
      setSearchParams({ ticket: activeTicketId }, { replace: true })
    }
  }, [activeTicketId])

  const handleSendReply = async () => {
    if (!activeTicketId || !replyText.trim() || sendingReply) return
    try {
      setSendingReply(true)
      const updated = await api.post<TicketDetail>(`/support/tickets/${activeTicketId}/messages`, {
        body: replyText.trim(),
      })
      setActiveTicket(updated)
      setReplyText('')
      void loadTickets()
    } catch (err) {
      console.error('Failed to send reply', err)
    } finally {
      setSendingReply(false)
    }
  }

  const handleCloseTicket = async () => {
    if (!activeTicketId) return
    try {
      const updated = await api.post<TicketDetail>(`/support/tickets/${activeTicketId}/close`)
      setActiveTicket(updated)
      void loadTickets()
    } catch (err) {
      console.error('Failed to close ticket', err)
    }
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubject.trim() || !newMessage.trim() || creatingTicket) return
    try {
      setCreatingTicket(true)
      const created = await api.post<TicketDetail>('/support/tickets', {
        subject: newSubject.trim(),
        category: newCategory,
        message: newMessage.trim(),
        order_id: newOrderId || null,
      })
      setIsNewModalOpen(false)
      setNewSubject('')
      setNewMessage('')
      setNewOrderId('')
      await loadTickets()
      setActiveTicketId(created.id)
    } catch (err) {
      console.error('Failed to create ticket', err)
    } finally {
      setCreatingTicket(false)
    }
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter === 'active') return t.status !== 'resolved' && t.status !== 'closed'
      if (statusFilter === 'closed') return t.status === 'resolved' || t.status === 'closed'
      return true
    })
  }, [tickets, statusFilter])

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <LifeBuoy className="mx-auto size-12 text-premium" />
        <h1 className="mt-4 text-2xl font-black">Служба поддержки клиентов</h1>
        <p className="mt-2 text-muted">
          Для создания обращений и отслеживания ответов специалистов, пожалуйста, войдите в свой аккаунт.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block rounded-lg bg-premium px-6 py-3 font-semibold text-ink transition hover:opacity-90"
        >
          Войти в аккаунт
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Top Banner / Support Info */}
      <div
        className="rounded-2xl border p-6 shadow-sm"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-premium/10 border border-premium/30 px-3 py-1 text-xs font-bold text-premium uppercase">
              <LifeBuoy className="size-3.5" />
              Поддержка AutoUniverse
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-ink">
              Центр поддержки & Консультации
            </h1>
            <p className="mt-1 text-sm text-muted">
              Эксперты помогут с подбором запчастей по VIN, статусом доставки и оформлением возвратов.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <Phone className="size-4 text-emerald-400" />
              <div>
                <div className="font-mono font-bold text-ink">+992 (90) 000-00-00</div>
                <div className="text-[10px] text-muted">Ежедневно 08:00 – 22:00</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-premium px-5 py-2.5 text-sm font-bold text-ink shadow-lg transition hover:brightness-110"
            >
              <Plus className="size-4" />
              <span>Создать обращение</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout: Tickets List + Conversation Thread */}
      <div className="mt-8 grid gap-6 lg:grid-cols-12 min-h-[600px]">
        {/* Left Column: Tickets List */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div
            className="flex items-center justify-between rounded-xl border p-3"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            <div className="flex items-center gap-1">
              {(['all', 'active', 'closed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    statusFilter === filter
                      ? 'bg-premium text-ink'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {filter === 'all' ? 'Все' : filter === 'active' ? 'В работе' : 'Архив'}
                </button>
              ))}
            </div>

            <button
              onClick={() => void loadTickets()}
              className="rounded-lg p-1.5 text-muted hover:text-ink"
              title="Обновить список"
            >
              <RefreshCw className={`size-3.5 ${loadingTickets ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto rounded-2xl border divide-y max-h-[680px]"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            {loadingTickets && tickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">Загрузка обращений...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">
                {statusFilter === 'all'
                  ? 'У вас пока нет созданных обращений.'
                  : 'Обращений с таким статусом не найдено.'}
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isActive = activeTicketId === t.id
                const cat = CATEGORY_LABELS[t.category] || CATEGORY_LABELS.other
                const statusInfo = STATUS_CONFIG[t.status] || STATUS_CONFIG.open
                const CatIcon = cat.icon

                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTicketId(t.id)}
                    className={`p-4 transition cursor-pointer hover:bg-white/5 ${
                      isActive ? 'bg-white/10 border-l-4 border-l-premium' : ''
                    } ${t.unread ? 'bg-premium/5' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-ink">{t.number}</span>
                        {t.unread && (
                          <span className="size-2 rounded-full bg-premium animate-pulse" />
                        )}
                      </div>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-ink line-clamp-1">{t.subject}</h3>
                    <p className="mt-1 text-xs text-muted line-clamp-2 leading-relaxed">
                      {t.last_message_preview || 'Нет сообщений'}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <CatIcon className="size-3" />
                        {cat.label}
                      </span>
                      <span className="font-mono text-[10px]">
                        {new Date(t.last_message_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Ticket Conversation Thread */}
        <div
          className="lg:col-span-7 flex flex-col rounded-2xl border overflow-hidden"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
        >
          {loadingActive ? (
            <div className="flex-1 flex items-center justify-center p-12 text-xs text-muted">
              Загрузка диалога...
            </div>
          ) : !activeTicket ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted">
              <MessageSquare className="size-10 text-muted/50 mb-3" />
              <p className="text-sm font-semibold text-ink">Выберите обращение для просмотра диалога</p>
              <p className="text-xs text-muted mt-1">Или создайте новое обращение к нашим специалистам.</p>
            </div>
          ) : (
            <>
              {/* Ticket Topbar */}
              <div
                className="p-5 border-b flex flex-wrap items-center justify-between gap-4"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-premium">{activeTicket.number}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${
                        STATUS_CONFIG[activeTicket.status]?.color
                      }`}
                    >
                      {STATUS_CONFIG[activeTicket.status]?.label}
                    </span>
                  </div>
                  <h2 className="mt-1 text-lg font-bold text-ink">{activeTicket.subject}</h2>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                    <span>Категория: {CATEGORY_LABELS[activeTicket.category]?.label}</span>
                    {activeTicket.order_number && (
                      <Link
                        to={`/orders/${activeTicket.order_id}`}
                        className="text-premium hover:underline font-mono"
                      >
                        Заказ #{activeTicket.order_number}
                      </Link>
                    )}
                  </div>
                </div>

                {activeTicket.status !== 'closed' && activeTicket.status !== 'resolved' && (
                  <button
                    type="button"
                    onClick={handleCloseTicket}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink transition"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    Закрыть обращение
                  </button>
                )}
              </div>

              {/* Message Feed */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[500px] min-h-[360px]">
                {activeTicket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.is_staff ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[11px] text-muted">
                      <span className={msg.is_staff ? 'font-bold text-premium' : 'text-muted font-medium'}>
                        {msg.author_name}
                      </span>
                      <span className="font-mono text-[10px]">
                        {new Date(msg.created_at).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div
                      className={`rounded-2xl px-4 py-3 text-xs max-w-[85%] leading-relaxed ${
                        msg.is_staff
                          ? 'bg-[#1E242D] border border-[#2E3642] text-ink rounded-tl-sm'
                          : 'bg-premium text-ink rounded-tr-sm shadow-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input Bar */}
              <div
                className="p-4 border-t"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                {activeTicket.status === 'closed' ? (
                  <div className="flex items-center justify-between text-xs text-muted bg-white/5 p-3 rounded-xl border border-white/10">
                    <span>Обращение закрыто. Отправка нового сообщения автоматически возобновит диалог.</span>
                  </div>
                ) : null}

                <div className="mt-2 flex items-end gap-2.5">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Напишите ответ специалисту поддержки..."
                    className="flex-1 rounded-xl border p-3 text-xs outline-none focus:border-premium resize-none"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void handleSendReply()
                      }
                    }}
                  />

                  <button
                    type="button"
                    disabled={!replyText.trim() || sendingReply}
                    onClick={handleSendReply}
                    className="rounded-xl bg-premium p-3 text-ink transition hover:brightness-110 disabled:opacity-40"
                    title="Отправить (Enter)"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-xl rounded-2xl border p-6 shadow-2xl space-y-5"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <LifeBuoy className="size-5 text-premium" />
                <h2 className="text-lg font-bold text-ink">Новое обращение в поддержку</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="rounded-lg p-1 text-muted hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted">Категория вопроса *</label>
                <select
                  className="mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-xs outline-none focus:border-premium"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as TicketCategory)}
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted">Тема обращения *</label>
                <input
                  required
                  placeholder="Например: Помогите подобрать тормозные диски на Toyota Camry 70"
                  className="mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-xs outline-none focus:border-premium"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                />
              </div>

              {customerOrders.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-muted">Связанный заказ (опционально)</label>
                  <select
                    className="mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-xs outline-none focus:border-premium"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    value={newOrderId}
                    onChange={(e) => setNewOrderId(e.target.value)}
                  >
                    <option value="">Не привязывать к заказу</option>
                    {customerOrders.map((ord) => (
                      <option key={ord.id} value={ord.id}>
                        Заказ #{ord.number}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted">Подробное описание вопроса *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Опишите вопрос, укажите VIN-код автомобиля или детали доставки..."
                  className="mt-1.5 w-full rounded-lg border p-3 text-xs outline-none focus:border-premium resize-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="rounded-lg border px-4 py-2 text-xs font-semibold text-muted hover:text-ink"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!newSubject.trim() || !newMessage.trim() || creatingTicket}
                  className="rounded-lg bg-premium px-5 py-2 text-xs font-bold text-ink transition hover:brightness-110 disabled:opacity-40"
                >
                  {creatingTicket ? 'Создание...' : 'Отправить обращение'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
