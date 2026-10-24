import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import ProductCard from '../components/product/ProductCard'
import { api } from '../lib/api'
import type { ProductBrief } from '../types'
import { useAuth } from '../stores/auth'

export default function Favorites() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const favorites = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get<ProductBrief[]>('/favorites'),
    enabled: Boolean(user),
  })

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Heart className="mx-auto size-12 muted" />
        <h1 className="mt-4 text-2xl font-black">Избранное</h1>
        <p className="mt-3 muted">{t('authRequired')} избранное.</p>
        <Link to="/login" className="mt-6 inline-block rounded-lg bg-premium px-6 py-3 font-semibold text-ink">{t('login')}</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-black">Избранное</h1>
      {favorites.isLoading && <div className="mt-6 text-sm muted">{t('loading')}</div>}
      {favorites.data?.length === 0 && (
        <div className="mt-8 rounded-xl border p-10 text-center" style={{ borderColor: 'var(--border)' }}>
          <Heart className="mx-auto size-10 muted" />
          <p className="mt-3 font-semibold">Список пуст</p>
          <Link to="/catalog" className="mt-3 inline-block text-premium">{t('continueShopping')}</Link>
        </div>
      )}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {(favorites.data ?? []).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
