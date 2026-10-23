import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Star, CheckCircle2, XCircle, HelpCircle, GitCompare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ProductBrief } from '../../types'
import { useCart } from '../../stores/cart'
import { useAuth } from '../../stores/auth'
import { useFavorites } from '../../stores/favorites'
import { useComparison } from '../../stores/comparison'

export function FitmentBadge({ status }: { status: string | null }) {
  const { t } = useTranslation()
  if (!status) return null
  if (status === 'compatible')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-500">
        <CheckCircle2 className="size-3" /> {t('fitmentYes')}
      </span>
    )
  if (status === 'not_compatible')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-premium/15 px-2 py-0.5 text-[11px] font-semibold text-premium">
        <XCircle className="size-3" /> {t('fitmentNo')}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
      <HelpCircle className="size-3" /> {t('fitmentUnknownShort')}
    </span>
  )
}

export default function ProductCard({ product }: { product: ProductBrief }) {
  const { t } = useTranslation()
  const { addItem } = useCart()
  const { user } = useAuth()
  const { ids, toggle } = useFavorites()
  const comparisonIds = useComparison((state) => state.ids)
  const toggleCompare = useComparison((state) => state.toggle)
  const [added, setAdded] = useState(false)
  const favorite = ids.includes(product.id)
  const inCompare = comparisonIds.includes(product.id)
  const discount = product.old_price
    ? Math.round((1 - Number(product.price) / Number(product.old_price)) * 100)
    : 0

  async function handleAdd() {
    try {
      await addItem(product.id, 1)
      setAdded(true)
      setTimeout(() => setAdded(false), 1500)
    } catch {
      // error surfaced via cart store
    }
  }

  async function toggleFavorite() {
    if (!user) return
    try {
      await toggle(product.id)
    } catch {
      // keep silent, state unchanged
    }
  }

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:border-[#E32636]/50 hover:shadow-[0_16px_36px_-12px_rgba(0,0,0,0.8)]"
      style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
    >
      <Link to={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-black/20 border-b border-[var(--border)]">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-108"
          />
        ) : (
          <div className="grid size-full place-items-center text-4xl font-black text-silver/40">AU</div>
        )}
        {discount > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-premium px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white shadow-[0_0_12px_rgba(227,38,54,0.5)]">
            -{discount}%
          </span>
        )}
        <span className="absolute right-2.5 top-2.5">
          <FitmentBadge status={product.fitment} />
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-mono font-bold uppercase tracking-wider text-premium">
            {product.brand.name}
          </span>
          <span className="font-mono text-[10px] text-muted">
            {product.sku}
          </span>
        </div>

        <Link to={`/product/${product.slug}`} className="line-clamp-2 min-h-10 text-sm font-semibold text-white transition-colors group-hover:text-premium">
          {product.name}
        </Link>

        <div className="flex items-center gap-1.5 text-xs text-muted">
          <div className="flex items-center gap-1">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span className="font-medium text-white">{Number(product.rating_avg) > 0 ? Number(product.rating_avg).toFixed(1) : '5.0'}</span>
          </div>
          <span>({product.rating_count})</span>
          <span className={`ml-auto text-[11px] font-semibold ${product.stock_quantity > 0 ? 'text-emerald-400' : 'text-muted'}`}>
            {product.stock_quantity > 0 ? t('inStock') : t('notAvailable')}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2 border-t border-[var(--border)]">
          <div>
            <div className="text-lg font-black tracking-tight text-white">{Number(product.price).toFixed(2)} TJS</div>
            {product.old_price && (
              <div className="text-xs text-muted line-through">{Number(product.old_price).toFixed(2)} TJS</div>
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label={t('compare')}
              title={inCompare ? t('compareAdded') : t('compareAdd')}
              onClick={() => toggleCompare(product.id)}
              className={`rounded-lg border p-2 transition hover:border-premium hover:text-premium ${inCompare ? 'border-premium bg-premium/15 text-premium' : ''}`}
              style={{ borderColor: inCompare ? 'var(--color-premium)' : 'var(--border)' }}
            >
              <GitCompare className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={t('favorite')}
              aria-pressed={favorite}
              onClick={() => void toggleFavorite()}
              className={`rounded-lg border p-2 transition hover:border-premium hover:text-premium ${favorite ? 'border-premium text-premium' : ''}`}
              style={{ borderColor: favorite ? '#e32636' : 'var(--border)' }}
            >
              <Heart className={`size-3.5 ${favorite ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              aria-label={t('addToCart')}
              onClick={() => void handleAdd()}
              disabled={product.stock_quantity <= 0}
              className="rounded-lg bg-premium p-2 text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 shadow-[0_0_12px_rgba(227,38,54,0.3)]"
            >
              <ShoppingCart className="size-3.5" />
            </button>
          </div>
        </div>
        {added && (
          <div className="rounded-lg bg-emerald-500/15 py-1 text-center text-xs font-semibold text-emerald-400">
            {user ? t('added') : t('addedGuest')}
          </div>
        )}
      </div>
    </article>
  )
}
