import { Home, Layers, ShoppingCart, Sparkles, User as UserIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../../stores/auth'
import { useCart } from '../../stores/cart'

export default function MobileTabBar() {
  const { t } = useTranslation()
  const location = useLocation()
  const user = useAuth((state) => state.user)
  const cart = useCart((state) => state.cart)

  const cartCount = cart?.count ?? 0

  const items = [
    {
      to: '/',
      label: 'Главная',
      icon: Home,
      isActive: location.pathname === '/',
      ariaLabel: 'Главная страница',
    },
    {
      to: '/catalog',
      label: t('explore') || 'Каталог',
      icon: Layers,
      isActive: location.pathname.startsWith('/catalog'),
      ariaLabel: 'Каталог автозапчастей',
    },
    {
      to: '/ai-mechanic',
      label: 'AI Механик',
      icon: Sparkles,
      isActive: location.pathname.startsWith('/ai-mechanic'),
      ariaLabel: 'AI Автомеханик консультант',
      isAi: true,
    },
    {
      to: '/cart',
      label: t('cart') || 'Корзина',
      icon: ShoppingCart,
      isActive: location.pathname.startsWith('/cart'),
      ariaLabel: `Корзина покупок, ${cartCount} товаров`,
      badge: cartCount > 0 ? (cartCount > 99 ? '99+' : cartCount) : null,
    },
    {
      to: user ? '/profile' : '/login',
      label: user ? (t('profile') || 'Профиль') : (t('login') || 'Войти'),
      icon: UserIcon,
      isActive:
        location.pathname.startsWith('/profile') ||
        location.pathname.startsWith('/orders') ||
        location.pathname.startsWith('/garage') ||
        location.pathname.startsWith('/login'),
      ariaLabel: user ? 'Личный кабинет пользователя' : 'Вход в аккаунт',
    },
  ]

  return (
    <nav
      role="navigation"
      aria-label="Мобильная навигация"
      className="fixed bottom-0 inset-x-0 z-40 block md:hidden border-t backdrop-blur-xl transition-colors duration-200"
      style={{
        background: 'color-mix(in srgb, var(--surface-2) 90%, transparent)',
        borderColor: 'var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="grid grid-cols-5 items-center justify-around px-1 py-1.5">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.ariaLabel}
              aria-current={item.isActive ? 'page' : undefined}
              className={`group relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg py-1 transition-all ${
                item.isActive
                  ? 'text-premium font-semibold'
                  : 'text-muted hover:text-white'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`size-5 transition-transform duration-200 ${
                    item.isActive ? 'scale-110 text-premium drop-shadow-[0_0_8px_rgba(227,38,54,0.4)]' : 'group-hover:scale-105'
                  }`}
                  aria-hidden="true"
                />

                {/* AI Pulsing Gem */}
                {item.isAi && (
                  <span className="absolute -top-1 -right-1 flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-premium opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-premium" />
                  </span>
                )}

                {/* Cart Badge */}
                {item.badge && (
                  <span
                    className="absolute -top-1.5 -right-2.5 flex min-w-4 h-4 items-center justify-center rounded-full bg-premium px-1 text-[10px] font-bold text-white shadow-sm"
                    aria-hidden="true"
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] leading-tight tracking-tight max-w-[64px] truncate text-center">
                {item.label}
              </span>

              {/* Active Tab Indicator Bar */}
              {item.isActive && (
                <span
                  className="absolute bottom-0 h-0.5 w-6 rounded-full bg-premium"
                  aria-hidden="true"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

