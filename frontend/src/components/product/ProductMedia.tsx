import { useEffect, useState } from 'react'
import { BatteryCharging, Disc3, Droplets, Filter, Package, Settings2, Wrench } from 'lucide-react'

// These six URLs are the lifestyle placeholders shipped by app.seed, not SKU photos.
const demoScenes = ['photo-1486262715619-67b85e0b08d3', 'photo-1487754180451-c456f719a1fc', 'photo-1619642751034-765dfdf7c58e', 'photo-1449965408869-eaa3f722e40d', 'photo-1580273916550-e323be2ae537', 'photo-1607860108855-64acf2078ed9']
const categoryIcons = { 'brake-system':Disc3, engine:Settings2, filters:Filter, suspension:Wrench, electronics:BatteryCharging, oils:Droplets }

export default function ProductMedia({ src, alt, categorySlug, categoryName, priority = false }: { src?: string | null; alt: string; categorySlug?: string; categoryName?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [src])
  const placeholder = !src || demoScenes.some(id => src.includes(id)) || failed
  const Icon = categoryIcons[categorySlug as keyof typeof categoryIcons] || Package
  if (placeholder) return <div className="product-media-placeholder" role="img" aria-label={`${categoryName || alt}: фото уточняется`}><Icon size={76} strokeWidth={.8} /><span>Фото уточняется</span></div>
  return <img src={src!} alt={alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} className="product-real-image" onError={() => setFailed(true)} />
}
