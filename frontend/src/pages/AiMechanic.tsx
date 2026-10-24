import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  Car,
  CheckCircle2,
  Clock,
  Compass,
  Gauge,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Thermometer,
  Wrench,
  XCircle,
} from 'lucide-react'

import { api } from '../lib/api'
import { useGarage } from '../stores/garage'
import { useCart } from '../stores/cart'
import type { AiDiagnosticResponse, QuickSymptomPrompt, RecommendedProduct } from '../types'

export default function AiMechanic() {
  const { t } = useTranslation()
  const { vehicles, selectedVehicleId, selectVehicle } = useGarage()
  const { addItem } = useCart()

  const [symptom, setSymptom] = useState('')
  const [mileage, setMileage] = useState<string>('')
  const [selectedVehicleOverride, setSelectedVehicleOverride] = useState<string | null>(null)
  const [activeChipId, setActiveChipId] = useState<string | null>(null)

  const [diagnosticResult, setDiagnosticResult] = useState<AiDiagnosticResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({})
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({})

  // Fetch quick symptoms from backend
  const { data: quickSymptoms } = useQuery<QuickSymptomPrompt[]>({
    queryKey: ['ai-symptoms'],
    queryFn: () => api.get<QuickSymptomPrompt[]>('/ai/symptoms'),
  })

  // Selected vehicle determination
  const activeVehicle =
    vehicles.find((v) => v.id === (selectedVehicleOverride ?? selectedVehicleId)) ??
    vehicles.find((v) => v.id === selectedVehicleId) ??
    vehicles[0]

  const handleSelectQuickSymptom = (item: QuickSymptomPrompt) => {
    setActiveChipId(item.id)
    setSymptom(item.symptom)
  }

  const handleRunDiagnostic = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = symptom.trim()
    if (trimmed.length < 3) {
      setErrorMessage('Пожалуйста, опишите проблему подробнее (минимум 3 символа).')
      return
    }

    setIsLoading(true)
    setErrorMessage(null)
    setCheckedSteps({})

    try {
      const payload: Record<string, unknown> = {
        symptom: trimmed,
      }
      if (activeVehicle) {
        payload.vehicle_id = activeVehicle.id
        payload.make_id = activeVehicle.make_id
        payload.model_id = activeVehicle.model_id
        payload.generation_id = activeVehicle.generation_id
        payload.modification_id = activeVehicle.modification_id
        payload.engine_id = activeVehicle.engine_id
        payload.year = activeVehicle.year
      }
      if (mileage && !isNaN(Number(mileage))) {
        payload.mileage_km = parseInt(mileage, 10)
      }

      const response = await api.post<AiDiagnosticResponse>('/ai/diagnose', payload)
      setDiagnosticResult(response)
    } catch {
      setErrorMessage('Не удалось выполнить диагностику. Проверьте соединение с сервером.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCart = async (product: RecommendedProduct) => {
    try {
      await addItem(product.id, 1)
      setAddedItemIds((prev) => ({ ...prev, [product.id]: true }))
      setTimeout(() => {
        setAddedItemIds((prev) => ({ ...prev, [product.id]: false }))
      }, 2000)
    } catch {
      // handled in cart store
    }
  }

  const toggleStep = (index: number) => {
    setCheckedSteps((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const handleReset = () => {
    setDiagnosticResult(null)
    setSymptom('')
    setActiveChipId(null)
    setErrorMessage(null)
    setCheckedSteps({})
  }

  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return {
          label: t('aiUrgencyCritical'),
          bg: 'bg-premium/15 text-premium border-[#E32636]/30',
        }
      case 'high':
        return {
          label: t('aiUrgencyHigh'),
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        }
      case 'medium':
        return {
          label: t('aiUrgencyMedium'),
          bg: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
        }
      default:
        return {
          label: t('aiUrgencyLow'),
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        }
    }
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-ink pb-24 selection:bg-premium selection:text-ink">
      {/* Background Architectural Grid Lines */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(227,38,54,0.06),rgba(255,255,255,0))] opacity-50" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header HUD Banner */}
        <div className="relative mb-10 overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface)] via-[#101317] to-[var(--canvas)] p-6 sm:p-8 shadow-2xl">
          <div className="pointer-events-none absolute right-0 top-0 size-80 bg-premium/5 blur-3xl rounded-full" />

          <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E32636]/30 bg-premium/10 px-3 py-1 font-mono text-xs font-bold text-premium">
                <Sparkles className="size-3.5" />
                <span>AI DIAGNOSTIC SUITE // ZERO HALLUCINATIONS</span>
              </div>
              <h1 className="mt-3 text-2xl sm:text-4xl font-black text-ink tracking-tight">
                {t('aiMechanicTitle')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                Профессиональная нейродиагностика неисправностей автомобиля с точным сопоставлением реальных артикулов запчастей и узлов.
              </p>
            </div>

            {/* Vehicle Context Telemetry Card */}
            <div className="w-full shrink-0 rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4 md:w-80 shadow-lg">
              <div className="flex items-center justify-between font-mono text-[11px] text-muted">
                <span className="flex items-center gap-1.5 font-bold uppercase text-premium">
                  <Car className="size-3.5" />
                  {t('vehicle')}
                </span>
                <Link to="/garage" className="text-muted hover:text-ink transition">
                  {t('garage')} →
                </Link>
              </div>

              {activeVehicle ? (
                <div className="mt-2.5">
                  <div className="font-bold text-ink text-sm truncate">
                    {activeVehicle.name || `${activeVehicle.make?.name || ''} ${activeVehicle.model?.name || ''}`}
                  </div>
                  <div className="font-mono text-xs text-muted">
                    {activeVehicle.make?.name} {activeVehicle.model?.name} {activeVehicle.year ? `(${activeVehicle.year})` : ''}
                  </div>
                  {vehicles.length > 1 && (
                    <select
                      className="mt-2.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 font-mono text-xs text-ink outline-none focus:border-[#E32636]"
                      value={activeVehicle.id}
                      onChange={(e) => {
                        setSelectedVehicleOverride(e.target.value)
                        selectVehicle(e.target.value)
                      }}
                    >
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id} className="bg-[var(--canvas)] text-ink">
                          {v.name} ({v.make?.name} {v.model?.name})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="mt-2">
                  <div className="text-sm font-semibold text-ink">Автомобиль не привязан</div>
                  <p className="font-mono text-xs text-muted mt-0.5">
                    Добавьте авто в Гараж для точной привязки геометрии деталей.
                  </p>
                  <Link
                    to="/garage"
                    className="mt-2.5 inline-flex items-center gap-1 font-mono text-xs font-bold text-premium hover:underline"
                  >
                    + {t('addVehicle')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Diagnostic Flow */}
        {!diagnosticResult ? (
          <div className="space-y-8">
            {/* Quick Symptoms Grid */}
            {quickSymptoms && quickSymptoms.length > 0 && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-premium" />
                    <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
                      {t('aiSymptomsTitle')}
                    </h2>
                  </div>
                  <span className="font-mono text-xs text-slate-500">Нажмите для выбора симптома</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {quickSymptoms.map((chip) => {
                    const isSelected = activeChipId === chip.id
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => handleSelectQuickSymptom(chip)}
                        className={`group relative flex flex-col items-start rounded-2xl border p-5 text-left transition-all ${
                          isSelected
                            ? 'border-[#E32636] bg-[var(--surface)] shadow-[0_0_20px_rgba(227,38,54,0.15)]'
                            : 'border-[var(--border)] bg-[var(--surface)]/60 hover:border-slate-500 hover:bg-[var(--surface)]'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="flex size-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--canvas)] text-premium transition group-hover:scale-105">
                            {chip.icon === 'brakes' && <Gauge className="size-4" />}
                            {chip.icon === 'suspension' && <Compass className="size-4" />}
                            {chip.icon === 'engine' && <Wrench className="size-4" />}
                            {chip.icon === 'thermometer' && <Thermometer className="size-4" />}
                            {chip.icon === 'battery' && <BatteryCharging className="size-4" />}
                            {chip.icon === 'oil' && <Wrench className="size-4" />}
                          </span>
                          {isSelected && (
                            <span className="rounded-md bg-premium px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink">
                              Выбрано
                            </span>
                          )}
                        </div>
                        <div className="mt-4 font-bold text-ink group-hover:text-premium transition">
                          {chip.title}
                        </div>
                        <div className="mt-1 line-clamp-2 font-mono text-xs text-muted">
                          {chip.short_description}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Diagnostic Input Form */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl">
              <form onSubmit={handleRunDiagnostic} className="space-y-6">
                <div>
                  <label className="mb-2 block font-mono text-xs uppercase tracking-wider text-muted">
                    Опишите неисправность, симптомы или нехарактерные звуки:
                  </label>
                  <textarea
                    rows={4}
                    value={symptom}
                    onChange={(e) => setSymptom(e.target.value)}
                    placeholder="Например: Появился сильный металлический скрежет спереди при торможении на перекрестках, педаль стала мягче, вибрация в руль..."
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4 text-sm text-ink placeholder-slate-600 outline-none transition focus:border-[#E32636]"
                  />
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <label className="font-mono text-xs uppercase tracking-wider text-muted whitespace-nowrap">
                      Текущий пробег:
                    </label>
                    <input
                      type="number"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      placeholder="120000"
                      className="w-36 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 font-mono text-xs text-ink outline-none focus:border-[#E32636]"
                    />
                    <span className="font-mono text-xs text-muted">км</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-premium px-8 py-3.5 font-mono text-xs font-bold text-ink shadow-[0_4px_20px_rgba(227,38,54,0.35)] transition hover:bg-[#D91F32] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RotateCcw className="size-4 animate-spin" />
                        <span>АНАЛИЗ ТЕЛЕМЕТРИИ...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        <span>ЗАПУСТИТЬ AI ДИАГНОСТИКУ</span>
                      </>
                    )}
                  </button>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-xl border border-[#E32636]/40 bg-premium/10 p-4 font-mono text-xs text-premium">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </form>
            </div>
          </div>
        ) : (
          /* Diagnostic Result View */
          <div className="space-y-8 animate-fade-in">
            {/* Top Status & Urgency Card */}
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
              <div className="flex flex-col gap-4 border-b border-[var(--border)] p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-xl bg-premium/15 text-premium">
                    <Sparkles className="size-6" />
                  </span>
                  <div>
                    <div className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
                      Система: <span className="text-ink font-bold">{diagnosticResult.system_affected}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-ink tracking-tight mt-0.5">
                      {diagnosticResult.primary_diagnosis}
                    </h2>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-bold ${
                      getUrgencyConfig(diagnosticResult.urgency).bg
                    }`}
                  >
                    <AlertTriangle className="size-3.5" />
                    {getUrgencyConfig(diagnosticResult.urgency).label}
                  </span>

                  {diagnosticResult.can_drive ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 font-mono text-xs font-bold text-emerald-400">
                      <ShieldCheck className="size-3.5" />
                      {t('aiCanDriveYes')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#E32636]/30 bg-premium/15 px-3 py-1 font-mono text-xs font-bold text-premium">
                      <ShieldAlert className="size-3.5" />
                      {t('aiCanDriveNo')}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-2 font-mono text-xs font-bold text-muted transition hover:text-ink"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>НОВЫЙ ЗАПРОС</span>
                  </button>
                </div>
              </div>

              {/* Critical Safety Alert Banner if present */}
              {diagnosticResult.safety_warning && (
                <div className="flex items-start gap-3 border-b border-[#E32636]/30 bg-premium/10 p-4 text-sm text-premium">
                  <AlertCircle className="size-5 shrink-0 mt-0.5" />
                  <div className="font-semibold">{diagnosticResult.safety_warning}</div>
                </div>
              )}

              {/* Diagnostic Metrics HUD Grid */}
              <div className="grid gap-6 p-6 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4">
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold text-muted">
                    <Gauge className="size-4 text-premium" />
                    <span>{t('aiConfidence')}</span>
                  </div>
                  <div className="mt-2 font-mono text-3xl font-black text-ink">
                    {Math.round(diagnosticResult.confidence_score * 100)}%
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-muted">
                    Соответствие паттернам узла
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4">
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold text-muted">
                    <Clock className="size-4 text-premium" />
                    <span>{t('aiRepairTime')}</span>
                  </div>
                  <div className="mt-2 font-mono text-3xl font-black text-ink">
                    {diagnosticResult.estimated_repair_time}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-muted">
                    Расчетное время работы мастера
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4">
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold text-muted">
                    <Wrench className="size-4 text-premium" />
                    <span>{t('aiDifficulty')}</span>
                  </div>
                  <div className="mt-2 font-mono text-lg font-black text-ink capitalize">
                    {diagnosticResult.difficulty === 'easy' && 'Базовая (своими руками)'}
                    {diagnosticResult.difficulty === 'medium' && 'Средняя (гараж / инструмент)'}
                    {diagnosticResult.difficulty === 'hard' && 'Сложная (автосервис / подъемник)'}
                    {diagnosticResult.difficulty === 'professional' && 'Профессиональная (специнструмент)'}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-muted">
                    Рекомендуемый уровень сервиса
                  </div>
                </div>
              </div>

              {/* Possible Root Causes & Technical Details */}
              <div className="border-t border-[var(--border)] p-6">
                <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-ink">
                  <AlertCircle className="size-4 text-premium" />
                  <span>{t('aiCausesTitle')}</span>
                </h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {diagnosticResult.possible_causes.map((cause, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-300">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-premium" />
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Step-by-step Interactive Inspection Checklist */}
              <div className="border-t border-[var(--border)] p-6">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-ink">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>{t('aiStepsTitle')}</span>
                  </h3>
                  <span className="font-mono text-xs text-muted">
                    Отмечайте выполненные проверки
                  </span>
                </div>
                <div className="mt-4 space-y-2.5">
                  {diagnosticResult.diagnostic_steps.map((step, idx) => {
                    const isChecked = !!checkedSteps[idx]
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleStep(idx)}
                        className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                          isChecked
                            ? 'border-emerald-500/40 bg-emerald-500/5 line-through opacity-70'
                            : 'border-[var(--border)] bg-[var(--canvas)] hover:border-slate-600'
                        }`}
                      >
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-bold ${
                            isChecked
                              ? 'border-emerald-500 bg-emerald-500 text-ink'
                              : 'border-[var(--border)] bg-[var(--surface)] text-muted'
                          }`}
                        >
                          {isChecked ? '✓' : idx + 1}
                        </span>
                        <span className="text-sm text-ink">{step}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Specialist Advice Callout */}
              <div className="border-t border-[var(--border)] bg-[var(--canvas)] p-6">
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-premium/15 text-premium">
                    <Wrench className="size-5" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold uppercase tracking-wider text-premium">
                      Совет главного инженера AUTO UNIVERSE
                    </div>
                    <p className="mt-1 text-sm text-slate-300 leading-relaxed">
                      {diagnosticResult.advice}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Parts Grid (Real Database Products) */}
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-bold uppercase tracking-widest text-premium">
                    CERTIFIED REPAIR PARTS
                  </div>
                  <h2 className="text-2xl font-black text-ink mt-0.5">
                    {t('aiPartsTitle')}
                  </h2>
                </div>
                <Link
                  to="/catalog"
                  className="flex items-center gap-1 font-mono text-xs font-bold text-premium hover:underline"
                >
                  <span>ВЕСЬ КАТАЛОГ</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>

              {diagnosticResult.recommended_products.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {diagnosticResult.recommended_products.map((part) => {
                    const isAdded = !!addedItemIds[part.id]
                    return (
                      <div
                        key={part.id}
                        className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-[#E32636]/60 shadow-xl"
                      >
                        <div>
                          {/* Image & Badges */}
                          <div className="relative aspect-square w-full overflow-hidden bg-[var(--canvas)] p-4 flex items-center justify-center">
                            {part.image_url ? (
                              <img
                                src={part.image_url}
                                alt={part.name}
                                className="size-full object-contain transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="grid size-full place-items-center font-mono text-xl font-black text-[#242A32]">
                                AUTO UNIVERSE
                              </div>
                            )}

                            {/* Fitment badge */}
                            <div className="absolute left-3 top-3">
                              {part.fitment_status === 'compatible' && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/90 px-2 py-0.5 font-mono text-[10px] font-bold text-ink shadow">
                                  <CheckCircle2 className="size-3" />
                                  100% ПОДХОДИТ
                                </span>
                              )}
                              {part.fitment_status === 'not_compatible' && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-premium/90 px-2 py-0.5 font-mono text-[10px] font-bold text-ink shadow">
                                  <XCircle className="size-3" />
                                  НЕ ПОДХОДИТ
                                </span>
                              )}
                              {part.fitment_status === 'unknown' && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[#242A32]/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted">
                                  <HelpCircle className="size-3" />
                                  ТРЕБУЕТСЯ VIN
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-4">
                            <div className="font-mono text-xs font-bold text-premium uppercase tracking-wider">
                              {part.brand_name} · <span className="text-muted">{part.sku}</span>
                            </div>
                            <Link
                              to={`/product/${part.slug}`}
                              className="mt-1 block font-bold text-ink text-sm line-clamp-2 transition hover:text-premium"
                            >
                              {part.name}
                            </Link>
                            <div className="mt-2 text-xs text-muted line-clamp-2">
                              {part.relevance_reason}
                            </div>
                          </div>
                        </div>

                        {/* Footer: Price & Add to Cart */}
                        <div className="border-t border-[var(--border)] p-4 bg-[var(--canvas)]/50">
                          <div className="flex items-baseline justify-between">
                            <div>
                              <div className="font-mono text-lg font-black text-ink">
                                {Number(part.price).toFixed(2)} TJS
                              </div>
                              {part.old_price && (
                                <div className="font-mono text-xs line-through text-slate-500">
                                  {Number(part.old_price).toFixed(2)} TJS
                                </div>
                              )}
                            </div>
                            <div className="font-mono text-right text-xs">
                              {part.stock_quantity > 0 ? (
                                <span className="font-bold text-emerald-400">
                                  В НАЛИЧИИ ({part.stock_quantity})
                                </span>
                              ) : (
                                <span className="text-slate-500">ПОД ЗАКАЗ</span>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAddToCart(part)}
                              disabled={part.stock_quantity <= 0}
                              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 font-mono text-xs font-bold transition ${
                                isAdded
                                  ? 'bg-emerald-600 text-ink'
                                  : 'bg-premium text-ink hover:bg-[#D91F32]'
                              } disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                              <ShoppingCart className="size-3.5" />
                              <span>{isAdded ? 'ДОБАВЛЕНО!' : 'В КОРЗИНУ'}</span>
                            </button>

                            <Link
                              to={`/product/${part.slug}`}
                              className="grid size-9 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-muted transition hover:border-[#E32636] hover:text-ink"
                              title="Подробнее о детали"
                            >
                              <ArrowRight className="size-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
                  <p className="font-mono text-sm text-muted">
                    Для данной проблемы нет точных совпадений на локальном складе.
                  </p>
                  <Link
                    to="/catalog"
                    className="mt-3 inline-block font-mono text-xs font-bold text-premium hover:underline"
                  >
                    Перейти в каталог для ручного подбора по VIN
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
