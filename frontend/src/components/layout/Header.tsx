import { Bell, CheckCheck, Coins, GitCompare, Heart, Menu, Moon, Package, Search, ShoppingCart, Sparkles, Sun, Truck, User as UserIcon, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'

import { api } from '../../lib/api'
import type { PaginatedProducts, ProductBrief } from '../../types'
import { useApp } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import { useCart } from '../../stores/cart'
import { useGarage } from '../../stores/garage'
import { useComparison } from '../../stores/comparison'
import { useLoyalty } from '../../stores/loyalty'
import { useNotifications } from '../../stores/notifications'
import CatalogMenu from './CatalogMenu'

export default function Header() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { theme, toggleTheme, locale, setLocale } = useApp()
  const { user, logout } = useAuth()
  const { cart, fetchCart } = useCart()
  const { selectedVehicleId, vehicles, loadGarage } = useGarage()
  const comparisonIds = useComparison((state) => state.ids)
  const loyaltyAccount = useLoyalty((state) => state.account)
  const loadLoyalty = useLoyalty((state) => state.loadLoyalty)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<ProductBrief[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(0)
  const [badgePop, setBadgePop] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const notifsWrapRef = useRef<HTMLDivElement>(null)
  const notifications = useNotifications((state) => state.items)
  const unreadCount = useNotifications((state) => state.unreadCount)
  const loadNotifications = useNotifications((state) => state.loadNotifications)
  const loadUnreadCount = useNotifications((state) => state.loadUnreadCount)
  const markAsRead = useNotifications((state) => state.markAsRead)
  const markAllAsRead = useNotifications((state) => state.markAllAsRead)

  useEffect(() => {
    void fetchCart()
    if (user) {
      void loadGarage()
      void loadLoyalty()
      void loadUnreadCount()
      const interval = setInterval(() => {
        void loadUnreadCount()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [fetchCart, user, loadGarage, loadLoyalty, loadUnreadCount])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifsWrapRef.current && !notifsWrapRef.current.contains(e.target as Node)) {
        setNotifsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      setSuggestionsOpen(false)
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      api
        .get<PaginatedProducts>('/catalog/products', { q: trimmed, limit: 5 })
        .then((page) => {
          if (cancelled) return
          setSuggestions(page.items)
          setSuggestionsOpen(true)
        })
        .catch(() => {
          if (!cancelled) setSuggestions([])
        })
    }, 280)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    if (cart && cart.count > prevCount.current && prevCount.current !== 0) {
      setBadgePop(true)
      const timer = setTimeout(() => setBadgePop(false), 350)
      return () => clearTimeout(timer)
    }
    prevCount.current = cart?.count ?? 0
  }, [cart])

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target as Node)) {
        setSuggestionsOpen(false)
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { setSuggestionsOpen(false); setNotifsOpen(false); setMobileOpen(false) }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const selected = vehicles.find((v) => v.id === selectedVehicleId)

  function submitSearch(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    setSuggestionsOpen(false)
    navigate(`/catalog?q=${encodeURIComponent(trimmed)}`)
    setMobileOpen(false)
  }

  function openSuggestion(product: ProductBrief) {
    setSuggestionsOpen(false)
    setQuery('')
    navigate(`/product/${product.slug}`)
  }

  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = (
    <>
      <CatalogMenu onNavigate={() => setMobileOpen(false)} />
      <Link className="transition hover:text-premium" to="/garage" onClick={() => setMobileOpen(false)}>
        Подбор по авто
      </Link>
      <Link className="transition hover:text-premium" to="/#brands" onClick={() => setMobileOpen(false)}>
        Бренды
      </Link>
      <Link className="transition hover:text-premium" to="/catalog?has_discount=true" onClick={() => setMobileOpen(false)}>
        Акции
      </Link>
      <Link className="inline-flex items-center gap-1.5 transition hover:text-premium" to="/ai-mechanic" onClick={() => setMobileOpen(false)}>
        <Sparkles className="size-3.5 text-premium" />
        <span>AI Механик</span>
        <span className="rounded-full bg-premium/20 px-1.5 py-0.5 text-[9px] font-black text-premium">AI</span>
      </Link>
      <Link className="transition hover:text-premium" to="/garage" onClick={() => setMobileOpen(false)}>
        Мой гараж
      </Link>
      <Link className="transition hover:text-premium" to="/blog" onClick={() => setMobileOpen(false)}>
        База знаний
      </Link>
      <Link className="transition hover:text-premium" to="/support" onClick={() => setMobileOpen(false)}>
        Поддержка
      </Link>
    </>
  )

  return (
    <header className={`commerce-header sticky top-0 z-50 ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="au-monogram">
            AU
          </span>
          <div className="flex flex-col">
            <span className="brand-wordmark">
              AUTO<span className="text-premium">UNIVERSE</span>
            </span>
            <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-silver/60">
              PRECISION IN EVERY PART
            </span>
          </div>
        </Link>

        <div ref={searchWrapRef} className="relative hidden flex-1 md:block">
          <form onSubmit={submitSearch}>
            <div
              className="flex w-full items-center gap-2 rounded-xl border px-3 py-2 transition focus-within:border-premium"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
            >
              <Search className="size-4 shrink-0 muted" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                placeholder={t('search')}
                aria-label={t('search')}
                className="w-full bg-transparent text-sm outline-none"
              />
              <button type="submit" className="shrink-0 rounded-lg bg-premium px-3 py-1 text-sm font-semibold text-ink transition hover:brightness-110">
                {t('searchShort')}
              </button>
            </div>
          </form>
          {suggestionsOpen && suggestions.length > 0 && (
            <div
              className="fade-in-up absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border shadow-[var(--shadow-lg)]"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openSuggestion(item)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--surface-2)]"
                >
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--surface-2)]">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="text-xs font-black muted">AU</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.name}</span>
                    <span className="block text-xs muted">
                      {item.brand.name} · {t('sku')}: {item.sku}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold">{Number(item.price).toFixed(2)} TJS</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <select
            aria-label="Language"
            value={locale}
            onChange={(event) => {
              const value = event.target.value as 'ru' | 'tg' | 'en'
              setLocale(value)
              void i18n.changeLanguage(value)
            }}
            className="rounded-lg border bg-transparent px-2 py-1 text-xs"
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="ru">RU</option>
            <option value="tg">TG</option>
            <option value="en">EN</option>
          </select>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-lg border p-2 transition hover:border-premium hover:text-premium"
            style={{ borderColor: 'var(--border)' }}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <Link
            to="/garage"
            className="flex max-w-40 items-center gap-1 rounded-lg border px-2 py-1.5 text-sm transition hover:border-premium"
            style={{ borderColor: 'var(--border)' }}
            title={selected ? selected.name : t('garage')}
          >
            <Truck className="size-4 shrink-0 text-premium" aria-hidden />
            <span className="truncate">{selected ? selected.name : t('garage')}</span>
          </Link>
          <Link
            to="/compare"
            aria-label={t('compare')}
            title={t('comparison')}
            className="relative rounded-lg border p-2 transition hover:border-premium hover:text-premium"
            style={{ borderColor: 'var(--border)' }}
          >
            <GitCompare className="size-4" />
            {comparisonIds.length > 0 && (
              <span className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-premium px-1 text-[10px] font-bold text-ink">
                {comparisonIds.length}
              </span>
            )}
          </Link>
          <Link
            to="/favorites"
            aria-label="Favorites"
            className="rounded-lg border p-2 transition hover:border-premium hover:text-premium"
            style={{ borderColor: 'var(--border)' }}
          >
            <Heart className="size-4" />
          </Link>
          {user?.role && ['admin', 'super_admin', 'manager', 'order_manager'].includes(user.role) && (
            <Link
              to={user.role === 'order_manager' ? '/cockpit' : '/admin'}
              aria-label="Admin"
              className="rounded-lg border px-3 py-2 text-xs font-bold transition hover:border-premium hover:text-premium"
              style={{ borderColor: 'var(--border)' }}
            >
              ADMIN
            </Link>
          )}
          <Link
            to="/cart"
            aria-label={t('cart')}
            className="relative rounded-lg border p-2 transition hover:border-premium"
            style={{ borderColor: 'var(--border)' }}
          >
            <ShoppingCart className="size-4" />
            {cart && cart.count > 0 && (
              <span
                key={cart.count}
                className={`absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-premium px-1 text-[10px] font-bold text-ink ${badgePop ? 'pop-badge' : ''}`}
              >
                {cart.count}
              </span>
            )}
          </Link>
          {user && (
            <div ref={notifsWrapRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  const nextState = !notifsOpen
                  setNotifsOpen(nextState)
                  if (nextState) void loadNotifications()
                }}
                aria-label="Уведомления"
                className="relative rounded-lg border p-2 transition hover:border-premium hover:text-premium"
                style={{ borderColor: 'var(--border)' }}
                title="Уведомления"
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-premium px-1 text-[10px] font-bold text-ink shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notifsOpen && (
                <div
                  className="fade-in-up absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
                >
                  <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-ink">Уведомления</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-premium/20 px-2 py-0.5 text-[10px] font-bold text-premium">
                          {unreadCount} новых
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => void markAllAsRead()}
                        className="flex items-center gap-1 text-xs text-muted hover:text-ink transition"
                        title="Отметить все прочитанными"
                      >
                        <CheckCheck className="size-3.5" />
                        <span>Прочитать все</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted">
                        У вас пока нет уведомлений.
                      </div>
                    ) : (
                      notifications.map((it) => (
                        <div
                          key={it.id}
                          role="button"
                          tabIndex={0}
                          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click() } }}
                          onClick={() => {
                            if (!it.is_read) void markAsRead(it.id)
                            if (it.link) {
                              navigate(it.link)
                              setNotifsOpen(false)
                            }
                          }}
                          className={`flex items-start gap-3 p-3.5 text-xs transition cursor-pointer hover:bg-white/5 ${
                            !it.is_read ? 'bg-premium/5' : ''
                          }`}
                        >
                          <div className="mt-0.5 shrink-0 rounded-lg p-2 bg-white/5 border border-white/10 text-premium">
                            {it.type === 'loyalty_bonus' ? (
                              <Coins className="size-4 text-amber-400" />
                            ) : it.type.startsWith('order') ? (
                              <Package className="size-4 text-emerald-400" />
                            ) : (
                              <Bell className="size-4 text-sky-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className={`font-semibold truncate ${!it.is_read ? 'text-ink' : 'text-muted'}`}>
                                {it.title}
                              </span>
                              {!it.is_read && (
                                <span className="size-2 shrink-0 rounded-full bg-premium" />
                              )}
                            </div>
                            <p className="mt-1 text-muted line-clamp-2 leading-relaxed">
                              {it.message}
                            </p>
                            <span className="mt-1.5 block font-mono text-[10px] text-zinc-500">
                              {new Date(it.created_at).toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t p-2.5 text-center" style={{ borderColor: 'var(--border)' }}>
                    <Link
                      to="/profile"
                      onClick={() => setNotifsOpen(false)}
                      className="text-xs font-semibold text-premium hover:underline"
                    >
                      Центр уведомлений в профиле →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-2 text-sm">
              <Link
                to="/profile"
                className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-400 hover:border-amber-400 transition"
                title="Бонусные баллы AU Loyalty (1 балл = 1 TJS)"
              >
                <Coins className="size-3.5" />
                <span>{loyaltyAccount?.points_balance ?? '—'}</span>
              </Link>
              <Link to="/profile" className="max-w-32 truncate hover:text-premium">
                <UserIcon className="mr-1 inline size-4" aria-hidden />
                {user.first_name}
              </Link>
              <button type="button" onClick={() => void logout()} className="muted transition hover:text-premium">
                {t('logout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <Link to="/login" className="transition hover:text-premium">
                {t('login')}
              </Link>
              <Link to="/register" className="rounded-lg bg-premium px-3 py-1.5 font-semibold text-ink transition hover:brightness-110">
                {t('register')}
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          className="ml-auto rounded-lg border p-2 lg:hidden"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => setMobileOpen((value) => !value)}
          aria-label="Menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <form onSubmit={submitSearch} className="commerce-mobile-search md:hidden" role="search"><Search size={19} aria-hidden /><input value={query} onChange={e => setQuery(e.target.value)} aria-label={t('search')} placeholder="Найти запчасть или артикул" /><button type="submit" aria-label="Найти запчасть"><Search size={18} /></button></form>
      <div className="commerce-nav-wrap hidden lg:block"><nav className="commerce-container commerce-nav" aria-label="Основная навигация">{navLinks}</nav></div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden border-t lg:hidden"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <div className="px-4 py-4">
              <form onSubmit={submitSearch} className="mb-4 flex gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('search')}
                  aria-label={t('search')}
                  className="input-premium"
                />
                <button type="submit" aria-label={t('searchShort')} className="btn-premium px-3 py-2.5">
                  <Search className="size-4" />
                </button>
              </form>
              <nav className="flex flex-col gap-3 text-sm font-medium">{navLinks}</nav>
              <div className="mobile-tools mt-4 text-sm">
                <select aria-label="Язык интерфейса" value={locale} onChange={e => { const value = e.target.value as 'ru' | 'tg' | 'en'; setLocale(value); void i18n.changeLanguage(value) }}><option value="ru">RU</option><option value="tg">TG</option><option value="en">EN</option></select>
                <button type="button" onClick={toggleTheme} className="flex items-center gap-2">
                  {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}{' '}
                  {theme === 'dark' ? 'Light' : 'Dark'}
                </button>
                <div className="flex items-center gap-3">
                  <Link to="/compare" onClick={() => setMobileOpen(false)} className="flex items-center gap-1.5">
                    <GitCompare className="size-4" /> {t('compare')} {comparisonIds.length > 0 ? `(${comparisonIds.length})` : ''}
                  </Link>
                  <Link to="/favorites" onClick={() => setMobileOpen(false)} aria-label="Избранное"><Heart className="size-5" /></Link>
                  <Link to="/cart" onClick={() => setMobileOpen(false)} className="flex items-center gap-1.5">
                    <ShoppingCart className="size-4" /> {t('cart')} {cart && cart.count > 0 ? `(${cart.count})` : ''}
                  </Link>
                </div>
              </div>
              <div className="mt-4 flex gap-3 text-sm">
                {user ? (
                  <>
                    <Link to="/profile">{user.first_name}</Link>
                    <button type="button" onClick={() => void logout()} className="text-premium">
                      {t('logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="rounded-lg border px-3 py-1.5" style={{ borderColor: 'var(--border)' }}>
                      {t('login')}
                    </Link>
                    <Link to="/register" className="rounded-lg bg-premium px-3 py-1.5 font-semibold text-ink">
                      {t('register')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
