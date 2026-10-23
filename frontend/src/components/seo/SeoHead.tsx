import { useEffect } from 'react'

export interface SeoHeadProps {
  title?: string
  description?: string
  keywords?: string
  canonical?: string
  ogImage?: string
  ogType?: 'website' | 'article' | 'product'
  articleData?: {
    publishedTime?: string
    modifiedTime?: string
    author?: string
    tags?: string[]
  }
  structuredData?: Record<string, any> | Record<string, any>[]
}

const DEFAULT_TITLE = 'Auto Universe — Премиальные автозапчасти в Таджикистане'
const DEFAULT_DESCRIPTION =
  'Каталог оригинальных премиальных автозапчастей, моторных масел и расходников в Душанбе. Гарантия совместимости по VIN, экспресс-доставка по всему Таджикистану.'
const DEFAULT_OG_IMAGE = 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80'
const SITE_URL = 'https://autouniverse.tj'

function setOrCreateMeta(selector: string, attr: string, value: string) {
  let el = document.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    if (selector.startsWith('meta[name=')) {
      const name = selector.match(/name="([^"]+)"/)?.[1]
      if (name) el.setAttribute('name', name)
    } else if (selector.startsWith('meta[property=')) {
      const prop = selector.match(/property="([^"]+)"/)?.[1]
      if (prop) el.setAttribute('property', prop)
    }
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

function setOrCreateLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function SeoHead({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  articleData,
  structuredData,
}: SeoHeadProps) {
  useEffect(() => {
    // 1. Document title
    const fullTitle = title
      ? `${title} | Auto Universe`
      : DEFAULT_TITLE
    document.title = fullTitle

    // 2. Standard Meta
    setOrCreateMeta('meta[name="description"]', 'content', description)
    if (keywords) {
      setOrCreateMeta('meta[name="keywords"]', 'content', keywords)
    }

    // 3. OpenGraph
    setOrCreateMeta('meta[property="og:site_name"]', 'content', 'Auto Universe')
    setOrCreateMeta('meta[property="og:title"]', 'content', title || DEFAULT_TITLE)
    setOrCreateMeta('meta[property="og:description"]', 'content', description)
    setOrCreateMeta('meta[property="og:image"]', 'content', ogImage)
    setOrCreateMeta('meta[property="og:type"]', 'content', ogType)
    const currentUrl = canonical || (typeof window !== 'undefined' ? window.location.href : SITE_URL)
    setOrCreateMeta('meta[property="og:url"]', 'content', currentUrl)

    // 4. Twitter Card
    setOrCreateMeta('meta[name="twitter:card"]', 'content', 'summary_large_image')
    setOrCreateMeta('meta[name="twitter:title"]', 'content', title || DEFAULT_TITLE)
    setOrCreateMeta('meta[name="twitter:description"]', 'content', description)
    setOrCreateMeta('meta[name="twitter:image"]', 'content', ogImage)

    // 5. Canonical Link
    if (canonical) {
      setOrCreateLink('canonical', canonical)
    }

    // 6. Article specific OpenGraph meta
    if (ogType === 'article' && articleData) {
      if (articleData.publishedTime) {
        setOrCreateMeta('meta[property="article:published_time"]', 'content', articleData.publishedTime)
      }
      if (articleData.modifiedTime) {
        setOrCreateMeta('meta[property="article:modified_time"]', 'content', articleData.modifiedTime)
      }
      if (articleData.author) {
        setOrCreateMeta('meta[property="article:author"]', 'content', articleData.author)
      }
      if (articleData.tags && articleData.tags.length > 0) {
        setOrCreateMeta('meta[property="article:tag"]', 'content', articleData.tags.join(','))
      }
    }

    // 7. Structured Data (JSON-LD)
    let jsonLdScript = document.getElementById('seo-structured-data') as HTMLScriptElement | null
    if (structuredData) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement('script')
        jsonLdScript.id = 'seo-structured-data'
        jsonLdScript.type = 'application/ld+json'
        document.head.appendChild(jsonLdScript)
      }
      jsonLdScript.textContent = JSON.stringify(structuredData)
    } else if (jsonLdScript) {
      jsonLdScript.remove()
    }
  }, [title, description, keywords, canonical, ogImage, ogType, articleData, structuredData])

  return null
}

