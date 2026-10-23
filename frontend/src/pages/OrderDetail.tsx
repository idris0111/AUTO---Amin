import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { api } from '../lib/api'
import type { Cart, Order } from '../types'
import { useAuth } from '../stores/auth'
import { useCart } from '../stores/cart'
import { StatusBadge } from './Orders'

export default function OrderDetail() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const { t } = useTranslation()
  const { user } = useAuth()
  const { fetchCart } = useCart()
  const [message, setMessage] = useState(params.get('created') ? t('orderSuccess') : '')

  const order = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<Order>(`/orders/${id}`),
    enabled: Boolean(user && id),
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.post<Order>(`/orders/${id}/cancel`),
    onSuccess: () => {
      setMessage('Заказ отменён, товары возвращены на склад.')
      void order.refetch()
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Не удалось отменить заказ'),
  })

  const reorderMutation = useMutation({
    mutationFn: () => api.post<Cart>(`/orders/${id}/reorder`),
    async onSuccess() {
      await fetchCart()
      setMessage('Товары добавлены в корзину.')
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Не удалось повторить заказ'),
  })

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="muted">{t('authRequired')} просмотр заказа.</p>
        <Link to="/login" className="mt-4 inline-block text-premium">{t('login')}</Link>
      </div>
    )
  }

  if (order.isLoading) return <div className="mx-auto max-w-4xl px-4 py-10 text-sm muted">{t('loading')}</div>

  if (order.isError || !order.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-xl font-black">{t('notFound')}</h1>
        <Link to="/orders" className="mt-3 inline-block text-premium">{t('myOrders')}</Link>
      </div>
    )
  }

  const data = order.data
  const cancellable = ['pending', 'awaiting_payment', 'confirmed', 'processing', 'packed'].includes(data.status)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{data.number}</h1>
          <div className="mt-1 text-sm muted">{new Date(data.created_at).toLocaleString('ru-RU')}</div>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {message && (
        <div className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-500">{message}</div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border p-5 lg:col-span-2" style={{ borderColor: 'var(--border)' }}>
          <h2 className="mb-3 font-bold">Товары</h2>
          <ul className="divide-y text-sm" style={{ borderColor: 'var(--border)' }}>
            {data.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-3">
                <div>
                  <div className="font-medium">{item.product_name}</div>
                  <div className="text-xs muted">{item.product_sku} · {item.quantity} шт.</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{Number(item.line_total).toFixed(2)} TJS</div>
                  <div className="text-xs muted">{Number(item.unit_price).toFixed(2)} TJS/шт.</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t pt-3 text-sm" style={{ borderColor: 'var(--border)' }}>
            <span className="muted">{t('shippingMethod')}</span>
            <span>{data.shipping_method === 'pickup' ? t('pickup') : t('courier')}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="muted">{t('paymentMethod')}</span>
            <span>{data.payment_method === 'cash_on_delivery' ? t('cashOnDelivery') : t('bankTransfer')}</span>
          </div>
          <div className="mt-4 flex justify-between border-t pt-3 text-lg font-black" style={{ borderColor: 'var(--border)' }}>
            <span>{t('total')}</span>
            <span>{Number(data.total).toFixed(2)} {data.currency}</span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => reorderMutation.mutate()}
              disabled={reorderMutation.isPending}
              className="rounded-md border px-4 py-2 text-sm font-semibold hover:border-premium hover:text-premium disabled:opacity-50"
              style={{ borderColor: 'var(--border)' }}
            >
              {t('reorder')}
            </button>
            {cancellable && (
              <button
                type="button"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="rounded-md border border-premium px-4 py-2 text-sm font-semibold text-premium hover:bg-premium/10 disabled:opacity-50"
              >
                {t('cancelOrder')}
              </button>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-xl border p-5 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <h2 className="mb-2 font-bold">Доставка</h2>
            <div>{data.contact_name}</div>
            <div className="muted">{data.contact_phone}</div>
            <div className="muted">{data.shipping_city}, {data.shipping_street}</div>
            {data.shipping_postal_code && <div className="muted">{data.shipping_postal_code}</div>}
            {data.customer_note && <div className="mt-2 muted">«{data.customer_note}»</div>}
          </div>

          <div className="rounded-xl border p-5 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <h2 className="mb-3 font-bold">{t('status')}</h2>
            <ol className="space-y-3">
              {[...data.status_history].reverse().map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-premium" aria-hidden />
                  <div>
                    <div className="font-medium">
                      {event.from_status ? `${event.from_status} → ` : ''}{event.to_status}
                    </div>
                    <div className="text-xs muted">{new Date(event.created_at).toLocaleString('ru-RU')}</div>
                    {event.note && <div className="text-xs muted">{event.note}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  )
}
