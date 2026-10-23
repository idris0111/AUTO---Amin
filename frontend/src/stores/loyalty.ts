import { create } from 'zustand'
import { api } from '../lib/api'
import type { LoyaltyAccountRead, PointsApplyResponse } from '../types'

type LoyaltyState = {
  account: LoyaltyAccountRead | null
  loading: boolean
  error: string | null
  loadLoyalty: () => Promise<void>
  quoteDiscount: (subtotal: number, points: number) => Promise<PointsApplyResponse>
  clear: () => void
}

export const useLoyalty = create<LoyaltyState>((set) => ({
  account: null,
  loading: false,
  error: null,

  async loadLoyalty() {
    set({ loading: true, error: null })
    try {
      const data = await api.get<LoyaltyAccountRead>('/loyalty/me')
      set({ account: data })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load loyalty account' })
    } finally {
      set({ loading: false })
    }
  },

  async quoteDiscount(subtotal: number, points: number) {
    return api.post<PointsApplyResponse>(`/loyalty/quote-discount?subtotal=${subtotal}`, {
      points,
    })
  },

  clear() {
    set({ account: null, error: null, loading: false })
  },
}))

