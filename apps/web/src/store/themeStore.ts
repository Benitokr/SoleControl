import { create } from 'zustand'

interface ThemeState { theme: 'light' | 'dark'; toggle: () => void }
export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (typeof window !== 'undefined' && localStorage.getItem('sc-theme') === 'dark') ? 'dark' : 'light',
  toggle: () => {
    const next = get().theme === 'light' ? 'dark' : 'light'
    document.documentElement.classList.add('theme-transition')
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem('sc-theme', next)
    } catch (e) {}
    set({ theme: next })
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition')
    }, 250)
  }
}))
