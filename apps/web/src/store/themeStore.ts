import { create } from 'zustand'

interface ThemeState { theme: 'light' | 'dark'; toggle: () => void }
export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (localStorage.getItem('sc-theme') as 'light' | 'dark') || 'light',
  toggle: () => {
    const next = get().theme === 'light' ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', next === 'dark')
    localStorage.setItem('sc-theme', next)
    set({ theme: next })
  }
}))

