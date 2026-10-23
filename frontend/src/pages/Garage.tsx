import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Car,
  CheckCircle2,
  ChevronRight,
  Plus,
  RotateCcw,
  ShieldCheck,
  Star,
  Trash2,
  Wrench,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { UserVehicle } from '../types'
import { useAuth } from '../stores/auth'
import { useGarage } from '../stores/garage'

export default function Garage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const {
    vehicles,
    vehicleTree,
    loadGarage,
    loadVehicleTree,
    addVehicle,
    removeVehicle,
    selectVehicle,
    selectedVehicleId,
  } = useGarage()

  const [form, setForm] = useState({
    name: '',
    make_id: '',
    model_id: '',
    generation_id: '',
    year: '',
    vin: '',
    is_primary: false,
  })
  const [error, setError] = useState('')
  const [isAddingMode, setIsAddingMode] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const tree = useQuery({
    queryKey: ['vehicle-tree'],
    queryFn: loadVehicleTree,
    enabled: Boolean(user),
  })

  useEffect(() => {
    if (user) void loadGarage()
  }, [user])

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        name: form.name.trim() || undefined,
        make_id: form.make_id,
        model_id: form.model_id || null,
        generation_id: form.generation_id || null,
        year: form.year ? Number(form.year) : null,
        vin: form.vin.trim().length === 17 ? form.vin.trim().toUpperCase() : null,
        is_primary: form.is_primary,
      }
      return addVehicle(payload)
    },
    async onSuccess() {
      setForm({
        name: '',
        make_id: '',
        model_id: '',
        generation_id: '',
        year: '',
        vin: '',
        is_primary: false,
      })
      setError('')
      setIsAddingMode(false)
      setSuccessToast('Автомобиль успешно добавлен в ваш гараж AU.')
      setTimeout(() => setSuccessToast(null), 3000)
    },
    onError(err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить автомобиль')
    },
  })

  // Selected or active vehicle
  const activeVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) ||
    vehicles.find((v) => v.is_primary) ||
    vehicles[0]

  const selectedMake = vehicleTree.find((item) => item.id === form.make_id)
  const selectedModel = selectedMake?.models.find((item) => item.id === form.model_id)

  // Popular makes quick select
  const popularMakeNames = ['BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Toyota', 'Lexus', 'Volkswagen', 'Hyundai']
  const popularMakes = vehicleTree.filter((m) => popularMakeNames.includes(m.name))

  if (!user) {
    return (
      <div className="min-h-[75vh] bg-[#0B0D10] text-slate-100 flex items-center justify-center px-4 py-16">
        <div className="relative max-w-lg w-full rounded-2xl border border-[#242A32] bg-gradient-to-b from-[#15191F] to-[#0B0D10] p-8 sm:p-10 text-center shadow-2xl overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-20 size-60 bg-[#E32636]/10 blur-3xl rounded-full" />
          <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-[#242A32] bg-[#0B0D10] text-[#E32636] shadow-xl">
            <Car className="size-8" />
          </div>
          <div className="mt-6 font-mono text-xs uppercase tracking-widest text-[#E32636]">
            AU GARAGE HANGAR
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-white">
            {t('myGarage')}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#A5ACB5]">
            Добавьте свой автомобиль, чтобы каталог автоматически фильтровал совместимые запчасти, исключая ошибки подбора на 100%.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/login"
              className="flex-1 rounded-xl bg-[#E32636] px-6 py-3.5 font-mono text-xs font-bold text-white transition hover:bg-[#D91F32]"
            >
              ВОЙТИ В АККАУНТ
            </Link>
            <Link
              to="/register"
              className="flex-1 rounded-xl border border-[#242A32] bg-[#15191F] px-6 py-3.5 font-mono text-xs font-bold text-[#A5ACB5] transition hover:border-slate-500 hover:text-white"
            >
              РЕГИСТРАЦИЯ
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] text-slate-100 pb-24 selection:bg-[#E32636] selection:text-white">
      {/* Background Architectural Grid Lines */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(227,38,54,0.06),rgba(255,255,255,0))] opacity-50" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        {/* Monospace Telemetry Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242A32] pb-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-[#E32636]">
              <span className="size-2 rounded-full bg-[#E32636] animate-pulse" />
              <span>AU PERFORMANCE GARAGE</span>
              <span className="text-[#242A32]">/</span>
              <span className="text-[#A5ACB5]">HANGAR TELEMETRY</span>
            </div>
            <h1 className="mt-2 text-3xl font-black text-white tracking-tight">
              Мой гараж
            </h1>
            <p className="mt-1 text-sm text-[#A5ACB5]">
              Интеллектуальная система контроля совместимости и профиль ваших автомобилей.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAddingMode(!isAddingMode)}
              className="flex items-center gap-2 rounded-xl bg-[#E32636] px-5 py-3 font-mono text-xs font-bold text-white shadow-lg transition hover:bg-[#D91F32]"
            >
              <Plus className="size-4" />
              <span>{isAddingMode ? 'СКРЫТЬ КОНФИГУРАТОР' : 'ДОБАВИТЬ АВТОМОБИЛЬ'}</span>
            </button>
          </div>
        </div>

        {/* Success Alert Toast */}
        {successToast && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-400 animate-fade-in">
            <CheckCircle2 className="size-4" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Active Vehicle Hero Card (if user has vehicles) */}
        {activeVehicle && (
          <section className="mt-8 rounded-2xl border border-[#242A32] bg-gradient-to-b from-[#15191F] via-[#101317] to-[#0B0D10] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="pointer-events-none absolute right-0 top-0 size-80 bg-[#E32636]/5 blur-3xl rounded-full" />

            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Vehicle Title & Specs */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    АКТИВНЫЙ АВТОМОБИЛЬ ДЛЯ ПОДБОРА
                  </span>
                  {activeVehicle.is_primary && (
                    <span className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      <Star className="size-3 fill-current" />
                      ОСНОВНОЙ
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  {activeVehicle.name || `${activeVehicle.make.name} ${activeVehicle.model?.name || ''}`}
                </h2>

                <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-[#A5ACB5]">
                  <span className="text-white font-bold">{activeVehicle.make.name}</span>
                  {activeVehicle.model && <span>/ {activeVehicle.model.name}</span>}
                  {activeVehicle.generation && <span>/ {activeVehicle.generation.name}</span>}
                  {activeVehicle.year && (
                    <span className="rounded bg-[#242A32] px-2 py-0.5 text-white">
                      ГОД: {activeVehicle.year}
                    </span>
                  )}
                  {activeVehicle.vin && (
                    <span className="rounded bg-[#242A32] px-2 py-0.5 text-[#E32636] font-bold">
                      VIN: {activeVehicle.vin}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 text-xs text-emerald-400">
                  <ShieldCheck className="size-4 shrink-0" />
                  <span>Каталог настроен: все детали помечаются 100% совместимостью.</span>
                </div>
              </div>

              {/* Fast Telemetry Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <Link
                  to={`/catalog?vehicle_id=${activeVehicle.id}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#E32636] px-6 py-3.5 font-mono text-xs font-bold text-white shadow-[0_4px_20px_rgba(227,38,54,0.35)] transition hover:bg-[#D91F32]"
                >
                  <Wrench className="size-4" />
                  <span>ПОДХОДЯЩИЕ ДЕТАЛИ</span>
                  <ArrowRight className="size-4" />
                </Link>

                <Link
                  to="/ai-mechanic"
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#242A32] bg-[#15191F] px-5 py-3.5 font-mono text-xs font-bold text-slate-200 transition hover:border-[#E32636] hover:text-white"
                >
                  <Bot className="size-4 text-[#E32636]" />
                  <span>AI МЕХАНИК</span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Vehicle Configurator Section (Collapsible or Triggered) */}
        {isAddingMode && (
          <section className="mt-8 rounded-2xl border border-[#242A32] bg-[#15191F] p-6 sm:p-8 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#242A32] pb-4">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#E32636]">
                  CONFIGURATOR
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  Конфигуратор автомобиля
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingMode(false)}
                className="font-mono text-xs text-[#A5ACB5] hover:text-white"
              >
                Закрыть [×]
              </button>
            </div>

            {/* Popular makes quick select chips */}
            {popularMakes.length > 0 && (
              <div className="mt-6">
                <div className="font-mono text-xs uppercase tracking-wider text-[#A5ACB5] mb-2">
                  Быстрый выбор популярной марки:
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularMakes.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          make_id: m.id,
                          model_id: '',
                          generation_id: '',
                          name: form.name || m.name,
                        })
                      }
                      className={`rounded-xl border px-3.5 py-2 font-mono text-xs font-bold transition ${
                        form.make_id === m.id
                          ? 'border-[#E32636] bg-[#E32636]/15 text-[#E32636]'
                          : 'border-[#242A32] bg-[#0B0D10] text-[#A5ACB5] hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              className="mt-6 space-y-6"
              onSubmit={(e) => {
                e.preventDefault()
                void createMutation.mutateAsync().catch(() => undefined)
              }}
            >
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Make Select */}
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#A5ACB5] mb-2">
                    Марка авто <span className="text-[#E32636]">*</span>
                  </label>
                  <select
                    required
                    value={form.make_id}
                    onChange={(e) => {
                      const makeId = e.target.value
                      const m = vehicleTree.find((item) => item.id === makeId)
                      setForm({
                        ...form,
                        make_id: makeId,
                        model_id: '',
                        generation_id: '',
                        name: m ? m.name : form.name,
                      })
                    }}
                    className="w-full rounded-xl border border-[#242A32] bg-[#0B0D10] px-4 py-3 font-mono text-xs text-white outline-none focus:border-[#E32636]"
                  >
                    <option value="">Выберите марку</option>
                    {vehicleTree.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model Select */}
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#A5ACB5] mb-2">
                    Модель
                  </label>
                  <select
                    disabled={!selectedMake}
                    value={form.model_id}
                    onChange={(e) => {
                      const modelId = e.target.value
                      const mod = selectedMake?.models.find((item) => item.id === modelId)
                      setForm({
                        ...form,
                        model_id: modelId,
                        generation_id: '',
                        name: selectedMake && mod ? `${selectedMake.name} ${mod.name}` : form.name,
                      })
                    }}
                    className="w-full rounded-xl border border-[#242A32] bg-[#0B0D10] px-4 py-3 font-mono text-xs text-white outline-none focus:border-[#E32636] disabled:opacity-40"
                  >
                    <option value="">
                      {selectedMake ? 'Выберите модель' : 'Сначала выберите марку'}
                    </option>
                    {selectedMake?.models.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Generation Select */}
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#A5ACB5] mb-2">
                    Поколение / Кузов
                  </label>
                  <select
                    disabled={!selectedModel || selectedModel.generations.length === 0}
                    value={form.generation_id}
                    onChange={(e) => setForm({ ...form, generation_id: e.target.value })}
                    className="w-full rounded-xl border border-[#242A32] bg-[#0B0D10] px-4 py-3 font-mono text-xs text-white outline-none focus:border-[#E32636] disabled:opacity-40"
                  >
                    <option value="">Все поколения</option>
                    {selectedModel?.generations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.year_from ? ` (${item.year_from}–${item.year_to ?? '…'})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year */}
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#A5ACB5] mb-2">
                    Год выпуска
                  </label>
                  <input
                    type="number"
                    min={1950}
                    max={2030}
                    placeholder="напр. 2021"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full rounded-xl border border-[#242A32] bg-[#0B0D10] px-4 py-3 font-mono text-xs text-white placeholder-slate-600 outline-none focus:border-[#E32636]"
                  />
                </div>
              </div>

              {/* Row 2: VIN and Custom Vehicle Name */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#A5ACB5] mb-2">
                    Название в гараже
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="напр. Мой W213 на каждый день"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-[#242A32] bg-[#0B0D10] px-4 py-3 font-mono text-xs text-white placeholder-slate-600 outline-none focus:border-[#E32636]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#A5ACB5] mb-2">
                    VIN-код (17 символов, опционально)
                  </label>
                  <input
                    type="text"
                    maxLength={17}
                    placeholder="напр. WBA3A5C50DF123456"
                    value={form.vin}
                    onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-[#242A32] bg-[#0B0D10] px-4 py-3 font-mono text-xs text-white uppercase placeholder-slate-600 outline-none focus:border-[#E32636]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_primary_checkbox"
                  checked={form.is_primary}
                  onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                  className="size-4 accent-[#E32636] rounded"
                />
                <label
                  htmlFor="is_primary_checkbox"
                  className="font-mono text-xs text-slate-300 cursor-pointer select-none"
                >
                  Сделать основным автомобилем по умолчанию
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-[#E32636]/40 bg-[#E32636]/10 px-4 py-3 text-xs font-mono text-[#E32636]">
                  <AlertCircle className="size-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingMode(false)}
                  className="rounded-xl border border-[#242A32] bg-[#0B0D10] px-6 py-3 font-mono text-xs font-bold text-[#A5ACB5] transition hover:text-white"
                >
                  ОТМЕНА
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !form.make_id}
                  className="flex items-center gap-2 rounded-xl bg-[#E32636] px-8 py-3 font-mono text-xs font-bold text-white shadow-lg transition hover:bg-[#D91F32] disabled:opacity-40"
                >
                  {createMutation.isPending ? (
                    <RotateCcw className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  <span>СОХРАНИТЬ В ГАРАЖ</span>
                </button>
              </div>
            </form>
          </section>
        )}

        {/* User's Vehicle Fleet */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#A5ACB5]">
                SAVED FLEET
              </span>
              <h2 className="text-xl font-black text-white mt-0.5">
                Автомобили в вашем ангаре ({vehicles.length})
              </h2>
            </div>
            {tree.isLoading && (
              <span className="font-mono text-xs text-[#A5ACB5]">Загрузка каталога...</span>
            )}
          </div>

          {vehicles.length === 0 ? (
            <div className="rounded-2xl border border-[#242A32] bg-[#15191F] p-12 text-center shadow-xl">
              <Car className="mx-auto size-12 text-[#242A32]" />
              <h3 className="mt-4 text-lg font-bold text-white">Гараж пуст</h3>
              <p className="mt-2 text-sm text-[#A5ACB5] max-w-md mx-auto">
                Добавьте свой первый автомобиль, чтобы активировать персональный фильтр совместимости в каталоге деталей.
              </p>
              <button
                type="button"
                onClick={() => setIsAddingMode(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#E32636] px-6 py-3 font-mono text-xs font-bold text-white hover:bg-[#D91F32] transition"
              >
                <Plus className="size-4" />
                <span>ДОБАВИТЬ ПЕРВЫЙ АВТОМОБИЛЬ</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle: UserVehicle) => {
                const isSelected = vehicle.id === selectedVehicleId
                return (
                  <div
                    key={vehicle.id}
                    className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#E32636] bg-[#15191F] shadow-[0_0_20px_rgba(227,38,54,0.15)]'
                        : 'border-[#242A32] bg-[#15191F]/60 hover:border-slate-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-base">
                              {vehicle.name}
                            </h3>
                            {vehicle.is_primary && (
                              <Star className="size-3.5 fill-[#E32636] text-[#E32636]" />
                            )}
                          </div>
                          <div className="mt-1 font-mono text-xs text-[#A5ACB5]">
                            {vehicle.make.name}
                            {vehicle.model ? ` ${vehicle.model.name}` : ''}
                            {vehicle.generation ? ` · ${vehicle.generation.name}` : ''}
                          </div>
                        </div>

                        <button
                          type="button"
                          aria-label={t('remove')}
                          onClick={() => void removeVehicle(vehicle.id)}
                          className="rounded-lg border border-[#242A32] p-2 text-slate-500 hover:border-[#E32636] hover:text-[#E32636] transition"
                          title="Удалить из гаража"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      {vehicle.year && (
                        <div className="mt-3 font-mono text-[11px] text-[#A5ACB5]">
                          Год выпуска: <span className="text-white font-bold">{vehicle.year}</span>
                        </div>
                      )}
                      {vehicle.vin && (
                        <div className="mt-1 font-mono text-[11px] text-[#A5ACB5]">
                          VIN: <span className="text-[#E32636] font-bold">{vehicle.vin}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#242A32] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => selectVehicle(isSelected ? null : vehicle.id)}
                        className={`rounded-xl border px-3.5 py-2 font-mono text-xs font-bold transition ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                            : 'border-[#242A32] bg-[#0B0D10] text-[#A5ACB5] hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓ ВЫБРАН' : 'ВЫБРАТЬ'}
                      </button>

                      <Link
                        to={`/catalog?vehicle_id=${vehicle.id}`}
                        className="font-mono text-xs font-bold text-[#E32636] hover:underline flex items-center gap-1"
                      >
                        <span>Запчасти</span>
                        <ChevronRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
