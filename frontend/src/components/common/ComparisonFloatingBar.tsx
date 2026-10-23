import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, GitCompare, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useComparison } from '../../stores/comparison'

export default function ComparisonFloatingBar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { ids, clear } = useComparison()

  // Hide on comparison page itself or when empty
  if (ids.length === 0 || location.pathname === '/compare') {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
      >
        <div
          className="flex items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-[var(--shadow-lg)] backdrop-blur-md"
          style={{
            borderColor: 'var(--color-premium)',
            background: 'rgba(21, 25, 31, 0.94)',
          }}
        >
          <span className="grid size-8 place-items-center rounded-xl bg-premium/15 text-premium">
            <GitCompare className="size-4" />
          </span>

          <div className="flex flex-col pr-1">
            <span className="text-xs font-bold text-white">
              {t('comparison')}
            </span>
            <span className="text-[11px] muted">
              Выбрано: {ids.length} {ids.length === 1 ? 'деталь' : ids.length < 5 ? 'детали' : 'деталей'}
            </span>
          </div>

          <Link
            to="/compare"
            className="btn-premium flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold shadow-[var(--shadow-glow)]"
          >
            <span>{t('compare')}</span>
            <ArrowRight className="size-3.5" />
          </Link>

          <button
            type="button"
            onClick={clear}
            title={t('compareClear')}
            className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
