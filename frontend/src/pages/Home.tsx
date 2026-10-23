import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Car,
  ChevronRight,
  Gauge,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import ProductCard from '../components/product/ProductCard'
import { api } from '../lib/api'
import type { PaginatedProducts } from '../types'
import { useAuth } from '../stores/auth'
import { useGarage } from '../stores/garage'

// 8 Curated Premium Categories with studio photography & automotive color signatures
const LUXURY_CATEGORIES = [
  {
    id: 'engine',
    title: 'Двигатель',
    subtitle: 'Турбины, поршневая группа, ГРМ',
    count: '2 850+ деталей',
    image: 'https://images.unsplash.com/photo-1597766353926-f04b204e3895?auto=format&fit=crop&w=800&q=80',
    query: 'engine',
    color: '#E32636',
    glow: 'rgba(227, 38, 54, 0.45)',
    badgeBg: 'bg-[#E32636]/15 text-[#E32636] border-[#E32636]/30',
  },
  {
    id: 'brakes',
    title: 'Тормозная система',
    subtitle: 'Перфорированные диски, суппорты, колодки',
    count: '1 940+ деталей',
    image: 'https://images.unsplash.com/photo-1600790142055-619df03207e6?auto=format&fit=crop&w=800&q=80',
    query: 'brakes',
    color: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.45)',
    badgeBg: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
  },
  {
    id: 'suspension',
    title: 'Подвеска',
    subtitle: 'Койловеры, адаптивные амортизаторы, рычаги',
    count: '1 620+ деталей',
    image: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80',
    query: 'suspension',
    color: '#0080FF',
    glow: 'rgba(0, 128, 255, 0.45)',
    badgeBg: 'bg-[#0080FF]/15 text-[#0080FF] border-[#0080FF]/30',
  },
  {
    id: 'filters',
    title: 'Фильтры',
    subtitle: 'Масляные, салонные HEPA, нулевого сопротивления',
    count: '1 280+ деталей',
    image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80',
    query: 'filters',
    color: '#10B981',
    glow: 'rgba(16, 185, 129, 0.45)',
    badgeBg: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30',
  },
  {
    id: 'fluids',
    title: 'Масла',
    subtitle: 'Синтетика PAO/Ester, допуски OEM, антифризы',
    count: '890+ позиций',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    query: 'oil',
    color: '#FBBF24',
    glow: 'rgba(251, 191, 36, 0.45)',
    badgeBg: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
  },
  {
    id: 'electrical',
    title: 'Электрика',
    subtitle: 'Лазерная оптика, датчики, свечи, блоки ECU',
    count: '2 150+ деталей',
    image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80',
    query: 'electrical',
    color: '#00F0FF',
    glow: 'rgba(0, 240, 255, 0.45)',
    badgeBg: 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/30',
  },
  {
    id: 'body',
    title: 'Кузов',
    subtitle: 'Карбоновые сплиттеры, бамперы, диффузоры',
    count: '1 430+ деталей',
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
    query: 'body',
    color: '#E2E8F0',
    glow: 'rgba(255, 255, 255, 0.3)',
    badgeBg: 'bg-white/10 text-white border-white/20',
  },
  {
    id: 'wheels',
    title: 'Шины и диски',
    subtitle: 'Кованые диски, UHP-шины, полуслики',
    count: '760+ моделей',
    image: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80',
    query: 'tires',
    color: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.45)',
    badgeBg: 'bg-[#A855F7]/15 text-[#A855F7] border-[#A855F7]/30',
  },
]

// Performance Engineering Pillars
const PERFORMANCE_PILLARS = [
  {
    title: 'Turbo Systems',
    desc: 'Высокопроизводительные турбокомпрессоры, интеркулеры и системы впуска с минимальным лагом.',
    spec: 'BOOST +1.8 BAR // STAGE 2+',
    image: 'https://images.unsplash.com/photo-1597766353926-f04b204e3895?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Braking Performance',
    desc: 'Карбон-керамические составы, 6-поршневые моноблочные суппорты и армированные тормозные магистрали.',
    spec: 'CARBON-CERAMIC // 390MM',
    image: 'https://images.unsplash.com/photo-1600790142055-619df03207e6?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Suspension Upgrades',
    desc: 'Винтовая регулируемая подвеска с 24 уровнями жесткости отбоя и сжатия для идеального баланса шасси.',
    spec: 'COILOVER 2-WAY // SHOCK ABSORPTION',
    image: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Exhaust Systems',
    desc: 'Титановые и жаропрочные выпускные тракты с электронно-управляемыми заслонками спортивного тембра.',
    spec: 'TITANIUM ALLOY // ACTIVE VALVES',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
  },
]

