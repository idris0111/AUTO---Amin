import { create } from 'zustand'

import { api } from '../lib/api'
import type { Cart } from '../types'

type CartState = {
  cart: Cart | null
  loading: boolean
  error: string | null
  fetchCart: () => Promise<void>
  addItem: (productId: string, quantity?: number) => Promise<void>
  updateItem: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  mergeGuestCart: () => Promise<void>
  clear: () => void
}

export const useCart = create<CartState>((set, get) => ({
  cart: null,
  loading: false,
  error: null,

  async fetchCart() {
    set({ loading: true, error: null })
    try {
      const cart = await api.get<Cart>('/cart')
      set({ cart })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load cart' })
    } finally {
      set({ loading: false })
    }
  },

  async addItem(productId, quantity = 1) {
    set({ error: null })
    try {
      const cart = await api.post<Cart>('/cart/items', { product_id: productId, quantity })
      set({ cart })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add item'
      set({ error: message })
      throw error
    }
  },

  async updateItem(itemId, quantity) {
    try {
      const cart = await api.patch<Cart>(`/cart/items/${itemId}`, { quantity })
      set({ cart })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update cart' })
      throw error
    }
  },

  async removeItem(itemId) {
    try {
      const cart = await api.delete<Cart>(`/cart/items/${itemId}`)
      set({ cart })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove item' })
    }
  },

  async mergeGuestCart() {
    try {
      const cart = await api.post<Cart>('/cart/merge')
      set({ cart })
    } catch {
      await get().fetchCart()
    }
  },

  clear() {
    set({ cart: null })
  },
}))
