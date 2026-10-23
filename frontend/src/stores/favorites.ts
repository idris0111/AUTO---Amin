import { create } from 'zustand'

import { api } from '../lib/api'
import type { ProductBrief } from '../types'

type FavoritesState = {
  ids: string[]
  loaded: boolean
  load: () => Promise<void>
  toggle: (productId: string) => Promise<boolean>
  clear: () => void
}

export const useFavorites = create<FavoritesState>((set, get) => ({
  ids: [],
  loaded: false,

  async load() {
    if (get().loaded) return
    try {
      const items = await api.get<ProductBrief[]>('/favorites')
      set({ ids: items.map((item) => item.id), loaded: true })
    } catch {
      set({ loaded: false })
    }
  },

  async toggle(productId) {
    const result = await api.post<{ is_favorite: boolean }>(`/favorites/${productId}`)
    const ids = [...get().ids]
    const next = result.is_favorite ? [...ids, productId] : ids.filter((id) => id !== productId)
    set({ ids: next, loaded: true })
    return result.is_favorite
  },

  clear() {
    set({ ids: [], loaded: false })
  },
}))
