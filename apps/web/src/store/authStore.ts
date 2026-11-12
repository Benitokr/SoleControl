import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  roleCode: string
  roleName: string
  permissions: string[]
}

interface AuthState {
  user: User | null
  accessToken: string | null
  setUser: (u: User) => void
  setAccessToken: (t: string) => void
  logout: () => void
  hasPermission: (k: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setUser: (user) => set({ user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => {
        set({ user: null, accessToken: null })
        localStorage.removeItem('solecontrol-auth')
      },
      hasPermission: (key) => {
        const { user } = get()
        if (!user) return false
        if (user.roleCode === 'SUPER_ADMIN') return true
        return user.permissions?.includes(key) ?? false
      }
    }),
    {
      name: 'solecontrol-auth'
    }
  )
)

