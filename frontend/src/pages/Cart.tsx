import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  Zap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useCart } from '../stores/cart'

export default function Cart() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cart, loading, error, fetchCart, updateItem, removeItem } = useCart()

  useEffect(() => {
    void fetchCart()
  }, [fetchCart])

  if (loading && !cart) {
    return (
      <div className="min-h-[70vh] bg-[#0B0D10] text-slate-100 flex items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-4xl w-full animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-xl bg-[#15191F]" />
          <div className="h-40 rounded-2xl bg-[#15191F] border border-[#242A32]" />
          <div className="h-40 rounded-2xl bg-[#15191F] border border-[#242A32]" />
        </div>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-[75vh] bg-[#0B0D10] text-slate-100 flex items-center justify-center px-4 py-16">
        <div className="relative max-w-md w-full rounded-2xl border border-[#242A32] bg-gradient-to-b from-[#15191F] to-[#0B0D10] p-8 sm:p-10 text-center shadow-2xl overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-20 size-60 bg-[#E32636]/10 blur-3xl rounded-full" />
          <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-[#242A32] bg-[#0B0D10] text-[#E32636] shadow-xl">
            <ShoppingBag className="size-8" />
          </div>
          <div className="mt-6 font-mono text-xs uppercase tracking-widest text-[#E32636]">
            AU SHOPPING BAG // EMPTY
          </div>
          <h1 className="mt-2 text-2xl font-black text-white">
            {t('emptyCart')}
          </h1>
          <p className="mt-2 text-xs text-[#A5ACB5] leading-relaxed">
            В вашей корзине пока нет запчастей. Найдите нужные детали в каталоге или воспользуйтесь подбором по авто.
          </p>
          <Link
            to="/catalog"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#E32636] px-6 py-3.5 font-mono text-xs font-bold text-white shadow-lg transition hover:bg-[#D91F32]"
          >
            <span>ПЕРЕЙТИ В КАТАЛОГ ДЕТАЛЕЙ</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    )
  }

  const freeDeliveryThreshold = 500
  const currentSubtotal = Number(cart.subtotal)
  const toFreeDelivery = Math.max(0, freeDeliveryThreshold - currentSubtotal)

  return (
    <div className="min-h-screen bg-[#0B0D10] text-slate-100 pb-24 selection:bg-[#E32636] selection:text-white">
      {/* Background Architectural Accent */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,240,255,0.05),transparent)]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header telemetry strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242A32] pb-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-[#E32636]">
              <span className="size-2 rounded-full bg-[#E32636] animate-pulse" />
              <span>AU PERFORMANCE CART</span>
              <span className="text-[#242A32]">/</span>
              <span className="text-[#A5ACB5]">ПОЗИЦИЙ: {cart.count}</span>
            </div>
            <h1 className="mt-2 text-3xl font-black text-white tracking-tight">
              Корзина покупок
            </h1>
          </div>

          <Link
            to="/catalog"
            className="font-mono text-xs font-bold text-[#A5ACB5] hover:text-[#00F0FF] transition flex items-center gap-1.5"
          >
            <span>← Продолжить подбор деталей</span>
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-[#E32636]/40 bg-[#E32636]/10 p-4 font-mono text-xs text-[#E32636]">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Items List (7 cols) */}
          <div className="lg:col-span-8 space-y-3">
            {/* Free shipping progress bar */}
            <div className="rounded-2xl border border-[#242A32] bg-[#15191F] p-4 shadow-lg">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <Truck className="size-4 text-[#00F0FF]" />
                  <span>Экспресс-доставка по Душанбе</span>
                </span>
                {toFreeDelivery > 0 ? (
                  <span className="text-[#A5ACB5]">
                    До бесплатной доставки: <strong className="text-white">{toFreeDelivery.toFixed(2)} TJS</strong>
                  </span>
                ) : (
                  <span className="font-bold text-emerald-400">Бесплатная доставка активна!</span>
                )}
              </div>
              <div className="mt-2.5 h-1.5 w-full rounded-full bg-[#0B0D10] overflow-hidden border border-[#242A32]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0080FF] via-[#00F0FF] to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((currentSubtotal / freeDeliveryThreshold) * 100))}%` }}
                />
              </div>
            </div>

            {/* Cart Items */}
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-[#242A32] bg-[#15191F] p-4 transition-all hover:border-[#00F0FF]/40 shadow-xl"
              >
                {/* Product thumbnail */}
                <Link
                  to={`/product/${item.product_slug ?? ''}`}
                  className="size-20 shrink-0 overflow-hidden rounded-xl border border-[#242A32] bg-[#0B0D10] p-1.5 flex items-center justify-center group-hover:border-slate-500 transition"
                >
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name ?? ''}
                      className="size-full object-contain"
                    />
                  ) : (
                    <div className="font-mono text-xs font-black text-slate-600">AU</div>
                  )}
                </Link>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/product/${item.product_slug ?? ''}`}
                    className="line-clamp-2 text-sm font-bold text-white transition hover:text-[#00F0FF]"
                  >
                    {item.product_name}
                  </Link>
                  <div className="mt-1 flex items-center gap-3 font-mono text-xs text-[#A5ACB5]">
                    <span>Цена: <strong className="text-white">{Number(item.unit_price).toFixed(2)} TJS</strong></span>
                    {item.stock_quantity !== null && (
                      <span className="text-emerald-400 font-semibold">● В наличии ({item.stock_quantity})</span>
                    )}
                  </div>
                </div>

                {/* Quantity Control */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#242A32]/60">
                  <div className="flex items-center rounded-xl border border-[#242A32] bg-[#0B0D10] p-1 font-mono">
                    <button
                      type="button"
                      className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-[#15191F] hover:text-white"
                      aria-label="Уменьшить"
                      onClick={() => void updateItem(item.id, item.quantity - 1)}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-white">{item.quantity}</span>
                    <button
                      type="button"
                      className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-[#15191F] hover:text-white disabled:opacity-30"
                      aria-label="Увеличить"
                      disabled={item.stock_quantity !== null && item.quantity >= item.stock_quantity}
                      onClick={() => void updateItem(item.id, item.quantity + 1)}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="w-24 text-right font-mono">
                    <div className="text-base font-black text-white">
                      {Number(item.line_total).toFixed(2)}
                    </div>
                    <span className="text-[10px] text-[#00F0FF] font-bold">TJS</span>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    aria-label="Удалить"
                    onClick={() => void removeItem(item.id)}
                    className="grid size-8 place-items-center rounded-lg border border-[#242A32] bg-[#0B0D10] text-slate-500 transition hover:border-[#E32636] hover:text-[#E32636]"
                    title="Удалить из корзины"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Order Executive Summary (4 cols) */}
          <aside className="lg:col-span-4 rounded-2xl border border-[#242A32] bg-gradient-to-b from-[#15191F] to-[#0B0D10] p-6 shadow-2xl space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[#00F0FF]">
                <Zap className="size-3.5" />
                <span>EXECUTIVE CHECKOUT SUMMARY</span>
              </div>
              <h2 className="text-xl font-black text-white mt-1">Сумма заказа</h2>
            </div>

            <div className="space-y-3 font-mono text-xs border-y border-[#242A32] py-4">
              <div className="flex items-center justify-between text-[#A5ACB5]">
                <span>Товары ({cart.count} шт.):</span>
                <span className="font-bold text-white">{Number(cart.subtotal).toFixed(2)} TJS</span>
              </div>
              <div className="flex items-center justify-between text-[#A5ACB5]">
                <span>Доставка по Душанбе:</span>
                <span className="font-bold text-emerald-400">
                  {toFreeDelivery === 0 ? 'Бесплатно' : 'По тарифам зоны'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#A5ACB5]">
                <span>НДС включён:</span>
                <span className="text-slate-400">0.00 TJS</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between font-mono">
              <span className="text-sm uppercase tracking-wider text-slate-300 font-bold">Итого к оплате:</span>
              <div className="text-right">
                <span className="text-3xl font-black text-white tracking-tight">
                  {Number(cart.subtotal).toFixed(2)}
                </span>
                <span className="text-xs font-bold text-[#E32636] ml-1.5">TJS</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#E32636] py-4 font-mono text-xs font-bold text-white shadow-[0_4px_20px_rgba(227,38,54,0.35)] transition-all hover:bg-[#D91F32] active:scale-[0.99]"
            >
              <span>ПЕРЕЙТИ К ОФОРМЛЕНИЮ</span>
              <ArrowRight className="size-4" />
            </button>

            {/* Quality Guarantees */}
            <div className="space-y-2 pt-2 border-t border-[#242A32]/60 font-mono text-[11px] text-[#A5ACB5]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
                <span>100% официальная гарантия производителя</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="size-4 text-[#00F0FF] shrink-0" />
                <span>Безусловный возврат детали в течение 14 дней</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#F59E0B] shrink-0" />
                <span>Кэшбэк бонусами на следующий заказ</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
