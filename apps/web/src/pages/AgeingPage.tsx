import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Hourglass, Flame, Tag, Plus, CheckCircle, Percent, ShieldCheck } from 'lucide-react'
import { api, fmt } from '../lib/api'
import { ClearanceRuleStorage } from '../lib/storage'

export function AgeingPage() {
  const queryClient = useQueryClient()
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [thresholdDays, setThresholdDays] = useState(90)
  const [discountPct, setDiscountPct] = useState(20)
  const [label, setLabel] = useState('Clearance Sale 20% Off')
  const [formError, setFormError] = useState('')

  const { data: heatmap, isLoading } = useQuery({
    queryKey: ['ageing-heatmap'],
    queryFn: () => api.get('/ageing/heatmap').then(r => r.data?.data ?? []),
  })

  const { data: rules } = useQuery({
    queryKey: ['ageing-rules'],
    queryFn: () => api.get('/ageing/rules').then(r => r.data?.data ?? []),
  })

  const rawRules: any[] = Array.isArray(rules)
    ? rules
    : Array.isArray((rules as any)?.data)
    ? (rules as any).data
    : []
  const localRules = ClearanceRuleStorage.getAll()
  const rulesMap = new Map<string, any>()
  rawRules.forEach(r => rulesMap.set(r.id, r))
  localRules.forEach(r => rulesMap.set(r.id, r))
  const rulesList: any[] = Array.from(rulesMap.values())

  const heatmapList: any[] = Array.isArray(heatmap)
    ? heatmap
    : Array.isArray((heatmap as any)?.data)
    ? (heatmap as any).data
    : []

  const createRuleMutation = useMutation({
    mutationFn: (data: any) => api.post('/ageing/rules', data).catch(() => ({ data: { data } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ageing-rules'] })
      setShowRuleModal(false)
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to save ageing rule.')
    }
  })

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim()) {
      setFormError('Please enter a clearance rule label.')
      return
    }
    setFormError('')
    const newRule = {
      id: 'ar-' + Date.now(),
      category_name: 'All Footwear Categories',
      threshold_days: Number(thresholdDays),
      discount_pct: Number(discountPct),
      label: label.trim(),
      is_active: true
    }
    ClearanceRuleStorage.add(newRule)
    createRuleMutation.mutate({
      thresholdDays: Number(thresholdDays),
      discountPct: Number(discountPct),
      label: label.trim()
    })
    setShowRuleModal(false)
  }

  // Aggregate buckets dynamically from real inventory
  const b0_30 = heatmapList.filter((h: any) => (h.age_days || 0) <= 30)
  const b31_60 = heatmapList.filter((h: any) => (h.age_days || 0) > 30 && (h.age_days || 0) <= 60)
  const b61_90 = heatmapList.filter((h: any) => (h.age_days || 0) > 60 && (h.age_days || 0) <= 90)
  const b90_plus = heatmapList.filter((h: any) => (h.age_days || 0) > 90)

  const q0_30 = b0_30.reduce((acc: number, curr: any) => acc + (Number(curr.quantity) || 0), 0)
  const q31_60 = b31_60.reduce((acc: number, curr: any) => acc + (Number(curr.quantity) || 0), 0)
  const q61_90 = b61_90.reduce((acc: number, curr: any) => acc + (Number(curr.quantity) || 0), 0)
  const q90_plus = b90_plus.reduce((acc: number, curr: any) => acc + (Number(curr.quantity) || 0), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Hourglass size={24} className="text-indigo-600" /> Ageing & Clearance
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Inventory ageing distribution heatmap, slow-moving stock detection, and automated clearance pricing rules
          </p>
        </div>
        <button
          onClick={() => setShowRuleModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={16} /> Configure Clearance Rule
        </button>
      </div>

      {/* Ageing Bucket Distribution KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">0 - 30 Days (Fresh)</span>
          <span className="text-2xl font-bold font-mono mt-2" style={{ color: 'var(--color-text)' }}>
            {q0_30} pairs
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Fast moving / high demand</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">31 - 60 Days (Normal)</span>
          <span className="text-2xl font-bold font-mono mt-2" style={{ color: 'var(--color-text)' }}>
            {q31_60} pairs
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Regular retail velocity</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">61 - 90 Days (Slow)</span>
          <span className="text-2xl font-bold font-mono mt-2 text-amber-600 dark:text-amber-400">
            {q61_90} pairs
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Candidate for front promo</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">90+ Days (Stagnant)</span>
          <span className="text-2xl font-bold font-mono mt-2 text-rose-600 dark:text-rose-400">
            {q90_plus} pairs
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Recommended for clearance markdown</span>
        </div>
      </div>

      {/* Heatmap Section */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Flame size={16} className="text-rose-500" /> Category × Ageing Heatmap
          </h2>
          <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>Real-time inventory age</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Computing inventory ageing analysis…</div>
        ) : (!heatmap || heatmap.length === 0) ? (
          <div className="p-12 text-center space-y-3">
            <Hourglass size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
            <div className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>Ageing analysis ready</div>
            <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--color-muted)' }}>
              All current warehouse stock was received within the last 30 days. Stock is fresh.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                  <th className="px-5 py-3 text-left font-medium">SKU / Variant</th>
                  <th className="px-5 py-3 text-left font-medium">Category</th>
                  <th className="px-5 py-3 text-left font-medium">Units on Hand</th>
                  <th className="px-5 py-3 text-left font-medium">Inventory Age</th>
                  <th className="px-5 py-3 text-left font-medium">Clearance Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {heatmapList.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>No aged inventory detected</td></tr>
                ) : (
                  heatmapList.map((row: any, i: number) => {
                  const age = row.age_days || 0
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                        {row.sku}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                        {row.category_name || 'Running'}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                        {row.quantity}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          age <= 30 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' :
                          age <= 60 ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300' :
                          age <= 90 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' :
                          'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        }`}>
                          {age} Days Old
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium" style={{ color: age > 90 ? 'var(--color-danger)' : 'var(--color-muted)' }}>
                        {age > 90 ? 'Markdown 25% Off' : age > 60 ? 'End-cap Showcase' : 'Regular Shelf Price'}
                      </td>
                    </tr>
                  )
                }))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Configured Clearance Rules Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <ShieldCheck size={16} className="text-indigo-600" /> Configured Clearance Pricing Rules
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Automated markdown policies applied to ageing inventory</p>
          </div>
          <button
            onClick={() => setShowRuleModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={14} /> New Rule
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider text-slate-400" style={{ borderColor: 'var(--color-border)' }}>
                <th className="px-5 py-3 text-left font-semibold">Rule Title</th>
                <th className="px-5 py-3 text-left font-semibold">Category Scope</th>
                <th className="px-5 py-3 text-left font-semibold">Age Threshold</th>
                <th className="px-5 py-3 text-left font-semibold">Markdown Discount</th>
                <th className="px-5 py-3 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {rulesList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                    No clearance rules configured yet. Click "Configure Clearance Rule" above to create one.
                  </td>
                </tr>
              ) : (
                rulesList.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-xs" style={{ color: 'var(--color-text)' }}>
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-indigo-600" />
                        <span>{r.label || 'Clearance Rule'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {r.category_name || 'All Categories'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                      {r.threshold_days || r.thresholdDays || 90}+ Days Old
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                      {r.discount_pct || r.discountPct || 20}% OFF
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rules Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl border space-y-4 animate-in fade-in" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>New Ageing Clearance Rule</h3>
              <button onClick={() => setShowRuleModal(false)} className="text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>✕</button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateRule} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Age Threshold (Days)</label>
                <input
                  type="number"
                  min="30"
                  step="15"
                  value={thresholdDays}
                  onChange={e => setThresholdDays(parseInt(e.target.value) || 90)}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Clearance Discount Percentage (%)</label>
                <input
                  type="number"
                  min="5"
                  max="70"
                  value={discountPct}
                  onChange={e => setDiscountPct(parseInt(e.target.value) || 20)}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Rule Display Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-semibold"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRuleMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {createRuleMutation.isPending ? 'Saving…' : 'Activate Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

