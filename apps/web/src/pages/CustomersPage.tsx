import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HeartHandshake, Plus, Search, Phone, Mail, CreditCard, X, CheckCircle2 } from 'lucide-react'
import { api, fmt } from '../lib/api'

interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  lifetimeValue?: number
  creditOutstanding?: number
  creditLimit?: number
  address?: string
  isActive: boolean
}

export function CustomersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [formError, setFormError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [creditLimit, setCreditLimit] = useState(15000)
  const [address, setAddress] = useState('')

  const { data, isLoading, error } = useQuery<{ data: Customer[] }>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then(r => r.data),
  })

  const addCustomerMutation = useMutation({
    mutationFn: (body: any) => api.post('/customers', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setShowAddModal(false)
      setName('')
      setPhone('')
      setEmail('')
      setAddress('')
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to add customer profile.')
    }
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Customer name is required.')
      return
    }
    setFormError('')
    addCustomerMutation.mutate({
      name,
      phone: phone || '+91 98401 00000',
      email: email || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      creditLimit: Number(creditLimit),
      address,
      isActive: true
    })
  }

  const rawCustomers: Customer[] = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
    ? (data as any)
    : []

  const customers = rawCustomers.filter(c =>
    (c?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c?.phone ?? '').includes(search) ||
    (c?.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <HeartHandshake size={24} className="text-indigo-600" /> Customers & CRM
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Customer profiles, store loyalty trackings, purchase history, and credit ledger balances
          </p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setFormError('') }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xs transition-all hover:opacity-95"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={16} /> New Customer
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Registered Patrons</span>
          <span className="text-2xl font-bold font-mono mt-2" style={{ color: 'var(--color-text)' }}>{customers.length}</span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Footwear retail accounts</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Lifetime Value</span>
          <span className="text-2xl font-bold font-mono mt-2 text-emerald-600 dark:text-emerald-400">
            {fmt(customers.reduce((acc, c) => acc + (Number(c.lifetimeValue) || 0), 0))}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Cumulative customer revenue</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Credit Outstanding</span>
          <span className="text-2xl font-bold font-mono mt-2 text-amber-600 dark:text-amber-400">
            {fmt(customers.reduce((acc, c) => acc + (Number(c.creditOutstanding) || 0), 0))}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Active customer ledger balance</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border overflow-hidden shadow-xs" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="p-4 border-b flex items-center justify-between gap-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customer name, phone or email…"
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:ring-indigo-500/20"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>
        </div>

        {isLoading && <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading customer accounts…</div>}
        {error && <div className="py-12 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load customers</div>}

        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-slate-400" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="text-left px-5 py-3 font-semibold">Customer</th>
                  <th className="text-left px-5 py-3 font-semibold">Contact</th>
                  <th className="text-right px-5 py-3 font-semibold">Lifetime Sales</th>
                  <th className="text-right px-5 py-3 font-semibold">Credit Balance</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-right px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {customers.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-xs text-slate-400">No customers found</td></tr>
                )}
                {customers.map(c => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--color-text)' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-indigo-600">
                          {c.name.charAt(0)}
                        </div>
                        <span>{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">
                      <div>{c.phone ?? '—'}</div>
                      <div className="text-[11px] text-slate-400">{c.email ?? '—'}</div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {fmt(Number(c.lifetimeValue || 0))}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold"
                        style={{ color: (c.creditOutstanding || 0) > 0 ? 'var(--color-danger)' : 'var(--color-muted)' }}>
                      {fmt(Number(c.creditOutstanding || 0))}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        Active
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="text-xs px-2.5 py-1 rounded-lg border font-semibold hover:border-indigo-400 transition-colors"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Profile Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right"
               style={{ background: 'var(--color-surface)' }}>
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-indigo-600">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{selectedCustomer.name}</h3>
                    <span className="text-xs text-slate-400">Customer Profile & Ledger</span>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-1 hover:opacity-75"><X size={18} /></button>
              </div>

              <div className="p-4 rounded-xl border space-y-3 text-xs font-mono" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedCustomer.phone || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedCustomer.email || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Credit Limit:</span>
                  <span className="font-bold">{fmt(Number(selectedCustomer.creditLimit || 25000))}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-emerald-600 dark:text-emerald-400 font-bold" style={{ borderColor: 'var(--color-border)' }}>
                  <span>Lifetime Spend:</span>
                  <span>{fmt(Number(selectedCustomer.lifetimeValue || 0))}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border space-y-2 text-xs" style={{ borderColor: 'var(--color-border)' }}>
                <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                  <CheckCircle2 size={14} className="text-emerald-500" /> WhatsApp Campaign Subscribed
                </div>
                <p className="text-slate-500">
                  Automated sales receipts and promotional season alerts dispatched via integrated WhatsApp Business API.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl border space-y-4 animate-in fade-in"
               style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>New Customer Profile</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:opacity-75"><X size={18} /></button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anandha Krishnan"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98401 23456"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Email Address</label>
                <input
                  type="email"
                  placeholder="anand@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Credit Limit (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={creditLimit}
                  onChange={e => setCreditLimit(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono"
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
                  disabled={addCustomerMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {addCustomerMutation.isPending ? 'Saving…' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
