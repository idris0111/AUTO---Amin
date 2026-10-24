import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  BookOpen,
  Calendar,
  Clock,
  Compass,
  Cpu,
  Eye,
  HelpCircle,
  Layers,
  Search,
  Sparkles,
  Truck,
  Wrench,
} from 'lucide-react'
import { api } from '../lib/api'
import { SeoHead } from '../components/seo/SeoHead'
import type {
  ArticleCategory,
  ArticleListResponse,
  ArticleSummary,
  CategorySummary,
} from '../types'

const CATEGORY_NAMES: Record<ArticleCategory, { label: string; icon: any }> = {
  guide: { label: 'Руководства', icon: BookOpen },
  maintenance: { label: 'Техобслуживание', icon: Clock },
  diy: { label: 'Своими руками', icon: Wrench },
  review: { label: 'Обзоры деталей', icon: Layers },
  news: { label: 'Новости и тренды', icon: Sparkles },
}

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = (searchParams.get('category') as ArticleCategory) || ''
  const [searchQuery, setSearchQuery] = useState('')
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Fetch categories
  useEffect(() => {
    api
      .get<CategorySummary[]>('/content/categories')
      .then((res) => setCategories(res))
      .catch((err) => console.error('Failed to load categories', err))
  }, [])

  // Fetch articles
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (activeCategory) params.set('category', activeCategory)
    if (searchQuery.trim()) params.set('search', searchQuery.trim())
    params.set('per_page', '30')

    api
      .get<ArticleListResponse>(`/content/articles?${params.toString()}`)
      .then((res) => {
        setArticles(res.items)
        setTotal(res.total)
      })
      .catch((err) => console.error('Failed to load articles', err))
      .finally(() => setLoading(false))
  }, [activeCategory, searchQuery])

  const handleCategoryClick = (cat: string) => {
    if (cat === activeCategory) {
      searchParams.delete('category')
    } else {
      searchParams.set('category', cat)
    }
    setSearchParams(searchParams)
  }

  const featuredArticle = useMemo(() => {
    return articles.length > 0 ? articles[0] : null
  }, [articles])

  const remainingArticles = useMemo(() => {
    return articles.length > 1 ? articles.slice(1) : []
  }, [articles])

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'База знаний & Блог автолюбителей Auto Universe',
    description:
      'Статьи, технические регламенты и руководства по выбору автозапчастей и ремонту автомобилей в Таджикистане.',
    url: 'https://autouniverse.tj/blog',
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-gray-200 py-10 px-4 sm:px-6 lg:px-8">
      <SeoHead
        title="База знаний & Блог автолюбителей"
        description="Экспертные руководства, советы инженеров, регламенты ТО и обзоры автозапчастей для условий Таджикистана."
        canonical="https://autouniverse.tj/blog"
        structuredData={collectionSchema}
      />

      <div className="max-w-7xl mx-auto space-y-10">
        {/* Hero Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-premium/10 border border-[#E32636]/30 text-premium text-xs font-semibold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            Экспертная экспертиза Auto Universe
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight">
            База знаний & Технический блог
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Проверенные руководства по выбору запчастей, специфика эксплуатации в жарком климате
            и горных условиях, пошаговые инструкции и аналитика автоинженеров.
          </p>

          {/* Search bar */}
          <div className="pt-2 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по статьям (например: колодки, масло 5w40, подвеска, свечи)..."
                className="w-full bg-[var(--surface)] border border-[#252B33] rounded-xl pl-11 pr-4 py-3 text-sm text-ink placeholder-gray-500 focus:outline-none focus:border-[#E32636] transition shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-ink"
                >
                  Очистить
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            onClick={() => handleCategoryClick('')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition flex items-center gap-2 border ${
              !activeCategory
                ? 'bg-premium text-ink border-[#E32636] shadow-lg shadow-[#E32636]/20'
                : 'bg-[var(--surface)] text-gray-400 border-[#252B33] hover:border-gray-600 hover:text-ink'
            }`}
          >
            <span>Все статьи</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/30 text-gray-300">
              {total}
            </span>
          </button>
          {categories.map((c) => {
            const meta = CATEGORY_NAMES[c.category] || { label: c.label, icon: BookOpen }
            const Icon = meta.icon
            const isSelected = activeCategory === c.category
            return (
              <button
                key={c.category}
                onClick={() => handleCategoryClick(c.category)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-premium text-ink border-[#E32636] shadow-lg shadow-[#E32636]/20'
                    : 'bg-[var(--surface)] text-gray-400 border-[#252B33] hover:border-gray-600 hover:text-ink'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{meta.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/30 text-gray-300">
                  {c.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Articles Content */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin w-8 h-8 border-2 border-[#E32636] border-t-transparent rounded-full" />
            <p className="mt-3 text-xs text-gray-400">Загрузка материалов базы знаний...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="py-20 text-center bg-[var(--surface)] rounded-2xl border border-[#252B33] p-8 max-w-lg mx-auto">
            <BookOpen className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-ink">Статьи не найдены</h3>
            <p className="text-sm text-gray-400 mt-1">
              Попробуйте изменить поисковый запрос или выбрать другую категорию.
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                handleCategoryClick('')
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-[#252B33] text-sm text-ink hover:bg-gray-700 transition"
            >
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Featured Hero Article */}
            {featuredArticle && !searchQuery && !activeCategory && (
              <div className="bg-gradient-to-r from-[var(--surface)] via-[#1a1f27] to-[#15191F] border border-[#252B33] hover:border-[#E32636]/40 transition rounded-2xl overflow-hidden shadow-2xl group">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {featuredArticle.cover_image && (
                    <div className="lg:col-span-6 relative overflow-hidden aspect-video lg:aspect-auto min-h-[260px]">
                      <img
                        src={featuredArticle.cover_image}
                        alt={featuredArticle.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:hidden" />
                      <div className="absolute top-4 left-4">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-premium text-ink uppercase tracking-wider shadow">
                          Главный материал
                        </span>
                      </div>
                    </div>
                  )}
                  <div
                    className={`${
                      featuredArticle.cover_image ? 'lg:col-span-6' : 'lg:col-span-12'
                    } p-6 sm:p-8 flex flex-col justify-between`}
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span className="text-premium font-medium uppercase tracking-wider">
                          {CATEGORY_NAMES[featuredArticle.category]?.label || featuredArticle.category}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {featuredArticle.reading_time_minutes} мин чтения
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {featuredArticle.views_count} просмотров
                        </span>
                      </div>
                      <Link to={`/blog/${featuredArticle.slug}`}>
                        <h2 className="text-2xl sm:text-3xl font-bold text-ink group-hover:text-premium transition leading-tight">
                          {featuredArticle.title}
                        </h2>
                      </Link>
                      <p className="text-gray-300 text-sm sm:text-base line-clamp-3 leading-relaxed">
                        {featuredArticle.excerpt}
                      </p>
                    </div>

                    <div className="pt-6 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {featuredArticle.tags?.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] px-2 py-0.5 rounded bg-[#252B33] text-gray-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <Link
                        to={`/blog/${featuredArticle.slug}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-premium text-ink text-xs font-semibold hover:bg-red-700 transition shadow-lg shadow-[#E32636]/20"
                      >
                        Читать материал
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid of Articles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(searchQuery || activeCategory ? articles : remainingArticles).map((article) => {
                const catMeta = CATEGORY_NAMES[article.category] || {
                  label: article.category,
                  icon: BookOpen,
                }
                const CatIcon = catMeta.icon
                return (
                  <article
                    key={article.id}
                    className="bg-[var(--surface)] border border-[#252B33] hover:border-[#E32636]/50 rounded-2xl overflow-hidden transition flex flex-col group shadow-md hover:shadow-xl hover:shadow-black/40"
                  >
                    {article.cover_image && (
                      <div className="relative aspect-video overflow-hidden bg-black/40">
                        <img
                          src={article.cover_image}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--canvas)]/80 backdrop-blur-md text-gray-200 border border-white/10">
                            <CatIcon className="w-3 h-3 text-premium" />
                            {catMeta.label}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-[11px] text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {article.reading_time_minutes} мин
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {article.views_count}
                          </span>
                          {article.published_at && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(article.published_at).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            </>
                          )}
                        </div>
                        <Link to={`/blog/${article.slug}`}>
                          <h3 className="font-bold text-ink text-base group-hover:text-premium transition line-clamp-2 leading-snug">
                            {article.title}
                          </h3>
                        </Link>
                        <p className="text-gray-400 text-xs line-clamp-3 leading-relaxed">
                          {article.excerpt}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#252B33] flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {article.tags?.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-2 py-0.5 rounded bg-[#252B33] text-gray-400"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <Link
                          to={`/blog/${article.slug}`}
                          className="text-xs font-semibold text-premium group-hover:translate-x-0.5 transition inline-flex items-center gap-1"
                        >
                          Подробнее →
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {/* Interactive Helper CTAs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
          <div className="bg-gradient-to-br from-[var(--surface)] to-[#1f1a1a] p-6 rounded-2xl border border-[#252B33] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-premium/10 border border-[#E32636]/20 flex items-center justify-center text-premium">
              <Cpu className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-ink text-base">Интеллектуальный AI Механик</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Опишите подозрительный стук или код ошибки OBD-II и получите мгновенный анализ узла с перечнем необходимых запчастей.
            </p>
            <Link
              to="/ai-mechanic"
              className="inline-block pt-1 text-xs font-semibold text-premium hover:underline"
            >
              Запустить онлайн-диагностику →
            </Link>
          </div>

          <div className="bg-gradient-to-br from-[var(--surface)] to-[#151c24] p-6 rounded-2xl border border-[#252B33] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-premium/10 border border-premium/20 flex items-center justify-center text-premium">
              <Truck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-ink text-base">Мой гараж & Спецификации</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Сохраните автомобиль в персональный гараж для мгновенной 100% проверки совместимости запчастей и регламентов ТО.
            </p>
            <Link
              to="/garage"
              className="inline-block pt-1 text-xs font-semibold text-premium hover:underline"
            >
              Перейти в Мой гараж →
            </Link>
          </div>

          <div className="bg-gradient-to-br from-[var(--surface)] to-[#181f18] p-6 rounded-2xl border border-[#252B33] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-ink text-base">Служба заботы & Поддержка</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Специалисты Auto Universe помогут подобрать деталь по VIN-коду и ответят на любые вопросы по доставке.
            </p>
            <Link
              to="/support"
              className="inline-block pt-1 text-xs font-semibold text-emerald-400 hover:underline"
            >
              Задать вопрос поддержке →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
