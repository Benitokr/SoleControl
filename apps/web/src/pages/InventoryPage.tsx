import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Boxes } from 'lucide-react'
import { api } from '../lib/api'

type Tab = 'stock' | 'adjustments' | 'audits' | 'heatmap'

export function InventoryPage() {
  const [tab, setTab] = useState<Tab>('stock')
  const [variantId, setVariantId] = useState('')

  const stock = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then(r => r.data?.data ?? []),
    enabled: tab === 'stock',
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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'stock', label: 'Stock Explorer' },
    { key: 'adjustments', label: 'Adjustments' },
    { key: 'audits', label: 'Audit Sessions' },
    { key: 'heatmap', label: 'Ageing Heatmap' },
  ]

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Boxes size={20} /> Inventory
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>Stock balances, adjustments and audit sessions</p>
      </div>

      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-3 py-1.5 text-sm rounded-md transition-all"
            style={tab === t.key
              ? { background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 600 }
              : { color: 'var(--color-muted)' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {tab === 'stock' && (
          stock.isLoading ? <Spinner /> : stock.error ? <Err /> : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-4 py-3 font-medium">SKU</th>
                  <th className="text-left px-4 py-3 font-medium">Article</th>
                  <th className="text-left px-4 py-3 font-medium">Size</th>
                  <th className="text-left px-4 py-3 font-medium">Colour</th>
                  <th className="text-right px-4 py-3 font-medium">Qty</th>
                  <th className="text-right px-4 py-3 font-medium">Cost Value</th>
                  <th className="text-right px-4 py-3 font-medium">MRP Value</th>
                </tr>
              </thead>
              <tbody>
                {(stock.data as any[]).length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No stock records found</td></tr>
                )}
                {(stock.data as any[]).map((s: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--color-text)' }}>{s.sku}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--color-text)' }}>{s.articleName ?? s.article ?? '—'}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--color-muted)' }}>{s.size ?? '—'}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--color-muted)' }}>{s.colour ?? '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold" style={{ color: 'var(--color-text)' }}>{s.quantity ?? s.qty ?? 0}</td>
                    <td className="px-4 py-2 text-right tabular-nums" style={{ color: 'var(--color-muted)' }}>₹{((s.costValue ?? 0) as number).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-right tabular-nums" style={{ color: 'var(--color-muted)' }}>₹{((s.mrpValue ?? 0) as number).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'adjustments' && (
          adjustments.isLoading ? <Spinner /> : adjustments.error ? <Err /> : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-4 py-3 font-medium">Doc No.</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Reason</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(adjustments.data as any[]).length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No adjustments</td></tr>
                )}
                {(adjustments.data as any[]).map((a: any) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text)' }}>{a.docNumber ?? a.id.substring(0, 8)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-muted)' }}>{new Date(a.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-muted)' }}>{a.reason ?? '—'}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'audits' && (
          audits.isLoading ? <Spinner /> : audits.error ? <Err /> : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-4 py-3 font-medium">Session</th>
                  <th className="text-left px-4 py-3 font-medium">Started</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(audits.data as any[]).length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No audit sessions</td></tr>
                )}
                {(audits.data as any[]).map((a: any) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text)' }}>{a.id.substring(0, 8)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-muted)' }}>{new Date(a.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-bg)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'heatmap' && (
          heatmap.isLoading ? <Spinner /> : heatmap.error ? <Err /> : (
            <div className="p-4">
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>Ageing by Category × Age Bucket</p>
              {(heatmap.data as any[]).length === 0
                ? <p className="text-sm text-center py-8" style={{ color: 'var(--color-muted)' }}>No ageing data</p>
                : <div className="overflow-x-auto">
                    <table className="text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 text-left font-medium" style={{ color: 'var(--color-muted)' }}>Category</th>
                          {['0-30d','31-60d','61-90d','91-180d','180d+'].map(b => (
                            <th key={b} className="p-2 text-center font-medium" style={{ color: 'var(--color-muted)' }}>{b}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(heatmap.data as any[]).map((row: any, i: number) => (
                          <tr key={i}>
                            <td className="p-2 font-medium" style={{ color: 'var(--color-text)' }}>{row.category}</td>
                            {[row.d30, row.d60, row.d90, row.d180, row.d180plus].map((v: number, j: number) => (
                              <td key={j} className="p-2 text-center tabular-nums rounded"
                                style={{ background: v > 100 ? '#FEE2E2' : v > 50 ? '#FEF3C7' : v > 0 ? '#DCFCE7' : 'transparent', color: 'var(--color-text)' }}>
                                {v ?? 0}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              }
            </div>
          )
        )}
      </div>
    </div>
  )
}

function Spinner() { return <div className="py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading…</div> }
function Err() { return <div className="py-8 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load</div> }

