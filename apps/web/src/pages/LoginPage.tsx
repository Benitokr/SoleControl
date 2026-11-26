import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { api } from '../lib/api'
import { Button } from '../components/ui'

export function LoginPage() {
  const [email, setEmail] = useState('superadmin@fortyv.local')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setUser, setAccessToken } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Sign In · SoleControl'
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await api.post('/auth/login', { email, password })
      const { accessToken, user } = res.data.data
      setAccessToken(accessToken)
      setUser(user)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Sign in failed. Check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#F7F8FA]">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 w-1/2 bg-[#0F172A] text-white relative overflow-hidden">
        <div className="relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2.5">
            <span className="text-2xl font-bold tracking-tight text-white">SoleControl</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-teal-600/20 text-teal-300 border border-teal-500/30">
              Retail ERP
            </span>
          </div>

          <div className="space-y-3 max-w-md">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Footwear Retail Operations
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Manage footwear purchasing, size-run inventory, POS billing, GST compliance, and store accounting in one place.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-6">
          <span>SoleControl Retail Management</span>
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            Role-based access
          </span>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="lg:hidden">
            <span className="text-xl font-bold tracking-tight text-slate-900">SoleControl</span>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">Sign in to SoleControl</h2>
            <p className="text-sm text-slate-500 mt-1">Enter your account credentials to continue.</p>
          </div>

          {error && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
                Email address <span className="text-red-600">*</span>
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                placeholder="name@store.local"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                Password <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-3 pr-10 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign in
            </Button>
          </form>

          <p className="text-xs text-slate-500 text-center">
            Forgot your password? Ask your Super Admin to reset it from Users.
          </p>
        </div>
      </div>
    </div>
  )
}
