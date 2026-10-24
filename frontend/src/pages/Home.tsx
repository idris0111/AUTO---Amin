import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Car, Disc3, Settings2, ShieldCheck, Truck, Search, Package, Wrench, ArrowUpRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import ProductCard from '../components/product/ProductCard'
import CategoryTiles from '../components/product/CategoryTiles'
import { api } from '../lib/api'
import type { Brand, Category, PaginatedProducts, VehicleMake } from '../types'
import { useGarage } from '../stores/garage'

const icons = [Disc3, Settings2, Wrench, Package, Car, ShieldCheck]

export default function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [makeId, setMakeId] = useState('')
  const [modelId, setModelId] = useState('')
  const [deals, setDeals] = useState(false)
  const { vehicles, selectedVehicleId } = useGarage()
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/catalog/categories') })
  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api.get<Brand[]>('/catalog/brands') })
  const makes = useQuery({ queryKey: ['public-vehicle-tree'], queryFn: () => api.get<VehicleMake[]>('/vehicles') })
  const products = useQuery({ queryKey: ['home-products', deals, selectedVehicleId], queryFn: () => api.get<PaginatedProducts>('/catalog/products', { sort: deals ? 'discount' : 'popular', has_discount: deals || undefined, vehicle_id: selectedVehicleId || undefined, limit: 8 }) })
  const recommendations = useQuery({ queryKey: ['home-new', selectedVehicleId], queryFn: () => api.get<PaginatedProducts>('/catalog/products', { sort: 'newest', vehicle_id: selectedVehicleId || undefined, limit: 4 }) })
  const make = makes.data?.find(m => m.id === makeId)

  return <div className="commerce-home">
    <nav className="commerce-container home-category-nav" aria-label="Популярные разделы">{categories.data?.slice(0, 6).map((category, i) => { const Icon = icons[i % icons.length]; return <Link key={category.id} to={`/catalog?category_id=${category.id}`}><Icon size={18} strokeWidth={1.5} />{category.name}</Link> })}<Link to="/catalog?has_discount=true" className="home-offers-link">Предложения <ArrowUpRight size={16} /></Link></nav>
    <section className="commerce-container hero-section">
      <div className="hero-copy"><span className="eyebrow"><i /> AUTOMOTIVE / PARTS & CARE</span><h1>Точность<br />в каждой <span>детали.</span></h1><p>Ваш автомобиль заслуживает правильных запчастей. Найдите нужную деталь — от повседневного обслуживания до большого ремонта.</p>
        <form onSubmit={e => { e.preventDefault(); if (query.trim()) navigate(`/catalog?q=${encodeURIComponent(query.trim())}`) }} className="hero-search" role="search"><Search size={20} aria-hidden /><input aria-label="Название, артикул или OEM-номер" value={query} onChange={e => setQuery(e.target.value)} placeholder="Название, артикул или OEM-номер" /><button type="submit" aria-label="Найти деталь"><ArrowRight size={21} /></button></form>
        <div className="hero-links"><span>С чего начать?</span><Link to="/catalog">Каталог <ArrowUpRight size={15} /></Link><Link to="/garage">Подбор по авто <ArrowUpRight size={15} /></Link></div>
      </div>
      <div className="hero-visual"><div className="hero-image-wrap"><img src="/images/automotive-studio.png" alt="Спортивный автомобиль в студийном освещении" fetchPriority="high" /></div><div className="hero-caption"><span>ENGINEERED FOR YOUR DRIVE</span><span>01 / AUTO UNIVERSE</span></div></div>
    </section>
    <section className="commerce-container vehicle-section" aria-labelledby="vehicle-title">
      <div className="vehicle-intro"><div className="outline-icon"><Car size={26} /></div><div><h2 id="vehicle-title">Начните с автомобиля</h2><p>Выберите марку и модель для подбора</p></div></div>
      <form className="vehicle-form" onSubmit={e => { e.preventDefault(); navigate(`/garage?make_id=${encodeURIComponent(makeId)}&model_id=${encodeURIComponent(modelId)}`) }}>
        <label>Марка<select value={makeId} onChange={e => { setMakeId(e.target.value); setModelId('') }} required><option value="">Выберите марку</option>{makes.data?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label>Модель<select value={modelId} onChange={e => setModelId(e.target.value)} disabled={!makeId} required><option value="">Выберите модель</option>{make?.models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <button className="commerce-button" type="submit" disabled={!makeId || !modelId}>Подобрать детали <ArrowRight size={17} /></button>
      </form>
      {makes.isError && <p className="inline-error" role="alert">Не удалось загрузить автомобили. <button onClick={() => void makes.refetch()}>Повторить</button></p>}
      {make && <p className="vehicle-hint">Для точной проверки {make.name} потребуется поколение, двигатель и год выпуска.</p>}
    </section>
    <section className="commerce-container commerce-section"><div className="section-heading"><div><span className="eyebrow">НАЙДИТЕ СВОЮ ДЕТАЛЬ</span><h2>Всё для вашего автомобиля</h2></div><Link to="/catalog" className="text-link">Все категории <ArrowUpRight size={18} /></Link></div>
      <CategoryTiles categories={categories.data} pending={categories.isPending} error={categories.isError} retry={() => void categories.refetch()} />
    </section>
    <section className="commerce-container commerce-section product-section"><div className="section-heading"><div><span className="eyebrow">ВЫБОР ДЛЯ ВАШИХ ДОРОГ</span><h2>{selectedVehicle ? `Для ${selectedVehicle.name}` : 'Детали для уверенности в пути'}</h2></div><div className="product-tabs" aria-label="Подборка товаров"><button aria-pressed={!deals} className={!deals ? 'selected' : ''} onClick={() => setDeals(false)}>Популярное</button><button aria-pressed={deals} className={deals ? 'selected' : ''} onClick={() => setDeals(true)}>Предложения</button></div></div>
      {products.isPending ? <div className="commerce-product-grid">{Array.from({ length: 4 }, (_, i) => <div key={i} className="product-skeleton skeleton" />)}</div> : products.isError ? <div className="commerce-empty" role="alert"><Package size={32} /><h3>Не удалось загрузить товары</h3><p>Проверьте соединение и попробуйте ещё раз.</p><button className="commerce-button" onClick={() => void products.refetch()}>Повторить загрузку</button></div> : !products.data?.items.length ? <div className="commerce-empty"><Package size={32} /><h3>{deals ? 'Пока нет специальных предложений' : 'В этой подборке пока нет деталей'}</h3><Link to="/catalog" className="text-link">Перейти в каталог <ArrowRight size={16} /></Link></div> : <div className="commerce-product-grid">{products.data.items.map(p => <ProductCard key={p.id} product={p} />)}</div>}
      <Link className="catalog-more" to={deals ? '/catalog?has_discount=true' : '/catalog?sort=popular'}>Перейти в каталог <ArrowRight size={17} /></Link>
    </section>
    <section className="brands-section" id="brands" aria-label="Производители"><div className="commerce-container"><span className="eyebrow">БРЕНДЫ В НАШЕМ КАТАЛОГЕ</span><div className="brand-list">{brands.data?.slice(0, 7).map(b => <Link to={`/catalog?brand_id=${b.id}`} key={b.id}>{b.name}</Link>)}{brands.isError && <button onClick={() => void brands.refetch()}>Загрузить бренды</button>}</div></div></section>
    <section className="commerce-container commerce-section service-editorial"><div className="garage-editorial"><span className="eyebrow">МОЙ ГАРАЖ</span><Car size={82} strokeWidth={0.8} /><h2>Ваш автомобиль.<br />Ваш точный выбор.</h2><p>{selectedVehicle ? `${selectedVehicle.name} уже в вашем гараже. Проверяйте доступные данные о совместимости перед покупкой.` : 'Сохраните автомобиль, чтобы видеть доступную информацию о совместимости в каталоге.'}</p><Link className="commerce-button" to="/garage">{selectedVehicle ? 'Открыть гараж' : 'Добавить автомобиль'} <ArrowRight size={17} /></Link></div><div className="service-list"><span className="eyebrow">ПРОДУМАНО ДО ДЕТАЛЕЙ</span><h2>Спокойствие<br />на каждом этапе.</h2>{[{ icon: ShieldCheck, title: 'Проверяйте совместимость', text: 'Артикулы, OEM-номера и характеристики помогают выбрать деталь для вашей модификации.' }, { icon: Truck, title: 'Доставка по вашему адресу', text: 'Стоимость и доступные сроки рассчитываются при оформлении заказа для выбранного города.' }, { icon: Wrench, title: 'Помощь с подбором', text: 'Отправьте вопрос о детали в поддержку или воспользуйтесь помощником по симптомам.' }].map(({ icon: Icon, title, text }) => <div className="service-item" key={title}><Icon size={24} strokeWidth={1.4} /><div><h3>{title}</h3><p>{text}</p></div></div>)}<Link to="/support" className="text-link">Связаться с поддержкой <ArrowUpRight size={17} /></Link></div></section>
    {Boolean(recommendations.data?.items.some(p => !products.data?.items.some(a => a.id === p.id))) && <section className="commerce-container commerce-section"><div className="section-heading"><div><span className="eyebrow">ОБНОВЛЕНИЕ КАТАЛОГА</span><h2>Стоит присмотреться</h2></div><Link to="/catalog?sort=newest" className="text-link">Все новинки <ArrowUpRight size={17} /></Link></div><div className="commerce-product-grid">{recommendations.data?.items.filter(p => !products.data?.items.some(a => a.id === p.id)).map(p => <ProductCard key={p.id} product={p} />)}</div></section>}
  </div>
}
