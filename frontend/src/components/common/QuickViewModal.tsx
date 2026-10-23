import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GitCompare, Heart, ShoppingCart, Star, X, Zap } from 'lucide-react'
import type { ProductBrief } from '../../types'
import { useCart } from '../../stores/cart'
import { useFavorites } from '../../stores/favorites'
import { useComparison } from '../../stores/comparison'
import { useAuth } from '../../stores/auth'
import { FitmentBadge } from '../product/ProductCard'

interface QuickViewModalProps {
  product: ProductBrief | null
  isOpen: boolean
  onClose: () => void
  onOpenQuickOrder: (product: ProductBrief) => void
}

export default function QuickViewModal({
  product,
  isOpen,
  onClose,
  onOpenQuickOrder,
}: QuickViewModalProps) {
  const { addItem } = useCart()
  const { user } = useAuth()
  const { ids, toggle: toggleFav } = useFavorites()
  const comparisonIds = useComparison((state) => state.ids)
  const toggleCompare = useComparison((state) => state.toggle)

  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  if (!isOpen || !product) return null

  const isFavorite = ids.includes(product.id)
  const isCompared = comparisonIds.includes(product.id)

  async function handleAddToCart() {
    if (!product) return
    try {
      await addItem(product.id, quantity)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch {
      // error surfaced via store
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-[#242A32] bg-[#15191F] p-6 sm:p-8 text-white shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #15191F 0%, #0B0D10 100%)' }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg border border-[#242A32] p-1.5 text-[#A5ACB5] hover:text-white hover:border-premium transition"
        >
          <X className="size-4" />
        </button>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: Image Container */}
          <div className="relative aspect-square overflow-hidden rounded-xl border border-[#242A32] bg-[#0B0D10]">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="size-full object-cover transition-transform duration-500 hover:scale-105"
              />
            ) : (
              <div className="grid size-full place-items-center font-black text-4xl text-silver/40">AU</div>
            )}
            {product.old_price && (
              <span className="absolute top-3 left-3 rounded-full bg-premium px-2.5 py-0.5 font-mono text-[10px] font-bold text-white shadow">
                SALE
              </span>
            )}
            <div className="absolute top-3 right-3">
              <FitmentBadge status={product.fitment} />
            </div>
          </div>

          {/* Right: Technical Specs & Purchasing */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-premium">
                {product.brand.name}
              </span>
              <span className="text-[#A5ACB5] font-mono text-xs">·</span>
              <span className="font-mono text-xs text-[#A5ACB5]">SKU: {product.sku}</span>
            </div>

            <h2 className="mt-2 text-xl font-bold uppercase tracking-tight text-white leading-tight">
              {product.name}
            </h2>

            <div className="mt-3 flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="size-3.5 fill-current" />
                <span className="font-bold text-white">{Number(product.rating_avg) > 0 ? Number(product.rating_avg).toFixed(1) : '5.0'}</span>
              </div>
              <span className="text-[#A5ACB5]">({product.rating_count} отзывов)</span>
              <span className="text-[#242A32]">•</span>
              <span className={`font-semibold ${product.stock_quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {product.stock_quantity > 0 ? `В наличии (${product.stock_quantity} шт.)` : 'Под заказ'}
              </span>
            </div>

            {/* Price block */}
            <div className="mt-4 rounded-xl border border-[#242A32] bg-[#0B0D10] p-4">
              <div className="text-2xl font-black text-white tracking-tight">
                {Number(product.price).toFixed(2)} TJS
              </div>
              {product.old_price && (
                <div className="text-xs text-[#A5ACB5] line-through mt-0.5">
                  {Number(product.old_price).toFixed(2)} TJS
                </div>
              )}
              <span className="mt-1 block text-[10px] font-mono uppercase text-emerald-400">
                + Начисляется до {Math.round(Number(product.price) * 0.05)} баллов AU Club
              </span>
            </div>

            {/* Quantity Selector */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs font-mono uppercase text-[#A5ACB5]">Количество:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="size-8 rounded-lg border border-[#242A32] bg-[#0B0D10] text-sm font-bold text-white hover:border-premium"
                >
                  -
                </button>
                <span className="font-mono font-bold text-sm text-white w-8 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                  className="size-8 rounded-lg border border-[#242A32] bg-[#0B0D10] text-sm font-bold text-white hover:border-premium"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col gap-2.5">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity <= 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-premium px-5 py-3 text-sm font-bold text-white hover:brightness-110 transition shadow-[0_0_15px_rgba(227,38,54,0.3)] disabled:opacity-40"
                >
                  <ShoppingCart className="size-4" />
                  <span>{added ? 'Добавлено в корзину!' : 'В корзину'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenQuickOrder(product)
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#242A32] bg-[#15191F] px-4 py-3 text-xs font-bold text-white hover:border-premium hover:text-premium transition"
                >
                  <Zap className="size-3.5 text-premium" />
                  <span>В 1 клик</span>
                </button>

                <button
                  type="button"
                  onClick={() => user && toggleFav(product.id)}
                  className={`rounded-xl border p-3 transition ${
                    isFavorite ? 'border-premium text-premium' : 'border-[#242A32] text-[#A5ACB5] hover:text-white'
                  }`}
                  title="В избранное"
                >
                  <Heart className={`size-4 ${isFavorite ? 'fill-current' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => toggleCompare(product.id)}
                  className={`rounded-xl border p-3 transition ${
                    isCompared ? 'border-premium text-premium' : 'border-[#242A32] text-[#A5ACB5] hover:text-white'
                  }`}
                  title="Сравнить"
                >
                  <GitCompare className="size-4" />
                </button>
              </div>

              <Link
                to={`/product/${product.slug}`}
                onClick={onClose}
                className="text-center text-xs text-[#A5ACB5] hover:text-white underline pt-1"
              >
                Подробные характеристики и совместимость на отдельной странице →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
