import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgePercent } from 'lucide-react'
import { api } from '../lib/api'

interface Offer {
  id: string; name: string; scopeType: string; discountType: string
  discountValue: number; validFrom: string; validTo?: string; isActive: boolean
  priority: number
}

export function OffersPage() {
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery<{ data: Offer[] }>({
    queryKey: ['offers'],
    queryFn: () => api.get('/offers').then(r => r.data),
  })

  const toggle = useMutation({
    mutationFn: (o: Offer) => o.isActive
      ? api.post(`/offers/${o.id}/deactivate`)
      : api.put(`/offers/${o.id}`, { isActive: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers'] }),
  })

  const offers = (data?.data ?? []).filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <BadgePercent size={20} /> Offers &amp; Discounts
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>Promotional offers and their redemptions</p>
        </div>
        <button className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--color-primary)' }}>+ New Offer</button>
      </div>

      <div className="rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search offers…"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
        </div>

        {isLoading && <div className="py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading…</div>}
        {error && <div className="py-8 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load offers</div>}

        {!isLoading && !error && (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Scope</th>
                <th className="text-left px-4 py-3 font-medium">Discount</th>
                <th className="text-left px-4 py-3 font-medium">Valid From</th>
                <th className="text-left px-4 py-3 font-medium">Valid To</th>
                <th className="text-right px-4 py-3 font-medium">Priority</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {offers.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No offers found</td></tr>
              )}
              {offers.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{o.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-bg)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                      {o.scopeType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                    {o.discountType === 'PERCENTAGE' ? `${o.discountValue}%` : `₹${o.discountValue}`}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-muted)' }}>{new Date(o.validFrom).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-muted)' }}>{o.validTo ? new Date(o.validTo).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--color-muted)' }}>{o.priority}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={o.isActive
                        ? { background: '#DCFCE7', color: '#059669' }
                        : { background: 'var(--color-bg)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                      {o.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle.mutate(o)}
                      className="text-xs px-3 py-1 rounded-md"
                      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                      {o.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

