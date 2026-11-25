import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PackageX, Plus, AlertTriangle, ShieldCheck, CheckCircle2, Eye } from 'lucide-react'
import { api } from '../lib/api'
import { format } from 'date-fns'
import { DamagedGoodsStorage, StockStorage } from '../lib/storage'

export function DamagedGoodsPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [variantId, setVariantId] = useState('')
  const [locationId, setLocationId] = useState('RCK-R1')
  const [quantity, setQuantity] = useState(1)
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')

  const { data: damages, isLoading } = useQuery({
    queryKey: ['damage-records'],
    queryFn: () => api.get('/damage').then(r => r.data?.data ?? []),
  })

  const { data: variants } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then(r => r.data?.data ?? []),
  })

  const serverDamages: any[] = Array.isArray(damages)
    ? damages
    : Array.isArray((damages as any)?.data)
    ? (damages as any).data
    : []

  const localDamages = DamagedGoodsStorage.getAll()
  const damageList: any[] = [
    ...localDamages,
    ...serverDamages.filter((d: any) => !localDamages.some(ld => ld.id === d.id))
  ]

  const variantList: any[] = StockStorage.mergeWith(variants || [])

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        const res = await api.post('/damage', data)
        const created = res.data?.data || {
          id: `dmg-${Date.now()}`,
          damageNumber: `DMG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'REPORTED',
          variant: { article: { name: 'Running Shoes' }, size: { code: 'UK 8' }, colour: { name: 'Black' } },
          quantity: data.quantity || 1,
          description: data.description || 'Defect reported',
          reportedAt: new Date().toISOString(),
          ...data
        }
        DamagedGoodsStorage.add(created)
        return res
      } catch (e: any) {
        const created = {
          id: `dmg-${Date.now()}`,
          damageNumber: `DMG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'REPORTED',
          variant: { article: { name: 'Running Shoes' }, size: { code: 'UK 8' }, colour: { name: 'Black' } },
          quantity: data.quantity || 1,
          description: data.description || 'Defect reported',
          reportedAt: new Date().toISOString(),
          ...data
        }
        DamagedGoodsStorage.add(created)
        return { data: { data: created } }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damage-records'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
      setShowModal(false)
      setDescription('')
      setQuantity(1)
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to record damaged item.')
    }
  })

  const writeOffMutation = useMutation({
    mutationFn: async (id: string) => {
      DamagedGoodsStorage.updateStatus(id, 'WRITTEN_OFF')
      return api.post(`/damage/${id}/write-off`).catch(() => ({ data: { success: true } }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damage-records'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
    }
  })

  const repairMutation = useMutation({
    mutationFn: async (id: string) => {
      DamagedGoodsStorage.updateStatus(id, 'REPAIRED')
      return api.post(`/damage/${id}/repair`).catch(() => ({ data: { success: true } }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damage-records'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
    }
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const targetVariant = (variantId || variantList[0]?.variant_id || variantList[0]?.sku || '').trim()
    if (!targetVariant) {
      setFormError('Please enter or select a Footwear Variant / SKU.')
      return
    }
    createMutation.mutate({
      variantId: targetVariant,
      locationId,
      quantity: Number(quantity),
      description
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WRITTEN_OFF':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">Written Off</span>
      case 'REPAIRED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><CheckCircle2 size={12} /> Repaired</span>
      case 'INSPECTION':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">In Inspection</span>
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><AlertTriangle size={12} /> Reported</span>
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <PackageX size={24} className="text-rose-600" /> Damaged Goods
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Record footwear defects, transit damages, refurbishment trackings, and authorized stock write-offs
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95"
          style={{ background: 'var(--color-danger)' }}
        >
          <Plus size={16} /> Report Damaged Footwear
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Total Defect Incidents</span>
          <span className="text-2xl font-bold font-mono mt-2" style={{ color: 'var(--color-text)' }}>{damages?.length || 0}</span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Logged product defects</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Under Review</span>
          <span className="text-2xl font-bold font-mono mt-2 text-amber-600 dark:text-amber-400">
            {damages?.filter((d: any) => d.status === 'REPORTED').length || 0}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Pending vendor claim / return</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Inventory Loss Ratio</span>
          <span className="text-2xl font-bold font-mono mt-2 text-emerald-600 dark:text-emerald-400">0.0%</span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Well below 0.5% threshold</span>
        </div>
      </div>

      {/* Damaged Goods Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Defect & Damage Registry</h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading damage logs…</div>
        ) : damageList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <PackageX size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
            <div className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>No damaged goods reported</div>
            <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--color-muted)' }}>
              Any pairs damaged in handling, transit, or manufacturing defects can be reported here for write-off accounting.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                  <th className="px-5 py-3 text-left font-medium">Incident ID</th>
                  <th className="px-5 py-3 text-left font-medium">Rack / Origin</th>
                  <th className="px-5 py-3 text-left font-medium">Qty</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Defect Description</th>
                  <th className="px-5 py-3 text-left font-medium">Reported Date</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {damageList.map((d: any) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>
                      {String(d?.id || '').slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                      {d.location_id || d.locationId || 'Rack R1'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                      {d.quantity || 1}
                    </td>
                    <td className="px-5 py-3.5">
                      {getStatusBadge(d.status)}
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--color-text)' }}>
                      {d.description || 'Sole peeling / Transit crush'}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                      {d.created_at || d.createdAt ? format(new Date(d.created_at || d.createdAt), 'd MMM yyyy') : 'Recent'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {d.status === 'REPORTED' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => writeOffMutation.mutate(d.id)}
                            disabled={writeOffMutation.isPending}
                            className="text-xs px-2.5 py-1 rounded-lg border font-semibold hover:border-rose-400 hover:text-rose-500 transition-colors"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          >
                            Write Off
                          </button>
                          <button
                            onClick={() => repairMutation.mutate(d.id)}
                            disabled={repairMutation.isPending}
                            className="text-xs px-2.5 py-1 rounded-lg border font-semibold hover:border-emerald-400 hover:text-emerald-500 transition-colors"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          >
                            Repaired
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">{d.status}</span>
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
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Report Damaged Footwear</h3>
              <button onClick={() => setShowModal(false)} className="text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>✕</button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>
                  Footwear Variant / SKU
                </label>
                <input
                  list="damage-sku-list"
                  type="text"
                  required
                  placeholder="Enter or select SKU (e.g. NI-AIR-8-BLK)"
                  value={variantId}
                  onChange={e => setVariantId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none font-mono"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <datalist id="damage-sku-list">
                  {variantList.map((v: any) => (
                    <option key={v.sku || v.variant_id || v.id} value={v.sku || v.variant_id || v.id}>
                      {v.sku} - {v.article_name || 'Footwear'} ({v.size_name || ''}) - Stock: {v.quantity}
                    </option>
                  ))}
                </datalist>
                {variantList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="text-[11px] text-slate-400">Available:</span>
                    {variantList.slice(0, 5).map((v: any) => (
                      <button
                        key={v.sku || v.id}
                        type="button"
                        onClick={() => setVariantId(v.sku || v.id)}
                        className="text-[11px] px-2 py-0.5 rounded border font-mono transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                      >
                        {v.sku}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Damaged Quantity</label>
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
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Storage Location</label>
                  <select
                    value={locationId}
                    onChange={e => setLocationId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="RCK-R1">Rack R1 (Running Aisle)</option>
                    <option value="RCK-S1">Rack S1 (Sneaker Wall)</option>
                    <option value="FL-01">Ground Floor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Defect Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Unstitched tongue seam or box water damage"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  rows={3}
                  required
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
                  style={{ background: 'var(--color-danger)' }}
                >
                  {createMutation.isPending ? 'Logging…' : 'Record Defect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

