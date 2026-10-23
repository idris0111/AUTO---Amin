import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, LifeBuoy, ArrowRight, ShieldCheck, Mail, Phone, Check } from 'lucide-react'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
    setTimeout(() => {
      setEmail('')
      setSubscribed(false)
    }, 4000)
  }

  return (
    <footer className="border-t border-[#242A32] bg-[#07080A] text-[#A5ACB5] pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4">
        {/* Top Newsletter & Brand Line */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 pb-14 border-b border-[#242A32]">
          <div className="max-w-xl">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-premium to-red-700 text-xs font-black text-white shadow-[0_0_15px_rgba(227,38,54,0.4)]">
                AU
              </span>
              <span className="text-xl font-black tracking-tight text-white">
                AUTO<span className="text-premium">UNIVERSE</span>
              </span>
            </div>
            <p className="mt-2 text-xs font-mono uppercase tracking-[0.2em] text-premium">
              ENGINEERED FOR YOUR DRIVE // PERFORMANCE LUXURY
            </p>
            <p className="mt-3 text-sm text-[#A5ACB5] leading-relaxed">
              Премиальная экосистема оригинальных запчастей и высокопроизводительных компонентов с гарантией точной совместимости в Таджикистане.
            </p>
          </div>

          {/* Newsletter Box */}
          <div className="w-full lg:w-96">
            <span className="block text-xs font-mono uppercase tracking-wider text-white mb-2">
              AU Club Newsletter // Эксклюзивные предложения
            </span>
            <form onSubmit={handleSubscribe} className="relative flex">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ваш e-mail для спецпредложений"
                className="w-full rounded-xl border border-[#242A32] bg-[#0B0D10] px-4 py-3 text-xs text-white placeholder:text-[#A5ACB5]/50 outline-none focus:border-premium transition"
              />
              <button
                type="submit"
                disabled={subscribed}
                className="absolute right-1 top-1 bottom-1 rounded-lg bg-premium px-4 font-bold text-xs text-white hover:brightness-110 transition flex items-center gap-1.5"
              >
                {subscribed ? (
                  <>
                    <Check className="size-3.5" />
                    <span>Готово</span>
                  </>
                ) : (
                  <>
                    <span>Подписаться</span>
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </button>
            </form>
            <span className="block mt-2 text-[10px] text-[#A5ACB5]/60">
              Нажимая кнопку, вы соглашаетесь с условиями конфиденциальности
            </span>
          </div>
        </div>

        {/* 4 Navigation Columns */}
        <div className="grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4 border-b border-[#242A32]">
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-white mb-4">
              Каталог запчастей
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/catalog" className="hover:text-premium transition">
                  Все автозапчасти
                </Link>
              </li>
              <li>
                <Link to="/catalog?has_discount=true" className="hover:text-premium transition">
                  Акции и спецпредложения
                </Link>
              </li>
              <li>
                <Link to="/garage" className="hover:text-premium transition">
                  Подбор по марке и VIN
                </Link>
              </li>
              <li>
                <Link to="/ai-mechanic" className="hover:text-premium transition flex items-center gap-1">
                  <span>AI Автомеханик</span>
                  <span className="rounded bg-premium/20 px-1 py-0.2 text-[9px] font-bold text-premium">AI</span>
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-premium transition">
                  База знаний и регламенты ТО
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-white mb-4">
              Клиентский сервис
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/profile" className="hover:text-premium transition">
                  Личный кабинет
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-premium transition">
                  Мои заказы и трекинг
                </Link>
              </li>
              <li>
                <Link to="/favorites" className="hover:text-premium transition">
                  Избранные детали
                </Link>
              </li>
              <li>
                <Link to="/compare" className="hover:text-premium transition">
                  Сравнение характеристик
                </Link>
              </li>
              <li>
                <Link to="/support" className="hover:text-premium transition">
                  Служба заботы (Тикеты)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-white mb-4">
              Гарантии & Доставка
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2 text-white">
                <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
                <span>100% Заводская гарантия OEM</span>
              </li>
              <li>Доставка по Душанбе: день в день</li>
              <li>Регионы РТ: 24–48 часов курьером</li>
              <li>Возврат и обмен: 14 дней без споров</li>
              <li>Безопасная оплата в сомони (TJS)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-white mb-4">
              Контакты в Таджикистане
            </h4>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2.5">
                <MapPin className="size-4 shrink-0 text-premium mt-0.5" />
                <span>г. Душанбе, пр. Рудаки 142, Автотехцентр AUTO UNIVERSE</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 shrink-0 text-premium" />
                <span className="font-mono text-white">+992 (44) 600-00-00</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0 text-premium" />
                <span className="font-mono">concierge@autouniverse.tj</span>
              </li>
              <li className="flex items-center gap-2.5">
                <LifeBuoy className="size-4 shrink-0 text-premium" />
                <span>Поддержка 24/7 в онлайн-чате</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & payment methods */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#A5ACB5]/70">
          <div>
            © {new Date().getFullYear()} AUTO UNIVERSE LLC. Все права защищены. Душанбе, Таджикистан.
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded border border-[#242A32] bg-[#15191F] px-2 py-0.5 text-[10px] text-white">
              TJS (СОМОНИ)
            </span>
            <span className="rounded border border-[#242A32] bg-[#15191F] px-2 py-0.5 text-[10px] text-white">
              КОРТИ МИЛЛИ
            </span>
            <span className="rounded border border-[#242A32] bg-[#15191F] px-2 py-0.5 text-[10px] text-white">
              VISA / MASTERCARD
            </span>
            <span className="rounded border border-[#242A32] bg-[#15191F] px-2 py-0.5 text-[10px] text-white">
              DUSHANBE CITY
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
