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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [quickViewProduct, setQuickViewProduct] = useState<ProductBrief | null>(null)
  const [quickOrderProduct, setQuickOrderProduct] = useState<ProductBrief | null>(null)

  const [priceMin, setPriceMin] = useState(params.get('price_min') ?? '')
  const [priceMax, setPriceMax] = useState(params.get('price_max') ?? '')

  const q = params.get('q') ?? ''
  const categoryId = params.get('category_id')
  const brandIds = params.getAll('brand_id')
  const sort = params.get('sort') ?? 'newest'
  const offset = Number(params.get('offset') ?? 0)
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
    queryKey: ['products', q, categoryId, brandIds, sort, offset, inStock, hasDiscount, priceMin, priceMax, vehicleId],
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
        price_min: priceMin || undefined,
        price_max: priceMax || undefined,
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
    setParams(new URLSearchParams())
  }

  const total = products.data?.total ?? 0
  const hasFilters = Boolean(q || categoryId || brandIds.length || inStock || hasDiscount || priceMin || priceMax || vehicleId)

  const selectedCategoryName = categories.data?.find((c) => c.id === categoryId)?.name

  const filtersContent = (
    <div className="space-y-6 text-white text-xs">
      {/* Search within catalog */}
      <div>
        <label className="block font-mono uppercase tracking-wider text-[#A5ACB5] mb-2 font-bold">
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
            className="w-full rounded-xl border border-[#242A32] bg-[#0B0D10] px-3.5 py-2.5 text-xs text-white outline-none focus:border-premium transition"
          />
          <Search className="absolute right-3 top-3 size-3.5 text-[#A5ACB5]" />
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="block font-mono uppercase tracking-wider text-[#A5ACB5] mb-2 font-bold">
          Категория узла
        </label>
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => setParam('category_id', null)}
            className={`block w-full rounded-lg px-2.5 py-1.5 text-left transition ${
              !categoryId ? 'bg-premium text-white font-bold' : 'text-[#A5ACB5] hover:text-white hover:bg-white/5'
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
                  categoryId === cat.id ? 'bg-premium text-white font-bold' : 'text-[#A5ACB5] hover:text-white hover:bg-white/5'
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
                      categoryId === child.id ? 'bg-premium/20 text-premium font-bold' : 'text-[#A5ACB5]/80 hover:text-white'
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
        <label className="block font-mono uppercase tracking-wider text-[#A5ACB5] mb-2 font-bold">
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
                <span className="text-white">{b.name}</span>
              </div>
              {b.country && <span className="font-mono text-[9px] text-[#A5ACB5]">{b.country}</span>}
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="block font-mono uppercase tracking-wider text-[#A5ACB5] mb-2 font-bold">
          Диапазон цены, TJS
        </label>
        <div className="flex gap-2">
          <input
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            placeholder="От"
            className="w-full rounded-xl border border-[#242A32] bg-[#0B0D10] px-3 py-2 text-xs text-white outline-none focus:border-premium transition"
          />
          <input
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            placeholder="До"
            className="w-full rounded-xl border border-[#242A32] bg-[#0B0D10] px-3 py-2 text-xs text-white outline-none focus:border-premium transition"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(params)
            if (priceMin) next.set('price_min', priceMin)
            else next.delete('price_min')
            if (priceMax) next.set('price_max', priceMax)
            else next.delete('price_max')
            next.delete('offset')
            setParams(next)
          }}
          className="mt-2 w-full rounded-xl border border-[#242A32] py-2 font-bold text-white hover:border-premium hover:text-premium transition"
        >
          Применить цену
        </button>
      </div>

      {/* Quick Toggles */}
      <div className="space-y-2.5 pt-2 border-t border-[#242A32]">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={inStock === 'true'}
            onChange={() => setParam('in_stock', inStock === 'true' ? null : 'true')}
            className="size-3.5 accent-[#e32636] rounded"
          />
          <span className="text-white">Только в наличии</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={hasDiscount === 'true'}
            onChange={() => setParam('has_discount', hasDiscount === 'true' ? null : 'true')}
            className="size-3.5 accent-[#e32636] rounded"
          />
          <span className="text-white">Со скидкой / Акции</span>
        </label>

        {vehicles.length > 0 && (
          <div className="pt-2">
            <label className="block font-mono uppercase tracking-wider text-[#A5ACB5] mb-1 font-bold">
              Гараж (Совместимость)
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setParam('vehicle_id', e.target.value || null)}
              className="w-full rounded-xl border border-[#242A32] bg-[#0B0D10] px-2.5 py-2 text-xs text-white outline-none focus:border-premium"
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
          className="w-full rounded-xl border border-[#242A32] py-2 text-xs font-bold text-premium hover:bg-premium/10 transition"
        >
          Сбросить все фильтры
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0B0D10] text-[#FFFFFF] px-4 py-8 max-w-7xl mx-auto">
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
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#242A32] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="racing-badge">Каталог</span>
            <span className="font-mono text-[11px] text-[#A5ACB5] tracking-widest uppercase">
              [AU-STORE CATALOG]
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
            {q ? `Поиск: ${q}` : selectedCategoryName ? selectedCategoryName : 'Автозапчасти & Комплектующие'}
          </h1>
          <div className="mt-1 font-mono text-xs text-[#A5ACB5]">
            Найдено позиций: <span className="font-bold text-white">{total}</span>
          </div>
        </div>

        {/* Controls: Sorting & View Modes */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher */}
          <div className="hidden sm:flex rounded-xl border border-[#242A32] bg-[#15191F] p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Сетка товаров"
              className={`rounded-lg p-2 transition ${
                viewMode === 'grid' ? 'bg-premium text-white shadow' : 'text-[#A5ACB5] hover:text-white'
              }`}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Таблица запчастей"
              className={`rounded-lg p-2 transition ${
                viewMode === 'table' ? 'bg-premium text-white shadow' : 'text-[#A5ACB5] hover:text-white'
              }`}
            >
              <List className="size-4" />
            </button>
          </div>

          {/* Sort Selector */}
          <select
            value={sort}
            onChange={(e) => setParam('sort', e.target.value)}
            className="rounded-xl border border-[#242A32] bg-[#15191F] px-4 py-2.5 text-xs text-white font-medium outline-none focus:border-premium transition"
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
            className="flex items-center gap-2 rounded-xl border border-[#242A32] bg-[#15191F] px-4 py-2.5 text-xs font-bold text-white lg:hidden hover:border-premium"
          >
            <SlidersHorizontal className="size-4 text-premium" />
            <span>Фильтры</span>
            {hasFilters && <span className="size-2 rounded-full bg-premium animate-pulse" />}
          </button>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {hasFilters && (
        <div className="mb-6 flex flex-wrap items-center gap-2 p-3 rounded-xl border border-[#242A32] bg-[#15191F]/60 text-xs">
          <span className="font-mono text-[10px] text-[#A5ACB5] uppercase tracking-wider mr-1">
            Активные фильтры:
          </span>

          {q && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0B0D10] border border-[#242A32] px-2.5 py-1 text-white">
              Поиск: «{q}»
              <button type="button" onClick={() => setParam('q', null)}>
                <X className="size-3 text-[#A5ACB5] hover:text-white" />
              </button>
            </span>
          )}

          {categoryId && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0B0D10] border border-[#242A32] px-2.5 py-1 text-white">
              Категория: {selectedCategoryName || categoryId}
              <button type="button" onClick={() => setParam('category_id', null)}>
                <X className="size-3 text-[#A5ACB5] hover:text-white" />
              </button>
            </span>
          )}

          {inStock === 'true' && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0B0D10] border border-[#242A32] px-2.5 py-1 text-emerald-400">
              В наличии
              <button type="button" onClick={() => setParam('in_stock', null)}>
                <X className="size-3 text-[#A5ACB5] hover:text-white" />
              </button>
            </span>
          )}

          {hasDiscount === 'true' && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0B0D10] border border-[#242A32] px-2.5 py-1 text-premium">
              Со скидкой
              <button type="button" onClick={() => setParam('has_discount', null)}>
                <X className="size-3 text-[#A5ACB5] hover:text-white" />
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
          <div className="sticky top-24 rounded-2xl border border-[#242A32] bg-[#15191F] p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#242A32] pb-3 mb-4">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-80 rounded-2xl border border-[#242A32] bg-[#15191F] animate-pulse"
                />
              ))}
            </div>
          ) : products.isError ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center text-sm text-red-400">
              Не удалось загрузить каталог. Пожалуйста, проверьте соединение.
            </div>
          ) : (products.data?.items.length ?? 0) === 0 ? (
            <div className="rounded-2xl border border-[#242A32] bg-[#15191F] p-14 text-center">
              <div className="text-xl font-bold uppercase text-white">Детали не найдены</div>
              <p className="mt-2 text-xs text-[#A5ACB5] max-w-sm mx-auto">
                Попробуйте изменить параметры фильтрации, сбросить поисковый запрос или выбрать другой бренд.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-6 rounded-xl bg-premium px-6 py-2.5 text-xs font-bold text-white hover:brightness-110 transition"
              >
                Показать весь ассортимент
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Apple / Porsche Style Card Grid */
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {products.data!.items.map((product) => (
                <div key={product.id} className="relative group/card">
                  <ProductCard product={product} />
                  {/* Floating Quick Action Overlay */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      onClick={() => setQuickViewProduct(product)}
                      className="rounded-lg border border-[#242A32] bg-[#0B0D10]/90 p-1.5 text-white hover:text-premium hover:border-premium shadow-lg"
                      title="Быстрый просмотр"
                    >
                      <Eye className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickOrderProduct(product)}
                      className="rounded-lg bg-premium p-1.5 text-white hover:brightness-110 shadow-lg"
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
            <div className="overflow-x-auto rounded-2xl border border-[#242A32] bg-[#15191F]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#242A32] bg-[#0B0D10] font-mono text-[10px] uppercase text-[#A5ACB5]">
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
                          <div className="size-10 rounded-lg bg-[#0B0D10] border border-[#242A32] overflow-hidden shrink-0">
                            {prod.image_url ? (
                              <img src={prod.image_url} alt="" className="size-full object-cover" />
                            ) : (
                              <div className="grid size-full place-items-center font-bold text-[9px] text-[#A5ACB5]">AU</div>
                            )}
                          </div>
                          <Link
                            to={`/product/${prod.slug}`}
                            className="font-semibold text-white hover:text-premium transition line-clamp-1 max-w-xs"
                          >
                            {prod.name}
                          </Link>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-premium">{prod.brand.name}</span>
                        <div className="text-[#A5ACB5] text-[10px]">{prod.sku}</div>
                      </td>

                      <td className="py-3 px-4">
                        <FitmentBadge status={prod.fitment} />
                      </td>

                      <td className="py-3 px-4">
                        <span className={prod.stock_quantity > 0 ? 'text-emerald-400 font-semibold' : 'text-muted'}>
                          {prod.stock_quantity > 0 ? `${prod.stock_quantity} шт.` : 'Под заказ'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-white text-sm">
                        {Number(prod.price).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setQuickViewProduct(prod)}
                            className="rounded-lg border border-[#242A32] p-1.5 text-[#A5ACB5] hover:text-white"
                            title="Быстрый просмотр"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickOrderProduct(prod)}
                            className="rounded-lg bg-premium/15 border border-premium/30 px-2 py-1 text-[11px] font-bold text-premium hover:bg-premium hover:text-white transition"
                            title="Купить в 1 клик"
                          >
                            1 клик
                          </button>
                          <button
                            type="button"
                            onClick={() => void addItem(prod.id, 1)}
                            disabled={prod.stock_quantity <= 0}
                            className="rounded-lg bg-premium p-1.5 text-white hover:brightness-110 disabled:opacity-40"
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
                className="rounded-xl border border-[#242A32] bg-[#15191F] px-4 py-2.5 font-bold text-white hover:border-premium disabled:opacity-40 transition"
              >
                ← Назад
              </button>
              <span className="text-[#A5ACB5] px-2">
                Страница <span className="text-white font-bold">{Math.floor(offset / 12) + 1}</span> из{' '}
                <span className="text-white font-bold">{Math.ceil(total / 12)}</span>
              </span>
              <button
                type="button"
                disabled={offset + 12 >= total}
                onClick={() => {
                  const next = new URLSearchParams(params)
                  next.set('offset', String(offset + 12))
                  setParams(next)
                }}
                className="rounded-xl border border-[#242A32] bg-[#15191F] px-4 py-2.5 font-bold text-white hover:border-premium disabled:opacity-40 transition"
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
          <div className="w-80 max-w-[85vw] overflow-y-auto p-6 border-l border-[#242A32] bg-[#15191F] text-white">
            <div className="mb-6 flex items-center justify-between border-b border-[#242A32] pb-4">
              <span className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                Фильтры каталога
              </span>
              <button
                type="button"
                onClick={() => setMobileFilters(false)}
                className="rounded-lg border border-[#242A32] p-1.5 text-[#A5ACB5] hover:text-white"
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
