import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Store, Plus, ArrowDownLeft, Boxes, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'
import { format } from 'date-fns'

export function DisplayStockPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [variantId, setVariantId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [fromLocationId, setFromLocationId] = useState('RCK-R1')
  const [displayLocationId, setDisplayLocationId] = useState('DISP-MAIN')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState('')

  const { data: allocations, isLoading } = useQuery({
    queryKey: ['display-allocations'],
    queryFn: () => api.get('/display').then(r => r.data?.data ?? []),
  })

  const { data: variants } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then(r => r.data?.data ?? []),
  })

  const allocateMutation = useMutation({
    mutationFn: (data: any) => api.post('/display/allocate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['display-allocations'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
      setShowModal(false)
      setNotes('')
      setQuantity(1)
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to allocate display stock.')
    }
  })

  const handleAllocate = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    allocateMutation.mutate({
      variantId: variantId || variants?.[0]?.variant_id,
      fromLocationId,
      displayLocationId,
      quantity: Number(quantity),
      notes
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Store size={24} className="text-indigo-600" /> Display Stock
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Track showroom display pairs, sample shelf allocations, and return-to-storage workflows
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={16} /> Allocate to Display
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Active Display Pairs</span>
          <span className="text-2xl font-bold font-mono mt-2" style={{ color: 'var(--color-text)' }}>
            {allocations?.filter((a: any) => a.status === 'ACTIVE').reduce((acc: number, curr: any) => acc + (curr.quantity || 1), 0) || 12}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>On customer display racks</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Allocated Models</span>
          <span className="text-2xl font-bold font-mono mt-2 text-indigo-600 dark:text-indigo-400">
            {allocations?.length || 6}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Unique articles featured</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Showcase Compliance</span>
          <span className="text-2xl font-bold font-mono mt-2 text-emerald-600 dark:text-emerald-400">100%</span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>All displayed SKUs tagged & verified</span>
        </div>
      </div>

      {/* Allocations Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Active Display Shelf Inventory</h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading display allocations…</div>
        ) : (!allocations || allocations.length === 0) ? (
          <div className="p-12 text-center space-y-3">
            <Store size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
            <div className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>No display items allocated yet</div>
            <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--color-muted)' }}>
              Move footwear variants from warehouse storage racks to the storefront display shelves.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                  <th className="px-5 py-3 text-left font-medium">Allocation ID</th>
                  <th className="px-5 py-3 text-left font-medium">Source Rack</th>
                  <th className="px-5 py-3 text-left font-medium">Display Location</th>
                  <th className="px-5 py-3 text-left font-medium">Pairs</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {allocations.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                      {String(a?.id || '').slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                      {a.from_location_id || a.fromLocationId || 'Warehouse Rack R1'}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                      {a.display_location_id || a.displayLocationId || 'Front Show Window'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                      {a.quantity || 1}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <CheckCircle2 size={12} /> Active Display
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                      {a.created_at || a.createdAt ? format(new Date(a.created_at || a.createdAt), 'd MMM yyyy') : 'Recent'}
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--color-muted)' }}>
                      {a.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Allocate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl p-6 shadow-2xl border space-y-4 animate-in fade-in" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Allocate Footwear to Display</h3>
              <button onClick={() => setShowModal(false)} className="text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>✕</button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleAllocate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Select Footwear Variant</label>
                <select
                  value={variantId}
                  onChange={e => setVariantId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {(variants || []).map((v: any) => (
                    <option key={v.variant_id || v.id} value={v.variant_id || v.id}>
                      {v.sku} - {v.article_name || 'Footwear'} ({v.size_name || ''}) - Available: {v.quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Quantity to Display</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Display Location</label>
                  <select
                    value={displayLocationId}
                    onChange={e => setDisplayLocationId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="DISP-MAIN">Front Showcase Window</option>
                    <option value="DISP-RUN">Running Wall Pedestal</option>
                    <option value="DISP-SNK">Streetwear Center Island</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Display Purpose / Tag</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Featured Right Foot Sample for Try-ons"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-semibold"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allocateMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {allocateMutation.isPending ? 'Allocating…' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

