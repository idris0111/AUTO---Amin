import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Lock,
  Package,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'

import { api } from '../lib/api'
import type { Cart, Order } from '../types'
import { useAuth } from '../stores/auth'
import { useCart } from '../stores/cart'
import { useLoyalty } from '../stores/loyalty'

export default function Checkout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { fetchCart } = useCart()
  const [form, setForm] = useState({
    contact_name: user ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
    contact_phone: user?.phone ?? '',
    contact_email: user?.email ?? '',
    shipping_city: 'Душанбе',
    shipping_street: '',
    shipping_postal_code: '',
    customer_note: '',
  })
  const [shippingMethod, setShippingMethod] = useState<'pickup' | 'courier'>('pickup')
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'bank_transfer'>('cash_on_delivery')
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: string } | null>(null)
  const [shippingFee, setShippingFee] = useState<{ fee: string; eta_days_min: number; eta_days_max: number; zone_found: boolean } | null>(null)
  const [quoteRetry, setQuoteRetry] = useState(0)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState('')
  const [couponError, setCouponError] = useState('')
  const [error, setError] = useState('')

  const cart = useQuery({
    queryKey: ['cart-checkout', user?.id],
    queryFn: () => api.get<Cart>('/cart'),
  })

  const subtotal = cart.data?.subtotal ?? '0'
  const { account: loyaltyAccount, loadLoyalty } = useLoyalty()
  const [usePoints, setUsePoints] = useState(false)
  const [pointsToRedeem, setPointsToRedeem] = useState(0)

  useEffect(() => {
    if (user) void loadLoyalty()
  }, [user, loadLoyalty])

  const maxAllowedPoints = Math.min(
    loyaltyAccount?.points_balance ?? 0,
    Math.floor(Number(subtotal) * 0.3)
  )

  useEffect(() => {
    if (usePoints) {
      setPointsToRedeem(maxAllowedPoints)
    } else {
      setPointsToRedeem(0)
    }
  }, [usePoints, maxAllowedPoints])

  useEffect(() => {
    if (shippingMethod !== 'courier' || !form.shipping_city.trim() || !cart.data) {
      setShippingFee(null)
      setQuoteLoading(false)
      return
    }
    let cancelled = false
    setShippingFee(null)
    setQuoteLoading(true)
    setQuoteError('')
    const timer = setTimeout(() => {
      api
        .post<{ fee: string; eta_days_min: number; eta_days_max: number; zone_found: boolean }>('/shipping/quote', {
          city: form.shipping_city.trim(),
          subtotal,
        })
        .then(result => { if (!cancelled) setShippingFee(result) })
        .catch(() => { if (!cancelled) { setShippingFee(null); setQuoteError('Не удалось рассчитать доставку.') } })
        .finally(() => { if (!cancelled) setQuoteLoading(false) })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [shippingMethod, form.shipping_city, subtotal, cart.data, quoteRetry])

  const validateCoupon = useMutation({
    mutationFn: (subtotal: string) =>
      api.post<{ code: string; discount: string }>('/coupons/validate', { code: couponInput.trim(), subtotal }),
    onSuccess(result) {
      setAppliedCoupon(result)
      setCouponError('')
    },
    onError(err) {
      setAppliedCoupon(null)
      setCouponError(err instanceof Error ? err.message : 'Промокод не применён')
    },
  })

  const checkoutMutation = useMutation({
    mutationFn: () =>
      api.post<Order>('/orders/checkout', {
        ...form,
        contact_email: form.contact_email || undefined,
        shipping_method: shippingMethod,
        payment_method: paymentMethod,
        shipping_postal_code: form.shipping_postal_code || undefined,
        customer_note: form.customer_note || undefined,
        coupon_code: appliedCoupon?.code,
        points_to_redeem: usePoints ? pointsToRedeem : 0,
      }),
    async onSuccess(order) {
      await fetchCart()
      await cart.refetch()
      navigate(`/orders/${order.id}?created=1`)
    },
    onError(err) {
      setError(err instanceof Error ? err.message : 'Не удалось оформить заказ')
    },
  })

  if (!user) {
    return (
      <div className="min-h-[75vh] bg-[var(--canvas)] text-ink flex items-center justify-center px-4 py-16">
        <div className="relative max-w-md w-full rounded-2xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-[var(--canvas)] p-8 text-center shadow-2xl">
          <div className="mx-auto grid size-14 place-items-center rounded-xl bg-premium/15 text-premium mb-4">
            <Lock className="size-6" />
          </div>
          <div className="font-mono text-xs uppercase tracking-widest text-premium">
            AU AUTH REQUIRED
          </div>
          <h1 className="mt-1 text-2xl font-black text-ink">{t('checkout')}</h1>
          <p className="mt-2 text-xs text-muted leading-relaxed">
            Войдите, чтобы оформить заказ и отслеживать его статус.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              to="/login?next=%2Fcheckout"
              className="flex-1 rounded-xl bg-premium px-5 py-3 font-mono text-xs font-bold text-ink transition hover:bg-[#D91F32]"
            >
              {t('login')}
            </Link>
            <Link
              to="/register"
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 font-mono text-xs font-bold text-muted transition hover:text-ink"
            >
              {t('register')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (cart.isLoading) {
    return (
      <div className="min-h-[70vh] bg-[var(--canvas)] text-ink flex items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-4xl w-full animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-xl bg-[var(--surface)]" />
          <div className="h-60 rounded-2xl bg-[var(--surface)] border border-[var(--border)]" />
        </div>
      </div>
    )
  }

  if (cart.isError) return <div className="commerce-container commerce-section"><div className="commerce-empty" role="alert"><h1>Не удалось загрузить корзину</h1><p>Проверьте соединение с сервером.</p><button className="commerce-button" onClick={() => void cart.refetch()}>Повторить</button></div></div>

  if (!cart.data || cart.data.items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[var(--canvas)] text-ink flex items-center justify-center px-4 text-center">
        <div className="max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl">
          <h1 className="text-xl font-black text-ink">{t('emptyCart')}</h1>
          <p className="mt-2 text-xs text-muted">В вашей корзине нет товаров для оформления.</p>
          <Link
            to="/catalog"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-premium px-6 py-3 font-mono text-xs font-bold text-ink hover:bg-[#D91F32] transition"
          >
            {t('continueShopping')}
          </Link>
        </div>
      </div>
    )
  }

  const shippingCost = Number(shippingMethod === 'courier' ? (shippingFee?.fee ?? 0) : 0)
  const couponDiscount = Number(appliedCoupon?.discount ?? 0)
  const bonusDiscount = Number(usePoints ? pointsToRedeem : 0)
  const calculatedTotal = Math.max(0, Number(cart.data.subtotal) + shippingCost - couponDiscount - bonusDiscount)

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-ink pb-24 selection:bg-premium selection:text-ink">
      {/* Background Accent */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,240,255,0.05),transparent)]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header Telemetry */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-premium">
              <span className="size-2 rounded-full bg-premium animate-pulse" />
              <span>AU CHECKOUT TELEMETRY</span>
              <span className="text-[#242A32]">/</span>
              <span className="text-premium">SSL 256-BIT ENCRYPTION</span>
            </div>
            <h1 className="mt-2 text-3xl font-black text-ink tracking-tight">
              Оформление заказа
            </h1>
          </div>

          <Link
            to="/cart"
            className="font-mono text-xs font-bold text-muted hover:text-premium transition flex items-center gap-1.5"
          >
            <span>← Вернуться в корзину</span>
          </Link>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Checkout Steps Form (8 cols) */}
          <form
            className="lg:col-span-8 space-y-6"
            onSubmit={(e) => {
              e.preventDefault()
              if (checkoutMutation.isPending || (shippingMethod === 'courier' && !shippingFee)) return
              setError('')
              checkoutMutation.mutate()
            }}
          >
            {/* Step 1: Contact Details */}
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-[var(--border)]">
                <span className="grid size-7 place-items-center rounded-lg bg-premium/15 text-premium font-mono text-xs font-bold">
                  01
                </span>
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                  Контактные данные получателя
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
                    Имя и фамилия <span className="text-premium">*</span>
                  </label>
                  <input
                    required
                    maxLength={200}
                    placeholder="Рустам Саидов"
                    value={form.contact_name}
                    aria-label="Имя и фамилия получателя"
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 font-mono text-xs text-ink placeholder-slate-600 outline-none focus:border-premium transition"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
                    Телефон <span className="text-premium">*</span>
                  </label>
                  <input
                    required
                    maxLength={32}
                    type="tel"
                    aria-label="Телефон получателя"
                    placeholder="+992 900 000 000"
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 font-mono text-xs text-ink placeholder-slate-600 outline-none focus:border-premium transition"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
                    Email для электронного чека
                  </label>
                  <input
                    type="email"
                    aria-label="Email получателя"
                    maxLength={320}
                    placeholder="client@mail.tj"
                    value={form.contact_email}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 font-mono text-xs text-ink placeholder-slate-600 outline-none focus:border-premium transition"
                  />
                </div>
              </div>
            </section>

            {/* Step 2: Shipping Method & Address */}
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-[var(--border)]">
                <span className="grid size-7 place-items-center rounded-lg bg-premium/15 text-premium font-mono text-xs font-bold">
                  02
                </span>
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                  Способ и адрес доставки
                </h2>
              </div>

              {/* Shipping Method Cards */}
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setShippingMethod('pickup')}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    shippingMethod === 'pickup'
                      ? 'border-premium bg-premium/10 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                      : 'border-[var(--border)] bg-[var(--canvas)] text-muted hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-ink text-xs">Самовывоз (Склад AU-1)</span>
                    <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      БЕСПЛАТНО
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-muted mt-1.5">
                    Место и время выдачи уточнит сотрудник после оформления.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setShippingMethod('courier')}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    shippingMethod === 'courier'
                      ? 'border-premium bg-premium/10 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                      : 'border-[var(--border)] bg-[var(--canvas)] text-muted hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-ink text-xs">Экспресс-курьер</span>
                    <span className="font-mono text-[10px] font-bold text-premium bg-premium/10 px-2 py-0.5 rounded">
                      ПО ТАРИФУ
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-muted mt-1.5">
                    Стоимость и расчётный срок зависят от города доставки.
                  </p>
                </button>
              </div>

              {shippingMethod === 'courier' && shippingFee && (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 font-mono text-xs text-emerald-400 flex items-center justify-between">
                  <span>Расчётная стоимость доставки: <strong>{Number(shippingFee.fee).toFixed(2)} TJS</strong></span>
                  <span>Срок: {shippingFee.eta_days_min}–{shippingFee.eta_days_max} дн.</span>
                </div>
              )}
              {shippingMethod === 'courier' && !shippingFee && <p className="mt-4 text-sm muted" role={quoteError ? 'alert' : 'status'}>{quoteLoading ? 'Рассчитываем доставку…' : quoteError || 'Укажите город доставки.'} {!quoteLoading && <button type="button" className="text-premium underline" onClick={() => setQuoteRetry(n => n + 1)}>Повторить расчёт</button>}</p>}

              {/* Address inputs */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
                    Город / Населённый пункт <span className="text-premium">*</span>
                  </label>
                  <input
                    required
                    maxLength={100}
                    value={form.shipping_city}
                    aria-label="Город доставки"
                    onChange={(e) => setForm({ ...form, shipping_city: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 font-mono text-xs text-ink outline-none focus:border-premium transition"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
                    Улица, дом, квартира / офис <span className="text-premium">*</span>
                  </label>
                  <input
                    required
                    maxLength={255}
                    placeholder="ул. Айни 48, кв. 12"
                    value={form.shipping_street}
                    aria-label="Улица, дом и квартира"
                    onChange={(e) => setForm({ ...form, shipping_street: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 font-mono text-xs text-ink placeholder-slate-600 outline-none focus:border-premium transition"
                  />
                </div>
              </div>
            </section>

            {/* Step 3: Payment Method */}
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-[var(--border)]">
                <span className="grid size-7 place-items-center rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] font-mono text-xs font-bold">
                  03
                </span>
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                  Способ оплаты
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash_on_delivery')}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    paymentMethod === 'cash_on_delivery'
                      ? 'border-[#F59E0B] bg-[#F59E0B]/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : 'border-[var(--border)] bg-[var(--canvas)] text-muted hover:border-slate-500'
                  }`}
                >
                  <Banknote className="size-4 text-[#F59E0B] mb-2" />
                  <span className="font-bold text-ink text-xs">При получении</span>
                  <p className="font-mono text-[10px] text-muted mt-1">
                    Наличными курьеру или при самовывозе
                  </p>
                </button>

<button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-[#F59E0B] bg-[#F59E0B]/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : 'border-[var(--border)] bg-[var(--canvas)] text-muted hover:border-slate-500'
                  }`}
                >
                  <ShieldCheck className="size-4 text-emerald-400 mb-2" />
                  <span className="font-bold text-ink text-xs">Банковский счёт</span>
                  <p className="font-mono text-[10px] text-muted mt-1">
                    Счёт-фактура для юрлиц и автосервисов
                  </p>
                </button>
              </div>

              {/* Note */}
              <div className="mt-5">
                <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
                  Комментарий к заказу или пожелания курьеру
                </label>
                <textarea
                  maxLength={2000}
                  rows={2}
                  placeholder="Код домофона, удобное время доставки, ориентиры..."
                  value={form.customer_note}
                  onChange={(e) => setForm({ ...form, customer_note: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-3 font-mono text-xs text-ink placeholder-slate-600 outline-none focus:border-premium transition"
                />
              </div>
            </section>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-[#E32636]/40 bg-premium/10 p-4 font-mono text-xs text-premium">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={checkoutMutation.isPending || (shippingMethod === 'courier' && !shippingFee)}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-premium py-4 font-mono text-xs font-bold text-ink shadow-[0_4px_25px_rgba(227,38,54,0.4)] transition-all hover:bg-[#D91F32] disabled:opacity-50 active:scale-[0.99]"
            >
              {checkoutMutation.isPending ? (
                <>
                  <RotateCcw className="size-4 animate-spin" />
                  <span>СОЗДАНИЕ ЗАКАЗА В СИСТЕМЕ...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>ПОДТВЕРДИТЬ И ОФОРМИТЬ ЗАКАЗ</span>
                </>
              )}
            </button>
          </form>

          {/* Right Column: Executive Order Receipt (4 cols) */}
          <aside className="lg:col-span-4 rounded-2xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-[var(--canvas)] p-6 shadow-2xl space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-premium">
                <Package className="size-3.5" />
                <span>ВАШ ЗАКАЗ</span>
              </div>
              <h2 className="text-xl font-black text-ink mt-1">Спецификация</h2>
            </div>

            {/* Items Mini List */}
            <div className="divide-y divide-[#242A32]/60 max-h-56 overflow-y-auto scrollbar-none pr-1">
              {cart.data.items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="truncate font-bold text-ink text-xs">{item.product_name}</p>
                    <span className="font-mono text-[10px] text-muted">
                      {item.quantity} шт. × {Number(item.unit_price).toFixed(2)} TJS
                    </span>
                  </div>
                  <span className="font-mono font-black text-ink text-xs shrink-0">
                    {Number(item.line_total).toFixed(2)} TJS
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon Promo Input */}
            <div className="border-t border-[var(--border)] pt-4">
              <div className="flex gap-2">
                <input
                  placeholder="ПРОМОКОД"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3.5 py-2.5 font-mono text-xs uppercase text-ink placeholder-slate-600 outline-none focus:border-premium"
                />
                <button
                  type="button"
                  disabled={!couponInput.trim() || validateCoupon.isPending}
                  onClick={() => validateCoupon.mutate(cart.data!.subtotal)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 font-mono text-xs font-bold text-ink transition hover:border-premium hover:text-premium disabled:opacity-40"
                >
                  {validateCoupon.isPending ? '...' : 'ОК'}
                </button>
              </div>

              {couponError && (
                <div className="mt-2 font-mono text-[11px] text-premium">{couponError}</div>
              )}
              {appliedCoupon && (
                <div className="mt-2 flex items-center justify-between font-mono text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  <span>Скидка по купону {appliedCoupon.code}:</span>
                  <span className="font-bold">−{Number(appliedCoupon.discount).toFixed(2)} TJS</span>
                </div>
              )}
            </div>

            {/* Loyalty Bonus Section */}
            {(loyaltyAccount?.points_balance ?? 0) > 0 && maxAllowedPoints > 0 && (
              <div className="border-t border-[var(--border)] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-mono text-xs font-bold text-ink cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={usePoints}
                      onChange={(e) => setUsePoints(e.target.checked)}
                      className="size-4 accent-[#E32636] rounded"
                    />
                    <span>Списать баллы AU Club</span>
                  </label>
                  <span className="font-mono text-xs font-bold text-[#F59E0B]">
                    🪙 {loyaltyAccount?.points_balance} доступно
                  </span>
                </div>

                {usePoints && (
                  <div className="space-y-2 pt-1 font-mono">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={maxAllowedPoints}
                        step={1}
                        value={pointsToRedeem}
                        onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                        className="w-full accent-[#E32636] h-1.5 bg-[var(--canvas)] rounded"
                      />
                      <span className="text-xs font-bold w-12 text-right text-ink">
                        {pointsToRedeem} б.
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">Скидка бонусами:</span>
                      <span className="font-bold text-emerald-400">−{pointsToRedeem}.00 TJS</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary Lines */}
            <div className="border-t border-[var(--border)] pt-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-muted">
                <span>Товары:</span>
                <span className="text-ink font-bold">{Number(cart.data.subtotal).toFixed(2)} TJS</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Доставка:</span>
                <span className="text-emerald-400 font-bold">
                  {shippingMethod === 'pickup' ? 'Бесплатно (самовывоз)' : !shippingFee ? 'Ожидаем расчёт…' : `${shippingCost.toFixed(2)} TJS`}
                </span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Скидка купона:</span>
                  <span>−{couponDiscount.toFixed(2)} TJS</span>
                </div>
              )}
              {bonusDiscount > 0 && (
                <div className="flex justify-between text-[#F59E0B]">
                  <span>Бонусы AU Club:</span>
                  <span>−{bonusDiscount}.00 TJS</span>
                </div>
              )}
            </div>

            {/* Final Total */}
            <div className="border-t border-[var(--border)] pt-4 flex items-baseline justify-between font-mono">
              <span className="font-bold text-ink text-xs uppercase tracking-wider">К ОПЛАТЕ:</span>
              <div className="text-right">
                <span className="text-3xl font-black text-ink tracking-tight">
                  {calculatedTotal.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-premium ml-1.5">TJS</span>
              </div>
            </div>

            {/* Cash-back Preview Pill */}
            {loyaltyAccount && <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3 text-center font-mono text-xs text-[#F59E0B]">
              Расчётный кэшбэк {loyaltyAccount.tier_info.cashback_percent}%: ~
              {Math.round(calculatedTotal * Number(loyaltyAccount.tier_info.cashback_rate))}{' '}
              бонусов на клубный счёт
            </div>}
          </aside>
        </div>
      </div>
    </div>
  )
}
