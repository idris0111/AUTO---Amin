import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../stores/auth'
import { useCart } from '../stores/cart'

const FIELD = 'w-full rounded-md border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-premium'
const BORDER = { borderColor: 'var(--border)' }

export default function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { register, loading } = useAuth()
  const { mergeGuestCart } = useCart()
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    try {
      await register({ ...form, phone: form.phone || undefined })
      await mergeGuestCart()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось зарегистрироваться')
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-2xl font-black">{t('register')}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            {t('firstName')}
            <input required maxLength={100} className={FIELD} style={BORDER} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </label>
          <label className="block text-sm">
            {t('lastName')}
            <input required maxLength={100} className={FIELD} style={BORDER} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </label>
        </div>
        <label className="block text-sm">
          {t('email')}
          <input type="email" required autoComplete="email" className={FIELD} style={BORDER} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="block text-sm">
          {t('contactPhone')}
          <input maxLength={32} placeholder="+992..." className={FIELD} style={BORDER} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label className="block text-sm">
          {t('password')}
          <input type="password" required minLength={10} autoComplete="new-password" className={FIELD} style={BORDER} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <span className="mt-1 block text-xs muted">Минимум 10 символов</span>
        </label>
        {error && <div className="rounded-md border border-premium/40 bg-premium/10 px-3 py-2 text-sm text-premium">{error}</div>}
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-premium py-3 font-semibold text-ink disabled:opacity-50">
          {loading ? t('loading') : t('register')}
        </button>
      </form>
      <p className="mt-5 text-sm muted">
        {t('haveAccount')}{' '}
        <Link to="/login" className="font-semibold text-premium">{t('login')}</Link>
      </p>
    </div>
  )
}
