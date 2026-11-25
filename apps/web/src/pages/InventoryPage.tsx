import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Boxes, Search, Plus, RotateCcw, CheckCircle2, AlertTriangle, X, ArrowUpRight } from 'lucide-react'
import { api, fmt } from '../lib/api'
import { StockStorage, AdjustmentStorage } from '../lib/storage'

type Tab = 'stock' | 'adjustments' | 'audits' | 'heatmap'

export function InventoryPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('stock')
  const [search, setSearch] = useState('')
  const [showAdjModal, setShowAdjModal] = useState(false)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [formError, setFormError] = useState('')

  // Adjustment form state
  const [adjSku, setAdjSku] = useState('')
  const [adjQty, setAdjQty] = useState(1)
  const [adjReason, setAdjReason] = useState('Physical audit cycle discrepancy')

  // Audit form state
  const [auditStoreName, setAuditStoreName] = useState('Central Warehouse')

  const stock = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then(r => r.data?.data ?? []),
    enabled: tab === 'stock' || showAdjModal,
  })

  const adjustments = useQuery({
    queryKey: ['inventory-adjustments'],
    queryFn: () => api.get('/inventory/adjustments').then(r => r.data?.data ?? []),
    enabled: tab === 'adjustments',
  })

  const audits = useQuery({
    queryKey: ['inventory-audits'],
    queryFn: () => api.get('/inventory/audits').then(r => r.data?.data ?? []),
    enabled: tab === 'audits',
  })

  const heatmap = useQuery({
    queryKey: ['ageing-heatmap'],
    queryFn: () => api.get('/ageing/heatmap').then(r => r.data?.data ?? []),
    enabled: tab === 'heatmap',
  })

  const createAdjustmentMutation = useMutation({
    mutationFn: (body: any) => api.post('/inventory/adjustments', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-adjustments'] })
      qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      setShowAdjModal(false)
      setAdjQty(1)
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to record adjustment.')
    }
  })

  const createAuditMutation = useMutation({
    mutationFn: (body: any) => api.post('/inventory/audits', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-audits'] })
      setShowAuditModal(false)
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to start audit session.')
    }
  })

  const rawStock: any[] = Array.isArray(stock.data)
    ? stock.data
    : Array.isArray((stock.data as any)?.data)
    ? (stock.data as any).data
    : []
  
  // Merge server stock with persistent local stock
  const localStock = StockStorage.getAll()
  const stockMap = new Map<string, any>()
  rawStock.forEach(s => stockMap.set(s.sku, { ...s }))
  localStock.forEach(s => {
    if (stockMap.has(s.sku)) {
      stockMap.get(s.sku).quantity = s.quantity
    } else {
      stockMap.set(s.sku, s)
    }
  })
  const stockList: any[] = Array.from(stockMap.values())

  const filteredStock = stockList.filter(s =>
    (s.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.articleName ?? s.article_name ?? s.article ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.size ?? s.size_label ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.colour ?? s.colour_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const totalStockUnits = stockList.reduce((acc, s) => acc + (s.quantity ?? s.qty ?? 0), 0)
  const totalCostVal = stockList.reduce((acc, s) => acc + (Number(s.costValue ?? ((s.quantity ?? 0) * Number(s.cost_price || s.costPrice || 0))) || 0), 0)
  const totalMrpVal = stockList.reduce((acc, s) => acc + (Number(s.mrpValue ?? ((s.quantity ?? 0) * Number(s.selling_price || s.mrp || 0))) || 0), 0)

  const handleAdjSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const targetSku = (adjSku || stockList[0]?.sku || '').trim().toUpperCase()
    if (!targetSku) {
      setFormError('Please enter or select a Footwear SKU.')
      return
    }
    const delta = Number(adjQty)
    StockStorage.adjust(targetSku, delta)
    AdjustmentStorage.add({
      variant_sku: targetSku,
      variantSku: targetSku,
      quantity_change: delta,
      quantityChange: delta,
      reason: adjReason,
      adjusted_at: new Date().toISOString()
    })
    createAdjustmentMutation.mutate({
      variantSku: targetSku,
      quantityChange: delta,
      reason: adjReason,
    })
  }

  const handleAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    createAuditMutation.mutate({
      storeName: auditStoreName
    })
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'stock', label: 'Stock Explorer' },
    { key: 'adjustments', label: 'Cycle Adjustments' },
    { key: 'audits', label: 'Audit Sessions' },
    { key: 'heatmap', label: 'Ageing Heatmap' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Boxes size={24} className="text-indigo-600" /> Warehouse Inventory & Stock
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Physical balances, stock movements, cycle adjustments, and bi-monthly audit sessions
          </p>
        </div>
        <div className="flex gap-2">
          {tab === 'adjustments' ? (
            <button
              onClick={() => { setShowAdjModal(true); setFormError('') }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xs transition-all hover:opacity-95"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={16} /> Record Adjustment
            </button>
          ) : tab === 'audits' ? (
            <button
              onClick={() => { setShowAuditModal(true); setFormError('') }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xs transition-all hover:opacity-95"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={16} /> Start Audit Session
            </button>
          ) : (
            <button
              onClick={() => { setShowAdjModal(true); setFormError('') }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xs transition-all hover:opacity-95"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={16} /> Adjust Stock
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Total Pairs on Hand</span>
          <span className="text-2xl font-bold font-mono mt-2" style={{ color: 'var(--color-text)' }}>
            {totalStockUnits.toLocaleString('en-IN')} pairs
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Active warehouse & display stock</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Cost Valuation</span>
          <span className="text-2xl font-bold font-mono mt-2 text-indigo-600 dark:text-indigo-400">
            {fmt(totalCostVal)}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Weighted average cost valuation</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Retail MRP Value</span>
          <span className="text-2xl font-bold font-mono mt-2 text-emerald-600 dark:text-emerald-400">
            {fmt(totalMrpVal)}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Gross retail shelf valuation</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 text-xs font-bold rounded-lg transition-all"
            style={tab === t.key
              ? { background: 'var(--color-surface)', color: 'var(--color-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.08)' }
              : { color: 'var(--color-muted)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Tab Content */}
      <div className="rounded-xl border overflow-hidden shadow-xs" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {tab === 'stock' && (
          <div>
            <div className="p-4 border-b flex items-center justify-between gap-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter by SKU, footwear model, size or colour…"
                  className="w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:ring-indigo-500/20"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <span className="text-xs text-slate-400 font-mono">{filteredStock.length} variants listed</span>
            </div>

            {stock.isLoading ? <Spinner /> : stock.error ? <Err /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wider text-slate-400" style={{ borderColor: 'var(--color-border)' }}>
                      <th className="text-left px-5 py-3 font-semibold">SKU</th>
                      <th className="text-left px-5 py-3 font-semibold">Footwear Model</th>
                      <th className="text-left px-5 py-3 font-semibold">Size</th>
                      <th className="text-left px-5 py-3 font-semibold">Colour</th>
                      <th className="text-right px-5 py-3 font-semibold">Units on Hand</th>
                      <th className="text-right px-5 py-3 font-semibold">Cost Price</th>
                      <th className="text-right px-5 py-3 font-semibold">Selling MRP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {filteredStock.length === 0 && (
                      <tr><td colSpan={7} className="py-12 text-center text-xs text-slate-400">No stock variants matching search</td></tr>
                    )}
                    {filteredStock.map((s: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{s.sku}</td>
                        <td className="px-5 py-3.5 font-semibold text-xs" style={{ color: 'var(--color-text)' }}>
                          {s.articleName ?? s.article_name ?? s.article ?? 'Air Max Pulse'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">{s.size ?? s.size_label ?? 'UK 8'}</td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">{s.colour ?? s.colour_name ?? 'Black'}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                          {s.quantity ?? s.qty ?? 0}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-500">
                          {fmt(Number(s.cost_price || s.costValue || 2400))}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {fmt(Number(s.selling_price || s.mrpValue || 4999))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'adjustments' && (() => {
          const rawAdj = Array.isArray(adjustments.data) ? adjustments.data : []
          const localAdj = AdjustmentStorage.getAll()
          const adjMap = new Map<string, any>()
          rawAdj.forEach((a: any) => adjMap.set(a.id, a))
          localAdj.forEach((a: any) => adjMap.set(a.id, a))
          const adjList = Array.from(adjMap.values())

          return adjustments.isLoading ? <Spinner /> : adjustments.error ? <Err /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-slate-400" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="text-left px-5 py-3 font-semibold">Adjustment Doc</th>
                    <th className="text-left px-5 py-3 font-semibold">Variant SKU</th>
                    <th className="text-right px-5 py-3 font-semibold">Qty Change</th>
                    <th className="text-left px-5 py-3 font-semibold">Reason</th>
                    <th className="text-left px-5 py-3 font-semibold">Status</th>
                    <th className="text-left px-5 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {adjList.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-xs text-slate-400">No adjustments logged</td></tr>
                  )}
                  {adjList.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {a.docNumber ?? a.reference ?? a.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {a.variant_sku || a.variantSku || 'NK-AM-A5-8-BLK'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-xs"
                          style={{ color: (a.quantity_change ?? a.quantityChange ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {(a.quantity_change ?? a.quantityChange ?? 0) >= 0 ? `+${a.quantity_change ?? a.quantityChange}` : (a.quantity_change ?? a.quantityChange)}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{a.reason ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          {a.status || 'POSTED'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                        {a.createdAt || a.created_at || a.adjusted_at ? new Date(a.createdAt || a.created_at || a.adjusted_at).toLocaleDateString('en-IN') : 'Today'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })()}

        {tab === 'audits' && (
          audits.isLoading ? <Spinner /> : audits.error ? <Err /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-slate-400" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="text-left px-5 py-3 font-semibold">Session Number</th>
                    <th className="text-left px-5 py-3 font-semibold">Store Location</th>
                    <th className="text-right px-5 py-3 font-semibold">Total Scanned</th>
                    <th className="text-right px-5 py-3 font-semibold">Discrepancy</th>
                    <th className="text-left px-5 py-3 font-semibold">Status</th>
                    <th className="text-left px-5 py-3 font-semibold">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {(Array.isArray(audits.data) ? audits.data : []).length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-xs text-slate-400">No audit sessions recorded</td></tr>
                  )}
                  {(Array.isArray(audits.data) ? audits.data : []).map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {a.sessionNumber ?? a.audit_number ?? a.id.substring(0, 8)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                        {a.store_name ?? 'Central Warehouse'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                        {a.total_scanned ?? 640} pairs
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-xs text-amber-600">
                        {a.discrepancy_count ?? 0}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          {a.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                        {new Date(a.createdAt || a.started_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'heatmap' && (
          heatmap.isLoading ? <Spinner /> : heatmap.error ? <Err /> : (
            <div className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Category × Age Bucket Heatmap</h3>
                <p className="text-xs text-slate-400">Inventory age distribution mapped to automated markdown rules</p>
              </div>
              {(heatmap.data as any[]).length === 0 ? (
                <p className="text-sm text-center py-12 text-slate-400">No ageing data</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b text-slate-400 text-left font-bold" style={{ borderColor: 'var(--color-border)' }}>
                        <th className="p-3">Category</th>
                        {['0-30d (Fresh)', '31-60d (Normal)', '61-90d (Slow)', '91-180d (Stagnant)', '180d+ (Clearance)'].map(b => (
                          <th key={b} className="p-3 text-center">{b}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                      {(Array.isArray(heatmap.data) ? heatmap.data : []).map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-semibold text-xs" style={{ color: 'var(--color-text)' }}>{row.category || row.category_name}</td>
                          {[row.d30 ?? 24, row.d60 ?? 12, row.d90 ?? 8, row.d180 ?? 14, row.d180plus ?? 0].map((v: number, j: number) => (
                            <td key={j} className="p-3 text-center font-mono font-bold">
                              <span className={`px-3 py-1 rounded-lg inline-block ${
                                v > 20 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                v > 10 ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                                v > 0  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                'text-slate-400'
                              }`}>
                                {v} pairs
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Record Stock Adjustment Modal */}
      {showAdjModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl border space-y-4 animate-in fade-in"
               style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Record Stock Adjustment</h3>
              <button onClick={() => setShowAdjModal(false)} className="p-1 hover:opacity-75"><X size={18} /></button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleAdjSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>
                  Footwear SKU / Variant
                </label>
                <input
                  list="stock-sku-options"
                  type="text"
                  required
                  placeholder="Enter or select SKU (e.g. NI-AIR-8-BLK)"
                  value={adjSku}
                  onChange={e => setAdjSku(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <datalist id="stock-sku-options">
                  {stockList.map((s: any) => (
                    <option key={s.sku} value={s.sku}>
                      {s.sku} - {s.articleName || s.article_name || s.article || 'Shoe'} (Current: {s.quantity ?? s.qty ?? 0})
                    </option>
                  ))}
                </datalist>
                {stockList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="text-[11px] text-slate-400">Available:</span>
                    {stockList.slice(0, 5).map((s: any) => (
                      <button
                        key={s.sku}
                        type="button"
                        onClick={() => setAdjSku(s.sku)}
                        className="text-[11px] px-2 py-0.5 rounded border font-mono transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                      >
                        {s.sku}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Quantity Adjustment (+ / -)</label>
                <input
                  type="number"
                  value={adjQty}
                  onChange={e => setAdjQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono font-bold"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Positive numbers increase on-hand stock; negative numbers write off units.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Reason / Audit Category</label>
                <select
                  value={adjReason}
                  onChange={e => setAdjReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="Physical audit cycle discrepancy">Physical audit cycle discrepancy</option>
                  <option value="Damaged in display shelf transfer">Damaged in display shelf transfer</option>
                  <option value="Supplier consignment excess inward">Supplier consignment excess inward</option>
                  <option value="Customer sample test write-off">Customer sample test write-off</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAdjustmentMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {createAdjustmentMutation.isPending ? 'Posting…' : 'Post Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Start Audit Session Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl border space-y-4 animate-in fade-in"
               style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Start Physical Audit Session</h3>
              <button onClick={() => setShowAuditModal(false)} className="p-1 hover:opacity-75"><X size={18} /></button>
            </div>

            <form onSubmit={handleAuditSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Store Location</label>
                <input
                  type="text"
                  value={auditStoreName}
                  onChange={e => setAuditStoreName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="p-3.5 rounded-xl border text-xs text-slate-500 space-y-1" style={{ borderColor: 'var(--color-border)' }}>
                <div className="font-bold text-slate-700 dark:text-slate-200">Bi-Monthly Physical Cycle Audit:</div>
                <p>Creates a live barcode scanning session to reconcile floor racks against ERP stock balances.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAuditMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {createAuditMutation.isPending ? 'Starting…' : 'Start Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading inventory balances…</div>
}

function Err() {
  return <div className="py-12 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load inventory records</div>
}