// Iconic Monochromatic Brands Showcase
const FEATURED_BRANDS = [
  { name: 'Brembo', country: 'Италия', spec: 'HIGH PERFORMANCE BRAKES' },
  { name: 'Bosch', country: 'Германия', spec: 'ORIGINAL EQUIPMENT' },
  { name: 'Motul', country: 'Франция', spec: 'ESTERT REFINED FLUIDS' },
  { name: 'Bilstein', country: 'Германия', spec: 'CHASSIS ENGINEERING' },
  { name: 'Michelin', country: 'Франция', spec: 'PILOT SPORT TECHNOLOGY' },
  { name: 'Akrapovič', country: 'Словения', spec: 'TITANIUM EXHAUST' },
  { name: 'Liqui Moly', country: 'Германия', spec: 'GERMAN OIL TECH' },
  { name: 'Denso', country: 'Япония', spec: 'IRIDIUM PRECISION' },
  { name: 'Mann-Filter', country: 'Германия', spec: 'AIR & FLUID PURITY' },
  { name: 'ZF Sachs', country: 'Германия', spec: 'DRIVETRAIN DYNAMICS' },
]

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { vehicles, selectedVehicleId, loadGarage, vehicleTree } = useGarage()

  // Vehicle Finder State
  const [finderMode, setFinderMode] = useState<'car' | 'vin' | 'oem'>('car')
  const [selectedMake, setSelectedMake] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [selectedEngine, setSelectedEngine] = useState<string>('')
  const [vinQuery, setVinQuery] = useState<string>('')
  const [oemQuery, setOemQuery] = useState<string>('')

  // Bestsellers / Deals tab
  const [productTab, setProductTab] = useState<'popular' | 'deals' | 'new'>('popular')

  // Load garage data safely inside useEffect
  useEffect(() => {
    if (user) {
      void loadGarage()
    }
  }, [user])

  // Catalog queries
  const bestsellers = useQuery({
    queryKey: ['home-products'],
    queryFn: () => api.get<PaginatedProducts>('/catalog/products', { sort: 'popular', limit: 8 }),
  })

  const deals = useQuery({
    queryKey: ['home-deals'],
    queryFn: () => api.get<PaginatedProducts>('/catalog/products', { has_discount: true, sort: 'discount', limit: 8 }),
  })

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)

  // Makes from tree or fallback list
  const makesList = useMemo(() => {
    if (vehicleTree && vehicleTree.length > 0) {
      return vehicleTree.map((item) => item.name)
    }
    return [
      'Porsche',
      'BMW',
      'Mercedes-Benz',
      'Audi',
      'Toyota',
      'Lexus',
      'Land Rover',
      'Volkswagen',
      'Hyundai',
      'Kia',
    ]
  }, [vehicleTree])

  // Models based on selected make
  const modelsList = useMemo(() => {
    if (!selectedMake) return []
    const match = vehicleTree?.find((v) => v.name === selectedMake)
    if (match && match.models) {
      return match.models.map((m) => m.name)
    }
    // Fallback model list
    if (selectedMake === 'Porsche') return ['911 (992)', '911 (991)', 'Cayenne', 'Panamera', 'Macan', 'Taycan']
    if (selectedMake === 'BMW') return ['M3 / M4 (G80)', 'M5 (F90)', 'X5 (G05)', 'X7 (G07)', '3 Series (G20)', '5 Series (G30)']
    if (selectedMake === 'Mercedes-Benz') return ['S-Class (W223)', 'E-Class (W213)', 'G-Class (W463)', 'AMG GT', 'GLE (W167)']
    if (selectedMake === 'Audi') return ['RS6 Avant', 'RS7 Sportback', 'R8', 'Q8', 'A6 (C8)']
    if (selectedMake === 'Toyota') return ['Land Cruiser 300', 'Land Cruiser Prado', 'Camry', 'RAV4', 'Supra']
    if (selectedMake === 'Lexus') return ['LX 600', 'LX 570', 'RX 350', 'GX 460', 'ES 250']
    return ['Стандартная серия', 'Sport Package', 'Executive']
  }, [selectedMake, vehicleTree])

  const yearsList = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015']

  const enginesList = useMemo(() => {
    if (!selectedModel) return []
    return ['3.0L Twin-Turbo (450 HP)', '4.0L V8 BiTurbo (600 HP)', '2.0L Turbo Inline-4', '3.5L V6 Naturally Aspirated', '4.4L V8 TwinPower']
  }, [selectedModel])

  function handleVehicleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (finderMode === 'car') {
      const params = new URLSearchParams()
      if (selectedMake) params.set('make', selectedMake)
      if (selectedModel) params.set('model', selectedModel)
      if (selectedYear) params.set('year', selectedYear)
      navigate(`/catalog?${params.toString()}`)
    } else if (finderMode === 'vin') {
      if (vinQuery.trim()) {
        navigate(`/catalog?q=${encodeURIComponent(vinQuery.trim())}&filter=vin`)
      }
    } else if (finderMode === 'oem') {
      if (oemQuery.trim()) {
        navigate(`/catalog?q=${encodeURIComponent(oemQuery.trim())}`)
      }
    }
  }

  const activeProducts = productTab === 'deals' ? deals.data?.items ?? [] : bestsellers.data?.items ?? []
  const isProductsLoading = productTab === 'deals' ? deals.isLoading : bestsellers.isLoading

  return (
    <div className="min-h-screen bg-[#0B0D10] text-[#FFFFFF] selection:bg-[#E32636]/30">
      {/* 1. CINEMATIC HERO */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden border-b border-[#242A32]/60">
        {/* Background Supercar Image with Precision Lighting */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=2400&q=85"
            alt="Porsche Luxury Performance"
            className="size-full object-cover object-center brightness-[0.75] contrast-[1.12]"
          />
          {/* Obsidian Vignette Gradients */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 40%, rgba(11,13,16,0.3) 0%, rgba(11,13,16,0.85) 75%, #0B0D10 100%)',
            }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#0B0D10] via-transparent to-[#0B0D10]/80"
          />
          {/* Subtle Red Aerodynamic Glow */}
          <div
            className="pointer-events-none absolute bottom-1/4 right-1/4 size-[500px] rounded-full opacity-20 blur-[140px]"
            style={{ background: 'radial-gradient(circle, #E32636, transparent 70%)' }}
          />
          {/* Subtle Grid Accent */}
          <div className="absolute inset-0 bg-automotive-grid opacity-40 pointer-events-none" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-28 sm:py-36 flex flex-col items-center text-center">
          {/* Top Telemetry HUD Tag */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-6"
          >
            <span className="racing-badge">
              <span className="size-1.5 rounded-full bg-premium animate-ping" />
              AU PERFORMANCE LUXURY
            </span>
            <span className="hidden sm:inline-block font-mono text-[11px] tracking-[0.2em] text-[#A5ACB5]/70 uppercase">
              [LAT: 38.5598° N / LON: 68.7870° E • DUSHANBE]
            </span>
          </motion.div>

          {/* Main Display Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="max-w-4xl text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight leading-[0.95] text-white"
          >
            ДЕТАЛИ, ДОСТОЙНЫЕ <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-[#A5ACB5]">
              ТВОЕГО АВТОМОБИЛЯ.
            </span>
          </motion.h1>

          {/* Supporting Text */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 max-w-2xl text-base sm:text-lg md:text-xl text-[#A5ACB5] leading-relaxed font-normal"
          >
            Оригинальные запчасти, проверенные аналоги и точный подбор для вашего автомобиля.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              to="/catalog"
              className="group inline-flex items-center gap-3 rounded-xl bg-premium px-8 py-4 font-bold text-white transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_30px_rgba(227,38,54,0.5)] hover:-translate-y-0.5"
            >
              <span className="tracking-wide uppercase text-sm">Найти запчасти</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <a
              href="#vehicle-finder"
              className="inline-flex items-center gap-2.5 rounded-xl border border-[#242A32] bg-[#15191F]/80 backdrop-blur-md px-7 py-4 font-bold text-white transition-all duration-300 hover:border-premium hover:text-premium hover:-translate-y-0.5"
            >
              <Car className="size-4" />
              <span className="tracking-wide uppercase text-sm">Подобрать по авто</span>
            </a>
          </motion.div>

          {/* Quick HUD Metrics Bar with Vibrant Automotive Colors */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-16 grid grid-cols-2 gap-4 border-t border-[#242A32]/60 pt-8 sm:grid-cols-4 max-w-4xl w-full text-left"
          >
            <div className="border-l-2 border-[#E32636] pl-3.5 bg-gradient-to-r from-[#E32636]/10 to-transparent py-1 rounded-r-lg">
              <span className="block font-mono text-[10px] text-[#E32636] uppercase tracking-wider font-bold">Каталог OEM</span>
              <span className="text-lg font-black text-white font-mono">150,000+ SKU</span>
            </div>
            <div className="border-l-2 border-[#10B981] pl-3.5 bg-gradient-to-r from-[#10B981]/10 to-transparent py-1 rounded-r-lg">
              <span className="block font-mono text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Подлинность</span>
              <span className="text-lg font-black text-white font-mono">100% Сертификат</span>
            </div>
            <div className="border-l-2 border-[#F59E0B] pl-3.5 bg-gradient-to-r from-[#F59E0B]/10 to-transparent py-1 rounded-r-lg">
              <span className="block font-mono text-[10px] text-amber-400 uppercase tracking-wider font-bold">AU Club Кэшбэк</span>
              <span className="text-lg font-black text-white font-mono">1 Балл = 1 TJS</span>
            </div>
            <div className="border-l-2 border-[#00F0FF] pl-3.5 bg-gradient-to-r from-[#00F0FF]/10 to-transparent py-1 rounded-r-lg">
              <span className="block font-mono text-[10px] text-[#00F0FF] uppercase tracking-wider font-bold">Экспресс Душанбе</span>
              <span className="text-lg font-black text-white font-mono">2-24 ч Доставка</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. SMART VEHICLE FINDER CONFIGURATOR */}
      <section id="vehicle-finder" className="relative z-20 -mt-10 mx-auto max-w-6xl px-4 scroll-mt-24">
        <div className="rounded-2xl border border-[#242A32] bg-[#15191F]/95 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          {/* Tabs header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#242A32] pb-5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-premium animate-pulse" />
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Интеллектуальный конфигуратор подбора
              </h2>
            </div>

            <div className="flex rounded-lg border border-[#242A32] bg-[#0B0D10] p-1 text-xs">
              <button
                type="button"
                onClick={() => setFinderMode('car')}
                className={`rounded-md px-3.5 py-1.5 font-bold transition ${
                  finderMode === 'car' ? 'bg-premium text-white shadow' : 'text-[#A5ACB5] hover:text-white'
                }`}
              >
                По автомобилю
              </button>
              <button
                type="button"
                onClick={() => setFinderMode('vin')}
                className={`rounded-md px-3.5 py-1.5 font-bold transition ${
                  finderMode === 'vin' ? 'bg-premium text-white shadow' : 'text-[#A5ACB5] hover:text-white'
                }`}
              >
                Поиск по VIN
              </button>
              <button
                type="button"
                onClick={() => setFinderMode('oem')}
                className={`rounded-md px-3.5 py-1.5 font-bold transition ${
                  finderMode === 'oem' ? 'bg-premium text-white shadow' : 'text-[#A5ACB5] hover:text-white'
                }`}
              >
                По OEM / артикулу
              </button>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleVehicleSubmit} className="mt-6">
            {finderMode === 'car' && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A5ACB5] mb-1.5 tracking-wider">
                    Марка автомобиля
                  </label>
                  <select
                    value={selectedMake}
                    onChange={(e) => {
                      setSelectedMake(e.target.value)
                      setSelectedModel('')
                      setSelectedEngine('')
                    }}
                    className="w-full rounded-xl border border-[#242A32] bg-[#0B0D10] px-3.5 py-3 text-sm text-white outline-none focus:border-premium transition"
                  >
                    <option value="">Выберите марку</option>
                    {makesList.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A5ACB5] mb-1.5 tracking-wider">
                    Модель
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value)
                      setSelectedEngine('')
                    }}
                    disabled={!selectedMake}
                    className="w-full rounded-xl border border-[#242A32] bg-[#0B0D10] px-3.5 py-3 text-sm text-white outline-none focus:border-premium transition disabled:opacity-40"
                  >
                    <option value="">Выберите модель</option>
                    {modelsList.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A5ACB5] mb-1.5 tracking-wider">
                    Год выпуска
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    disabled={!selectedModel}
                    className="w-full rounded-xl border border-[#242A32] bg-[#0B0D10] px-3.5 py-3 text-sm text-white outline-none focus:border-premium transition disabled:opacity-40"
                  >
                    <option value="">Любой год</option>
                    {yearsList.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A5ACB5] mb-1.5 tracking-wider">
                    Двигатель / Модификация
                  </label>
                  <select
                    value={selectedEngine}
                    onChange={(e) => setSelectedEngine(e.target.value)}
                    disabled={!selectedModel}
                    className="w-full rounded-xl border border-[#242A32] bg-[#0B0D10] px-3.5 py-3 text-sm text-white outline-none focus:border-premium transition disabled:opacity-40"
                  >
                    <option value="">Все двигатели</option>
                    {enginesList.map((eng) => (
                      <option key={eng} value={eng}>
                        {eng}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {finderMode === 'vin' && (
              <div className="space-y-3">
                <label className="block text-[11px] font-mono uppercase text-[#A5ACB5] tracking-wider">
                  17-значный идентификационный номер (VIN)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    maxLength={17}
                    placeholder="Например: WP0AB2A99NS248190"
                    value={vinQuery}
                    onChange={(e) => setVinQuery(e.target.value.toUpperCase())}
                    className="flex-1 font-mono uppercase rounded-xl border border-[#242A32] bg-[#0B0D10] px-4 py-3 text-sm text-white outline-none focus:border-premium transition"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-premium px-6 py-3 font-bold text-white transition hover:brightness-110 flex items-center justify-center gap-2"
                  >
                    <Search className="size-4" />
                    <span>Проверить VIN</span>
                  </button>
                </div>
                <p className="text-xs text-[#A5ACB5]/70 italic">
                  * Поиск по VIN проходит проверку по оригинальным каталогам OEM. Требуется сверка с паспортом авто.
                </p>
              </div>
            )}

            {finderMode === 'oem' && (
              <div className="space-y-3">
                <label className="block text-[11px] font-mono uppercase text-[#A5ACB5] tracking-wider">
                  Оригинальный номер детали (OEM) или артикул производителя
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Например: 991.352.049.02 или 06H 103 495 AH"
                    value={oemQuery}
                    onChange={(e) => setOemQuery(e.target.value.toUpperCase())}
                    className="flex-1 font-mono uppercase rounded-xl border border-[#242A32] bg-[#0B0D10] px-4 py-3 text-sm text-white outline-none focus:border-premium transition"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-premium px-6 py-3 font-bold text-white transition hover:brightness-110 flex items-center justify-center gap-2"
                  >
                    <Search className="size-4" />
                    <span>Найти по номеру</span>
                  </button>
                </div>
              </div>
            )}

            {finderMode === 'car' && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#242A32]">
                <span className="text-xs text-[#A5ACB5]">
                  Уже есть автомобиль?{' '}
                  <Link to="/garage" className="text-white underline hover:text-premium">
                    Открыть Мой гараж
                  </Link>
                </span>
                <button
                  type="submit"
                  disabled={!selectedMake}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-premium px-8 py-3.5 font-bold text-white transition hover:brightness-110 disabled:opacity-40"
                >
                  <Search className="size-4" />
                  <span>Показать подходящие запчасти</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* 3. POPULAR CATEGORIES (8 LUXURY TILES) */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:py-28">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#242A32] pb-6">
          <div>
            <span className="racing-badge mb-2">Архитектура каталога</span>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
              Популярные категории
            </h2>
          </div>
          <Link
            to="/catalog"
            className="group inline-flex items-center gap-2 text-sm font-bold text-white hover:text-premium transition"
          >
            <span>Весь каталог деталей</span>
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {LUXURY_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/catalog?q=${cat.query}`}
              className="group relative flex flex-col justify-end overflow-hidden rounded-2xl border border-[#242A32] bg-[#15191F] aspect-[4/5] p-5 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl"
              style={{
                boxShadow: undefined,
              }}
            >
              {/* Photo Background */}
              <div className="absolute inset-0 z-0">
                <img
                  src={cat.image}
                  alt={cat.title}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-110 brightness-[0.68] contrast-[1.08]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D10] via-[#0B0D10]/60 to-transparent" />
                {/* Subtle colored ambient corner glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 80% 90%, ${cat.glow}, transparent 65%)` }}
                />
              </div>

              {/* Card Meta Content */}
              <div className="relative z-10">
                <span
                  className={`inline-block rounded-md px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider border ${cat.badgeBg}`}
                >
                  {cat.count}
                </span>
                <h3 className="mt-2 text-lg sm:text-xl font-black uppercase text-white group-hover:text-white transition-colors">
                  {cat.title}
                </h3>
                <p className="mt-1 text-xs text-[#A5ACB5] line-clamp-1">
                  {cat.subtitle}
                </p>
                <div
                  className="mt-3 flex items-center gap-1.5 text-xs font-bold transition-all group-hover:translate-x-1"
                  style={{ color: cat.color }}
                >
                  <span>Каталог узла</span>
                  <ArrowRight className="size-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. PERFORMANCE COLLECTION (FULL-WIDTH DARK EDITORIAL) */}
      <section className="relative overflow-hidden border-y border-[#242A32] bg-[#07080A] py-20 sm:py-28">
        <div className="pointer-events-none absolute -right-20 top-1/2 -translate-y-1/2 size-[600px] rounded-full bg-premium/10 blur-[150px]" />
        
        <div className="mx-auto max-w-7xl px-4 relative z-10">
          <div className="max-w-2xl mb-14">
            <span className="racing-badge mb-3">Motorsport Heritage</span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
              РАСКРОЙ ПОТЕНЦИАЛ <br />
              <span className="text-premium">СВОЕГО АВТОМОБИЛЯ.</span>
            </h2>
            <p className="mt-4 text-base text-[#A5ACB5] leading-relaxed">
              Компоненты для трека, динамики и максимальной отдачи. Высокоточная инженерия для тех, кто требует абсолютного превосходства на дороге.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PERFORMANCE_PILLARS.map((item, idx) => (
              <div
                key={item.title}
                className="group relative flex flex-col rounded-2xl border border-[#242A32] bg-[#15191F]/90 p-6 transition-all duration-300 hover:border-premium/50 hover:-translate-y-1"
              >
                <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-xl border border-[#242A32]/80 bg-[#0B0D10]">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-0.5 font-mono text-[9px] font-bold text-white">
                    0{idx + 1} // TRACK SPEC
                  </span>
                </div>

                <span className="font-mono text-[10px] font-bold tracking-wider text-premium uppercase">
                  {item.spec}
                </span>
                <h3 className="mt-2 text-xl font-black uppercase text-white group-hover:text-premium transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-[#A5ACB5] leading-relaxed flex-1">
                  {item.desc}
                </p>

                <Link
                  to="/catalog?has_discount=false"
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white hover:text-premium transition pt-3 border-t border-[#242A32]"
                >
                  <span>Компоненты серии</span>
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. MONOCHROMATIC FEATURED BRANDS */}
      <section className="mx-auto max-w-7xl px-4 py-20 border-b border-[#242A32]">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="racing-badge mb-2">Мировые лидеры индустрии</span>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
            Официальные бренды
          </h2>
          <p className="mt-2 text-xs text-[#A5ACB5]">
            Прямые поставки сертифицированных запчастей от оригинальных поставщиков конвейеров
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {FEATURED_BRANDS.map((brand) => (
            <Link
              key={brand.name}
              to={`/catalog?q=${encodeURIComponent(brand.name)}`}
              className="group flex flex-col items-center justify-center rounded-xl border border-[#242A32] bg-[#15191F]/50 p-6 text-center transition-all duration-300 hover:border-premium/50 hover:bg-[#15191F]"
            >
              <span className="text-lg font-black tracking-tight text-white group-hover:text-premium transition-colors">
                {brand.name}
              </span>
              <span className="mt-1 font-mono text-[9px] text-[#A5ACB5] uppercase tracking-widest">
                {brand.country}
              </span>
              <span className="mt-2 font-mono text-[8px] text-[#A5ACB5]/60 uppercase">
                {brand.spec}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 6. BEST SELLERS / APPLE-STYLE PRODUCT PRESENTATION */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:py-28">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#242A32] pb-6">
          <div>
            <span className="racing-badge mb-2">Хиты продаж</span>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
              Популярные автозапчасти
            </h2>
          </div>

          <div className="flex rounded-lg border border-[#242A32] bg-[#15191F] p-1 text-xs">
            <button
              type="button"
              onClick={() => setProductTab('popular')}
              className={`rounded-md px-3.5 py-1.5 font-bold transition ${
                productTab === 'popular' ? 'bg-premium text-white' : 'text-[#A5ACB5] hover:text-white'
              }`}
            >
              Все бестселлеры
            </button>
            <button
              type="button"
              onClick={() => setProductTab('deals')}
              className={`rounded-md px-3.5 py-1.5 font-bold transition ${
                productTab === 'deals' ? 'bg-premium text-white' : 'text-[#A5ACB5] hover:text-white'
              }`}
            >
              Спецпредложения
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {activeProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {isProductsLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-80 rounded-xl bg-[#15191F] animate-pulse border border-[#242A32]" />
            ))}
        </div>
      </section>

      {/* 7. MY GARAGE PREVIEW MODULE */}
      <section className="border-t border-[#242A32] bg-[#0E1116] py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-3xl border border-[#242A32] bg-gradient-to-br from-[#15191F] to-[#0B0D10] p-8 sm:p-12 relative overflow-hidden">
            <div className="pointer-events-none absolute -bottom-20 -left-20 size-80 rounded-full bg-premium/10 blur-[140px]" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="max-w-xl">
                <span className="racing-badge mb-3">Персональный гараж</span>
                <h3 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">
                  {selectedVehicle ? selectedVehicle.name : 'Ваш персональный автопарк'}
                </h3>
                <p className="mt-3 text-sm text-[#A5ACB5] leading-relaxed">
                  {selectedVehicle
                    ? `Автомобиль привязан к вашему профилю. Все запчасти в каталоге автоматически проверяются на 100% совместимость с вашей модификацией.`
                    : `Добавьте свой автомобиль в гараж один раз, чтобы мгновенно видеть статус совместимости деталей и план технического обслуживания без ручного поиска.`}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/garage"
                    className="inline-flex items-center gap-2 rounded-xl bg-premium px-6 py-3 font-bold text-white hover:brightness-110 transition shadow-[0_0_20px_rgba(227,38,54,0.4)] text-sm"
                  >
                    <Car className="size-4" />
                    <span>{selectedVehicle ? 'Управление гаражом' : 'Добавить автомобиль'}</span>
                  </Link>

                  <Link
                    to="/catalog"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#242A32] bg-[#15191F] px-6 py-3 font-bold text-white hover:border-premium transition text-sm"
                  >
                    <span>Искать подходящие детали</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>

              {/* Visual vehicle badge / card preview */}
              <div className="w-full lg:w-96 rounded-2xl border border-[#242A32] bg-[#0B0D10]/80 p-6 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-[#242A32] pb-4">
                  <span className="font-mono text-xs uppercase tracking-wider text-premium">
                    [AU-GARAGE STATUS]
                  </span>
                  <span className="size-2 rounded-full bg-emerald-400" />
                </div>
                <div className="mt-4 space-y-3 font-mono text-xs">
                  <div className="flex justify-between py-1 border-b border-[#242A32]/50">
                    <span className="text-[#A5ACB5]">Выбранный авто:</span>
                    <span className="font-bold text-white">{selectedVehicle?.name || 'Porsche 911 (992) GT3'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#242A32]/50">
                    <span className="text-[#A5ACB5]">Год выпуска:</span>
                    <span className="font-bold text-white">{selectedVehicle?.year || '2024'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#242A32]/50">
                    <span className="text-[#A5ACB5]">VIN-проверка:</span>
                    <span className="font-bold text-emerald-400">100% Верифицировано</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#A5ACB5]">Регламент ТО:</span>
                    <span className="font-bold text-white">Пройдено 15,000 км</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. AI MECHANIC PREVIEW MODULE */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:py-28">
        <div className="rounded-3xl border border-[#242A32] bg-[#15191F] p-8 sm:p-12 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-20 -right-20 size-80 rounded-full bg-premium/15 blur-[140px]" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="max-w-xl">
              <span className="racing-badge mb-3">
                <Sparkles className="size-3" />
                Neural Diagnostics
              </span>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                ВАШ ПЕРСОНАЛЬНЫЙ <br />
                <span className="text-premium">AI-МЕХАНИК.</span>
              </h2>
              <p className="mt-4 text-base text-[#A5ACB5] leading-relaxed">
                Интеллектуальный помощник для мгновенной диагностики симптомов, расшифровки ошибок OBD-II и экспертного подбора совместимых деталей без поездки на СТО.
              </p>

              {/* Suggested Questions */}
              <div className="mt-6 space-y-2">
                <span className="font-mono text-[11px] text-[#A5ACB5] uppercase tracking-wider block mb-2">
                  Популярные запросы автолюбителей:
                </span>
                {[
                  '«Появился гул спереди справа на скорости выше 70 км/ч»',
                  '«Какое масло заливать в мотор с допуском Porsche A40?»',
                  '«Регламент замены тормозной жидкости и свечей зажигания»',
                ].map((q) => (
                  <Link
                    key={q}
                    to="/ai-mechanic"
                    className="block rounded-lg border border-[#242A32] bg-[#0B0D10]/60 px-3.5 py-2 text-xs text-[#A5ACB5] hover:border-premium hover:text-white transition"
                  >
                    {q}
                  </Link>
                ))}
              </div>

              <div className="mt-8">
                <Link
                  to="/ai-mechanic"
                  className="inline-flex items-center gap-3 rounded-xl bg-premium px-8 py-4 font-bold text-white transition hover:brightness-110 shadow-[0_0_25px_rgba(227,38,54,0.4)]"
                >
                  <Sparkles className="size-4" />
                  <span className="text-sm uppercase tracking-wider">Запустить AI Диагностику</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            {/* AI Terminal Simulation View */}
            <div className="w-full lg:w-96 rounded-2xl border border-[#242A32] bg-[#0B0D10] p-6 font-mono text-xs shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#242A32] pb-3 text-[10px] text-[#A5ACB5]">
                <span>AI MECHANIC WORKSPACE</span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-[#15191F] p-3 text-[#A5ACB5]">
                  <span className="text-premium font-bold">USER:</span> Стучит на мелких кочках, руль слегка вибрирует при торможении.
                </div>
                <div className="rounded-lg bg-premium/10 border border-premium/20 p-3 text-white">
                  <span className="text-premium font-bold">AI MECHANIC:</span> С вероятностью 92% изношены стойки стабилизатора либо деформирован тормозной диск. Рекомендуется замена комплектом.
                  <div className="mt-2 text-[10px] text-emerald-400 font-bold">
                    ✓ Подобрано 3 проверенных аналога в наличии
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. ENGINEERING PILLARS */}
      <section className="border-t border-[#242A32] bg-[#0B0D10] py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#242A32] bg-[#15191F]/60 p-6">
              <div className="grid size-12 place-items-center rounded-xl bg-premium/10 text-premium mb-4">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-tight">100% OEM Аутентичность</h3>
              <p className="mt-2 text-xs text-[#A5ACB5] leading-relaxed">
                Только оригинальные детали и проверенные бренды с заводской гарантией и сертификатами соответствия.
              </p>
            </div>

            <div className="rounded-2xl border border-[#242A32] bg-[#15191F]/60 p-6">
              <div className="grid size-12 place-items-center rounded-xl bg-premium/10 text-premium mb-4">
                <Truck className="size-6" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-tight">Экспресс-логистика</h3>
              <p className="mt-2 text-xs text-[#A5ACB5] leading-relaxed">
                Доставка по Душанбе день в день. Регулярные отправки во все города и регионы Таджикистана.
              </p>
            </div>

            <div className="rounded-2xl border border-[#242A32] bg-[#15191F]/60 p-6">
              <div className="grid size-12 place-items-center rounded-xl bg-premium/10 text-premium mb-4">
                <Gauge className="size-6" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-tight">Точный подбор по VIN</h3>
              <p className="mt-2 text-xs text-[#A5ACB5] leading-relaxed">
                Исключение риска ошибки благодаря двойной верификации совместимости с заводскими каталогами.
              </p>
            </div>

            <div className="rounded-2xl border border-[#242A32] bg-[#15191F]/60 p-6">
              <div className="grid size-12 place-items-center rounded-xl bg-premium/10 text-premium mb-4">
                <Zap className="size-6" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-tight">Клуб AU Loyalty</h3>
              <p className="mt-2 text-xs text-[#A5ACB5] leading-relaxed">
                Кэшбэк до 7% на баланс. 1 бонусный балл = 1 сомони (TJS) для оплаты следующих заказов.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
