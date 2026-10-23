import { create } from 'zustand'

type Theme = 'dark' | 'light'

type AppState = {
  theme: Theme
  locale: 'ru' | 'tg' | 'en'
  toggleTheme: () => void
  setLocale: (locale: 'ru' | 'tg' | 'en') => void
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem('au_theme', theme)
}

const initialTheme: Theme =
  (localStorage.getItem('au_theme') as Theme | null) ?? 'dark'

export const useApp = create<AppState>((set) => ({
  theme: initialTheme,
  locale: (localStorage.getItem('au_locale') as AppState['locale'] | null) ?? 'ru',

  toggleTheme() {
    set((state) => {
      const theme: Theme = state.theme === 'dark' ? 'light' : 'dark'
      applyTheme(theme)
      return { theme }
    })
  },

  setLocale(locale) {
    localStorage.setItem('au_locale', locale)
    set({ locale })
  },
}))

applyTheme(initialTheme)
