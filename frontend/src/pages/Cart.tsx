import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react'
import { useCart } from '../stores/cart'

const money = (n: string) => Number(n).toLocaleString('ru-RU',{minimumFractionDigits:2})

export default function Cart() {
  const { cart, loading, error, fetchCart, updateItem, removeItem } = useCart()
  const [pending, setPending] = useState(false)
  useEffect(() => { void fetchCart() }, [fetchCart])
  async function change(itemId: string, quantity?: number) {
    setPending(true)
    try { if (quantity === undefined) await removeItem(itemId); else await updateItem(itemId, quantity) }
    catch { /* The cart store exposes the server error below. */ }
    finally { setPending(false) }
  }
  if (loading && !cart) return <div className="commerce-container commerce-section"><div className="skeleton h-10 w-48 rounded-lg mb-8" /><div className="skeleton h-64 rounded-xl" /></div>
  if (error && !cart) return <div className="commerce-container commerce-section"><div className="commerce-empty" role="alert"><ShoppingBag size={36} /><h1>Корзина временно недоступна</h1><p>{error}</p><button className="commerce-button" onClick={() => void fetchCart()}>Повторить</button></div></div>
  if (!cart?.items.length) return <div className="commerce-container commerce-section"><div className="commerce-empty"><ShoppingBag size={42} strokeWidth={1.2} /><span className="eyebrow">ВАША КОРЗИНА</span><h1 className="text-2xl font-bold">Начните с правильной детали</h1><p>Добавьте товары из каталога — они появятся здесь.</p><Link className="commerce-button" to="/catalog">Открыть каталог <ArrowRight size={17} /></Link></div></div>
  return <div className="commerce-container commerce-section">
    <div className="section-heading"><div><span className="eyebrow">ВАШ ВЫБОР / AUTO UNIVERSE</span><h1 className="text-3xl font-bold mt-3 tracking-tight">Корзина</h1><p className="text-sm muted mt-2">{cart.count} шт. · Проверьте детали перед оформлением</p></div><Link className="text-link" to="/catalog"><ArrowLeft size={16} /> Продолжить покупки</Link></div>
    {error && <p role="alert" className="inline-error mb-6">{error}</p>}
    <div className="cart-layout"><div className="cart-items" aria-busy={pending}>{cart.items.map(item=><article className="cart-item" key={item.id}><Link to={`/product/${item.product_slug}`} className="cart-photo">{item.product_image ? <img src={item.product_image} alt={item.product_name || 'Деталь'} /> : <PackagePlaceholder />}</Link><div className="cart-item-copy"><Link to={`/product/${item.product_slug}`} className="font-semibold text-sm">{item.product_name}</Link><p>{money(item.unit_price)} TJS / шт.</p>{item.stock_quantity !== null && <small>{item.stock_quantity > 0 ? `На складе: ${item.stock_quantity} шт.` : 'Сейчас нет в наличии'}</small>}<div className="cart-quantity"><button disabled={pending || item.quantity <= 1} aria-label={`Уменьшить количество: ${item.product_name}`} onClick={() => void change(item.id,item.quantity-1)}><Minus size={15} /></button><span aria-live="polite">{item.quantity}</span><button disabled={pending || (item.stock_quantity !== null && item.quantity >= item.stock_quantity)} aria-label={`Увеличить количество: ${item.product_name}`} onClick={() => void change(item.id,item.quantity+1)}><Plus size={15} /></button></div></div><div className="cart-item-total"><strong>{money(item.line_total)} TJS</strong><button disabled={pending} aria-label={`Удалить: ${item.product_name}`} onClick={() => void change(item.id)}><Trash2 size={17} /></button></div></article>)}</div>
      <aside className="cart-summary"><span className="eyebrow">СУММА ЗАКАЗА</span><h2>Всё готово к следующему шагу</h2><div><span>Товары, {cart.count} шт.</span><strong>{money(cart.subtotal)} TJS</strong></div><p><Truck size={18} /> Стоимость и срок доставки рассчитаем по адресу на следующем шаге.</p><div className="cart-grand-total"><span>Стоимость товаров</span><strong>{money(cart.subtotal)} <small>TJS</small></strong></div><Link to="/checkout" className="commerce-button">Оформить заказ <ArrowRight size={17} /></Link><small>Промокод и бонусы можно применить при оформлении. Итоговую сумму подтверждает сервер.</small></aside>
    </div>
  </div>
}
function PackagePlaceholder() { return <ShoppingBag size={32} strokeWidth={1} /> }
