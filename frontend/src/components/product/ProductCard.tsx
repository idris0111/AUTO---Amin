import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, ShoppingCart, Star, CheckCircle2, XCircle, HelpCircle, GitCompare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ProductBrief } from '../../types'
import { useCart } from '../../stores/cart'
import { useAuth } from '../../stores/auth'
import { useFavorites } from '../../stores/favorites'
import { useComparison } from '../../stores/comparison'
import ProductMedia from './ProductMedia'

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
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { addItem } = useCart()
  const { user } = useAuth()
  const { ids, toggle } = useFavorites()
  const comparisonIds = useComparison((state) => state.ids)
  const toggleCompare = useComparison((state) => state.toggle)
  const [added, setAdded] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const favorite = ids.includes(product.id)
  const inCompare = comparisonIds.includes(product.id)
  const discount = product.old_price
    ? Math.round((1 - Number(product.price) / Number(product.old_price)) * 100)
    : 0

  async function handleAdd() {
    setPending(true)
    setError('')
    try {
      await addItem(product.id, 1)
      setAdded(true)
      setTimeout(() => setAdded(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить товар')
    } finally { setPending(false) }
  }

  async function toggleFavorite() {
    if (!user) { navigate('/login'); return }
    try {
      await toggle(product.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить избранное')
    }
  }

  return (
    <article
      className="commerce-product-card group"
    >
      <div className="product-media">
      <Link to={`/product/${product.slug}`} className="product-photo" aria-label={product.name}>
        <ProductMedia src={product.image_url} alt={product.name} categorySlug={product.category.slug} categoryName={product.category.name} />
        {discount > 0 && (
          <span className="product-discount">
            −{discount}%
          </span>
        )}
      </Link>
        <button type="button" className={`product-favorite ${favorite ? 'is-favorite' : ''}`} aria-label={t('favorite')} aria-pressed={favorite} onClick={() => void toggleFavorite()}><Heart size={20} strokeWidth={1.6} className={favorite ? 'fill-current' : ''} /></button>
      </div>

      <div className="product-card-content">
        <div className="product-price-row">
          <strong className="product-price">{Number(product.price).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} <small>TJS</small></strong>
          {discount > 0 && <span className="product-old-price">{Number(product.old_price).toLocaleString('ru-RU')} TJS</span>}
        </div>
        <div className="product-card-brand"><span>{product.brand.name}</span><span className="product-brand-dot" /> <span>{product.category.name}</span></div>
        <Link to={`/product/${product.slug}`} className="product-name">
          {product.name}
        </Link>
        <div className="product-rating-row">
          {product.rating_count > 0 ? <span className="product-rating"><Star size={13} className="fill-current" /> <b>{Number(product.rating_avg).toFixed(1)}</b> <small>· {product.rating_count}</small></span> : <span className="product-no-rating">Нет отзывов</span>}
          <span className={`product-availability ${product.stock_quantity > 0 ? 'is-available' : ''}`}>{product.stock_quantity > 0 && <i />}{product.stock_quantity > 0 ? t('inStock') : t('notAvailable')}</span>
        </div>
        <div className="product-sku-row"><span title={product.sku}>{product.sku}</span><button type="button" aria-label={t('compare')} aria-pressed={inCompare} title={inCompare ? t('compareAdded') : t('compareAdd')} className={inCompare ? 'is-compared' : ''} onClick={() => toggleCompare(product.id)}><GitCompare size={16} /></button></div>
        {product.fitment && <div className="product-fitment"><FitmentBadge status={product.fitment} /></div>}
        <button type="button" className={`product-add ${added ? 'is-added' : ''}`} aria-label={t('addToCart')} onClick={() => void handleAdd()} disabled={product.stock_quantity <= 0 || pending}>{added ? <CheckCircle2 size={17} /> : <ShoppingCart size={17} />}<span>{pending ? t('loading') : added ? t('added') : t('addToCart')}</span></button>
        {error && <p role="alert" className="inline-error">{error}</p>}
        {added && (
          <div role="status" className="sr-only">
            {user ? t('added') : t('addedGuest')}
          </div>
        )}
      </div>
    </article>
  )
}
