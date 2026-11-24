import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, Plus, CheckCircle, Clock, Truck, ShieldAlert } from 'lucide-react'
import { api } from '../lib/api'
import { format } from 'date-fns'

export function TransfersPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [fromStoreId, setFromStoreId] = useState('')
  const [toStoreId, setToStoreId] = useState('')
  const [variantId, setVariantId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState('')

  const { data: transfers, isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => api.get('/transfers').then(r => r.data?.data ?? []),
  })

  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/company/stores').then(r => r.data?.data ?? []),
  })

  const { data: variants } = useQuery({
    queryKey: ['variants-list'],
    queryFn: () => api.get('/inventory/stock').then(r => r.data?.data ?? []),
  })

  const transferList: any[] = Array.isArray(transfers)
    ? transfers
    : Array.isArray((transfers as any)?.data)
    ? (transfers as any).data
    : []

  const storeList: any[] = Array.isArray(stores)
    ? stores
    : Array.isArray((stores as any)?.data)
    ? (stores as any).data
    : []

  const variantList: any[] = Array.isArray(variants)
    ? variants
    : Array.isArray((variants as any)?.data)
    ? (variants as any).data
    : []

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/transfers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
      setShowModal(false)
      setNotes('')
      setQuantity(1)
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to initiate stock transfer.')
    }
  })

  const dispatchMutation = useMutation({
    mutationFn: (id: string) => api.post(`/transfers/${id}/dispatch`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transfers'] }),
  })

  const receiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/transfers/${id}/receive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transfers'] }),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const defaultStore = stores?.[0]?.id || 'STORE-01'
    const targetStore = toStoreId || defaultStore
    createMutation.mutate({
      fromStoreId: fromStoreId || defaultStore,
      toStoreId: targetStore,
      items: [{ variantId: variantId || variants?.[0]?.variant_id, quantity: Number(quantity) }],
      notes
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><CheckCircle size={12} /> Received</span>
      case 'DISPATCHED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"><Truck size={12} /> In Transit</span>
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"><CheckCircle size={12} /> Approved</span>
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><Clock size={12} /> Requested</span>
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <ArrowLeftRight size={24} className="text-indigo-600" /> Stock Transfers
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Manage warehouse-to-store, rack-to-rack, and inter-branch transfer consignments
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={16} /> New Transfer Request
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Total Consignments</span>
          <span className="text-2xl font-bold font-mono mt-2" style={{ color: 'var(--color-text)' }}>{transferList.length}</span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Recorded transfers in system</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Approvals</span>
          <span className="text-2xl font-bold font-mono mt-2 text-amber-600 dark:text-amber-400">
            {transferList.filter((t: any) => t.status === 'REQUESTED').length}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Awaiting warehouse authorization</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Completed Deliveries</span>
          <span className="text-2xl font-bold font-mono mt-2 text-emerald-600 dark:text-emerald-400">
            {transferList.filter((t: any) => t.status === 'RECEIVED').length}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Successfully received & verified</span>
        </div>
      </div>

      {/* Transfer List */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Transfer Manifest History</h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading transfer records…</div>
        ) : transferList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ArrowLeftRight size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
            <div className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>No stock transfers found</div>
            <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--color-muted)' }}>
              Transfer stock between storage racks, display shelves, or branch locations to optimize stock density.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                  <th className="px-5 py-3 text-left font-medium">Consignment ID</th>
                  <th className="px-5 py-3 text-left font-medium">From / Origin</th>
                  <th className="px-5 py-3 text-left font-medium">Destination</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">Notes</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {transferList.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                      {String(t?.id || '').slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                      Main Warehouse (CBE)
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                      Sales Floor Rack R1
                    </td>
                    <td className="px-5 py-3.5">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                      {t.created_at || t.createdAt ? format(new Date(t.created_at || t.createdAt), 'd MMM yyyy') : 'Recent'}
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--color-muted)' }}>
                      {t.notes || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {t.status === 'REQUESTED' && (
                        <button
                          onClick={() => dispatchMutation.mutate(t.id)}
                          disabled={dispatchMutation.isPending}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-semibold hover:border-sky-500 hover:text-sky-600 transition-colors"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        >
                          <Truck size={12} /> Dispatch
                        </button>
                      )}
                      {t.status === 'DISPATCHED' && (
                        <button
                          onClick={() => receiveMutation.mutate(t.id)}
                          disabled={receiveMutation.isPending}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-semibold hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        >
                          <CheckCircle size={12} /> Receive
                        </button>
                      )}
                      {t.status === 'RECEIVED' && (
                        <span className="text-xs text-slate-400 font-medium">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl p-6 shadow-2xl border space-y-4 animate-in fade-in" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Initiate Stock Transfer</h3>
              <button onClick={() => setShowModal(false)} className="text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>✕</button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Footwear Variant / SKU</label>
                <select
                  value={variantId}
                  onChange={e => setVariantId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {variantList.map((v: any) => (
                    <option key={v.variant_id || v.id} value={v.variant_id || v.id}>
                      {v.sku} - {v.article_name || 'Footwear'} ({v.size_name || ''} / {v.colour_name || ''}) - Stock: {v.quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Transfer Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Target Location</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="RCK-R1">Rack R1 (Running Aisle)</option>
                    <option value="RCK-S1">Rack S1 (Sneaker Wall)</option>
                    <option value="DISP-MAIN">Front Display Showcase</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Reason / Transfer Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Replenishing high-demand sneaker sizes for weekend surge"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  rows={3}
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
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {createMutation.isPending ? 'Submitting…' : 'Create Transfer Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

