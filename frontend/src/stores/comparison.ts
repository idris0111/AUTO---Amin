import { create } from 'zustand'

const STORAGE_KEY = 'au_comparison_ids'
const MAX_COMPARISON_ITEMS = 4

function loadStoredIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore local storage errors
  }
}

type ComparisonState = {
  ids: string[]
  add: (id: string) => boolean
  remove: (id: string) => void
  toggle: (id: string) => boolean
  clear: () => void
  has: (id: string) => boolean
}

export const useComparison = create<ComparisonState>((set, get) => ({
  ids: loadStoredIds(),

  add(id: string) {
    const current = get().ids
    if (current.includes(id)) return true
    if (current.length >= MAX_COMPARISON_ITEMS) return false
    const next = [...current, id]
    saveIds(next)
    set({ ids: next })
    return true
  },

  remove(id: string) {
    const next = get().ids.filter((item) => item !== id)
    saveIds(next)
    set({ ids: next })
  },

  toggle(id: string) {
    const current = get().ids
    if (current.includes(id)) {
      get().remove(id)
      return false
    }
    return get().add(id)
  },

  clear() {
    saveIds([])
    set({ ids: [] })
  },

  has(id: string) {
    return get().ids.includes(id)
  },
}))

