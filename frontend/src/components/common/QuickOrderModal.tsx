import { useState } from 'react'
import { CheckCircle2, MessageCircle, Phone, Send, ShoppingBag, X } from 'lucide-react'
import { api } from '../../lib/api'
import type { ProductBrief, QuickOrderRequest, QuickOrderResponse } from '../../types'
import { useAuth } from '../../stores/auth'
import { useDialogFocus } from '../../lib/useDialogFocus'

interface QuickOrderModalProps {
  product: ProductBrief | null
  isOpen: boolean
  onClose: () => void
}

export default function QuickOrderModal({ product, isOpen, onClose }: QuickOrderModalProps) {
  const user = useAuth((state) => state.user)

  const [quantity, setQuantity] = useState(1)
  const [name, setName] = useState(user ? `${user.first_name} ${user.last_name || ''}`.trim() : '')
  const [phone, setPhone] = useState(user?.phone || '+992 ')
  const [contactMethod, setContactMethod] = useState<'phone' | 'whatsapp' | 'telegram'>('whatsapp')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderResult, setOrderResult] = useState<QuickOrderResponse | null>(null)
  const dialog = useDialogFocus(isOpen, () => { setOrderResult(null); setError(null); onClose() })

  if (!isOpen || !product) return null

  const unitPrice = Number(product.price)
  const totalPrice = unitPrice * quantity

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!product) return

    setLoading(true)
    setError(null)

    try {
      const payload: QuickOrderRequest = {
        product_id: product.id,
        quantity,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        contact_method: contactMethod,
        comment: comment.trim() || undefined,
      }

      const res = await api.post<QuickOrderResponse>('/orders/quick-order', payload)
      setOrderResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось оформить заказ. Попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setOrderResult(null)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        ref={dialog} role="dialog" aria-modal="true" aria-label="Быстрый заказ" tabIndex={-1}
        className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 text-ink shadow-2xl overflow-hidden"
        style={{ background: 'var(--surface)', maxHeight:'90dvh', overflowY:'auto' }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Закрыть быстрый заказ"
          className="absolute right-4 top-4 rounded-lg border border-[var(--border)] p-1.5 text-muted hover:text-ink hover:border-premium transition"
        >
          <X className="size-4" />
        </button>

        {orderResult ? (
          /* Success Screen */
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>

            <span className="racing-badge">Заказ принят</span>
            <h3 className="text-2xl font-black uppercase tracking-tight text-ink">
              Спасибо за заказ!
            </h3>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4 text-xs font-mono space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-muted">Номер заказа:</span>
                <span className="font-bold text-premium">{orderResult.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Итоговая сумма:</span>
                <span className="font-bold text-ink">{Number(orderResult.total).toFixed(2)} TJS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Способ связи:</span>
                <span className="font-bold text-ink uppercase">{contactMethod}</span>
              </div>
            </div>

            <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
              {orderResult.message}
            </p>

            <button
              type="button"
              onClick={handleClose}
              className="mt-4 rounded-xl bg-premium px-8 py-3 text-sm font-bold text-ink hover:brightness-110 transition"
            >
              Вернуться к покупкам
            </button>
          </div>
        ) : (
          /* Form Screen */
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="racing-badge">Быстрый заказ</span>
              <span className="font-mono text-[10px] text-muted uppercase">Без регистрации</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink">
              Купить в 1 клик
            </h3>
            <p className="text-xs text-muted mt-1">
              Оставьте контактные данные — менеджер свяжется с вами для подтверждения адреса доставки в Душанбе.
            </p>

            {/* Product summary card */}
            <div className="mt-5 flex items-center gap-3.5 rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-3">
              <div className="size-14 rounded-lg bg-[var(--surface)] border border-[var(--border)] overflow-hidden shrink-0">
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center font-bold text-xs text-silver">AU</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-mono text-[10px] uppercase text-premium font-bold">
                  {product.brand.name} · {product.sku}
                </span>
                <h4 className="truncate text-sm font-semibold text-ink">{product.name}</h4>
                <div className="text-xs font-mono font-bold text-ink mt-0.5">
                  {unitPrice.toFixed(2)} TJS
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Quantity */}
              <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                <span className="text-xs font-mono uppercase text-muted">Количество:</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="size-7 rounded border border-[var(--border)] bg-[var(--canvas)] text-sm font-bold text-ink hover:border-premium"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-sm text-ink w-6 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                    className="size-7 rounded border border-[var(--border)] bg-[var(--canvas)] text-sm font-bold text-ink hover:border-premium"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">
                  Ваше имя:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Алишер"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm text-ink outline-none focus:border-premium transition"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">
                  Номер телефона:
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+992 90 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm text-ink font-mono outline-none focus:border-premium transition"
                />
              </div>

              {/* Contact Method Tabs */}
              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1.5">
                  Удобный способ связи:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setContactMethod('whatsapp')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold transition ${
                      contactMethod === 'whatsapp'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                        : 'border-[var(--border)] text-muted hover:text-ink'
                    }`}
                  >
                    <MessageCircle className="size-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContactMethod('telegram')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold transition ${
                      contactMethod === 'telegram'
                        ? 'border-sky-500 bg-sky-500/15 text-sky-400'
                        : 'border-[var(--border)] text-muted hover:text-ink'
                    }`}
                  >
                    <Send className="size-3.5" />
                    <span>Telegram</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContactMethod('phone')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold transition ${
                      contactMethod === 'phone'
                        ? 'border-premium bg-premium/15 text-premium'
                        : 'border-[var(--border)] text-muted hover:text-ink'
                    }`}
                  >
                    <Phone className="size-3.5" />
                    <span>Звонок</span>
                  </button>
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">
                  Комментарий (необязательно):
                </label>
                <input
                  type="text"
                  placeholder="Район доставки, ориентир или вопрос"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3.5 py-2 text-xs text-ink outline-none focus:border-premium transition"
                />
              </div>

              {/* Total & Submit */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-mono uppercase text-muted">Итого к оплате:</span>
                  <span className="text-xl font-black text-ink">{totalPrice.toFixed(2)} TJS</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-premium px-6 py-3 font-bold text-ink transition hover:brightness-110 disabled:opacity-50 shadow-[0_0_20px_rgba(227,38,54,0.35)]"
                >
                  <ShoppingBag className="size-4" />
                  <span>{loading ? 'Оформление...' : 'Заказать в 1 клик'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

