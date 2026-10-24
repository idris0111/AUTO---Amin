import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Info,
  Layers,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Truck,
  Wrench,
} from 'lucide-react'

import { api } from '../lib/api'
import { useGarage } from '../stores/garage'
import { useCart } from '../stores/cart'
import type { AssemblyDetailResponse, AssemblyNodePart, AssemblySummary } from '../types'
import AssemblyCanvas3D from '../components/explorer3d/AssemblyCanvas3D'

export default function PartsExplorer3D() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { vehicles, selectedVehicleId, selectVehicle } = useGarage()
  const { addItem } = useCart()

  // Selected assembly ID from query or default to 'brakes'
  const activeAssemblyId = searchParams.get('assembly') || 'brakes'

  // Local 3D controls state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('brake_disc')
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [explosionProgress, setExplosionProgress] = useState<number>(0.25)
  const [autoRotate, setAutoRotate] = useState<boolean>(false)
  const [wireframe, setWireframe] = useState<boolean>(false)
  const [resetTrigger, setResetTrigger] = useState<number>(0)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({})

  // 1. Fetch all available assemblies
  const { data: assemblies } = useQuery<AssemblySummary[]>({
    queryKey: ['3d-assemblies'],
    queryFn: () => api.get<AssemblySummary[]>('/3d/assemblies'),
  })

  // 2. Fetch active assembly details (with nodes & matched products)
  const {
    data: assemblyDetail,
    isLoading,
    isError,
  } = useQuery<AssemblyDetailResponse>({
    queryKey: ['3d-assembly', activeAssemblyId, selectedVehicleId],
    queryFn: () => {
      const query: Record<string, string> = {}
      if (selectedVehicleId) query.vehicle_id = selectedVehicleId
      return api.get<AssemblyDetailResponse>(`/3d/assemblies/${activeAssemblyId}`, query)
    },
  })

  // When assembly changes, set default selected node
  useEffect(() => {
    if (assemblyDetail?.nodes && assemblyDetail.nodes.length > 0) {
      setSelectedNodeId(assemblyDetail.nodes[0].node_id)
    }
  }, [activeAssemblyId, assemblyDetail])

  const handleSelectAssembly = (id: string) => {
    setSearchParams({ assembly: id })
  }

  const handleAddToCart = async (productId: string) => {
    try {
      await addItem(productId, 1)
      setAddedItemIds((prev) => ({ ...prev, [productId]: true }))
      setTimeout(() => {
        setAddedItemIds((prev) => ({ ...prev, [productId]: false }))
      }, 2500)
    } catch {
      // error handled by cart store
    }
  }

  // Active node data
  const activeNode: AssemblyNodePart | undefined = assemblyDetail?.nodes.find(
    (n) => n.node_id === selectedNodeId,
  )

  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId)

  return (
    <div className={`mx-auto max-w-7xl px-4 py-6 ${isFullscreen ? 'fixed inset-0 z-50 max-w-none bg-[var(--canvas)] p-4' : ''}`}>
      {/* Breadcrumb & Top Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs text-muted">
            <Link to="/catalog" className="hover:text-premium">
              Каталог
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-ink">3D Parts Explorer</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
              ИНТЕРАКТИВНЫЙ 3D ПРОСМОТР УЗЛОВ
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-premium/15 px-2.5 py-0.5 text-xs font-bold text-premium">
              <Layers className="size-3.5" />
              WebGL PBR
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Изучайте кинематику и послойную конструкцию во взрыв-схеме (Exploded View), осматривайте детали и заказывайте точно подходящие компоненты.
          </p>
        </div>

        {/* Vehicle Selection Pill */}
        <div className="flex items-center gap-2 rounded-xl border border-[#252B33] bg-[var(--surface)] px-3 py-2 text-xs">
          <Truck className="size-4 text-premium" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted">Гараж для подбора:</span>
            {vehicles.length > 0 ? (
              <select
                value={selectedVehicleId ?? ''}
                onChange={(e) => selectVehicle(e.target.value || null)}
                className="bg-transparent font-semibold text-ink outline-none cursor-pointer"
              >
                <option value="" className="bg-[var(--surface)] text-ink">Все автомобили</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[var(--surface)] text-ink">
                    {v.name} ({v.year})
                  </option>
                ))}
              </select>
            ) : (
              <Link to="/garage" className="font-semibold text-premium hover:underline">
                + Добавить автомобиль
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Assembly Switcher Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-[#252B33] pb-4">
        {assemblies?.map((item) => {
          const isActive = item.id === activeAssemblyId
          return (
            <button
              key={item.id}
              onClick={() => handleSelectAssembly(item.id)}
              className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'border-premium bg-premium/10 text-ink shadow-[var(--shadow-glow)]'
                  : 'border-[#252B33] bg-[var(--surface)] text-muted hover:border-muted hover:text-ink'
              }`}
            >
              <Box className={`size-4 ${isActive ? 'text-premium' : 'text-muted'}`} />
              <span>{item.title}</span>
              <span className="rounded-full bg-[#252B33] px-2 py-0.5 text-[11px] font-normal text-muted">
                {item.parts_count} дет.
              </span>
            </button>
          )
        })}
      </div>

      {/* Main 3D Layout: Left Canvas / Right Inspector */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: 3D Viewport Box (8 cols) */}
        <div className="relative flex flex-col overflow-hidden rounded-2xl border border-[#252B33] bg-[var(--canvas)] shadow-2xl lg:col-span-8">
          {/* Viewport Top Overlay Bar */}
          <div className="absolute left-4 right-4 top-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            {/* Assembly Header Chip */}
            <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-[#252B33] bg-[var(--surface)]/85 px-3 py-1.5 backdrop-blur-md">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-ink">
                {assemblyDetail?.title ?? 'Загрузка 3D…'}
              </span>
              <span className="text-[10px] text-muted">| {assemblyDetail?.subsystem}</span>
            </div>

            {/* Quick 3D Canvas Controls */}
            <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-[#252B33] bg-[var(--surface)]/85 p-1 backdrop-blur-md">
              <button
                onClick={() => setResetTrigger((prev) => prev + 1)}
                title="Сбросить ракурс камеры"
                className="rounded-lg p-1.5 text-muted hover:bg-[#252B33] hover:text-ink transition"
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                onClick={() => setAutoRotate((prev) => !prev)}
                title={autoRotate ? 'Остановить авто-вращение' : 'Включить авто-вращение'}
                className={`rounded-lg p-1.5 transition ${
                  autoRotate ? 'bg-premium text-ink' : 'text-muted hover:bg-[#252B33] hover:text-ink'
                }`}
              >
                <RefreshCw className={`size-4 ${autoRotate ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setWireframe((prev) => !prev)}
                title={wireframe ? 'Обычный режим' : 'Рентген / Каркасный режим'}
                className={`rounded-lg p-1.5 transition ${
                  wireframe ? 'bg-premium text-ink' : 'text-muted hover:bg-[#252B33] hover:text-ink'
                }`}
              >
                {wireframe ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
              <button
                onClick={() => setIsFullscreen((prev) => !prev)}
                title={isFullscreen ? 'Свернуть' : 'Во весь экран'}
                className="rounded-lg p-1.5 text-muted hover:bg-[#252B33] hover:text-ink transition"
              >
                {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
            </div>
          </div>

          {/* 3D WebGL Canvas */}
          <div className="relative min-h-[460px] flex-1 lg:min-h-[580px]">
            {isLoading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--canvas)]/80 backdrop-blur-sm">
                <div className="size-12 animate-spin rounded-full border-4 border-[#252B33] border-t-premium" />
                <span className="mt-3 text-sm font-medium text-ink">Сборка 3D кинематики…</span>
              </div>
            )}

            {isError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--canvas)]">
                <p className="text-rose-400">Не удалось загрузить 3D узел</p>
              </div>
            )}

            {assemblyDetail && (
              <AssemblyCanvas3D
                assemblyId={activeAssemblyId}
                nodes={assemblyDetail.nodes}
                selectedNodeId={selectedNodeId}
                hoveredNodeId={hoveredNodeId}
                explosionProgress={explosionProgress}
                autoRotate={autoRotate}
                wireframe={wireframe}
                resetTrigger={resetTrigger}
                onSelectNode={(id) => setSelectedNodeId(id)}
                onHoverNode={(id) => setHoveredNodeId(id)}
              />
            )}
          </div>

          {/* Viewport Bottom Controls: Exploded View Slider & Hovered Pill */}
          <div className="border-t border-[#252B33] bg-[var(--surface)]/90 p-4 backdrop-blur-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Explosion Slider */}
              <div className="flex flex-1 items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <Sliders className="size-4 text-premium" />
                  <span className="hidden sm:inline">Взрыв-схема:</span>
                  <span className="text-premium">{Math.round(explosionProgress * 100)}%</span>
                </div>

                <div className="relative flex flex-1 items-center">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={explosionProgress}
                    onChange={(e) => setExplosionProgress(parseFloat(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#252B33] accent-[#E32636]"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex gap-1 text-[11px]">
                  <button
                    onClick={() => setExplosionProgress(0)}
                    className="rounded bg-[#252B33] px-2 py-1 text-muted hover:text-ink"
                  >
                    0%
                  </button>
                  <button
                    onClick={() => setExplosionProgress(0.5)}
                    className="rounded bg-[#252B33] px-2 py-1 text-muted hover:text-ink"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setExplosionProgress(1)}
                    className="rounded bg-[#252B33] px-2 py-1 text-muted hover:text-ink"
                  >
                    100%
                  </button>
                </div>
              </div>

              {/* Interaction Hint */}
              <div className="text-right text-[11px] text-muted">
                {hoveredNodeId ? (
                  <span className="font-medium text-sky-400">
                    💡 Нажмите для выбора: {assemblyDetail?.nodes.find((n) => n.node_id === hoveredNodeId)?.name}
                  </span>
                ) : (
                  <span>🖱️ Вращайте ЛКМ • Масштаб колесом • Кликните на деталь</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Component Inspector & Connected Catalog Part (4 cols) */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          {/* Selected Component Card */}
          <div className="rounded-2xl border border-[#252B33] bg-[var(--surface)] p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-premium">
                <Wrench className="size-3" />
                Инспектор компонента
              </span>
              <span className="rounded-full bg-[#252B33] px-2 py-0.5 text-[10px] text-muted font-mono">
                {activeNode?.node_id ?? 'selected'}
              </span>
            </div>

            {activeNode ? (
              <div>
                <h3 className="text-lg font-bold text-ink">{activeNode.name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted">{activeNode.description}</p>

                {/* Matched Real Catalog Product Box */}
                <div className="mt-5 rounded-xl border border-[#252B33] bg-[var(--canvas)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Товар в наличии
                    </span>
                    {activeVehicle && (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        <ShieldCheck className="size-3" />
                        Совместимо
                      </span>
                    )}
                  </div>

                  {activeNode.matching_product ? (
                    <div>
                      {/* Product Brand & Title */}
                      <div className="flex gap-3">
                        {activeNode.matching_product.image_url ? (
                          <img
                            src={activeNode.matching_product.image_url}
                            alt={activeNode.matching_product.name}
                            className="size-16 shrink-0 rounded-lg border border-[#252B33] object-cover bg-neutral-900"
                          />
                        ) : (
                          <div className="grid size-16 shrink-0 place-items-center rounded-lg border border-[#252B33] bg-neutral-900 text-muted">
                            <Box className="size-7 text-muted" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-premium">
                            {activeNode.matching_product.brand?.name ?? 'OEM'}
                          </span>
                          <Link
                            to={`/product/${activeNode.matching_product.slug}`}
                            className="line-clamp-2 text-sm font-semibold text-ink hover:text-premium transition"
                          >
                            {activeNode.matching_product.name}
                          </Link>
                          <span className="mt-0.5 block text-[11px] font-mono text-muted">
                            Арт: {activeNode.matching_product.sku}
                          </span>
                        </div>
                      </div>

                      {/* Price & Stock */}
                      <div className="mt-4 flex items-baseline justify-between">
                        <div>
                          <div className="text-xl font-black text-ink">
                            {activeNode.matching_product.price} <span className="text-xs font-normal text-muted">TJS</span>
                          </div>
                          {activeNode.matching_product.old_price && (
                            <span className="text-xs text-muted line-through">
                              {activeNode.matching_product.old_price} TJS
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-400" />
                            В наличии
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleAddToCart(activeNode.matching_product!.id)}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition shadow-lg ${
                            addedItemIds[activeNode.matching_product.id]
                              ? 'bg-emerald-600 text-ink'
                              : 'bg-premium text-ink hover:bg-[#c91e2c] shadow-[var(--shadow-glow)]'
                          }`}
                        >
                          {addedItemIds[activeNode.matching_product.id] ? (
                            <>
                              <Check className="size-3.5" />
                              Добавлено!
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="size-3.5" />
                              В корзину
                            </>
                          )}
                        </button>

                        <Link
                          to={`/product/${activeNode.matching_product.slug}`}
                          className="flex items-center justify-center rounded-xl border border-[#252B33] bg-[var(--surface)] px-3 text-xs font-medium text-ink hover:border-premium transition"
                        >
                          Детали
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-muted">
                      Подходящий артикул временно недоступен онлайн. Обратитесь к менеджеру.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted">
                <Info className="mb-2 size-8 text-muted" />
                <p className="text-xs">Выберите компонент на 3D схеме для подробной информации</p>
              </div>
            )}
          </div>

          {/* Node Explorer List in this Assembly */}
          <div className="rounded-2xl border border-[#252B33] bg-[var(--surface)] p-4 shadow-xl">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
              Узлы в данной сборке ({assemblyDetail?.nodes.length ?? 0})
            </h4>

            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {assemblyDetail?.nodes.map((node, idx) => {
                const isSelected = node.node_id === selectedNodeId
                const isHovered = node.node_id === hoveredNodeId
                return (
                  <button
                    key={node.node_id}
                    onClick={() => setSelectedNodeId(node.node_id)}
                    onMouseEnter={() => setHoveredNodeId(node.node_id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                      isSelected
                        ? 'border-premium bg-premium/15 text-ink'
                        : isHovered
                        ? 'border-[#252B33] bg-[#252B33]/60 text-ink'
                        : 'border-[#252B33]/60 bg-[var(--canvas)] text-muted hover:text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                        isSelected ? 'bg-premium text-ink' : 'bg-[#252B33] text-muted'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="truncate font-medium">{node.name}</span>
                    </div>

                    {node.matching_product && (
                      <span className="shrink-0 text-[11px] font-bold text-premium ml-2">
                        {node.matching_product.price} TJS
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
