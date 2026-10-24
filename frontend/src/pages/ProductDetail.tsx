import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  GitCompare,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import ProductCard, { FitmentBadge } from '../components/product/ProductCard'
import ProductMedia from '../components/product/ProductMedia'
import QuickOrderModal from '../components/common/QuickOrderModal'
import Reviews from '../components/product/Reviews'
import { api } from '../lib/api'
import type {
  FrequentlyBoughtTogetherResponse,
  ProductBrief,
  ProductDetail as ProductDetailType,
} from '../types'
import { useCart } from '../stores/cart'
import { useGarage } from '../stores/garage'
import { useAuth } from '../stores/auth'
import { useFavorites } from '../stores/favorites'
import { useComparison } from '../stores/comparison'
import { useRecentlyViewed } from '../stores/recentlyViewed'

export default function ProductDetail() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addItem } = useCart()
  const { vehicles, selectedVehicleId } = useGarage()
  const { ids: favoriteIds, toggle: toggleFavoriteStore } = useFavorites()
  const comparisonIds = useComparison((state) => state.ids)
  const toggleCompare = useComparison((state) => state.toggle)
  const addToRecentlyViewed = useRecentlyViewed((state) => state.add)
  const recentlyViewedItems = useRecentlyViewed((state) => state.items)

  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)
  const [bundleAdded, setBundleAdded] = useState(false)
  const [copiedSku, setCopiedSku] = useState(false)
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false)
  const [showStickyBar, setShowStickyBar] = useState(false)

  const buySectionRef = useRef<HTMLDivElement>(null)

  const vehicleId = params.get('vehicle_id') ?? selectedVehicleId ?? ''

  const product = useQuery({
    queryKey: ['product', slug, vehicleId],
    queryFn: () =>
      api.get<ProductDetailType>(`/catalog/products/${slug}`, { vehicle_id: vehicleId || undefined }),
    enabled: Boolean(slug),
  })

  const related = useQuery({
    queryKey: ['related', slug],
    queryFn: () => api.get<ProductBrief[]>(`/catalog/products/${slug}/related`),
    enabled: Boolean(slug),
  })

  const fbt = useQuery({
    queryKey: ['fbt', slug, vehicleId],
    queryFn: () =>
      api.get<FrequentlyBoughtTogetherResponse>(
        `/catalog/products/${slug}/frequently-bought-together`,
        { vehicle_id: vehicleId || undefined }
      ),
    enabled: Boolean(slug),
  })

  // Track sticky purchase bar visibility on scroll
  useEffect(() => {
    function handleScroll() {
      if (!buySectionRef.current) return
      const rect = buySectionRef.current.getBoundingClientRect()
      setShowStickyBar(rect.bottom < 80)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Track sticky purchase bar visibility on scroll
  useEffect(() => {
    function handleScroll() {
      if (!buySectionRef.current) return
      const rect = buySectionRef.current.getBoundingClientRect()
      // Show sticky bar when user scrolls past the main buy section
      setShowStickyBar(rect.bottom < 80)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  async function toggleFavorite() {
    if (!user || !product.data) return
    try {
      await toggleFavoriteStore(product.data.id)
    } catch {
      // ignore
    }
  }

  const addMutation = useMutation({
    mutationFn: () => addItem(product.data!.id, quantity),
    onSuccess: () => {
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    },
  })

  async function handleBuyBundle() {
    if (!product.data || !fbt.data) return
    try {
      await addItem(product.data.id, 1)
      for (const bItem of fbt.data.items) {
        await addItem(bItem.id, 1)
      }
      setBundleAdded(true)
      setTimeout(() => setBundleAdded(false), 2200)
    } catch {
      // ignore
    }
  }

  function handleCopySku(skuText: string) {
    if (!skuText) return
    navigator.clipboard.writeText(skuText)
    setCopiedSku(true)
    setTimeout(() => setCopiedSku(false), 1800)
  }

  useEffect(() => {
    if (!product.data) return
    document.title = `${product.data.name} — AUTO UNIVERSE PERFORMANCE`

    // Save to recently viewed
    addToRecentlyViewed({
      id: product.data.id,
      name: product.data.name,
      slug: product.data.slug,
      sku: product.data.sku,
      price: String(product.data.price),
      old_price: product.data.old_price ? String(product.data.old_price) : null,
      stock_quantity: product.data.stock_quantity,
      rating_avg: String(product.data.rating_avg),
      rating_count: product.data.rating_count,
      brand: product.data.brand,
      category: product.data.category,
      image_url: product.data.images[0]?.url || null,
      fitment: product.data.fitment,
    })

    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.data.name,
      sku: product.data.sku,
      brand: { '@type': 'Brand', name: product.data.brand.name },
      aggregateRating:
        Number(product.data.rating_count) > 0
          ? {
              '@type': 'AggregateRating',
              ratingValue: String(product.data.rating_avg),
              reviewCount: String(product.data.rating_count),
            }
          : undefined,
    })
    document.head.appendChild(ld)
    return () => {
      document.head.removeChild(ld)
      document.title = 'AUTO UNIVERSE — Engineered for Your Drive'
    }
  }, [product.data, addToRecentlyViewed])

  if (product.isLoading) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] text-ink py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-8">
          <div className="h-6 w-72 rounded bg-[var(--surface)]" />
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="aspect-square rounded-2xl bg-[var(--surface)] border border-[var(--border)]" />
            <div className="space-y-6">
              <div className="h-4 w-28 rounded bg-[#242A32]" />
              <div className="h-10 w-4/5 rounded bg-[var(--surface)]" />
              <div className="h-6 w-1/3 rounded bg-[#242A32]" />
              <div className="h-28 rounded-xl bg-[var(--surface)] border border-[var(--border)]" />
              <div className="h-14 rounded-xl bg-[var(--surface)]" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (product.isError || !product.data) {
    return (
      <div className="min-h-[70vh] bg-[var(--canvas)] grid place-items-center px-4 text-center">
        <div className="max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl">
          <div className="inline-flex size-14 items-center justify-center rounded-xl bg-premium/10 text-premium mb-4">
            <Wrench className="size-7" />
          </div>
          <h1 className="text-2xl font-black text-ink">{t('notFound')}</h1>
          <p className="mt-2 text-sm text-muted">
            Запрашиваемая запчасть не найдена или перемещена в архив каталога.
          </p>
          <Link
            to="/catalog"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-premium px-6 py-3 text-sm font-bold text-ink transition hover:bg-[#D91F32]"
          >
            {t('backHome')}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    )
  }

  const item = product.data
  const favorite = favoriteIds.includes(item.id)
  const inCompare = comparisonIds.includes(item.id)
  const images = item.images.length ? item.images : [{ id: 'none', url: '', alt: null, position: 0, is_primary: false }]
  const discount = item.old_price
    ? Math.round((1 - Number(item.price) / Number(item.old_price)) * 100)
    : 0

  const selectedVehicleObj = vehicles.find((v) => v.id === vehicleId)
  const otherRecentItems = recentlyViewedItems.filter((r) => r.id !== item.id)

  // Map to brief for QuickOrder modal
  const productBriefForOrder: ProductBrief = {
    id: item.id,
    name: item.name,
    slug: item.slug,
    sku: item.sku,
    price: String(item.price),
    old_price: item.old_price ? String(item.old_price) : null,
    stock_quantity: item.stock_quantity,
    rating_avg: String(item.rating_avg),
    rating_count: item.rating_count,
    brand: item.brand,
    category: item.category,
    image_url: images[0]?.url || null,
    fitment: item.fitment,
  }

  return (
    <div className="market-product-detail min-h-screen bg-[var(--canvas)] text-ink pb-24 selection:bg-premium selection:text-ink">
      {/* Background Architectural Grid Lines */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(227,38,54,0.06),rgba(255,255,255,0))] opacity-50" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        {/* Monospace Telemetry Breadcrumb */}
        <nav
          className="mb-8 flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted"
          aria-label="Breadcrumbs"
        >
          <Link to="/" className="transition hover:text-ink">Главная</Link>
          <ChevronRight className="size-3 text-[#242A32]" />
          <Link to="/catalog" className="transition hover:text-ink">{t('explore')}</Link>
          <ChevronRight className="size-3 text-[#242A32]" />
          <Link
            to={`/catalog?category_id=${item.category.id}`}
            className="text-ink hover:text-premium transition"
          >
            {item.category.name}
          </Link>
          <ChevronRight className="size-3 text-[#242A32]" />
          <span className="text-premium font-semibold truncate max-w-xs">{item.sku}</span>
        </nav>

        {/* Primary Showcase Grid (Apple / Porsche Luxury Layout) */}
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Oversized Studio Gallery (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="product-gallery-stage relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[var(--border)] p-6 flex items-center justify-center group">
              {/* Subtle ambient lighting */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_70%)]" />

              {/* Status Badges */}
              <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
                {discount > 0 && (
                  <span className="rounded bg-premium px-2.5 py-1 font-mono text-xs font-black uppercase tracking-wider text-ink shadow-lg">
                    -{discount}%
                  </span>
                )}
                {item.oem_numbers && item.oem_numbers.length > 0 && (
                  <span className="rounded bg-[#242A32]/90 backdrop-blur-md px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink border border-white/10">
                    OEM-номера
                  </span>
                )}
              </div>

              {/* Image Frame with hover zoom */}
              <ProductMedia src={images[activeImage]?.url} alt={images[activeImage]?.alt || item.name} categorySlug={item.category.slug} categoryName={item.category.name} priority />

              {/* Monospace Index Overlay */}
              <div className="absolute bottom-4 right-4 rounded-md border border-[var(--border)] bg-[var(--canvas)]/80 px-2.5 py-1 font-mono text-[11px] text-muted backdrop-blur-md">
                {String(activeImage + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {images.map((image, index) => {
                  const isActive = index === activeImage
                  return (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={`relative size-20 shrink-0 overflow-hidden rounded-xl border p-1 transition-all ${
                        isActive
                          ? 'border-[#E32636] bg-[var(--surface)] shadow-[0_0_12px_rgba(227,38,54,0.3)]'
                          : 'border-[var(--border)] bg-[var(--surface)]/40 hover:border-slate-500'
                      }`}
                      aria-label={`Фото ${index + 1}`}
                    >
                      <ProductMedia src={image.url} alt={`Фото ${index+1}`} categorySlug={item.category.slug} categoryName={item.category.name} />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Engineering Highlights Bar */}
            <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 p-3 text-center backdrop-blur-sm">
                <ShieldCheck className="mx-auto size-5 text-premium mb-1" />
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted">Гарантия</div>
                <div className="text-xs font-bold text-ink mt-0.5">
                  {item.warranty_months ? `${item.warranty_months} мес.` : 'Уточните условия'}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 p-3 text-center backdrop-blur-sm">
                <Truck className="mx-auto size-5 text-premium mb-1" />
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted">Доставка</div>
                <div className="text-xs font-bold text-ink mt-0.5">Расчёт при оформлении</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 p-3 text-center backdrop-blur-sm">
                <RotateCcw className="mx-auto size-5 text-premium mb-1" />
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted">Возврат</div>
                <div className="text-xs font-bold text-ink mt-0.5">Через поддержку</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 p-3 text-center backdrop-blur-sm">
                <Sparkles className="mx-auto size-5 text-premium mb-1" />
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted">Качество</div>
                <div className="text-xs font-bold text-ink mt-0.5">Характеристики ниже</div>
              </div>
            </div>
          </div>

          {/* Right Column: High-Precision Product Spec & Actions (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Monospace Brand Pill & Header */}
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest text-premium">
                  <span className="size-1.5 rounded-full bg-premium" />
                  {item.brand.name}
                </span>
                <span className="font-mono text-[11px] text-muted uppercase">
                  {item.category.name}
                </span>
              </div>

              <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-ink leading-tight">
                {item.name}
              </h1>

              {/* Monospace Technical HUD Strip */}
              <div className="mt-4 flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--border)]/60">
                {/* SKU badge with copy */}
                <button
                  type="button"
                  onClick={() => handleCopySku(item.sku)}
                  className="group inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-mono text-xs text-muted transition hover:border-[#E32636] hover:text-ink"
                  title="Скопировать артикул"
                >
                  <span className="text-[10px] text-slate-500">АРТ:</span>
                  <span className="font-bold text-ink">{item.sku}</span>
                  {copiedSku ? (
                    <Check className="size-3 text-emerald-400" />
                  ) : (
                    <Copy className="size-3 text-slate-500 group-hover:text-ink" />
                  )}
                </button>

                {/* Primary OEM */}
                {item.oem_numbers[0] && (
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-mono text-xs text-muted">
                    <span className="text-[10px] text-slate-500">OEM:</span>
                    <span className="font-bold text-ink">{item.oem_numbers[0].number}</span>
                  </div>
                )}

                {/* Star Rating */}
                {item.rating_count > 0 && <div className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-ink">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-mono font-bold">
                    {Number(item.rating_avg).toFixed(1)}
                  </span>
                  <span className="text-[11px] text-slate-500">({item.rating_count})</span>
                </div>}
              </div>
            </div>

            {/* Price Presentation (Apple / Monochromatic Titanium) */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    Розничная цена (TJS)
                  </div>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-ink font-mono">
                      {Number(item.price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-sm font-bold text-premium font-mono">TJS</span>

                    {item.old_price && (
                      <span className="text-sm line-through text-slate-500 font-mono">
                        {Number(item.old_price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} TJS
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock availability HUD badge */}
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span
                      className={`size-2 rounded-full ${
                        item.stock_quantity > 0 ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 'bg-premium'
                      }`}
                    />
                    <span
                      className={`font-mono text-xs font-bold uppercase tracking-wider ${
                        item.stock_quantity > 0 ? 'text-emerald-400' : 'text-premium'
                      }`}
                    >
                      {item.stock_quantity > 0 ? 'В НАЛИЧИИ' : 'ПОД ЗАКАЗ'}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 mt-1">
                    {item.stock_quantity > 0 ? `${item.stock_quantity} шт. на складе` : 'Уточните срок поступления'}
                  </div>
                </div>
              </div>

              {/* Dynamic Vehicle Fitment HUD Banner */}
              <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--canvas)]/80 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <FitmentBadge status={item.fitment} />
                    {selectedVehicleObj ? (
                      <div className="text-xs">
                        <span className="text-slate-400 font-medium">Выбрано авто: </span>
                        <span className="font-bold text-ink">
                          {selectedVehicleObj.name} ({selectedVehicleObj.make.name} {selectedVehicleObj.model?.name})
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-muted">
                        Выберите авто в гараже для автоматической проверки совместимости.
                      </div>
                    )}
                  </div>
                  <Link
                    to="/garage"
                    className="font-mono text-[11px] font-bold text-premium hover:underline shrink-0"
                  >
                    Гараж →
                  </Link>
                </div>
              </div>

              {/* Buy Actions Hub */}
              <div ref={buySectionRef} className="mt-6 space-y-3">
                <div className="flex items-center gap-3">
                  {/* Quantity selector */}
                  <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-1 font-mono">
                    <button
                      type="button"
                      className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-[var(--surface)] hover:text-ink disabled:opacity-30"
                      onClick={() => setQuantity((v) => Math.max(1, v - 1))}
                      disabled={quantity <= 1}
                      aria-label="Уменьшить количество"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-ink text-sm">{quantity}</span>
                    <button
                      type="button"
                      className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-[var(--surface)] hover:text-ink disabled:opacity-30"
                      onClick={() => setQuantity((v) => Math.min(item.stock_quantity || 99, v + 1))}
                      disabled={quantity >= item.stock_quantity}
                      aria-label="Увеличить количество"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  {/* Primary Add To Cart Button */}
                  <button
                    type="button"
                    disabled={item.stock_quantity <= 0 || addMutation.isPending}
                    onClick={() => addMutation.mutate()}
                    className="flex-1 flex items-center justify-center gap-2.5 rounded-xl bg-premium px-6 py-3.5 font-bold text-ink shadow-[0_4px_20px_rgba(227,38,54,0.35)] transition-all hover:bg-[#D91F32] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {added ? (
                      <>
                        <CheckCircle2 className="size-5" />
                        <span>ДОБАВЛЕНО В КОРЗИНУ</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="size-5" />
                        <span>ДОБАВИТЬ В КОРЗИНУ</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 1-Click Quick Order Button */}
                <button
                  type="button"
                  onClick={() => setIsQuickOrderOpen(true)}
                  disabled={item.stock_quantity <= 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#E32636]/60 bg-premium/10 px-6 py-3.5 font-bold text-premium transition-all hover:bg-premium/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Zap className="size-4 fill-current" />
                  <span>КУПИТЬ В 1 КЛИК (TELEGRAM / WHATSAPP / ЗВОНОК)</span>
                </button>

                {/* Secondary Actions: Compare & Favorite */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => toggleCompare(item.id)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition ${
                      inCompare
                        ? 'border-[#E32636] bg-premium/10 text-premium'
                        : 'border-[var(--border)] bg-[var(--canvas)]/50 text-muted hover:border-slate-500 hover:text-ink'
                    }`}
                  >
                    <GitCompare className="size-4" />
                    <span>{inCompare ? 'В сравнении' : 'Сравнить'}</span>
                  </button>

                  {user && (
                    <button
                      type="button"
                      onClick={() => void toggleFavorite()}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition ${
                        favorite
                          ? 'border-[#E32636] bg-premium/10 text-premium'
                          : 'border-[var(--border)] bg-[var(--canvas)]/50 text-muted hover:border-slate-500 hover:text-ink'
                      }`}
                    >
                      <Heart className={`size-4 ${favorite ? 'fill-[#E32636] text-premium' : ''}`} />
                      <span>{favorite ? 'В избранном' : 'В избранное'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Frequently Bought Together Bundle (AU Engineered Kits) */}
        {fbt.data && fbt.data.items.length > 0 && (
          <section className="mt-16 rounded-2xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-[var(--canvas)] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="pointer-events-none absolute right-0 top-0 size-72 bg-premium/5 blur-3xl rounded-full" />

            <div className="relative">
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-premium">
                <Sparkles className="size-4" />
                <span>AU PERFORMANCE BUNDLE</span>
              </div>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-ink">
                Рекомендуемый инженерный комплект для узла
              </h2>
              <p className="mt-1 text-sm text-muted">
                Замените сопутствующие компоненты одновременно, чтобы сохранить гарантию и ресурс узла.
              </p>

              <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-center">
                {/* Bundle Items Chain */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Main Product Card */}
                  <div className="w-40 rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-3 text-xs">
                    <div className="aspect-square w-full overflow-hidden rounded-lg bg-[var(--surface)] p-2 flex items-center justify-center">
                      {images[0]?.url ? (
                        <img src={images[0].url} alt="" className="size-full object-contain" />
                      ) : (
                        <div className="font-mono text-xs font-black text-muted">AU</div>
                      )}
                    </div>
                    <div className="mt-2 line-clamp-1 font-bold text-ink">{item.name}</div>
                    <div className="font-mono font-black text-premium mt-0.5">
                      {Number(item.price).toFixed(2)} TJS
                    </div>
                  </div>

                  <span className="font-mono text-2xl font-black text-premium">+</span>

                  {/* Complementary Products */}
                  {fbt.data.items.map((bItem, idx) => (
                    <div key={bItem.id} className="flex items-center gap-3">
                      <Link
                        to={`/product/${bItem.slug}`}
                        className="w-40 rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-3 text-xs transition hover:border-[#E32636] group"
                      >
                        <div className="aspect-square w-full overflow-hidden rounded-lg bg-[var(--surface)] p-2 flex items-center justify-center">
                          {bItem.image_url ? (
                            <img
                              src={bItem.image_url}
                              alt=""
                              className="size-full object-contain transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="font-mono text-xs font-black text-muted">AU</div>
                          )}
                        </div>
                        <div className="mt-2 line-clamp-1 font-bold text-ink group-hover:text-premium transition">
                          {bItem.name}
                        </div>
                        <div className="font-mono font-black text-ink mt-0.5">
                          {Number(bItem.price).toFixed(2)} TJS
                        </div>
                      </Link>

                      {idx < fbt.data!.items.length - 1 && (
                        <span className="font-mono text-2xl font-black text-[#242A32]">+</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total & Action Box */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-5 lg:ml-auto min-w-[240px]">
                  <div className="font-mono text-xs uppercase tracking-wider text-muted">
                    Итого за комплект:
                  </div>
                  <div className="mt-1 text-2xl font-black text-ink font-mono">
                    {Number(fbt.data.total_bundle_price).toFixed(2)} TJS
                  </div>
                  {Number(fbt.data.total_savings) > 0 && (
                    <div className="mt-1 font-mono text-xs font-bold text-emerald-400">
                      Экономия: {Number(fbt.data.total_savings).toFixed(2)} TJS
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleBuyBundle}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-premium px-4 py-3 font-mono text-xs font-bold text-ink transition hover:bg-[#D91F32]"
                  >
                    <ShoppingCart className="size-4" />
                    <span>{bundleAdded ? 'КОМПЛЕКТ В КОРЗИНЕ' : 'КУПИТЬ КОМПЛЕКТ'}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Technical Specifications & Description (Architectural Layout) */}
        <div className="mt-16 grid gap-10 lg:grid-cols-12">
          {/* Description & Overview (7 cols) */}
          <section className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-premium mb-3">
                // ИНЖЕНЕРНОЕ ОПИСАНИЕ
              </h2>
              <div className="text-sm leading-relaxed text-slate-300 space-y-3">
                {item.description ? (
                  <p className="whitespace-pre-line">{item.description}</p>
                ) : item.short_description ? (
                  <p>{item.short_description}</p>
                ) : (
                  <p className="text-slate-500 italic">Описание для данной детали формируется инженерами AU.</p>
                )}
              </div>
            </div>

            {/* Specifications Table */}
            {item.specifications.length > 0 && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
                <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-premium mb-4">
                  // ТЕХНИЧЕСКИЕ СПЕЦИФИКАЦИИ
                </h2>
                <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                  <table className="w-full text-left text-sm font-mono">
                    <tbody>
                      {item.specifications.map((spec, index) => (
                        <tr
                          key={spec.id}
                          className={`border-b border-[var(--border)]/60 last:border-b-0 ${
                            index % 2 === 0 ? 'bg-[var(--canvas)]/40' : 'bg-[var(--surface)]'
                          }`}
                        >
                          <td className="w-1/2 px-4 py-3 text-xs text-muted">{spec.name}</td>
                          <td className="px-4 py-3 text-xs font-bold text-ink">
                            {spec.value} {spec.unit ?? ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Cross References & Fitment Intelligence (5 cols) */}
          <section className="lg:col-span-5 space-y-6">
            {/* Cross references */}
            {item.cross_references.length > 0 && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
                <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-premium mb-3">
                  // КРОСС-НОМЕРА И АНАЛОГИ
                </h2>
                <div className="flex flex-wrap gap-2">
                  {item.cross_references.map((cross) => (
                    <span
                      key={cross.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-1.5 font-mono text-xs text-ink"
                    >
                      <span className="font-bold">{cross.number}</span>
                      {cross.brand_name && <span className="text-muted ml-1.5">· {cross.brand_name}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fitment Status Card */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-premium mb-3">
                // СОВМЕСТИМОСТЬ
              </h2>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4 text-sm">
                {item.fitment === 'compatible' && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-400">Совместимость по данным каталога</div>
                      <p className="mt-1 text-xs text-muted">
                        Для выбранной модификации есть запись о совместимости. Сверьте артикул перед заказом.
                      </p>
                    </div>
                  </div>
                )}
                {item.fitment === 'not_compatible' && (
                  <div className="flex items-start gap-3">
                    <span className="size-2 rounded-full bg-premium shrink-0 mt-2" />
                    <div>
                      <div className="font-bold text-premium">Не подходит к текущему авто</div>
                      <p className="mt-1 text-xs text-muted">
                        Для вашего автомобиля требуются другие артикулы. Воспользуйтесь подбором в гараже.
                      </p>
                    </div>
                  </div>
                )}
                {!item.fitment && (
                  <div className="text-xs text-muted">
                    Для проверки совместимости с вашим автомобилем укажите марку, модель и год выпуска в{' '}
                    <Link to="/garage" className="text-premium underline">
                      Моём гараже
                    </Link>{' '}
                    или проконсультируйтесь с нашим AI Механиком.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Customer Reviews Section */}
        <div className="mt-16">
          <Reviews productId={item.id} />
        </div>

        {/* Related Products Grid */}
        {(related.data?.length ?? 0) > 0 && (
          <section className="mt-20">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-premium">
                  AU PERFORMANCE
                </span>
                <h2 className="text-2xl font-black text-ink mt-1">Сопутствующие компоненты</h2>
              </div>
              <Link
                to="/catalog"
                className="flex items-center gap-1.5 font-mono text-xs font-bold text-premium hover:underline"
              >
                <span>ВЕСЬ КАТАЛОГ</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {related.data!.map((relatedItem) => (
                <ProductCard key={relatedItem.id} product={relatedItem} />
              ))}
            </div>
          </section>
        )}

        {/* Recently Viewed Products */}
        {otherRecentItems.length > 0 && (
          <section className="mt-20 border-t border-[var(--border)] pt-12">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
                  ИСТОРИЯ ПРОСМОТРА
                </span>
                <h2 className="text-2xl font-black text-ink mt-1">{t('recentlyViewed')}</h2>
              </div>
              <Link
                to="/catalog"
                className="flex items-center gap-1.5 font-mono text-xs font-bold text-premium hover:underline"
              >
                <span>{t('explore')}</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {otherRecentItems.slice(0, 4).map((rItem) => (
                <ProductCard key={rItem.id} product={rItem} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky Bottom Purchase Bar (Apple / Bang & Olufsen luxury floating HUD) */}
      {showStickyBar && (
        <aside
          aria-label="Панель покупки"
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--canvas)]/95 backdrop-blur-xl px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] transition-all animate-fade-in"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            {/* Left: Product Thumbnail & Title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
                <ProductMedia src={images[0]?.url} alt={item.name} categorySlug={item.category.slug} categoryName={item.category.name} />
              </div>
              <div className="min-w-0">
                <div className="truncate font-bold text-ink text-sm">{item.name}</div>
                <div className="flex items-center gap-2 font-mono text-xs text-muted">
                  <span>{item.brand.name}</span>
                  <span>·</span>
                  <span className="text-premium">{item.sku}</span>
                </div>
              </div>
            </div>

            {/* Right: Price & Quick Action Buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:block text-right">
                <div className="font-mono text-xs text-muted">Цена:</div>
                <div className="font-mono text-lg font-black text-ink">
                  {Number(item.price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} TJS
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQuickOrderOpen(true)}
                disabled={item.stock_quantity <= 0}
                className="hidden md:flex items-center gap-1.5 rounded-xl border border-[#E32636] bg-premium/15 px-4 py-2.5 font-mono text-xs font-bold text-premium transition hover:bg-premium/25"
              >
                <Zap className="size-3.5 fill-current" />
                <span>1 КЛИК</span>
              </button>

              <button
                type="button"
                disabled={item.stock_quantity <= 0 || addMutation.isPending}
                onClick={() => addMutation.mutate()}
                className="flex items-center gap-2 rounded-xl bg-premium px-5 py-2.5 font-mono text-xs font-bold text-ink shadow-lg transition hover:bg-[#D91F32]"
              >
                {added ? <CheckCircle2 className="size-4" /> : <ShoppingCart className="size-4" />}
                <span>{added ? 'В КОРЗИНЕ' : 'В КОРЗИНУ'}</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 1-Click Quick Order Modal */}
      <QuickOrderModal
        product={productBriefForOrder}
        isOpen={isQuickOrderOpen}
        onClose={() => setIsQuickOrderOpen(false)}
      />
    </div>
  )
}
