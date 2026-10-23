import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, ThumbsUp, BadgeCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api } from '../../lib/api'
import type { ReviewRead } from '../../types/reviews'
import { useAuth } from '../../stores/auth'

export default function Reviews({ productId }: { productId: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [message, setMessage] = useState('')
  const [messageOk, setMessageOk] = useState(false)

  const reviews = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => api.get<ReviewRead[]>(`/products/${productId}/reviews`),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post<ReviewRead>(`/products/${productId}/reviews`, { rating, text }),
    onSuccess: () => {
      setText('')
      setMessage(t('reviewThanks'))
      setMessageOk(true)
      void reviews.refetch()
    },
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : t('reviewFailed'))
      setMessageOk(false)
    },
  })

  return (
    <section className="mt-12">
      <h2 className="premium-section-title mb-4 text-lg font-black">{t('reviews')}</h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {reviews.isLoading && <div className="skeleton h-20 w-full" />}
          {reviews.data?.length === 0 && (
            <div className="rounded-xl border p-6 text-sm muted" style={{ borderColor: 'var(--border)' }}>
              {t('noReviews')}
            </div>
          )}
          {(reviews.data ?? []).map((review) => (
            <article
              key={review.id}
              className="card-hover rounded-xl border p-4"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
            >
              <div className="flex items-center gap-2">
                <span className="flex">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`size-4 ${index < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`}
                    />
                  ))}
                </span>
                <span className="text-sm font-semibold">{review.author_name}</span>
                {review.is_verified_purchase && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
                    <BadgeCheck className="size-3.5" /> {t('verifiedPurchase')}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed">{review.text}</p>
              <div className="mt-2 text-xs muted">{new Date(review.created_at).toLocaleDateString('ru-RU')}</div>
            </article>
          ))}
        </div>

        <div className="h-fit rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
          <h3 className="mb-3 font-bold">{t('leaveReview')}</h3>
          {user ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                setMessage('')
                createMutation.mutate()
              }}
            >
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Оценка ${index + 1}`}
                    onClick={() => setRating(index + 1)}
                  >
                    <Star className={`size-6 ${index < rating ? 'fill-amber-400 text-amber-400' : 'muted'}`} />
                  </button>
                ))}
              </div>
              <textarea
                required
                minLength={10}
                maxLength={4000}
                rows={4}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={t('reviewPlaceholder')}
                className="input-premium resize-y"
              />
              {message && (
                <div className={`text-sm ${messageOk ? 'text-emerald-500' : 'text-premium'}`}>{message}</div>
              )}
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-premium px-5 py-2.5 text-sm"
              >
                <ThumbsUp className="size-4" /> {t('send')}
              </button>
            </form>
          ) : (
            <p className="text-sm muted">
              <Link to="/login" className="font-semibold text-premium">
                {t('login')}
              </Link>{' '}
              — {t('leaveReview').toLowerCase()}.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
