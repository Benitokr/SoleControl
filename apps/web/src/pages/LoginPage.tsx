import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles, Lock, Mail } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { api } from '../lib/api'

export function LoginPage() {
  const [email, setEmail] = useState('superadmin@fortyv.local')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setUser, setAccessToken } = useAuthStore()
  const navigate = useNavigate()

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
      setError(err.response?.data?.error?.message || 'Login failed. Please verify your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoFill = () => {
    setEmail('superadmin@fortyv.local')
    setPassword('ChangeMe@123')
    setError('')
  }

  const inpClass = "w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border outline-none transition-all focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
  const inpStyle = { background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Left brand hero panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 w-1/2 relative overflow-hidden" 
           style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 35%, #4338CA 70%, #0284C7 100%)' }}>
        {/* Decorative background glow rings */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 inline-flex items-center gap-3 px-3 py-2 rounded-2xl mb-8 shadow-xl">
            <img src="/fortyv-logo.png" alt="Forty V" className="h-8 object-contain" />
            <span className="text-white text-xs font-semibold tracking-wider uppercase border-l border-white/20 pl-3">
              Forty V Retail Suite
            </span>
          </div>

          <h1 className="text-4xl font-bold text-white tracking-tight leading-tight mb-4">
            SoleControl <span className="text-sky-300 font-light text-2xl">2.0</span>
          </h1>
          <p className="text-white/80 text-base leading-relaxed max-w-lg mb-8">
            Enterprise footwear retail management engine. Precision inventory, barcode generation, multi-store transfer orchestration, automated GST compliance, and real-time financial ledgers.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-lg">
            {[
              ['Dynamic Size × Colour Matrix', 'Lightning-fast matrix bill entries & bulk SKU variant generation'],
              ['Smart Double-Entry Ledger', 'Balanced general journal with append-only reversal integrity'],
              ['Multi-Store Transfer & Map', 'Visual Floor → Rack → Shelf explorer with stock density heatmap'],
              ['Statutory Tax & Compliance', 'Automated GST Class A/B isolation & instant return reconciliation']
            ].map(([t, d]) => (
              <div key={t} className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-4 shadow-sm hover:bg-white/15 transition-colors">
                <div className="text-white font-semibold text-sm mb-1 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-300" /> {t}
                </div>
                <div className="text-white/65 text-xs leading-normal">{d}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-white/50 text-xs border-t border-white/10 pt-6">
          <span>Powered by Forty V · Super Admin Console</span>
          <span className="flex items-center gap-1.5 text-white/70">
            <ShieldCheck size={14} className="text-emerald-400" /> SSL / AES-256 Secured
          </span>
        </div>
      </div>

      {/* Right interactive auth panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <img src="/fortyv-logo.png" alt="Forty V" className="h-8" />
            <span className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>SoleControl</span>
          </div>

          {/* Header Title */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
              Sign In
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
              Enter your credentials to access the Forty V retail management console
            </p>
          </div>

          {/* Feedback banners */}
          {error && (
            <div className="p-3.5 rounded-xl text-sm font-medium border border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 animate-in fade-in">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-muted)' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="admin@fortyv.local"
                  className={inpClass}
                  style={inpStyle}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-muted)' }}>
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className={`${inpClass} pr-10`}
                  style={inpStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:opacity-100"
                  style={{ color: 'var(--color-muted)' }}
                  aria-label="Toggle password visibility"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'var(--color-primary)' }}
            >
              {loading ? (
                <span>Verifying credentials…</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Helper */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleDemoFill}
              className="inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg border transition-colors hover:border-indigo-400"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', background: 'var(--color-surface)' }}
            >
              <Sparkles size={13} className="text-indigo-500" />
              Fill Super Admin (ChangeMe@123)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
