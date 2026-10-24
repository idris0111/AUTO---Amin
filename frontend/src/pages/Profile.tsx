import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Award,
  Bell,
  CheckCircle2,
  Coins,
  Crown,
  History,
  Lock,
  Mail,
  Package,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  User as UserIcon,
  Car,
  Globe,
  Sun,
  Moon,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import type { NotificationItem, NotificationListResponse, NotificationPreference } from '../types'

import { api } from '../lib/api'
import { useAuth } from '../stores/auth'
import { useApp } from '../stores/app'
import { useLoyalty } from '../stores/loyalty'

export default function Profile() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, logout, refreshUser } = useAuth()
  const { theme, toggleTheme, locale, setLocale } = useApp()
  const { account: loyalty, loadLoyalty } = useLoyalty()

  const [form, setForm] = useState({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    phone: user?.phone ?? '',
  })
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [preferences, setPreferences] = useState<NotificationPreference | null>(null)
  const [notifHistory, setNotifHistory] = useState<NotificationItem[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all')

  const loadPreferencesAndHistory = async () => {
    try {
      setLoadingNotifs(true)
      const [prefsData, notifsData] = await Promise.all([
        api.get<NotificationPreference>('/notifications/preferences'),
        api.get<NotificationListResponse>('/notifications?limit=50'),
      ])
      setPreferences(prefsData)
      setNotifHistory(notifsData.items)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingNotifs(false)
    }
  }

  const updatePref = async (key: keyof NotificationPreference, val: boolean) => {
    if (!preferences) return
    const updated = { ...preferences, [key]: val }
    setPreferences(updated)
    try {
      await api.put('/notifications/preferences', { [key]: val })
    } catch (e) {
      console.error(e)
    }
  }

  const markItemRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifHistory((prev) => prev.map((it) => (it.id === id ? { ...it, is_read: true } : it)))
    } catch (e) {
      console.error(e)
    }
  }

  const deleteItem = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifHistory((prev) => prev.filter((it) => it.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (user) {
      void loadLoyalty()
      void loadPreferencesAndHistory()
      setForm({
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        phone: user.phone ?? '',
      })
    }
  }, [user, loadLoyalty])

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-white/10 bg-[#12161D] text-premium shadow-2xl">
          <UserIcon className="size-8" />
        </div>
        <h1 className="mt-6 text-3xl font-black text-ink">Личный кабинет AU</h1>
        <p className="mt-3 text-sm text-slate-400">Требуется авторизация для входа в панель управления профилем.</p>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0080FF] to-[#00F0FF] px-8 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-black shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
        >
          {t('login')}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    )
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSavingProfile(true)
    try {
      await api.patch('/users/me', { ...form, phone: form.phone || null })
      await refreshUser()
      setMessage('Данные профиля успешно обновлены')
      setTimeout(() => setMessage(''), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения данных')
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsChangingPassword(true)
    try {
      await api.post('/users/me/change-password', passwords)
      setPasswords({ current_password: '', new_password: '' })
      setMessage('Пароль успешно изменён. Все сессии обновлены.')
      setTimeout(() => setMessage(''), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка смены пароля')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Tier styling helpers
  const tier = (loyalty?.tier_info.current_tier ?? 'silver').toLowerCase()
  const tierConfig = {
    silver: {
      label: 'AU SILVER PILOT',
      badge: 'border-slate-400/40 bg-slate-400/10 text-slate-300',
      icon: ShieldCheck,
      cardGradient: 'from-[#1E232D] via-[#14181F] to-[#0D1015]',
      cardBorder: 'border-slate-500/30',
      accentColor: '#94A3B8',
      glow: 'rgba(148, 163, 184, 0.15)',
    },
    gold: {
      label: 'AU GOLD EXECUTIVE',
      badge: 'border-amber-400/50 bg-amber-400/10 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
      icon: Award,
      cardGradient: 'from-[#2B2313] via-[#1A160F] to-[#0D0B08]',
      cardBorder: 'border-amber-500/40',
      accentColor: '#F59E0B',
      glow: 'rgba(245, 158, 11, 0.25)',
    },
    platinum: {
      label: 'AU PLATINUM VIP',
      badge: 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.3)]',
      icon: Crown,
      cardGradient: 'from-[#0B1E2B] via-[#0E1520] to-[#070B10]',
      cardBorder: 'border-cyan-500/40',
      accentColor: '#00F0FF',
      glow: 'rgba(0, 240, 255, 0.25)',
    },
  }[tier] ?? {
    label: 'AU CLUB MEMBER',
    badge: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
    icon: ShieldCheck,
    cardGradient: 'from-[#1A1F26] via-[#12161D] to-[#0B0D12]',
    cardBorder: 'border-[#252B35]',
    accentColor: '#00F0FF',
    glow: 'rgba(0, 240, 255, 0.15)',
  }

  const TierIcon = tierConfig.icon
  const filteredNotifs = notifFilter === 'unread' ? notifHistory.filter((n) => !n.is_read) : notifHistory
  const unreadCount = notifHistory.filter((n) => !n.is_read).length

  return (
    <div className="min-h-screen bg-[#07090C] text-ink pb-24 selection:bg-premium selection:text-black">
      {/* Background Aurora / Ambient */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(0,240,255,0.06),transparent_80%)]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8">
        {/* Cockpit Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-premium">
              <span className="size-2 rounded-full bg-premium animate-pulse" />
              <span>AU PERFORMANCE OS</span>
              <span className="text-ink/20">/</span>
              <span>PILOT COCKPIT</span>
              <span className="text-ink/20">/</span>
              <span className="text-slate-400">ID: AU-{user.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <h1 className="mt-2 text-3xl font-black text-ink tracking-tight">
              Личный кабинет
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Управление персональной телеметрией, клубным статусом и параметрами безопасности.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                await logout()
                navigate('/')
              }}
              className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-2.5 font-mono text-xs font-bold text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/60 transition"
            >
              {t('logout')}
            </button>
          </div>
        </div>

        {/* Global Alert Notification */}
        {(message || error) && (
          <div
            className={`mt-6 flex items-center gap-3 rounded-xl border p-4 text-xs font-medium ${
              error
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{error || message}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. AU CLUB MEMBERSHIP METALLIC FOIL CARD & TELEMETRY ROW       */}
        {/* ============================================================== */}
        <div className="mt-8 grid gap-6 lg:grid-cols-12 items-stretch">
          {/* Executive Metallic Card */}
          <div
            className={`lg:col-span-6 rounded-2xl border ${tierConfig.cardBorder} bg-gradient-to-br ${tierConfig.cardGradient} p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col justify-between`}
            style={{
              boxShadow: `0 10px 40px -10px ${tierConfig.glow}`,
            }}
          >
            {/* Holographic light sweep effect */}
            <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full opacity-30 blur-3xl" style={{ background: tierConfig.accentColor }} />
            <div className="pointer-events-none absolute -left-20 -bottom-20 size-60 rounded-full opacity-15 blur-3xl bg-[#0080FF]" />

            {/* Top row of card: Emblem & Contactless */}
            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-white/10 border border-white/20 grid place-items-center backdrop-blur-md">
                    <Sparkles className="size-4 text-premium" />
                  </div>
                  <div>
                    <span className="block font-black tracking-widest text-ink text-sm">AU PERFORMANCE</span>
                    <span className="block font-mono text-[9px] uppercase tracking-widest text-premium">EXECUTIVE LUXURY PASS</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Radio className="size-4 text-slate-400 rotate-90" />
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${tierConfig.badge}`}>
                  <TierIcon className="size-3" />
                  {tierConfig.label}
                </span>
              </div>
            </div>

            {/* Smart EMV Chip & Monospace Card Number */}
            <div className="relative my-8">
              <div className="flex items-center gap-4 mb-4">
                {/* Brushed Gold EMV Chip Visual */}
                <div className="size-9 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/50 shadow-inner p-1 grid grid-cols-2 grid-rows-2 gap-0.5">
                  <div className="border-r border-b border-amber-700/40 rounded-tl" />
                  <div className="border-b border-amber-700/40 rounded-tr" />
                  <div className="border-r border-amber-700/40 rounded-bl" />
                  <div className="rounded-br" />
                </div>
                <div className="font-mono text-sm tracking-widest text-slate-400">
                  AUTO UNIVERSE CLIENT CLUB
                </div>
              </div>

              <div className="font-mono text-lg sm:text-xl font-bold tracking-[0.22em] text-ink/90 drop-shadow">
                AU • 9920 • 8472 • {user.id.slice(0, 4).toUpperCase()}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-400">
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500">PILOT / HOLDER</span>
                  <span className="font-bold text-ink">
                    {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.toUpperCase() : 'VIP CLIENT'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500">ROLE TIER</span>
                  <span className="font-bold text-premium uppercase">{user.role}</span>
                </div>
              </div>
            </div>

            {/* Bottom HUD bar on card: Live Balance & Cashback */}
            <div className="relative border-t border-white/10 pt-4 flex items-center justify-between">
              <div>
                <span className="block font-mono text-[10px] uppercase text-slate-400">Баланс бонусов</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                    {loyalty?.points_balance ?? 100}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-400">TJS</span>
                </div>
              </div>

              <div className="text-right">
                <span className="block font-mono text-[10px] uppercase text-slate-400">Кэшбэк на заказы</span>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-premium/40 bg-premium/10 px-2.5 py-1 text-xs font-bold font-mono text-premium">
                  <TrendingUp className="size-3.5" />
                  <span>{loyalty?.tier_info.cashback_percent ?? 3}% МГНОВЕННО</span>
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry Metrics & Tier Progress */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-4">
            {/* 3 Compact HUD cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-[#12161D] p-4 flex flex-col justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Кэшбэк статус</span>
                <div className="mt-2 text-2xl font-black text-[#10B981] font-mono">
                  {loyalty?.tier_info.cashback_percent ?? 3}%
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Возврат с каждой покупки</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#12161D] p-4 flex flex-col justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Всего покупок</span>
                <div className="mt-2 text-2xl font-black text-premium font-mono">
                  {Number(loyalty?.total_spent ?? 0).toFixed(0)} <span className="text-xs font-normal text-slate-400">TJS</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Накопительный объем</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#12161D] p-4 flex flex-col justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Всего начислено</span>
                <div className="mt-2 text-2xl font-black text-[#F59E0B] font-mono">
                  {loyalty?.lifetime_points ?? 100}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">1 балл = 1 сомони скидки</p>
              </div>
            </div>

            {/* Next Tier Telemetry Progress Bar */}
            <div className="rounded-xl border border-white/10 bg-[#12161D] p-5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Award className="size-4 text-amber-400" />
                  <span className="font-medium text-ink">
                    {loyalty?.tier_info.next_tier ? (
                      <>
                        Прогресс до статуса <strong className="font-mono uppercase text-amber-400">{loyalty.tier_info.next_tier}</strong>
                      </>
                    ) : (
                      'Максимальный VIP уровень достигнут'
                    )}
                  </span>
                </div>
                {loyalty?.tier_info.next_tier && (
                  <span className="font-mono text-xs text-slate-400">
                    Осталось: <strong className="text-ink">{Number(loyalty.tier_info.spent_needed_for_next).toFixed(2)} TJS</strong>
                  </span>
                )}
              </div>

              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/5 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#0080FF] via-[#00F0FF] to-[#10B981] transition-all duration-700 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(10, loyalty?.tier_info.tier_progress_percent ?? 20))}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Silver (3%)</span>
                <span>Gold (5%)</span>
                <span>Platinum VIP (7%)</span>
              </div>
            </div>

            {/* Privilege Highlights */}
            <div className="rounded-xl border border-white/10 bg-[#12161D] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="size-3.5 text-[#10B981]" />
                  Оплата бонусами до 30%
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="size-3.5 text-premium" />
                  1 бонус = 1 TJS
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="size-3.5 text-amber-400" />
                  Возврат при отмене
                </span>
              </div>
              <Link
                to="/catalog"
                className="font-mono text-xs font-bold text-premium hover:underline flex items-center gap-1"
              >
                В КАТАЛОГ <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. PERSONAL DATA & SECURITY DUAL COCKPIT                       */}
        {/* ============================================================== */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Left: Personal Dossier */}
          <form
            onSubmit={saveProfile}
            className="rounded-2xl border border-white/10 bg-[#12161D] p-6 shadow-xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-[#0080FF]/10 text-premium border border-[#0080FF]/30">
                  <UserIcon className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ink">Персональные данные</h2>
                  <p className="font-mono text-[11px] text-slate-400">{user.email} · {user.role.toUpperCase()}</p>
                </div>
              </div>
              <span className="rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-[#10B981]">
                VERIFIED
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
                  {t('firstName')}
                </label>
                <input
                  required
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#07090C] px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-premium focus:ring-1 focus:ring-[#00F0FF]"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
                  {t('lastName')}
                </label>
                <input
                  required
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#07090C] px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-premium focus:ring-1 focus:ring-[#00F0FF]"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
                  {t('contactPhone')}
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+992 90 000 00 00"
                  className="w-full rounded-xl border border-white/10 bg-[#07090C] px-3.5 py-2.5 text-sm font-mono text-ink outline-none transition focus:border-premium focus:ring-1 focus:ring-[#00F0FF]"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full mt-2 rounded-xl bg-gradient-to-r from-[#0080FF] to-[#00F0FF] py-3 font-mono text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:opacity-50"
              >
                {isSavingProfile ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </form>

          {/* Right: Security & Credentials + Preferences */}
          <div className="space-y-6">
            <form
              onSubmit={changePassword}
              className="rounded-2xl border border-white/10 bg-[#12161D] p-6 shadow-xl"
            >
              <div className="flex items-center gap-2.5 border-b border-white/10 pb-4 mb-5">
                <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Lock className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ink">Безопасность учетной записи</h2>
                  <p className="font-mono text-[11px] text-slate-400">Смена мастер-пароля (минимум 8 символов)</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
                    Текущий пароль
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={passwords.current_password}
                    onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#07090C] px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
                    Новый безопасный пароль
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={passwords.new_password}
                    onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#07090C] px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full mt-2 rounded-xl border border-amber-500/40 bg-amber-500/10 py-3 font-mono text-xs font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-500/20 transition disabled:opacity-50"
                >
                  {isChangingPassword ? 'Обновление...' : 'Обновить пароль'}
                </button>
              </div>
            </form>

            {/* Interface & Garage Quick Links */}
            <div className="rounded-2xl border border-white/10 bg-[#12161D] p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#07090C] px-4 py-3 text-xs hover:border-premium/50 transition"
                >
                  <span className="flex items-center gap-2 text-slate-300">
                    {theme === 'dark' ? <Moon className="size-4 text-premium" /> : <Sun className="size-4 text-amber-400" />}
                    Тема оформления
                  </span>
                  <span className="font-mono font-bold text-ink">
                    {theme === 'dark' ? 'Obsidian' : 'Light'}
                  </span>
                </button>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#07090C] px-4 py-3 text-xs">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Globe className="size-4 text-[#10B981]" />
                    Язык
                  </span>
                  <select
                    value={locale}
                    onChange={(e) => {
                      const val = e.target.value as 'ru' | 'tg' | 'en'
                      setLocale(val)
                      void i18n.changeLanguage(val)
                    }}
                    className="bg-transparent font-mono font-bold text-premium outline-none cursor-pointer"
                  >
                    <option value="ru" className="bg-[#12161D] text-ink">Русский (RU)</option>
                    <option value="tg" className="bg-[#12161D] text-ink">Тоҷикӣ (TG)</option>
                    <option value="en" className="bg-[#12161D] text-ink">English (EN)</option>
                  </select>
                </div>
              </div>

              <Link
                to="/garage"
                className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-[#07090C] px-4 py-3 text-xs hover:border-[#E32636]/60 transition group"
              >
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Car className="size-4 text-premium" />
                  <span>Перейти в мой цифровой гараж</span>
                </div>
                <span className="font-mono text-xs font-bold text-premium group-hover:translate-x-1 transition-transform">
                  ГАРАЖ →
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. NOTIFICATION CENTER & DISPATCH PREFERENCES                 */}
        {/* ============================================================== */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#12161D] p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-premium/10 text-premium border border-premium/30">
                <Bell className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-ink">Центр уведомлений & Каналы доставки</h2>
                <p className="text-xs text-slate-400">Настройка каналов информирования для {user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNotifFilter(notifFilter === 'all' ? 'unread' : 'all')}
                className={`rounded-lg border px-3 py-1.5 font-mono text-xs font-bold transition ${
                  notifFilter === 'unread'
                    ? 'border-premium bg-premium/20 text-premium'
                    : 'border-white/10 bg-[#07090C] text-slate-400 hover:text-ink'
                }`}
              >
                {notifFilter === 'unread' ? `Только новые (${unreadCount})` : 'Все уведомления'}
              </button>

              <button
                type="button"
                onClick={() => void loadPreferencesAndHistory()}
                className="rounded-lg border border-white/10 bg-[#07090C] px-3 py-1.5 font-mono text-xs font-bold text-slate-400 hover:text-ink transition"
              >
                Обновить
              </button>
            </div>
          </div>

          {/* Preferences Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {/* Orders */}
            <div className="rounded-xl border border-white/10 bg-[#07090C] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-ink mb-3">
                <Package className="size-4 text-[#10B981]" />
                Статусы заказов
              </div>
              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Smartphone className="size-3.5 text-slate-500" /> В приложении
                  </span>
                  <input
                    type="checkbox"
                    className="size-4 accent-[#00F0FF] cursor-pointer"
                    checked={preferences?.order_updates_in_app ?? true}
                    onChange={(e) => updatePref('order_updates_in_app', e.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Mail className="size-3.5 text-slate-500" /> По email
                  </span>
                  <input
                    type="checkbox"
                    className="size-4 accent-[#00F0FF] cursor-pointer"
                    checked={preferences?.order_updates_email ?? true}
                    onChange={(e) => updatePref('order_updates_email', e.target.checked)}
                  />
                </label>
              </div>
            </div>

            {/* Loyalty */}
            <div className="rounded-xl border border-white/10 bg-[#07090C] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-ink mb-3">
                <Coins className="size-4 text-amber-400" />
                Бонусы и кэшбэк
              </div>
              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Smartphone className="size-3.5 text-slate-500" /> В приложении
                  </span>
                  <input
                    type="checkbox"
                    className="size-4 accent-[#00F0FF] cursor-pointer"
                    checked={preferences?.loyalty_in_app ?? true}
                    onChange={(e) => updatePref('loyalty_in_app', e.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Mail className="size-3.5 text-slate-500" /> По email
                  </span>
                  <input
                    type="checkbox"
                    className="size-4 accent-[#00F0FF] cursor-pointer"
                    checked={preferences?.loyalty_email ?? true}
                    onChange={(e) => updatePref('loyalty_email', e.target.checked)}
                  />
                </label>
              </div>
            </div>

            {/* VIP Promotions */}
            <div className="rounded-xl border border-white/10 bg-[#07090C] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-ink mb-3">
                <Crown className="size-4 text-purple-400" />
                Спецпредложения
              </div>
              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Smartphone className="size-3.5 text-slate-500" /> В приложении
                  </span>
                  <input
                    type="checkbox"
                    className="size-4 accent-[#00F0FF] cursor-pointer"
                    checked={preferences?.promotions_in_app ?? true}
                    onChange={(e) => updatePref('promotions_in_app', e.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Mail className="size-3.5 text-slate-500" /> По email
                  </span>
                  <input
                    type="checkbox"
                    className="size-4 accent-[#00F0FF] cursor-pointer"
                    checked={preferences?.promotions_email ?? false}
                    onChange={(e) => updatePref('promotions_email', e.target.checked)}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* History Feed */}
          <div className="mt-6 border-t border-white/10 pt-5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3">
              Журнал входящих сообщений
            </h3>

            {loadingNotifs ? (
              <p className="text-xs text-slate-400 py-4">Синхронизация оповещений...</p>
            ) : filteredNotifs.length === 0 ? (
              <div className="rounded-xl border border-white/5 bg-[#07090C] p-8 text-center text-xs text-slate-400">
                Нет сообщений для отображения.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {filteredNotifs.map((n) => (
                  <div
                    key={n.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border text-xs transition ${
                      !n.is_read
                        ? 'border-premium/40 bg-premium/5'
                        : 'border-white/5 bg-[#07090C]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${!n.is_read ? 'text-ink' : 'text-slate-400'}`}>
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span className="rounded bg-premium/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-premium">
                            NEW
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono ml-auto sm:ml-0">
                          {new Date(n.created_at).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-400 leading-relaxed">{n.message}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={() => {
                            if (!n.is_read) void markItemRead(n.id)
                          }}
                          className="rounded-lg border border-premium/30 bg-premium/10 px-2.5 py-1 text-xs font-mono font-bold text-premium hover:bg-premium/20 transition"
                        >
                          Открыть →
                        </Link>
                      )}
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={() => void markItemRead(n.id)}
                          className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-mono text-slate-400 hover:text-ink transition"
                        >
                          Прочитано
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void deleteItem(n.id)}
                        className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-rose-400 transition"
                        title="Удалить"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. BONUS LEDGER & TRANSACTION HISTORY                          */}
        {/* ============================================================== */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#12161D] p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink uppercase tracking-wider font-mono">
              <History className="size-4 text-premium" />
              Журнал транзакций AU Club
            </h3>
            <span className="font-mono text-xs text-slate-400">
              Баланс: <strong className="text-amber-400">{loyalty?.points_balance ?? 100} TJS</strong>
            </span>
          </div>

          {loyalty?.recent_transactions && loyalty.recent_transactions.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#07090C]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 bg-white/5 text-slate-400 font-mono">
                  <tr>
                    <th className="px-4 py-3">ДАТА / ВРЕМЯ</th>
                    <th className="px-4 py-3">ТИП ОПЕРАЦИИ</th>
                    <th className="px-4 py-3">ОПИСАНИЕ</th>
                    <th className="px-4 py-3 text-right">СУММА</th>
                    <th className="px-4 py-3 text-right">ОСТАТОК</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {loyalty.recent_transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/5 transition">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {tx.type === 'accrual' && (
                          <span className="rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 text-[#10B981] font-bold">
                            Начисление
                          </span>
                        )}
                        {tx.type === 'redemption' && (
                          <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-rose-400 font-bold">
                            Списание
                          </span>
                        )}
                        {tx.type === 'refund' && (
                          <span className="rounded-md border border-[#0080FF]/30 bg-[#0080FF]/10 px-2 py-0.5 text-premium font-bold">
                            Возврат
                          </span>
                        )}
                        {tx.type === 'welcome' && (
                          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-400 font-bold">
                            Приветственный
                          </span>
                        )}
                        {tx.type === 'admin_adjust' && (
                          <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-400 font-bold">
                            Корректировка
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-sans">{tx.description}</td>
                      <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                        {tx.amount > 0 ? (
                          <span className="text-[#10B981]">+{tx.amount} б.</span>
                        ) : (
                          <span className="text-rose-400">{tx.amount} б.</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 whitespace-nowrap">
                        {tx.balance_after} TJS
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-white/5 bg-[#07090C] p-6 text-center text-xs text-slate-400">
              Пока нет операций по бонусному счету.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
