import { useQuery } from '@tanstack/react-query'
import {
  Eye,
  Filter,
  LayoutGrid,
  List,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import ProductCard, { FitmentBadge } from '../components/product/ProductCard'
import QuickOrderModal from '../components/common/QuickOrderModal'
import QuickViewModal from '../components/common/QuickViewModal'
import { api } from '../lib/api'
import type { Brand, Category, PaginatedProducts, ProductBrief } from '../types'
import { useGarage } from '../stores/garage'
import { useCart } from '../stores/cart'
import { useDialogFocus } from '../lib/useDialogFocus'

const SORTS = [
  { value: 'newest', label: 'Новинки' },
  { value: 'popular', label: 'По популярности' },
  { value: 'price_asc', label: 'Сначала дешевле' },
  { value: 'price_desc', label: 'Сначала дороже' },
  { value: 'rating', label: 'Высокий рейтинг' },
  { value: 'discount', label: 'Большие скидки' },
]

export default function Catalog() {
  const [params, setParams] = useSearchParams()
  const { vehicles, selectedVehicleId } = useGarage()
  const { addItem } = useCart()

  const [mobileFilters, setMobileFilters] = useState(false)
  const filterDialog = useDialogFocus(mobileFilters, () => setMobileFilters(false))
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [quickViewProduct, setQuickViewProduct] = useState<ProductBrief | null>(null)
  const [quickOrderProduct, setQuickOrderProduct] = useState<ProductBrief | null>(null)

  const [priceMin, setPriceMin] = useState(params.get('price_min') ?? '')
  const [priceMax, setPriceMax] = useState(params.get('price_max') ?? '')
  const [priceError, setPriceError] = useState('')

  const q = params.get('q') ?? ''
  const categoryId = params.get('category_id')
  const brandIds = params.getAll('brand_id')
  const sort = params.get('sort') ?? 'newest'
  const rawOffset = Number(params.get('offset') ?? 0)
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0
  const inStock = params.get('in_stock')
  const hasDiscount = params.get('has_discount')
  const vehicleId = params.get('vehicle_id') ?? selectedVehicleId ?? ''

  useEffect(() => {
    setPriceMin(params.get('price_min') ?? '')
    setPriceMax(params.get('price_max') ?? '')
  }, [params])

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/catalog/categories'),
  })

  const brands = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get<Brand[]>('/catalog/brands'),
  })

  const products = useQuery({
    queryKey: ['products', q, categoryId, brandIds, sort, offset, inStock, hasDiscount, params.get('price_min'), params.get('price_max'), vehicleId],
    queryFn: () =>
      api.get<PaginatedProducts>('/catalog/products', {
        q,
        category_id: categoryId ?? undefined,
        brand_id: brandIds,
        sort,
        offset,
        limit: 12,
        in_stock: inStock ?? undefined,
        has_discount: hasDiscount ?? undefined,
        price_min: params.get('price_min') || undefined,
        price_max: params.get('price_max') || undefined,
        vehicle_id: vehicleId || undefined,
      }),
  })

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('offset')
    setParams(next)
  }

  function toggleBrand(id: string) {
    const next = new URLSearchParams(params)
    const existing = next.getAll('brand_id')
    next.delete('brand_id')
    const updated = existing.includes(id) ? existing.filter((item) => item !== id) : [...existing, id]
    updated.forEach((item) => next.append('brand_id', item))
    next.delete('offset')
    setParams(next)
  }

  function resetAllFilters() {
    setPriceMin('')
    setPriceMax('')
    setParams(selectedVehicleId ? new URLSearchParams({ vehicle_id: '' }) : new URLSearchParams())
  }

  const total = products.data?.total ?? 0
  const hasFilters = Boolean(q || categoryId || brandIds.length || inStock || hasDiscount || priceMin || priceMax || vehicleId)

  const selectedCategoryName = categories.data?.flatMap(c => [c, ...c.children]).find(c => c.id === categoryId)?.name

  const filtersContent = (
    <div className="space-y-6 text-ink text-xs">
      {/* Search within catalog */}
      <div>
        <label className="block font-mono uppercase tracking-wider text-muted mb-2 font-bold">
          Поиск по названию / SKU
        </label>
        <div className="relative">
          <input
            defaultValue={q}
            key={q}
            placeholder="Артикул или название..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') setParam('q', (e.target as HTMLInputElement).value.trim())
            }}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3.5 py-2.5 text-xs text-ink outline-none focus:border-premium transition"
          />
          <Search className="absolute right-3 top-3 size-3.5 text-muted" />
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="block font-mono uppercase tracking-wider text-muted mb-2 font-bold">
          Категория узла
        </label>
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => setParam('category_id', null)}
            className={`block w-full rounded-lg px-2.5 py-1.5 text-left transition ${
              !categoryId ? 'bg-premium text-ink font-bold' : 'text-muted hover:text-ink hover:bg-white/5'
            }`}
          >
            Все категории
          </button>
          {(categories.data ?? []).map((cat) => (
            <div key={cat.id}>
              <button
                type="button"
                onClick={() => setParam('category_id', cat.id)}
                className={`block w-full rounded-lg px-2.5 py-1.5 text-left transition ${
                  categoryId === cat.id ? 'bg-premium text-ink font-bold' : 'text-muted hover:text-ink hover:bg-white/5'
                }`}
              >
                {cat.name}
              </button>
              {cat.children &&
                cat.children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setParam('category_id', child.id)}
                    className={`block w-full rounded-lg py-1 pl-6 pr-2 text-left text-[11px] transition ${
                      categoryId === child.id ? 'bg-premium/20 text-premium font-bold' : 'text-muted/80 hover:text-ink'
                    }`}
                  >
                    ↳ {child.name}
                  </button>
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* Brands */}
      <div>
        <label className="block font-mono uppercase tracking-wider text-muted mb-2 font-bold">
          Бренды производителей
        </label>
        <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {(brands.data ?? []).map((b) => (
            <label
              key={b.id}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={brandIds.includes(b.id)}
                  onChange={() => toggleBrand(b.id)}
                  className="size-3.5 accent-[#e32636] rounded"
                />
                <span className="text-ink">{b.name}</span>
              </div>
              {b.country && <span className="font-mono text-[9px] text-muted">{b.country}</span>}
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="block font-mono uppercase tracking-wider text-muted mb-2 font-bold">
          Диапазон цены, TJS
        </label>
        <div className="flex gap-2">
          <input
            value={priceMin}
            type="number" min="0" step="0.01" aria-label="Цена от, TJS"
            onChange={(e) => setPriceMin(e.target.value)}
            placeholder="От"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-xs text-ink outline-none focus:border-premium transition"
          />
          <input
            value={priceMax}
            type="number" min="0" step="0.01" aria-label="Цена до, TJS"
            onChange={(e) => setPriceMax(e.target.value)}
            placeholder="До"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-xs text-ink outline-none focus:border-premium transition"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if ((priceMin && Number(priceMin) < 0) || (priceMax && Number(priceMax) < 0) || (priceMin && priceMax && Number(priceMin) > Number(priceMax))) { setPriceError('Проверьте диапазон: цена «от» должна быть не больше цены «до».'); return }
            setPriceError('')
            const next = new URLSearchParams(params)
            if (priceMin) next.set('price_min', priceMin)
            else next.delete('price_min')
            if (priceMax) next.set('price_max', priceMax)
            else next.delete('price_max')
            next.delete('offset')
            setParams(next)
          }}
          className="mt-2 w-full rounded-xl border border-[var(--border)] py-2 font-bold text-ink hover:border-premium hover:text-premium transition"
        >
          Применить цену
        </button>
        {priceError && <p role="alert" className="inline-error mt-2">{priceError}</p>}
      </div>

      {/* Quick Toggles */}
      <div className="space-y-2.5 pt-2 border-t border-[var(--border)]">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={inStock === 'true'}
            onChange={() => setParam('in_stock', inStock === 'true' ? null : 'true')}
            className="size-3.5 accent-[#e32636] rounded"
          />
          <span className="text-ink">Только в наличии</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={hasDiscount === 'true'}
            onChange={() => setParam('has_discount', hasDiscount === 'true' ? null : 'true')}
            className="size-3.5 accent-[#e32636] rounded"
          />
          <span className="text-ink">Со скидкой / Акции</span>
        </label>

        {vehicles.length > 0 && (
          <div className="pt-2">
            <label className="block font-mono uppercase tracking-wider text-muted mb-1 font-bold">
              Гараж (Совместимость)
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setParam('vehicle_id', e.target.value || null)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-2.5 py-2 text-xs text-ink outline-none focus:border-premium"
            >
              <option value="">Любой автомобиль</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={resetAllFilters}
          className="w-full rounded-xl border border-[var(--border)] py-2 text-xs font-bold text-premium hover:bg-premium/10 transition"
        >
          Сбросить все фильтры
        </button>
      )}
    </div>
  )

  return (
    <div className="market-catalog commerce-container min-h-screen bg-[var(--canvas)] text-ink py-8">
      {/* Modals */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
        onOpenQuickOrder={(p) => setQuickOrderProduct(p)}
      />

      <QuickOrderModal
        product={quickOrderProduct}
        isOpen={Boolean(quickOrderProduct)}
        onClose={() => setQuickOrderProduct(null)}
      />

      {/* Top Header & Telemetry */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="racing-badge">Каталог</span>
            <span className="font-mono text-[11px] text-muted tracking-widest uppercase">
              Подбор для вашего автомобиля
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-ink">
            {q ? `Поиск: ${q}` : selectedCategoryName ? selectedCategoryName : 'Каталог запчастей'}
          </h1>
          <div className="mt-1 font-mono text-xs text-muted">
            {products.isPending ? 'Ищем нужные детали…' : <>Найдено позиций: <span className="font-bold text-ink">{total}</span></>}
          </div>
        </div>

        {/* Controls: Sorting & View Modes */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher */}
          <div className="hidden sm:flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Сетка товаров"
              className={`rounded-lg p-2 transition ${
                viewMode === 'grid' ? 'bg-premium text-ink shadow' : 'text-muted hover:text-ink'
              }`}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Таблица запчастей"
              className={`rounded-lg p-2 transition ${
                viewMode === 'table' ? 'bg-premium text-ink shadow' : 'text-muted hover:text-ink'
              }`}
            >
              <List className="size-4" />
            </button>
          </div>

          {/* Sort Selector */}
          <select
            aria-label="Сортировка товаров"
            value={sort}
            onChange={(e) => setParam('sort', e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs text-ink font-medium outline-none focus:border-premium transition"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Mobile Filter Button */}
          <button
            type="button"
            onClick={() => setMobileFilters(true)}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-bold text-ink lg:hidden hover:border-premium"
          >
            <SlidersHorizontal className="size-4 text-premium" />
            <span>Фильтры</span>
            {hasFilters && <span className="size-2 rounded-full bg-premium animate-pulse" />}
          </button>
        </div>
      </div>

      <div className="catalog-shortcuts" aria-label="Быстрые фильтры">
        <button aria-pressed={inStock === 'true'} className={inStock === 'true' ? 'selected' : ''} onClick={() => setParam('in_stock', inStock === 'true' ? null : 'true')}>В наличии</button>
        <button aria-pressed={hasDiscount === 'true'} className={hasDiscount === 'true' ? 'selected' : ''} onClick={() => setParam('has_discount', hasDiscount === 'true' ? null : 'true')}>Со скидкой</button>
        {(categories.data || []).slice(0, 6).map(c => <button key={c.id} aria-pressed={categoryId === c.id} className={categoryId === c.id ? 'selected' : ''} onClick={() => setParam('category_id', categoryId === c.id ? null : c.id)}>{c.name}</button>)}
      </div>
      {/* Active Filter Chips Bar */}
      {hasFilters && (
        <div className="mb-6 flex flex-wrap items-center gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 text-xs">
          <span className="font-mono text-[10px] text-muted uppercase tracking-wider mr-1">
            Активные фильтры:
          </span>

          {q && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--canvas)] border border-[var(--border)] px-2.5 py-1 text-ink">
              Поиск: «{q}»
              <button type="button" onClick={() => setParam('q', null)}>
                <X className="size-3 text-muted hover:text-ink" />
              </button>
            </span>
          )}

          {categoryId && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--canvas)] border border-[var(--border)] px-2.5 py-1 text-ink">
              Категория: {selectedCategoryName || categoryId}
              <button type="button" onClick={() => setParam('category_id', null)}>
                <X className="size-3 text-muted hover:text-ink" />
              </button>
            </span>
          )}

          {inStock === 'true' && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--canvas)] border border-[var(--border)] px-2.5 py-1 text-emerald-400">
              В наличии
              <button type="button" onClick={() => setParam('in_stock', null)}>
                <X className="size-3 text-muted hover:text-ink" />
              </button>
            </span>
          )}

          {hasDiscount === 'true' && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--canvas)] border border-[var(--border)] px-2.5 py-1 text-premium">
              Со скидкой
              <button type="button" onClick={() => setParam('has_discount', null)}>
                <X className="size-3 text-muted hover:text-ink" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={resetAllFilters}
            className="ml-auto font-mono text-[11px] text-premium hover:underline font-bold"
          >
            Сбросить всё ✕
          </button>
        </div>
      )}

      {/* Main Catalog Layout */}
      <div className="flex gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                <Filter className="size-3.5 text-premium" />
                Параметры
              </span>
              {hasFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="font-mono text-[10px] text-premium hover:underline"
                >
                  Сбросить
                </button>
              )}
            </div>
            {filtersContent}
          </div>
        </aside>

        {/* Products Results Pane */}
        <div className="min-w-0 flex-1">
          {products.isLoading ? (
            <div className="catalog-product-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-80 rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-pulse"
                />
              ))}
            </div>
          ) : products.isError ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center text-sm text-red-400">
              Не удалось загрузить каталог. Пожалуйста, проверьте соединение.
              <button className="block mx-auto mt-4 underline" onClick={() => void products.refetch()}>Повторить загрузку</button>
            </div>
          ) : (products.data?.items.length ?? 0) === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-14 text-center">
              <div className="text-xl font-bold uppercase text-ink">Детали не найдены</div>
              <p className="mt-2 text-xs text-muted max-w-sm mx-auto">
                Попробуйте изменить параметры фильтрации, сбросить поисковый запрос или выбрать другой бренд.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-6 rounded-xl bg-premium px-6 py-2.5 text-xs font-bold text-ink hover:brightness-110 transition"
              >
                Показать весь ассортимент
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Apple / Porsche Style Card Grid */
            <div className="catalog-product-grid">
              {products.data!.items.map((product) => (
                <div key={product.id} className="relative group/card">
                  <ProductCard product={product} />
                  {/* Floating Quick Action Overlay */}
                  <div className="catalog-quick-actions flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100 focus-within:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      onClick={() => setQuickViewProduct(product)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--canvas)]/90 p-1.5 text-ink hover:text-premium hover:border-premium shadow-lg"
                      title="Быстрый просмотр"
                    >
                      <Eye className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickOrderProduct(product)}
                      className="rounded-lg bg-premium p-1.5 text-ink hover:brightness-110 shadow-lg"
                      title="Купить в 1 клик"
                    >
                      <Zap className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Technical Service Center Table View */
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--border)] bg-[var(--canvas)] font-mono text-[10px] uppercase text-muted">
                  <tr>
                    <th className="py-3 px-4">Деталь</th>
                    <th className="py-3 px-4">Бренд & Артикул</th>
                    <th className="py-3 px-4">Совместимость</th>
                    <th className="py-3 px-4">Склад</th>
                    <th className="py-3 px-4 text-right">Цена, TJS</th>
                    <th className="py-3 px-4 text-right">Заказ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242A32]">
                  {products.data!.items.map((prod) => (
                    <tr key={prod.id} className="hover:bg-white/5 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-[var(--canvas)] border border-[var(--border)] overflow-hidden shrink-0">
                            {prod.image_url ? (
                              <img src={prod.image_url} alt="" className="size-full object-cover" />
                            ) : (
                              <div className="grid size-full place-items-center font-bold text-[9px] text-muted">AU</div>
                            )}
                          </div>
                          <Link
                            to={`/product/${prod.slug}`}
                            className="font-semibold text-ink hover:text-premium transition line-clamp-1 max-w-xs"
                          >
                            {prod.name}
                          </Link>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-premium">{prod.brand.name}</span>
                        <div className="text-muted text-[10px]">{prod.sku}</div>
                      </td>

                      <td className="py-3 px-4">
                        <FitmentBadge status={prod.fitment} />
                      </td>

                      <td className="py-3 px-4">
                        <span className={prod.stock_quantity > 0 ? 'text-emerald-400 font-semibold' : 'text-muted'}>
                          {prod.stock_quantity > 0 ? `${prod.stock_quantity} шт.` : 'Под заказ'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-ink text-sm">
                        {Number(prod.price).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setQuickViewProduct(prod)}
                            className="rounded-lg border border-[var(--border)] p-1.5 text-muted hover:text-ink"
                            title="Быстрый просмотр"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickOrderProduct(prod)}
                            className="rounded-lg bg-premium/15 border border-premium/30 px-2 py-1 text-[11px] font-bold text-premium hover:bg-premium hover:text-ink transition"
                            title="Купить в 1 клик"
                          >
                            1 клик
                          </button>
                          <button
                            type="button"
                            onClick={() => void addItem(prod.id, 1)}
                            disabled={prod.stock_quantity <= 0}
                            className="rounded-lg bg-premium p-1.5 text-ink hover:brightness-110 disabled:opacity-40"
                            title="В корзину"
                          >
                            <ShoppingCart className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > 12 && (
            <div className="mt-10 flex items-center justify-center gap-3 font-mono text-xs">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => {
                  const next = new URLSearchParams(params)
                  next.set('offset', String(Math.max(0, offset - 12)))
                  setParams(next)
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-bold text-ink hover:border-premium disabled:opacity-40 transition"
              >
                ← Назад
              </button>
              <span className="text-muted px-2">
                Страница <span className="text-ink font-bold">{Math.floor(offset / 12) + 1}</span> из{' '}
                <span className="text-ink font-bold">{Math.ceil(total / 12)}</span>
              </span>
              <button
                type="button"
                disabled={offset + 12 >= total}
                onClick={() => {
                  const next = new URLSearchParams(params)
                  next.set('offset', String(offset + 12))
                  setParams(next)
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-bold text-ink hover:border-premium disabled:opacity-40 transition"
              >
                Вперед →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Filters */}
      {mobileFilters && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="flex-1 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileFilters(false)}
            aria-hidden
          />
          <div ref={filterDialog} role="dialog" aria-modal="true" aria-label="Фильтры каталога" tabIndex={-1} className="w-80 max-w-[90vw] overflow-y-auto p-6 border-l border-[var(--border)] bg-[var(--surface)] text-ink">
            <div className="mb-6 flex items-center justify-between border-b border-[var(--border)] pb-4">
              <span className="font-mono text-sm font-bold uppercase tracking-wider text-ink">
                Фильтры каталога
              </span>
              <button
                type="button"
                onClick={() => setMobileFilters(false)}
                aria-label="Закрыть фильтры"
                className="rounded-lg border border-[var(--border)] p-1.5 text-muted hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
            {filtersContent}
          </div>
        </div>
      )}
    </div>
  )
}
