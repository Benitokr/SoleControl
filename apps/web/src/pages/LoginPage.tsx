import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles, Lock, Mail, Command, Layers } from 'lucide-react'
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
           style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 40%, #312E81 75%, #4338CA 100%)' }}>
        {/* Decorative background glow rings */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl mb-8 shadow-xl">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Command size={18} strokeWidth={2.2} />
            </div>
            <span className="text-white text-xs font-bold tracking-wider uppercase">
              SoleControl
            </span>
          </div>

          <h1 className="text-4xl font-bold text-white tracking-tight leading-tight mb-4">
            Enterprise Footwear <br />
            <span className="text-indigo-300 font-light text-3xl">Retail Operating System</span>
          </h1>
          <p className="text-white/80 text-base leading-relaxed max-w-lg mb-8">
            High-precision retail management platform engineered for footwear enterprises. Real-time multi-location inventory, automated barcode generation, GST Class A/B separation, and double-entry financial controls.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-lg">
            {[
              ['Dynamic Size × Colour Matrix', 'Rapid matrix bill inward & bulk SKU variant generation'],
              ['Smart Double-Entry Ledger', 'Balanced general journal with append-only audit trail'],
              ['Store Map & Rack Explorer', 'Visual Floor → Rack → Shelf explorer with stock density heatmap'],
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
          <span>SoleControl Retail Management Platform · Super Admin</span>
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
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Command size={18} strokeWidth={2.2} />
            </div>
            <span className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>SoleControl</span>
          </div>

          {/* Header Title */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
              Sign In
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
              Enter your credentials to access the Super Admin control console
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
                  placeholder="admin@domain.local"
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

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer" style={{ color: 'var(--color-muted)' }}>
                <input type="checkbox" defaultChecked className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span>Keep me signed in</span>
              </label>
              <button
                type="button"
                onClick={handleDemoFill}
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Use Super Admin Demo
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white shadow-sm flex items-center justify-center gap-2 transition-all hover:opacity-95 disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Super Admin</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Security footnote */}
          <div className="p-3.5 rounded-xl border text-xs space-y-1" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
            <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Lock size={12} className="text-emerald-500" /> Authorized Super Admin Access Only
            </div>
            <p>
              Session activity and mutations are cryptographically signed and recorded to the immutable system audit log.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
