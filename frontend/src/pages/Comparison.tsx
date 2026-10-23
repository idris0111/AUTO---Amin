import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  Car,
  CheckCircle2,
  ChevronRight,
  GitCompare,
  HelpCircle,
  RotateCcw,
  ShoppingCart,
  Star,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'

import { api } from '../lib/api'
import { useComparison } from '../stores/comparison'
import { useGarage } from '../stores/garage'
import { useCart } from '../stores/cart'
import type { ProductComparisonResponse, ProductDetail } from '../types'

export default function Comparison() {
  const { t } = useTranslation()
  const { ids, remove, clear } = useComparison()
  const { vehicles, selectedVehicleId, selectVehicle } = useGarage()
  const { addItem } = useCart()

  const [onlyDifferences, setOnlyDifferences] = useState(false)
  const [selectedVehicleOverride, setSelectedVehicleOverride] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({})

  const activeVehicle =
    vehicles.find((v) => v.id === (selectedVehicleOverride ?? selectedVehicleId)) ??
    vehicles.find((v) => v.id === selectedVehicleId) ??
    vehicles[0]

  const { data, isLoading, isError, refetch } = useQuery<ProductComparisonResponse>({
    queryKey: ['comparison', ids, activeVehicle?.id],
    queryFn: () => {
      const params: Record<string, string | string[] | undefined> = {
        ids,
      }
      if (activeVehicle) {
        params.vehicle_id = activeVehicle.id
      }
      return api.get<ProductComparisonResponse>('/catalog/products/compare', params)
    },
    enabled: ids.length > 0,
  })

  const handleAddToCart = async (product: ProductDetail) => {
    try {
      await addItem(product.id, 1)
      setAddedIds((prev) => ({ ...prev, [product.id]: true }))
      setTimeout(() => {
        setAddedIds((prev) => ({ ...prev, [product.id]: false }))
      }, 1800)
    } catch {
      // handled in cart store
    }
  }

  // Filtered spec rows
  const visibleSpecRows = (data?.specifications_matrix ?? []).filter((row) => {
    if (!onlyDifferences) return true
    return row.is_different
  })

  // Check differences in top-level attributes
  const isBrandDiff = (data?.products ?? []).some(
    (p, _, arr) => p.brand.name !== arr[0].brand.name
  )
  const isCountryDiff = (data?.products ?? []).some(
    (p, _, arr) => (p.country_of_origin ?? '') !== (arr[0].country_of_origin ?? '')
  )
  const isWarrantyDiff = (data?.products ?? []).some(
    (p, _, arr) => p.warranty_months !== arr[0].warranty_months
  )
  const isPriceDiff = (data?.products ?? []).some(
    (p, _, arr) => p.price !== arr[0].price
  )

  if (ids.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-[var(--surface-2)] text-premium shadow-[var(--shadow-glow)]">
          <GitCompare className="size-10" />
        </div>
        <h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">
          {t('compareEmpty')}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm muted">
          {t('compareEmptyHint')}
        </p>
        <div className="mt-8">
          <Link to="/catalog" className="btn-premium inline-flex items-center gap-2 px-6 py-3 text-sm font-bold shadow-[var(--shadow-glow)]">
            <span>{t('explore')}</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Top Header & Breadcrumbs */}
      <nav className="mb-4 flex items-center gap-2 text-xs muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-premium">{t('home')}</Link>
        <ChevronRight className="size-3" />
        <Link to="/catalog" className="hover:text-premium">{t('explore')}</Link>
        <ChevronRight className="size-3" />
        <span className="text-white font-medium">{t('comparison')}</span>
      </nav>

      <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-premium/15 text-premium">
              <GitCompare className="size-5" />
            </span>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              {t('comparison')}
            </h1>
            <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-bold text-slate-300">
              {ids.length}
            </span>
          </div>
          <p className="mt-1 text-xs muted sm:text-sm">
            Сравнение параметров, цен и гарантии совместимости деталей бок о бок
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Difference Toggle */}
          <div className="flex items-center rounded-xl border p-1 text-xs font-semibold" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <button
              type="button"
              onClick={() => setOnlyDifferences(false)}
              className={`rounded-lg px-3 py-1.5 transition ${
                !onlyDifferences ? 'bg-premium text-white font-bold shadow' : 'muted hover:text-white'
              }`}
            >
              {t('allParameters')}
            </button>
            <button
              type="button"
              onClick={() => setOnlyDifferences(true)}
              className={`rounded-lg px-3 py-1.5 transition ${
                onlyDifferences ? 'bg-premium text-white font-bold shadow' : 'muted hover:text-white'
              }`}
            >
              {t('onlyDifferences')}
            </button>
          </div>

          {/* Vehicle selector */}
          {vehicles.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
              <Car className="size-3.5 text-premium" />
              <select
                value={activeVehicle?.id}
                onChange={(e) => {
                  setSelectedVehicleOverride(e.target.value)
                  selectVehicle(e.target.value)
                }}
                className="bg-transparent text-xs font-semibold text-white outline-none"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                    {v.name} ({v.make?.name} {v.model?.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Button */}
          <button
            type="button"
            onClick={clear}
            className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            <Trash2 className="size-3.5 text-rose-500" />
            <span>{t('compareClear')}</span>
          </button>
        </div>
      </div>

      {/* Different categories warning */}
      {data && !data.is_same_category && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-400">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{t('differentCategoriesWarn')}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ids.map((id) => (
            <div key={id} className="skeleton h-96 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="mt-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center text-xs text-rose-500">
          <p>Не удалось загрузить данные для сравнения.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-600"
          >
            <RotateCcw className="size-3.5" />
            <span>Повторить</span>
          </button>
        </div>
      )}

      {/* Comparison Table View */}
      {data && data.products.length > 0 && (
        <div className="mt-8 overflow-x-auto pb-6">
          <div className="min-w-[760px]">
            {/* Sticky Product Cards Header */}
            <div className="grid grid-cols-[220px_repeat(auto-fit,minmax(220px,1fr))] gap-4 border-b pb-6" style={{ borderColor: 'var(--border)' }}>
              <div className="flex flex-col justify-end p-2">
                <span className="text-xs font-bold uppercase tracking-wider muted">
                  Товары
                </span>
                <span className="text-[11px] muted">
                  Сравнивается: {data.products.length} детали
                </span>
              </div>

              {data.products.map((product) => {
                const isAdded = !!addedIds[product.id]
                const primaryImg = product.images.find((i) => i.is_primary)?.url || product.images[0]?.url
                return (
                  <div
                    key={product.id}
                    className="relative flex flex-col justify-between rounded-2xl border p-4 shadow-sm"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
                  >
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => remove(product.id)}
                      title={t('compareRemove')}
                      className="absolute right-3 top-3 z-10 grid size-7 place-items-center rounded-lg bg-black/40 text-slate-400 transition hover:bg-rose-500 hover:text-white"
                    >
                      <X className="size-3.5" />
                    </button>

                    <div>
                      {/* Image */}
                      <Link
                        to={`/product/${product.slug}`}
                        className="relative block aspect-video w-full overflow-hidden rounded-xl bg-black/20"
                      >
                        {primaryImg ? (
                          <img
                            src={primaryImg}
                            alt={product.name}
                            className="size-full object-cover transition hover:scale-105"
                          />
                        ) : (
                          <div className="grid size-full place-items-center font-black text-slate-700">AU</div>
                        )}
                      </Link>

                      {/* Brand & Title */}
                      <div className="mt-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-premium">
                          {product.brand.name}
                        </span>
                        <Link
                          to={`/product/${product.slug}`}
                          className="mt-1 block line-clamp-2 text-sm font-bold text-white transition hover:text-premium"
                        >
                          {product.name}
                        </Link>
                        <div className="mt-1 text-[11px] muted">
                          {t('sku')}: {product.sku}
                        </div>
                      </div>

                      {/* Vehicle Fitment Badge */}
                      <div className="mt-2.5">
                        {product.fitment === 'compatible' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-500">
                            <CheckCircle2 className="size-3" />
                            {t('fitmentYes')}
                          </span>
                        )}
                        {product.fitment === 'not_compatible' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-bold text-rose-500">
                            <XCircle className="size-3" />
                            {t('fitmentNo')}
                          </span>
                        )}
                        {(!product.fitment || product.fitment === 'unknown') && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
                            <HelpCircle className="size-3" />
                            {t('fitmentUnknownShort')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price and Cart */}
                    <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-baseline justify-between">
                        <div className="text-xl font-black text-white">
                          {Number(product.price).toFixed(2)} TJS
                        </div>
                        {product.old_price && (
                          <span className="text-xs line-through muted">
                            {Number(product.old_price).toFixed(2)} TJS
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-xs">
                        {product.stock_quantity > 0 ? (
                          <span className="font-semibold text-emerald-500">
                            В наличии ({product.stock_quantity})
                          </span>
                        ) : (
                          <span className="text-slate-500">{t('outOfStock')}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock_quantity <= 0}
                        className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                          isAdded ? 'bg-emerald-600 text-white' : 'btn-premium'
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <ShoppingCart className="size-3.5" />
                        <span>{isAdded ? 'Добавлено!' : t('addToCart')}</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Section: Общие сведения */}
            <div className="mt-8 space-y-1">
              <div className="border-b pb-2 text-xs font-bold uppercase tracking-wider text-premium" style={{ borderColor: 'var(--border)' }}>
                {t('generalSection')}
              </div>

              {/* Row: Цена */}
              {(!onlyDifferences || isPriceDiff) && (
                <div className={`grid grid-cols-[220px_repeat(auto-fit,minmax(220px,1fr))] items-center gap-4 rounded-xl px-2 py-3 text-sm ${
                  isPriceDiff ? 'bg-white/[0.02]' : ''
                }`}>
                  <div className="flex items-center gap-2 font-semibold muted">
                    <span>{t('price')}</span>
                    {isPriceDiff && (
                      <span className="rounded bg-premium/15 px-1.5 py-0.5 text-[10px] font-bold text-premium">
                        {t('diffBadge')}
                      </span>
                    )}
                  </div>
                  {data.products.map((p) => (
                    <div key={p.id} className="font-bold text-white">
                      {Number(p.price).toFixed(2)} TJS
                    </div>
                  ))}
                </div>
              )}

              {/* Row: Бренд */}
              {(!onlyDifferences || isBrandDiff) && (
                <div className={`grid grid-cols-[220px_repeat(auto-fit,minmax(220px,1fr))] items-center gap-4 rounded-xl px-2 py-3 text-sm ${
                  isBrandDiff ? 'bg-white/[0.02]' : ''
                }`}>
                  <div className="flex items-center gap-2 font-semibold muted">
                    <span>{t('brand')}</span>
                    {isBrandDiff && (
                      <span className="rounded bg-premium/15 px-1.5 py-0.5 text-[10px] font-bold text-premium">
                        {t('diffBadge')}
                      </span>
                    )}
                  </div>
                  {data.products.map((p) => (
                    <div key={p.id} className="font-medium text-slate-200">
                      {p.brand.name}
                    </div>
                  ))}
                </div>
              )}

              {/* Row: Страна бренда/производства */}
              {(!onlyDifferences || isCountryDiff) && (
                <div className={`grid grid-cols-[220px_repeat(auto-fit,minmax(220px,1fr))] items-center gap-4 rounded-xl px-2 py-3 text-sm ${
                  isCountryDiff ? 'bg-white/[0.02]' : ''
                }`}>
                  <div className="flex items-center gap-2 font-semibold muted">
                    <span>Страна</span>
                    {isCountryDiff && (
                      <span className="rounded bg-premium/15 px-1.5 py-0.5 text-[10px] font-bold text-premium">
                        {t('diffBadge')}
                      </span>
                    )}
                  </div>
                  {data.products.map((p) => (
                    <div key={p.id} className="font-medium text-slate-300">
                      {p.country_of_origin || '—'}
                    </div>
                  ))}
                </div>
              )}

              {/* Row: Гарантия */}
              {(!onlyDifferences || isWarrantyDiff) && (
                <div className={`grid grid-cols-[220px_repeat(auto-fit,minmax(220px,1fr))] items-center gap-4 rounded-xl px-2 py-3 text-sm ${
                  isWarrantyDiff ? 'bg-white/[0.02]' : ''
                }`}>
                  <div className="flex items-center gap-2 font-semibold muted">
                    <span>Гарантия</span>
                    {isWarrantyDiff && (
                      <span className="rounded bg-premium/15 px-1.5 py-0.5 text-[10px] font-bold text-premium">
                        {t('diffBadge')}
                      </span>
                    )}
                  </div>
                  {data.products.map((p) => (
                    <div key={p.id} className="font-medium text-slate-300">
                      {p.warranty_months ? `${p.warranty_months} мес.` : 'Гарантия производителя'}
                    </div>
                  ))}
                </div>
              )}

              {/* Row: Рейтинг */}
              {!onlyDifferences && (
                <div className="grid grid-cols-[220px_repeat(auto-fit,minmax(220px,1fr))] items-center gap-4 rounded-xl px-2 py-3 text-sm">
                  <div className="font-semibold muted">Рейтинг</div>
                  {data.products.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 text-slate-200">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      <span>{Number(p.rating_avg) > 0 ? Number(p.rating_avg).toFixed(1) : '—'}</span>
                      <span className="text-xs muted">({p.rating_count})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section: Технические характеристики */}
            {visibleSpecRows.length > 0 && (
              <div className="mt-8 space-y-1">
                <div className="border-b pb-2 text-xs font-bold uppercase tracking-wider text-premium" style={{ borderColor: 'var(--border)' }}>
                  {t('specsSection')}
                </div>

                {visibleSpecRows.map((specRow) => (
                  <div
                    key={specRow.name}
                    className={`grid grid-cols-[220px_repeat(auto-fit,minmax(220px,1fr))] items-center gap-4 rounded-xl px-2 py-3 text-sm transition ${
                      specRow.is_different ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold muted">
                      <span>{specRow.name}</span>
                      {specRow.is_different && (
                        <span className="rounded bg-premium/15 px-1.5 py-0.5 text-[10px] font-bold text-premium">
                          {t('diffBadge')}
                        </span>
                      )}
                    </div>
                    {data.products.map((p) => {
                      const val = specRow.values[p.id]
                      return (
                        <div key={p.id} className="font-medium text-slate-200">
                          {val || '—'}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Section: OEM номера */}
            {!onlyDifferences && (
              <div className="mt-8 space-y-1">
                <div className="border-b pb-2 text-xs font-bold uppercase tracking-wider text-premium" style={{ borderColor: 'var(--border)' }}>
                  {t('oemSection')}
                </div>

                <div className="grid grid-cols-[220px_repeat(auto-fit,minmax(220px,1fr))] items-start gap-4 rounded-xl px-2 py-3 text-sm">
                  <div className="font-semibold muted">OEM Номера</div>
                  {data.products.map((p) => (
                    <div key={p.id} className="flex flex-wrap gap-1">
                      {p.oem_numbers && p.oem_numbers.length > 0 ? (
                        p.oem_numbers.map((o) => (
                          <span
                            key={o.id}
                            className="rounded bg-[var(--surface-2)] px-2 py-0.5 font-mono text-xs text-slate-300"
                          >
                            {o.number}
                          </span>
                        ))
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
