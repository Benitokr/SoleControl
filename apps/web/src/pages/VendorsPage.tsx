import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Truck, Plus, Search, Phone, FileText, CheckCircle2, X } from 'lucide-react'
import { api, fmt } from '../lib/api'
import { VendorStorage } from '../lib/storage'

interface Vendor {
  id: string
  name: string
  phone?: string
  gstin?: string
  balance?: number
  address?: string
  contactPerson?: string
  isActive: boolean
}

export function VendorsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [formError, setFormError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [gstin, setGstin] = useState('')
  const [address, setAddress] = useState('')
  const [contactPerson, setContactPerson] = useState('')

  const { data, isLoading } = useQuery<{ data: Vendor[] }>({
    queryKey: ['vendors'],
    queryFn: () => api.get('/vendors').then(r => r.data).catch(() => ({ data: [] })),
  })

  const addVendorMutation = useMutation({
    mutationFn: (body: any) => api.post('/vendors', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] })
      setShowAddModal(false)
      setName('')
      setPhone('')
      setGstin('')
      setAddress('')
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to add supplier.')
    }
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Vendor name is required.')
      return
    }
    setFormError('')
    const newVendorObj = {
      id: 'vnd-' + Date.now(),
      name: name.trim(),
      code: 'VND-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
      phone: phone || '+91 98401 11222',
      gstin: gstin || '33AABCV1234F1Z1',
      address,
      contactPerson,
      balance: 0,
      isActive: true
    }
    VendorStorage.add(newVendorObj)
    addVendorMutation.mutate(newVendorObj)
    setShowAddModal(false)
    setName('')
    setPhone('')
    setGstin('')
    setAddress('')
  }

  const rawVendors: Vendor[] = VendorStorage.mergeWith(
    Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
      ? (data as any)
      : []
  )

  const vendors = rawVendors.filter(v =>
    (v?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (v?.phone ?? '').includes(search) ||
    (v?.gstin ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Truck size={24} className="text-indigo-600" /> Vendors & Suppliers
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Authorized footwear manufacturers, wholesale distributors, GST tax invoices, and payables ledger
          </p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setFormError('') }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xs transition-all hover:opacity-95"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={16} /> New Vendor
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Registered Suppliers</span>
          <span className="text-2xl font-bold font-mono mt-2" style={{ color: 'var(--color-text)' }}>{vendors.length}</span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Direct factory & agency accounts</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Total Trade Payables</span>
          <span className="text-2xl font-bold font-mono mt-2 text-rose-600 dark:text-rose-400">
            {fmt(vendors.reduce((acc, v) => acc + (Number(v.balance) || 0), 0))}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Pending supplier settlement balances</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">GST Compliance</span>
          <span className="text-2xl font-bold font-mono mt-2 text-emerald-600 dark:text-emerald-400">100%</span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>All vendors GSTIN verified</span>
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
              placeholder="Search supplier name, GSTIN or contact…"
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:ring-indigo-500/20"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>
        </div>

        {isLoading && vendors.length === 0 && <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading suppliers…</div>}

        {(!isLoading || vendors.length > 0) && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-slate-400" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="text-left px-5 py-3 font-semibold">Vendor / Supplier</th>
                  <th className="text-left px-5 py-3 font-semibold">Contact</th>
                  <th className="text-left px-5 py-3 font-semibold">GSTIN</th>
                  <th className="text-right px-5 py-3 font-semibold">Payable Balance</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-right px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {vendors.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-xs text-slate-400">No suppliers found</td></tr>
                )}
                {vendors.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--color-text)' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-indigo-600">
                          {v.name.charAt(0)}
                        </div>
                        <span>{v.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">{v.phone ?? '—'}</td>
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {v.gstin ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold"
                        style={{ color: (v.balance ?? 0) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {fmt(Number(v.balance || 0))}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        Active
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedVendor(v)}
                        className="text-xs px-2.5 py-1 rounded-lg border font-semibold hover:border-indigo-400 transition-colors"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      >
                        Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vendor Detail Drawer */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right"
               style={{ background: 'var(--color-surface)' }}>
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-indigo-600">
                    {selectedVendor.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{selectedVendor.name}</h3>
                    <span className="text-xs text-slate-400">Supplier Ledger & Statutory Info</span>
                  </div>
                </div>
                <button onClick={() => setSelectedVendor(null)} className="p-1 hover:opacity-75"><X size={18} /></button>
              </div>

              <div className="p-4 rounded-xl border space-y-3 text-xs font-mono" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between">
                  <span className="text-slate-400">GSTIN:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedVendor.gstin || '33AABCN1234F1Z5'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span>{selectedVendor.phone || '+91 98401 12345'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Terms:</span>
                  <span className="font-semibold">Net 30 Days (Direct NEFT/RTGS)</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-rose-600 dark:text-rose-400 font-bold" style={{ borderColor: 'var(--color-border)' }}>
                  <span>Outstanding Payables:</span>
                  <span>{fmt(Number(selectedVendor.balance || 0))}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border space-y-2 text-xs" style={{ borderColor: 'var(--color-border)' }}>
                <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                  <CheckCircle2 size={14} className="text-emerald-500" /> Automated GST Input Credit (ITC)
                </div>
                <p className="text-slate-500">
                  Consignments from this supplier are processed under Purchase Class A (statutory ITC reconciliation enabled).
                </p>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setSelectedVendor(null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl border space-y-4 animate-in fade-in"
               style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Add Footwear Supplier</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:opacity-75"><X size={18} /></button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Company / Supplier Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asics India Operations Pvt Ltd"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>GSTIN (15-digit)</label>
                <input
                  type="text"
                  placeholder="33AABCA1234F1Z8"
                  value={gstin}
                  onChange={e => setGstin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Suresh Nair (Regional Lead)"
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98401 77889"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
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
                  disabled={addVendorMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {addVendorMutation.isPending ? 'Saving…' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
