import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowRight, Lock, LogIn, Mail } from 'lucide-react'

import { useAuth } from '../stores/auth'
import { useCart } from '../stores/cart'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { login, loading } = useAuth()
  const { mergeGuestCart } = useCart()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    try {
      await login(email, password)
      await mergeGuestCart()
      const next = params.get('next') || '/'
      navigate(next.startsWith('/') && !next.startsWith('//') ? next : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти в аккаунт')
    }
  }

  return (
    <div className="min-h-[80vh] bg-[var(--canvas)] text-ink flex items-center justify-center px-4 py-16">
      {/* Background radial accent */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_40%,rgba(227,38,54,0.08),transparent)]" />

      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-[var(--canvas)] p-8 sm:p-10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-premium/15 text-premium border border-[#E32636]/30 mb-3">
            <LogIn className="size-6" />
          </div>
          <div className="font-mono text-xs uppercase tracking-widest text-premium">
            AU PERFORMANCE AUTH
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-ink tracking-tight">
            {t('login')}
          </h1>
          <p className="mt-2 text-xs text-muted">
            Войдите в личный кабинет для доступа к заказам и панели управления.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-2">
              {t('email')}
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Mail className="size-4" />
              </div>
              <input
                type="email"
                aria-label={t('email')}
                required
                autoComplete="email"
                placeholder="admin@autouniverse.tj"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-3 pl-10 pr-4 font-mono text-xs text-ink placeholder-slate-600 outline-none transition focus:border-[#E32636]"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-2">
              {t('password')}
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Lock className="size-4" />
              </div>
              <input
                type="password"
                aria-label={t('password')}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-3 pl-10 pr-4 font-mono text-xs text-ink placeholder-slate-600 outline-none transition focus:border-[#E32636]"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-[#E32636]/40 bg-premium/10 p-3.5 text-xs font-mono text-premium">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-premium py-3.5 font-mono text-xs font-bold text-ink shadow-[0_4px_20px_rgba(227,38,54,0.35)] transition hover:bg-[#D91F32] disabled:opacity-50"
          >
            <span>{loading ? 'ВХОД В СИСТЕМУ...' : 'ВОЙТИ В СИСТЕМУ'}</span>
            <ArrowRight className="size-4" />
          </button>
        </form>

        <div className="mt-8 border-t border-[var(--border)] pt-6 text-center">
          <p className="font-mono text-xs text-muted">
            {t('noAccount')}{' '}
            <Link to="/register" className="font-bold text-premium hover:underline">
              {t('freeRegistration')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
