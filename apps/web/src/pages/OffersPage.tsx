import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgePercent, Plus, Search, Sparkles, X, Calculator, Tag, CheckCircle2 } from 'lucide-react'
import { api, fmt } from '../lib/api'

interface Offer {
  id: string
  name: string
  scopeType: string
  discountType: string
  discountValue: number
  validFrom: string
  validTo?: string
  isActive: boolean
  priority: number
}

export function OffersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [showSimulator, setShowSimulator] = useState(false)
  const [formError, setFormError] = useState('')

  // New Offer form state
  const [name, setName] = useState('')
  const [scopeType, setScopeType] = useState('ALL')
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE')
  const [discountValue, setDiscountValue] = useState(15)
  const [priority, setPriority] = useState(1)

  // Simulator state
  const [simCartAmount, setSimCartAmount] = useState(8999)
  const [simSelectedOfferId, setSimSelectedOfferId] = useState('')

  const { data, isLoading, error } = useQuery<{ data: Offer[] }>({
    queryKey: ['offers'],
    queryFn: () => api.get('/offers').then(r => r.data),
  })

  const rawOffers: Offer[] = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
    ? (data as any)
    : []

  const offers = rawOffers.filter(o =>
    (o?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const toggle = useMutation({
    mutationFn: (o: Offer) => o.isActive
      ? api.post(`/offers/${o.id}/deactivate`)
      : api.put(`/offers/${o.id}`, { isActive: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers'] }),
  })

  const createOfferMutation = useMutation({
    mutationFn: (body: any) => api.post('/offers', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] })
      setShowNewModal(false)
      setName('')
      setDiscountValue(15)
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to create offer.')
    }
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Please enter an offer title.')
      return
    }
    setFormError('')
    createOfferMutation.mutate({
      name,
      scopeType,
      discountType,
      discountValue: Number(discountValue),
      priority: Number(priority),
      validFrom: new Date().toISOString(),
      isActive: true
    })
  }

  // Simulation calculation
  const activeOffer = offers.find(o => o.id === simSelectedOfferId) || offers.find(o => o.isActive) || offers[0]
  let simDiscountAmount = 0
  if (activeOffer) {
    if (activeOffer.discountType === 'PERCENTAGE') {
      simDiscountAmount = (simCartAmount * activeOffer.discountValue) / 100
    } else {
      simDiscountAmount = Math.min(simCartAmount, activeOffer.discountValue)
    }
  }
  const simNetPayable = Math.max(0, simCartAmount - simDiscountAmount)
  const simSavingsPct = simCartAmount > 0 ? Math.round((simDiscountAmount / simCartAmount) * 100) : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <BadgePercent size={24} className="text-indigo-600" /> Offers & Discounts
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Promotional footwear campaign rules, seasonal markdowns, and real-time POS bill offer simulator
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSimulator(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:border-indigo-400"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', background: 'var(--color-surface)' }}
          >
            <Sparkles size={15} className="text-amber-500" />
            <span>Simulate On Bill</span>
          </button>
          <button
            onClick={() => { setShowNewModal(true); setFormError('') }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs transition-all hover:opacity-95"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={16} />
            <span>New Offer</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Active Campaigns</span>
          <span className="text-2xl font-bold font-mono mt-2 text-emerald-600 dark:text-emerald-400">
            {offers.filter(o => o.isActive).length}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Running at billing counters</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Highest Discount</span>
          <span className="text-2xl font-bold font-mono mt-2 text-indigo-600 dark:text-indigo-400">
            {offers.length ? Math.max(...offers.map(o => Number(o.discountValue) || 0)) : 0}%
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Peak promotional markdown</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Total Schemes</span>
          <span className="text-2xl font-bold font-mono mt-2" style={{ color: 'var(--color-text)' }}>
            {offers.length}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Configured retail policies</span>
        </div>
      </div>

      {/* Offers Table */}
      <div className="rounded-xl border overflow-hidden shadow-xs" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="p-4 border-b flex items-center justify-between gap-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search offer titles, schemes or campaigns…"
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:ring-indigo-500/20"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>
        </div>

        {isLoading && <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading promotional schemes…</div>}
        {error && <div className="py-12 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load offers</div>}

        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-slate-400" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="text-left px-5 py-3 font-semibold">Campaign Scheme</th>
                  <th className="text-left px-5 py-3 font-semibold">Scope</th>
                  <th className="text-left px-5 py-3 font-semibold">Discount</th>
                  <th className="text-left px-5 py-3 font-semibold">Effective Period</th>
                  <th className="text-right px-5 py-3 font-semibold">Priority</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-right px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {offers.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-xs text-slate-400">No promotional offers found</td></tr>
                )}
                {offers.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--color-text)' }}>
                      <div className="flex items-center gap-2">
                        <Tag size={15} className="text-indigo-600" />
                        <span>{o.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-medium border"
                            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                        {o.scopeType || 'STOREWIDE'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {o.discountType === 'PERCENTAGE' ? `${o.discountValue}% OFF` : `₹${o.discountValue} FLAT`}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                      {new Date(o.validFrom).toLocaleDateString('en-IN')} {o.validTo ? `→ ${new Date(o.validTo).toLocaleDateString('en-IN')}` : '(Ongoing)'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-slate-400">
                      Level {o.priority ?? 1}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        o.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${o.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {o.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => toggle.mutate(o)}
                        className="text-xs px-3 py-1 rounded-lg border font-semibold transition-colors hover:border-indigo-400"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      >
                        {o.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Offer Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl border space-y-4 animate-in fade-in"
               style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Create Promotional Offer</h3>
              <button onClick={() => setShowNewModal(false)} className="p-1 hover:opacity-75"><X size={18} /></button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Offer Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End of Season Sneaker Fest"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Discount Type</label>
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Value ({discountType === 'PERCENTAGE' ? '%' : '₹'})</label>
                  <input
                    type="number"
                    min="1"
                    value={discountValue}
                    onChange={e => setDiscountValue(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono"
                    style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Scope / Applicability</label>
                <select
                  value={scopeType}
                  onChange={e => setScopeType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="ALL">Entire Store Inventory</option>
                  <option value="BRAND">Specific Brand (Nike, Adidas, Puma)</option>
                  <option value="CATEGORY">Category (Running, Lifestyle, Casual)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createOfferMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {createOfferMutation.isPending ? 'Publishing…' : 'Publish Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signature Feature #9: Interactive Offer Simulator Modal */}
      {showSimulator && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl shadow-2xl border p-6 space-y-5 animate-in fade-in"
               style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <Calculator size={20} className="text-indigo-600" />
                <div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Offer Bill Simulator</h3>
                  <p className="text-xs text-slate-400">Preview real-time discount calculations on sample retail sales bills</p>
                </div>
              </div>
              <button onClick={() => setShowSimulator(false)} className="p-1 hover:opacity-75"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Sample Cart Gross Total (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={simCartAmount}
                    onChange={e => setSimCartAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border font-mono font-bold text-base outline-none"
                    style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Select Promotional Scheme to Test</label>
                <select
                  value={simSelectedOfferId}
                  onChange={e => setSimSelectedOfferId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-medium"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {offers.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.discountType === 'PERCENTAGE' ? `${o.discountValue}%` : `₹${o.discountValue}`})
                    </option>
                  ))}
                </select>
              </div>

              {/* Simulation Result Card */}
              <div className="p-4 rounded-xl border space-y-2.5 font-mono text-xs" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between text-slate-400">
                  <span>Gross Invoice Total:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{fmt(simCartAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Promotional Savings ({simSavingsPct}%):</span>
                  <span>- {fmt(simDiscountAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2.5 text-base font-bold text-indigo-600 dark:text-indigo-400" style={{ borderColor: 'var(--color-border)' }}>
                  <span>Net Customer Payable:</span>
                  <span>{fmt(simNetPayable)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border flex items-center gap-2 text-xs text-slate-500" style={{ borderColor: 'var(--color-border)' }}>
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                <span>Simulation verified: rule applies correctly at counter checkout with automated journal entries.</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSimulator(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
