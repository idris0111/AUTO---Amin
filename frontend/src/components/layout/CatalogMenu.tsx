import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ArrowUpRight, Car, Grid2X2, Package, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useDialogFocus } from '../../lib/useDialogFocus'
import type { Brand, Category } from '../../types'

export default function CatalogMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false)
  const dialog = useDialogFocus(open, () => setOpen(false))
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/catalog/categories'), enabled: open })
  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api.get<Brand[]>('/catalog/brands'), enabled: open })
  function close() { setOpen(false); onNavigate?.() }

  return <>
    <button className="catalog-menu-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><Grid2X2 size={17} /> Каталог</button>
    {open && <div className="catalog-menu-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className="catalog-menu-panel" ref={dialog} role="dialog" aria-modal="true" aria-label="Каталог запчастей" tabIndex={-1}>
        <div className="catalog-menu-heading"><div><span className="eyebrow">AUTO UNIVERSE / КАТАЛОГ</span><h2>Нужная деталь. В пару кликов.</h2></div><button type="button" aria-label="Закрыть каталог" onClick={() => setOpen(false)}><X size={22} /></button></div>
        <div className="catalog-menu-body"><div className="catalog-menu-categories">
          {categories.isPending && Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
          {categories.isError && <p className="inline-error" role="alert">Категории недоступны. <button onClick={() => void categories.refetch()}>Повторить</button></p>}
          {categories.data?.map((category, i) => <Link to={`/catalog?category_id=${category.id}`} key={category.id} onClick={close}><span className="menu-category-index">{String(i + 1).padStart(2, '0')}</span><div><strong>{category.name}</strong><p>{category.description || 'Посмотреть детали'}</p></div><ArrowUpRight size={18} /></Link>)}
          <Link to="/catalog" className="catalog-menu-all" onClick={close}><Package size={20} /><strong>Все автозапчасти</strong><ArrowRight size={18} /></Link>
        </div><aside className="catalog-menu-aside"><Car size={44} strokeWidth={1} /><h3>Начните с вашего автомобиля</h3><p>Сохраните модель в гараже, чтобы проверять доступные данные о совместимости.</p><Link to="/garage" className="text-link" onClick={close}>Подобрать по авто <ArrowUpRight size={16} /></Link><div className="menu-brands"><h4>Производители</h4>{brands.data?.slice(0, 8).map(brand => <Link key={brand.id} to={`/catalog?brand_id=${brand.id}`} onClick={close}>{brand.name}</Link>)}</div></aside></div>
      </div>
    </div>}
  </>
}
