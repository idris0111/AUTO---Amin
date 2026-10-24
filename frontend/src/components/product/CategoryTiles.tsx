import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Category } from '../../types'
import ProductMedia from './ProductMedia'

export default function CategoryTiles({ categories, pending, error, retry }: { categories?: Category[]; pending: boolean; error: boolean; retry: () => void }) {
  if (pending) return <div className="category-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="category-skeleton skeleton" />)}</div>
  if (error) return <div className="commerce-empty" role="alert">Категории временно недоступны. <button onClick={retry}>Повторить</button></div>
  if (!categories?.length) return <div className="commerce-empty"><p>Категории появятся после обновления каталога.</p><Link className="text-link" to="/catalog">Открыть каталог <ArrowUpRight size={16} /></Link></div>
  return <div className="category-grid">{categories.slice(0, 6).map((category, i) => <Link className="category-tile category-tile-illustrated" key={category.id} to={`/catalog?category_id=${category.id}`}>
    <span className="category-number">0{i + 1}</span>
    <div className="category-visual"><ProductMedia alt={category.name} categoryName={category.name} categorySlug={category.slug} /></div>
    <div className="category-tile-copy"><h3>{category.name}</h3><span>{category.description || 'Смотреть запчасти'}</span></div>
    <ArrowUpRight className="category-arrow" size={19} />
  </Link>)}</div>
}
