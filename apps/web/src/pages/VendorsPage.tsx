import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Truck } from 'lucide-react'
import { api } from '../lib/api'

interface Vendor { id: string; name: string; phone?: string; gstin?: string; balance?: number; isActive: boolean }

export function VendorsPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading, error } = useQuery<{ data: Vendor[] }>({
    queryKey: ['vendors'],
    queryFn: () => api.get('/vendors').then(r => r.data),
  })

  const vendors = (data?.data ?? []).filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.phone ?? '').includes(search) ||
    (v.gstin ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Truck size={20} /> Vendors
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>Supplier accounts and payment history</p>
        </div>
      </div>

      <div className="rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search vendors…"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
        </div>

        {isLoading && <div className="py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading…</div>}
        {error && <div className="py-8 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load vendors</div>}

        {!isLoading && !error && (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Phone</th>
                <th className="text-left px-4 py-3 font-medium">GSTIN</th>
                <th className="text-right px-4 py-3 font-medium">Balance</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No vendors found</td></tr>
              )}
              {vendors.map(v => (
                <tr key={v.id} className="hover:bg-opacity-50 cursor-pointer"
                  style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{v.name}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-muted)' }}>{v.phone ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-muted)' }}>{v.gstin ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium"
                    style={{ color: (v.balance ?? 0) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    ₹{((v.balance ?? 0) as number).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={v.isActive
                        ? { background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }
                        : { background: 'var(--color-bg)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                      {v.isActive ? 'Active' : 'Inactive'}
                    </span>
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

