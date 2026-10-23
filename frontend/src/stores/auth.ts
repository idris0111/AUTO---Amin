import { create } from 'zustand'

import { api, clearTokens, getAccessToken, getRefreshToken, setTokens } from '../lib/api'
import type { TokenPair, User } from '../types'

type AuthState = {
  user: User | null
  loading: boolean
  initialized: boolean
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (payload: {
    email: string
    password: string
    first_name: string
    last_name: string
    phone?: string
  }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  async initialize() {
    if (!getAccessToken() || !getRefreshToken()) {
      set({ initialized: true })
      return
    }
    try {
      const user = await api.get<User>('/users/me')
      set({ user, initialized: true })
    } catch {
      clearTokens()
      set({ user: null, initialized: true })
    }
  },

  async login(email, password) {
    set({ loading: true })
    try {
      const tokens = await api.post<TokenPair>('/auth/login', { email, password })
      setTokens(tokens.access_token, tokens.refresh_token)
      const user = await api.get<User>('/users/me')
      set({ user })
    } finally {
      set({ loading: false })
    }
  },

  async register(payload) {
    set({ loading: true })
    try {
      await api.post('/auth/register', payload)
      const tokens = await api.post<TokenPair>('/auth/login', {
        email: payload.email,
        password: payload.password,
      })
      setTokens(tokens.access_token, tokens.refresh_token)
      const user = await api.get<User>('/users/me')
      set({ user })
    } finally {
      set({ loading: false })
    }
  },

  async logout() {
    try {
      const refresh = getRefreshToken()
      if (refresh) await api.post('/auth/logout', { refresh_token: refresh })
    } catch {
      // ignore network errors on logout
    } finally {
      clearTokens()
      set({ user: null })
    }
  },

  async refreshUser() {
    if (!getAccessToken()) return
    try {
      const user = await api.get<User>('/users/me')
      set({ user })
    } catch {
      clearTokens()
      set({ user: null })
    }
  },
}))
