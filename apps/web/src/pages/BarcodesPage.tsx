import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ScanBarcode, Printer, Plus, Eye, X, CheckCircle2, Sliders, Layers } from 'lucide-react'
import { api, fmt } from '../lib/api'

interface BarcodeJob {
  id: string
  sku: string
  article_name?: string
  size?: string
  colour?: string
  mrp?: number
  copies?: number
  quantity: number
  status: string
  createdAt: string
}

export function BarcodesPage() {
  const qc = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedSku, setSelectedSku] = useState('NK-AM-A5-8-BLK')
  const [copies, setCopies] = useState(12)
  const [formError, setFormError] = useState('')

  // Live WYSIWYG toggles
  const [showMrp, setShowMrp] = useState(true)
  const [showSize, setShowSize] = useState(true)
  const [showBrand, setShowBrand] = useState(true)

  const { data: queueData, isLoading, error } = useQuery<{ data: BarcodeJob[] }>({
    queryKey: ['barcodes-queue'],
    queryFn: () => api.get('/barcodes/queue').then(r => r.data),
  })

  const { data: stockItems } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then(r => r.data?.data ?? []),
  })

  const markPrinted = useMutation({
    mutationFn: (id: string) => api.post(`/barcodes/jobs/${id}/mark-printed`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barcodes-queue'] }),
  })

  const addJobMutation = useMutation({
    mutationFn: (body: any) => api.post('/barcodes/queue', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barcodes-queue'] }),
      setShowAddModal(false)
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to queue barcode label.')
    }
  })

  const jobs: BarcodeJob[] = Array.isArray(queueData?.data)
    ? queueData.data
    : Array.isArray(queueData)
    ? (queueData as any)
    : []

  const stockList: any[] = Array.isArray(stockItems)
    ? stockItems
    : Array.isArray((stockItems as any)?.data)
    ? (stockItems as any).data
    : []

  // Resolve preview item
  const previewItem = stockList.find((v: any) => v.sku === selectedSku) || {
    sku: 'NK-AM-A5-8-BLK',
    article_name: 'Air Max Pulse Retro',
    size_label: 'UK 8',
    colour_name: 'Midnight Black',
    selling_price: 8999
  }

  const handleQueueSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    addJobMutation.mutate({
      sku: selectedSku,
      copies: Number(copies),
      quantity: Number(copies),
      articleName: previewItem.article_name,
      mrp: Number(previewItem.selling_price || 8999)
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <ScanBarcode size={24} className="text-indigo-600" /> Barcode & Label Management
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Thermal label designer, live WYSIWYG tag preview, and bulk footwear print queue orchestration
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:border-indigo-400"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', background: 'var(--color-surface)' }}
          >
            <Printer size={15} /> Print Label Sheet
          </button>
          <button
            onClick={() => { setShowAddModal(true); setFormError('') }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xs transition-all hover:opacity-95"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={16} /> Queue Labels
          </button>
        </div>
      </div>

      {/* Signature Feature #6: Live WYSIWYG Label Designer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Preview */}
        <div className="lg:col-span-7 rounded-2xl border p-6 flex flex-col justify-between"
             style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Live WYSIWYG Thermal Label (50mm × 25mm)</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold">
                EAN-13 / Code-128
              </span>
            </div>

            {/* Label Card */}
            <div className="mx-auto max-w-sm rounded-xl border-2 border-dashed p-5 bg-white text-slate-900 shadow-md space-y-3 font-sans">
              {showBrand && (
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-black tracking-widest uppercase">FORTY V FOOTWEAR</span>
                  <span className="text-[10px] font-mono font-bold">GENUINE RETAIL</span>
                </div>
              )}

              <div>
                <div className="font-extrabold text-sm tracking-tight">{previewItem.article_name || 'Air Max Pulse Retro'}</div>
                {showSize && (
                  <div className="text-xs font-semibold text-slate-700 flex gap-2 mt-0.5">
                    <span>Size: <strong>{previewItem.size_label || previewItem.size || 'UK 8'}</strong></span>
                    <span>·</span>
                    <span>Colour: <strong>{previewItem.colour_name || previewItem.colour || 'Midnight Black'}</strong></span>
                  </div>
                )}
              </div>

              {/* Barcode Graphic Simulation */}
              <div className="space-y-1 text-center py-1">
                <div className="h-10 w-full flex items-center justify-between px-2 bg-slate-100 rounded">
                  {/* Repeated vertical barcode stripes */}
                  {[3,1,2,1,4,1,2,3,1,2,1,3,2,1,4,1,2,1,3,1,2,3,1,4,2,1,3,1,2,4,1,2].map((w, idx) => (
                    <span key={idx} className="bg-slate-900 h-8 inline-block" style={{ width: `${w}px` }} />
                  ))}
                </div>
                <div className="font-mono text-[11px] font-bold tracking-widest text-slate-800">
                  {previewItem.sku}
                </div>
              </div>

              {showMrp && (
                <div className="border-t pt-2 flex items-center justify-between font-mono">
                  <span className="text-[10px] uppercase font-bold text-slate-500">M.R.P. (Incl. of Taxes):</span>
                  <span className="text-sm font-black text-slate-950">
                    {fmt(Number(previewItem.selling_price || 8999))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Toggles */}
          <div className="pt-6 mt-6 border-t flex flex-wrap items-center gap-4 text-xs font-semibold" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-slate-400">Tag Customization:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showMrp} onChange={e => setShowMrp(e.target.checked)} className="rounded" />
              <span>Show MRP Price</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showSize} onChange={e => setShowSize(e.target.checked)} className="rounded" />
              <span>Show Size & Colour</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showBrand} onChange={e => setShowBrand(e.target.checked)} className="rounded" />
              <span>Show Forty V Header</span>
            </label>
          </div>
        </div>

        {/* Right: Quick Queue Stats */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Thermal Printer Status</span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <Printer size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>TSC TE244 / Zebra ZD220</h4>
                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={12} /> Ready for spooling (ESC/POS connected)
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Batch Summary</span>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Pending Tags in Spooler:</span>
              <span className="font-bold text-amber-600">{jobs.filter(j => j.status === 'PENDING').reduce((a, b) => a + (b.quantity || b.copies || 0), 0)} tags</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Total Printed Today:</span>
              <span className="font-bold text-emerald-600">30 tags</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spool Queue Table */}
      <div className="rounded-xl border overflow-hidden shadow-xs" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Print Spool Queue</h2>
          <span className="text-xs text-slate-400 font-mono">{jobs.length} jobs in queue</span>
        </div>

        {isLoading && <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading print queue…</div>}
        {error && <div className="py-12 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load queue</div>}

        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-slate-400" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="text-left px-5 py-3 font-semibold">SKU / Variant</th>
                  <th className="text-left px-5 py-3 font-semibold">Article Name</th>
                  <th className="text-right px-5 py-3 font-semibold">Copies</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-left px-5 py-3 font-semibold">Queued At</th>
                  <th className="text-right px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {jobs.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-xs text-slate-400">Print queue is empty</td></tr>
                )}
                {jobs.map(j => (
                  <tr key={j.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                      {j.sku}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-xs" style={{ color: 'var(--color-text)' }}>
                      {j.article_name || 'Footwear Model'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                      {j.quantity || j.copies} tags
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        j.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      }`}>
                        {j.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                      {new Date(j.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {j.status === 'PENDING' ? (
                        <button
                          onClick={() => markPrinted.mutate(j.id)}
                          className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-lg border font-semibold hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        >
                          <Printer size={12} /> Mark Printed
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Archived</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Queue Barcode Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl border space-y-4 animate-in fade-in"
               style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Queue Barcode Label Print</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:opacity-75"><X size={18} /></button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleQueueSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Select Footwear Model / SKU</label>
                <select
                  value={selectedSku}
                  onChange={e => setSelectedSku(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {stockList.map((s: any) => (
                    <option key={s.sku} value={s.sku}>
                      {s.sku} - {s.article_name || 'Shoe'} ({s.size_label || s.size || ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Copies / Tags Required</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={copies}
                  onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono font-bold"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addJobMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {addJobMutation.isPending ? 'Queuing…' : 'Add to Spooler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
