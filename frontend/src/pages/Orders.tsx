import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PackageOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api } from '../lib/api'
import type { PaginatedOrders, OrderListItem } from '../types'
import { useAuth } from '../stores/auth'

export function StatusBadge({ status }: { status: string }) {
  const label: Record<string, string> = {
    pending: 'Ожидает',
    awaiting_payment: 'Ожидает оплаты',
    confirmed: 'Подтверждён',
    processing: 'В обработке',
    packed: 'Упакован',
    shipped: 'Отправлен',
    delivered: 'Доставлен',
    completed: 'Завершён',
    cancelled: 'Отменён',
    returned: 'Возврат',
  }
  const tone =
    status === 'cancelled'
      ? 'bg-premium/15 text-premium'
      : status === 'completed' || status === 'delivered'
        ? 'bg-emerald-500/15 text-emerald-500'
        : 'bg-amber-500/15 text-amber-500'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label[status] ?? status}</span>
}

export default function Orders() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const orders = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<PaginatedOrders>('/orders'),
    enabled: Boolean(user),
  })

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-black">{t('myOrders')}</h1>
        <p className="mt-3 muted">{t('authRequired')} историю заказов.</p>
        <Link to="/login" className="mt-6 inline-block rounded-lg bg-premium px-6 py-3 font-semibold text-white">{t('login')}</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-black">{t('myOrders')}</h1>

      {orders.isLoading && <div className="mt-6 text-sm muted">{t('loading')}</div>}

      {orders.data?.items.length === 0 && (
        <div className="mt-8 rounded-xl border p-10 text-center" style={{ borderColor: 'var(--border)' }}>
          <PackageOpen className="mx-auto size-10 muted" />
          <p className="mt-3 font-semibold">Заказов пока нет</p>
          <Link to="/catalog" className="mt-3 inline-block text-premium">{t('continueShopping')}</Link>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {(orders.data?.items ?? []).map((order: OrderListItem) => (
          <li key={order.id}>
            <Link
              to={`/orders/${order.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition hover:border-premium"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
            >
              <div>
                <div className="font-bold">{order.number}</div>
                <div className="mt-1 text-xs muted">
                  {new Date(order.created_at).toLocaleDateString('ru-RU')} · {order.items_count} поз.
                </div>
              </div>
              <StatusBadge status={order.status} />
              <div className="text-lg font-black">{Number(order.total).toFixed(2)} {order.currency}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
