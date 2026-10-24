import { ArrowUpRight, Car } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return <footer className="commerce-footer"><div className="commerce-container">
    <div className="footer-main"><div className="footer-brand"><Link to="/" className="brand-wordmark">AUTO<span>UNIVERSE</span></Link><p>Точность в каждой детали.<br />Запчасти и забота о вашем автомобиле.</p><span className="footer-location">Таджикистан · Цены в сомони</span></div>
      <div><h3>Ваш автомобиль</h3><Link to="/catalog">Каталог запчастей</Link><Link to="/garage">Мой гараж</Link><Link to="/catalog?has_discount=true">Предложения</Link><Link to="/compare">Сравнение деталей</Link></div>
      <div><h3>Покупателю</h3><Link to="/orders">Мои заказы</Link><Link to="/favorites">Избранное</Link><Link to="/profile">Личный кабинет</Link><Link to="/support">Доставка и возврат</Link></div>
      <div className="footer-help"><Car size={28} strokeWidth={1.2} /><h3>Нужна помощь с выбором?</h3><p>Уточните артикул и совместимость перед заказом.</p><Link to="/support">Задать вопрос <ArrowUpRight size={16} /></Link><Link to="/blog">База знаний <ArrowUpRight size={16} /></Link><Link to="/ai-mechanic">Помощник по симптомам <ArrowUpRight size={16} /></Link></div>
    </div><div className="footer-bottom"><span>© {new Date().getFullYear()} AUTO UNIVERSE</span><span>При получении · Банковский перевод</span><span>TJS / СОМОНИ</span></div>
  </div></footer>
}
