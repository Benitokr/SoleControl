import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { formatINR } from './format'

const metaEnv = (import.meta as unknown as { env?: Record<string, string> })?.env
const apiBase = metaEnv?.VITE_API_URL 
  ? `${metaEnv.VITE_API_URL.replace(/\/$/, '')}/api/v1`
  : '/api/v1'

export const api = axios.create({ baseURL: apiBase, withCredentials: true })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string | null> | null = null
api.interceptors.response.use(
  r => r,
  async (err) => {
    const original = err.config
    // Never retry auth login or refresh requests to avoid infinite loops
    if (original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh')) {
      return Promise.reject(err)
    }
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      if (!refreshing) {
        refreshing = api.post('/auth/refresh').then(r => {
          const t = r.data.data.accessToken
          useAuthStore.getState().setAccessToken(t)
          refreshing = null
          return t
        }).catch(() => {
          useAuthStore.getState().logout()
          refreshing = null
          return null
        })
      }
      const token = await refreshing
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
    }
    return Promise.reject(err)
  }
)

export const fmt = (n: number) => formatINR(n)
