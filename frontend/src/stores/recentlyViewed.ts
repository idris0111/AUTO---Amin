import { create } from 'zustand'
import type { ProductBrief } from '../types'

const STORAGE_KEY = 'au_recently_viewed'
const MAX_RECENT_ITEMS = 8

function loadStored(): ProductBrief[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(items: ProductBrief[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

type RecentlyViewedState = {
  items: ProductBrief[]
  add: (product: ProductBrief) => void
  clear: () => void
}

export const useRecentlyViewed = create<RecentlyViewedState>((set, get) => ({
  items: loadStored(),

  add(product: ProductBrief) {
    const current = get().items.filter((item) => item.id !== product.id)
    const next = [product, ...current].slice(0, MAX_RECENT_ITEMS)
    save(next)
    set({ items: next })
  },

  clear() {
    save([])
    set({ items: [] })
  },
}))

