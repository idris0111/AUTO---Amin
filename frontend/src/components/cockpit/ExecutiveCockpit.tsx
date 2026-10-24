import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, BarChart3, Package, RefreshCw, ShieldCheck, ShoppingBag, Users, Wallet } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../stores/auth'
import type { AnalyticsDashboardResponse } from '../../types'

const statusNames: Record<string, string> = { pending:'Ожидает', awaiting_payment:'Ожидает оплаты', confirmed:'Подтверждён', processing:'В обработке', packed:'Упакован', shipped:'Отправлен', delivered:'Доставлен', completed:'Завершён', cancelled:'Отменён', returned:'Возврат' }
const money = (n: string | number) => Number(n).toLocaleString('ru-RU', { maximumFractionDigits:2, minimumFractionDigits:2 })

export function ExecutiveCockpit({ embedded = false }: { embedded?: boolean }) {
  const { user, initialized } = useAuth()
  const [days, setDays] = useState(7)
  const allowed = Boolean(user && ['admin','super_admin','manager','order_manager'].includes(user.role))
  const analytics = useQuery({ queryKey:['commerce-analytics',days,user?.id], queryFn:() => api.get<AnalyticsDashboardResponse>('/admin/analytics/dashboard', { days }), enabled:initialized && allowed, retry:false })
  const data = analytics.data
  const max = Math.max(...(data?.revenue_chart.map(d => Number(d.revenue)) || []), 1)

  if (!initialized) return <div className="analytics-page"><div className="skeleton h-64 rounded-xl" /></div>
  if (!allowed) return <div className="analytics-page"><div className="commerce-empty"><ShieldCheck size={36} /><h1>Доступ к аналитике</h1><p>{user ? 'Для этого раздела требуется право просмотра статистики.' : 'Войдите в учётную запись сотрудника с доступом к статистике.'}</p><Link to={user ? '/' : '/login'} className="commerce-button">{user ? 'На главную' : 'Войти'}</Link></div></div>

  return <div className={`analytics-page ${embedded ? 'analytics-embedded' : ''}`}>
    {!embedded && <div className="analytics-top"><Link to="/" className="brand-wordmark">AUTO<span>UNIVERSE</span></Link><Link to="/admin" className="text-link"><ArrowLeft size={16} /> Управление магазином</Link></div>}
    <div className="section-heading"><div><span className="eyebrow">COMMERCE INTELLIGENCE / {data?.currency || 'TJS'}</span><h1>Каждое решение — на основе данных.</h1><p className="analytics-description">Заказы за выбранный период · Дни по UTC · Остатки на текущий момент</p></div><div className="analytics-controls"><label className="sr-only" htmlFor={`analytics-period-${embedded}`}>Период аналитики</label><select id={`analytics-period-${embedded}`} value={days} onChange={e => setDays(Number(e.target.value))}><option value={7}>7 дней</option><option value={30}>30 дней</option><option value={90}>90 дней</option></select><button aria-label="Обновить аналитику" onClick={() => void analytics.refetch()} disabled={analytics.isFetching}><RefreshCw size={17} /></button></div></div>
    {analytics.isPending && <div className="analytics-kpis">{Array.from({length:6},(_,i)=><div className="skeleton h-32 rounded-xl" key={i} />)}</div>}
    {analytics.isError && <div className="commerce-empty" role="alert"><BarChart3 size={32} /><h2>Не удалось загрузить аналитику</h2><p>{analytics.error instanceof Error ? analytics.error.message : 'Проверьте подключение к серверу.'}</p><button className="commerce-button" onClick={() => void analytics.refetch()}>Повторить</button></div>}
    {data && <>
      <div className="analytics-kpis">{[
        { title:'Стоимость заказов', value:money(data.total_revenue), suffix:data.currency, icon:Wallet },
        { title:'Заказы', value:data.total_orders, icon:ShoppingBag },
        { title:'Средний чек', value:money(data.average_order_value), suffix:data.currency, icon:BarChart3 },
        { title:'Заказано деталей', value:data.units_sold, suffix:'шт.', icon:Package },
        { title:'Новые клиенты', value:data.new_customers, icon:Users },
        { title:'Товаров в каталоге', value:data.stock_health.total_skus, suffix:'SKU', icon:Package },
      ].map(({title,value,suffix,icon:Icon})=><div className="analytics-kpi" key={title}><div><span>{title}</span><Icon size={16} /></div><strong>{value} <small>{suffix}</small></strong></div>)}</div>
      <p className="analytics-note">Стоимость заказов исключает отмены и возвраты; это сумма заказов, а не подтверждение поступления оплаты. Средний чек, детали и категории рассчитаны по тем же заказам.</p>
      <div className="analytics-grid"><section className="analytics-panel revenue-panel"><div className="analytics-panel-heading"><h2>Динамика заказов</h2><span>{days} дней</span></div><div className="revenue-plot" role="img" aria-label={`Стоимость заказов за ${days} дней: ${money(data.total_revenue)} ${data.currency}`}><div className="chart-scale"><span>{money(max)}</span><span>{money(max/2)}</span><span>0</span></div><div className="revenue-bars">{data.revenue_chart.map(d=><div className="revenue-bar-wrap" key={d.date}><div className="revenue-bar" style={{height:`${Math.max(1,Number(d.revenue)/max*100)}%`}} title={`${d.date}: ${money(d.revenue)} TJS · ${d.orders_count} заказов`} /></div>)}</div></div><div className="chart-dates"><span>{data.revenue_chart[0]?.date}</span><span>{data.revenue_chart.at(-1)?.date}</span></div><details className="chart-data"><summary>Данные графика</summary><div className="analytics-table-wrap"><table><thead><tr><th>Дата</th><th>Стоимость, TJS</th><th>Заказы</th></tr></thead><tbody>{data.revenue_chart.map(d=><tr key={d.date}><td>{d.date}</td><td>{money(d.revenue)}</td><td>{d.orders_count}</td></tr>)}</tbody></table></div></details></section>
      <section className="analytics-panel"><div className="analytics-panel-heading"><h2>Продажи по категориям</h2><Package size={17} /></div>{!data.sales_by_category.length ? <p className="analytics-description">За выбранный период пока нет продаж.</p> : data.sales_by_category.map(c=><div className="category-sales" key={c.name}><div><strong>{c.name}</strong><span>{money(c.revenue)} TJS</span></div><meter min={0} max={Math.max(...data.sales_by_category.map(c=>Number(c.revenue)),1)} value={Number(c.revenue)} aria-label={c.name} /><small>{c.units_sold} шт.</small></div>)}</section></div>
      <div className="analytics-grid"><section className="analytics-panel"><div className="analytics-panel-heading"><h2>Лидеры продаж</h2><span>По количеству деталей</span></div><div className="analytics-table-wrap"><table><thead><tr><th>Деталь</th><th>Шт.</th><th>Стоимость, TJS</th></tr></thead><tbody>{data.top_products.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small>{p.sku}</small></td><td>{p.units_sold}</td><td>{money(p.revenue)}</td></tr>)}</tbody></table>{!data.top_products.length && <p className="analytics-description">За период нет заказанных деталей.</p>}</div></section>
      <section className="analytics-panel"><div className="analytics-panel-heading"><h2>Состояние склада</h2><span>Сейчас</span></div><div className="stock-summary"><div><strong>{data.stock_health.in_stock}</strong><span>В наличии</span></div><div><strong>{data.stock_health.low_stock}</strong><span>Мало</span></div><div><strong>{data.stock_health.out_of_stock}</strong><span>Закончились</span></div></div><h3 className="analytics-subtitle">Требуют внимания</h3>{data.low_stock_products.map(p=><div className="inventory-alert" key={p.id}><div><strong>{p.name}</strong><small>{p.sku} · порог {p.low_stock_threshold}</small></div><span>{p.stock_quantity} шт.</span></div>)}{!data.low_stock_products.length && <p className="analytics-description">Нет товаров с низким остатком.</p>}</section></div>
      <section className="analytics-panel"><div className="analytics-panel-heading"><h2>Последние заказы</h2><Link to="/admin" className="text-link">Управление <ArrowUpRight size={16} /></Link></div><div className="analytics-table-wrap"><table><thead><tr><th>Заказ</th><th>Дата</th><th>Статус</th><th>Сумма, TJS</th></tr></thead><tbody>{data.recent_orders.map(o=><tr key={o.id}><td><strong>{o.number}</strong></td><td>{new Date(o.created_at).toLocaleDateString('ru-RU',{timeZone:'Asia/Dushanbe'})}</td><td><span className="order-status">{statusNames[o.status] || o.status}</span></td><td>{money(o.total)}</td></tr>)}</tbody></table>{!data.recent_orders.length && <p className="analytics-description">За выбранный период заказов нет.</p>}</div></section>
    </>}
  </div>
}
export default ExecutiveCockpit
