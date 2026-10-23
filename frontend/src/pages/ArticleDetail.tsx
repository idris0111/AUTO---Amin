import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Eye,
  Layers,
  Share2,
  Tag,
  User as UserIcon,
  Wrench,
} from 'lucide-react'
import { api } from '../lib/api'
import { SeoHead } from '../components/seo/SeoHead'
import type { ArticleCategory, ArticleDetail as ArticleDetailType } from '../types'

const CATEGORY_NAMES: Record<ArticleCategory, { label: string; icon: any }> = {
  guide: { label: 'Руководства', icon: BookOpen },
  maintenance: { label: 'Техобслуживание', icon: Clock },
  diy: { label: 'Своими руками', icon: Wrench },
  review: { label: 'Обзоры деталей', icon: Layers },
  news: { label: 'Новости и тренды', icon: BookOpen },
}

/**
 * Lightweight, robust markdown formatter for articles.
 */
function FormattedArticleContent({ content }: { content: string }) {
  const blocks = content.split('\n\n')

  return (
    <div className="space-y-5 text-gray-300 leading-relaxed text-sm sm:text-base">
      {blocks.map((block, idx) => {
        const trimmed = block.trim()
        if (!trimmed) return null

        // H2
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="text-xl sm:text-2xl font-bold text-white pt-6 pb-2 border-b border-[#252B33] flex items-center gap-2"
            >
              <span className="w-1.5 h-5 bg-[#E32636] rounded-full inline-block" />
              {trimmed.replace(/^## /, '')}
            </h2>
          )
        }

        // H3
        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="text-lg sm:text-xl font-semibold text-gray-100 pt-4 pb-1 text-white"
            >
              {trimmed.replace(/^### /, '')}
            </h3>
          )
        }

        // Blockquote
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="p-4 rounded-xl bg-[#15191F] border-l-4 border-[#E32636] text-gray-300 italic text-sm my-3 shadow-inner"
            >
              {trimmed.replace(/^> /, '')}
            </blockquote>
          )
        }

        // Unordered List
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed.split('\n').filter((l) => l.trim().startsWith('- ') || l.trim().startsWith('* '))
          return (
            <ul key={idx} className="space-y-2 pl-4">
              {items.map((it, i) => {
                const text = it.replace(/^[-*]\s+/, '')
                return (
                  <li key={i} className="flex items-start gap-2.5 text-sm sm:text-base">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E32636] mt-2 shrink-0" />
                    <span>{renderInline(text)}</span>
                  </li>
                )
              })}
            </ul>
          )
        }

        // Numbered List
        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed.split('\n').filter((l) => /^\d+\.\s/.test(l.trim()))
          return (
            <ol key={idx} className="space-y-2 pl-4">
              {items.map((it, i) => {
                const text = it.replace(/^\d+\.\s+/, '')
                return (
                  <li key={i} className="flex items-start gap-3 text-sm sm:text-base">
                    <span className="w-5 h-5 rounded-md bg-[#252B33] text-[#E32636] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{renderInline(text)}</span>
                  </li>
                )
              })}
            </ol>
          )
        }

        // Standard Paragraph
        return (
          <p key={idx} className="text-gray-300 text-sm sm:text-base leading-relaxed">
            {renderInline(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

function renderInline(text: string) {
  // Support bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<ArticleDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)

    api
      .get<ArticleDetailType>(`/content/articles/${slug}`)
      .then((res) => setArticle(res))
      .catch((err) => {
        console.error('Failed to load article', err)
        setError('Статья не найдена или временно недоступна.')
      })
      .finally(() => setLoading(false))
  }, [slug])

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D10] text-gray-200 py-20 text-center">
        <div className="inline-block animate-spin w-8 h-8 border-2 border-[#E32636] border-t-transparent rounded-full" />
        <p className="mt-3 text-xs text-gray-400">Загрузка статьи...</p>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-[#0B0D10] text-gray-200 py-20 px-4">
        <div className="max-w-md mx-auto text-center bg-[#15191F] p-8 rounded-2xl border border-[#252B33] space-y-4">
          <BookOpen className="w-12 h-12 text-[#E32636] mx-auto" />
          <h2 className="text-xl font-bold text-white">Статья не найдена</h2>
          <p className="text-xs text-gray-400">{error || 'Материал был удален или перенесен.'}</p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E32636] text-white text-xs font-semibold hover:bg-red-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться в базу знаний
          </Link>
        </div>
      </div>
    )
  }

  const catMeta = CATEGORY_NAMES[article.category] || { label: article.category, icon: BookOpen }
  const CatIcon = catMeta.icon

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.seo_title || article.title,
    description: article.seo_description || article.excerpt,
    image: article.cover_image || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80',
    datePublished: article.published_at || article.created_at,
    dateModified: article.updated_at || article.created_at,
    author: {
      '@type': 'Organization',
      name: article.author_name || 'Инженерная команда Auto Universe',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Auto Universe Tajikistan',
      logo: {
        '@type': 'ImageObject',
        url: 'https://autouniverse.tj/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://autouniverse.tj/blog/${article.slug}`,
    },
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] text-gray-200 py-10 px-4 sm:px-6 lg:px-8">
      <SeoHead
        title={article.seo_title || article.title}
        description={article.seo_description || article.excerpt}
        keywords={article.seo_keywords || article.tags?.join(', ')}
        canonical={`https://autouniverse.tj/blog/${article.slug}`}
        ogImage={article.cover_image || undefined}
        ogType="article"
        articleData={{
          publishedTime: article.published_at || article.created_at,
          modifiedTime: article.updated_at,
          author: article.author_name || 'Auto Universe',
          tags: article.tags,
        }}
        structuredData={articleSchema}
      />

      <article className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 overflow-x-auto whitespace-nowrap pb-2">
          <Link to="/" className="hover:text-white transition">
            Главная
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
          <Link to="/blog" className="hover:text-white transition">
            База знаний
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
          <Link
            to={`/blog?category=${article.category}`}
            className="hover:text-white transition text-[#E32636]"
          >
            {catMeta.label}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
          <span className="text-gray-300 truncate max-w-[200px] sm:max-w-xs">{article.title}</span>
        </nav>

        {/* Back Link & Share Action */}
        <div className="flex items-center justify-between pt-2">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
            Назад ко всем статьям
          </Link>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#15191F] border border-[#252B33] text-xs text-gray-300 hover:text-white hover:border-gray-600 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Ссылка скопирована!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-gray-400" />
                <span>Поделиться</span>
              </>
            )}
          </button>
        </div>

        {/* Article Header */}
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E32636]/10 border border-[#E32636]/30 text-[#E32636] text-xs font-semibold uppercase tracking-wider">
            <CatIcon className="w-3.5 h-3.5" />
            {catMeta.label}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {article.title}
          </h1>

          {/* Meta line: Author, date, reading time, views */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-2 border-y border-[#252B33] py-3">
            <span className="inline-flex items-center gap-1.5 text-gray-300">
              <UserIcon className="w-3.5 h-3.5 text-[#E32636]" />
              {article.author_name || 'Инженер Auto Universe'}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {article.reading_time_minutes} минут чтения
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              {article.views_count} просмотров
            </span>
            {article.published_at && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(article.published_at).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </>
            )}
          </div>
        </header>

        {/* Cover Image */}
        {article.cover_image && (
          <div className="relative rounded-2xl overflow-hidden aspect-video max-h-[460px] w-full border border-[#252B33] shadow-2xl">
            <img
              src={article.cover_image}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Lead Excerpt */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#15191F] via-[#1a1f26] to-[#15191F] border border-[#252B33] text-gray-200 text-sm sm:text-base font-medium leading-relaxed italic">
          {article.excerpt}
        </div>

        {/* Article Body Content */}
        <div className="bg-[#15191F]/40 border border-[#252B33] rounded-2xl p-6 sm:p-10 shadow-lg">
          <FormattedArticleContent content={article.content} />
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="pt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400 inline-flex items-center gap-1">
              <Tag className="w-3 h-3 text-[#E32636]" />
              Теги материала:
            </span>
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-lg bg-[#15191F] border border-[#252B33] text-gray-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Call to action card */}
        <div className="mt-12 bg-gradient-to-r from-[#15191F] via-[#211b1b] to-[#15191F] p-8 rounded-2xl border border-[#E32636]/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-lg font-bold text-white">Нужна помощь с выбором запчастей?</h4>
            <p className="text-xs text-gray-400">
              Воспользуйтесь каталогом совместимости по марке автомобиля или обратитесь к инженеру поддержки.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/catalog"
              className="px-5 py-2.5 rounded-xl bg-[#E32636] text-white text-xs font-semibold hover:bg-red-700 transition shadow-lg shadow-[#E32636]/20"
            >
              Перейти в каталог
            </Link>
            <Link
              to="/ai-mechanic"
              className="px-5 py-2.5 rounded-xl bg-[#252B33] text-white text-xs font-semibold hover:bg-gray-700 transition"
            >
              Спросить AI Механика
            </Link>
          </div>
        </div>
      </article>
    </div>
  )
}
