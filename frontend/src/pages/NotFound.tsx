import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <div className="text-7xl font-black text-premium">404</div>
      <h1 className="mt-3 text-2xl font-black">{t('notFound')}</h1>
      <p className="mt-2 muted">Страница удалена или адрес указан неверно.</p>
      <Link to="/" className="mt-6 inline-block rounded-lg bg-premium px-6 py-3 font-semibold text-white">
        {t('backHome')}
      </Link>
    </div>
  )
}
