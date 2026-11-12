import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HeartHandshake } from 'lucide-react'
import { api } from '../lib/api'

interface Customer {
  id: string; name: string; phone?: string; email?: string
  lifetimeValue?: number; creditOutstanding?: number; isActive: boolean
}

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading, error } = useQuery<{ data: Customer[] }>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then(r => r.data),
  })

  const customers = (data?.data ?? []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <HeartHandshake size={20} /> Customers &amp; CRM
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>Customer profiles and communication history</p>
        </div>
        <button className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--color-primary)' }}>+ New Customer</button>
      </div>

      <div className="rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
        </div>

        {isLoading && <div className="py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading…</div>}
        {error && <div className="py-8 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load customers</div>}

        {!isLoading && !error && (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Phone</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-right px-4 py-3 font-medium">Lifetime Value</th>
                <th className="text-right px-4 py-3 font-medium">Credit Outstanding</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No customers found</td></tr>
              )}
              {customers.map(c => (
                <tr key={c.id} className="cursor-pointer"
                  style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-muted)' }}>{c.phone ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-muted)' }}>{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: 'var(--color-success)' }}>
                    ₹{((c.lifetimeValue ?? 0) as number).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums"
                    style={{ color: (c.creditOutstanding ?? 0) > 0 ? 'var(--color-danger)' : 'var(--color-muted)' }}>
                    ₹{((c.creditOutstanding ?? 0) as number).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={c.isActive
                        ? { background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }
                        : { background: 'var(--color-bg)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                      {c.isActive ? 'Active' : 'Inactive'}
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

