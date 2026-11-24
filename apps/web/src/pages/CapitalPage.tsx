import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Wallet, Plus, CheckCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { api } from '../lib/api'

interface CapitalEntry {
  id: string
  storeId: string
  type: 'CAPITAL_IN' | 'WITHDRAWAL'
  amount: string | number
  description?: string
  reference?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  approvedBy?: string
}

interface Withdrawal {
  id: string
  storeId: string
  amount: string | number
  description?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  approvedBy?: string
}

export function CapitalPage() {
  const [activeTab, setActiveTab] = useState<'entries' | 'withdrawals'>('entries')
  const [showModal, setShowModal] = useState(false)
  const [formType, setFormType] = useState<'CAPITAL_IN' | 'WITHDRAWAL'>('CAPITAL_IN')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')

  const queryClient = useQueryClient()

  // Queries
  const { data: capitalData, isLoading: loadingCapital } = useQuery<{ data: CapitalEntry[] }>({
    queryKey: ['capital-entries'],
    queryFn: () => api.get('/capital').then(r => r.data),
  })

  const { data: withdrawalsData, isLoading: loadingWithdrawals } = useQuery<{ data: Withdrawal[] }>({
    queryKey: ['withdrawals'],
    queryFn: () => api.get('/capital/withdrawals').then(r => r.data),
  })

  // Mutations
  const createEntryMutation = useMutation({
    mutationFn: (data: any) => api.post('/capital', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capital-entries'] })
      setShowModal(false)
      setAmount('')
      setDescription('')
      setReference('')
    },
  })

  const createWithdrawalMutation = useMutation({
    mutationFn: (data: any) => api.post('/capital/withdrawals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] })
      setShowModal(false)
      setAmount('')
      setDescription('')
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/capital/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capital-entries'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] })
    },
  })

  const entries: CapitalEntry[] = Array.isArray(capitalData?.data)
    ? capitalData.data
    : Array.isArray(capitalData)
    ? (capitalData as any)
    : []

  const withdrawals: Withdrawal[] = Array.isArray(withdrawalsData?.data)
    ? withdrawalsData.data
    : Array.isArray(withdrawalsData)
    ? (withdrawalsData as any)
    : []

  // Metrics
  const totalCapitalIn = entries
    .filter(e => e.type === 'CAPITAL_IN' && e.status === 'APPROVED')
    .reduce((s, e) => s + parseFloat(e.amount as any || 0), 0)

  const totalCapitalOut = entries
    .filter(e => e.type === 'WITHDRAWAL' && e.status === 'APPROVED')
    .reduce((s, e) => s + parseFloat(e.amount as any || 0), 0)

  const netInvested = totalCapitalIn - totalCapitalOut

  const handleSubmit = () => {
    if (activeTab === 'entries') {
      createEntryMutation.mutate({
        type: formType,
        amount: parseFloat(amount),
        description,
        reference,
      })
    } else {
      createWithdrawalMutation.mutate({
        amount: parseFloat(amount),
        description,
      })
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Wallet size={20} /> Capital & Drawings
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
            Equity injections, partner withdrawals, capital ledger approvals, and drawings
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={16} /> {activeTab === 'entries' ? 'New Capital Entry' : 'Record Withdrawal'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Total Capital In</span>
            <ArrowDownLeft size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono mt-1 tabular-nums text-emerald-600">
            ₹{totalCapitalIn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-4 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Total Drawings / Out</span>
            <ArrowUpRight size={16} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold font-mono mt-1 tabular-nums text-red-500">
            ₹{totalCapitalOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-4 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Net Partner Equity</span>
          <p className="text-2xl font-bold font-mono mt-1 tabular-nums" style={{ color: 'var(--color-primary)' }}>
            ₹{netInvested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => setActiveTab('entries')}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderColor: activeTab === 'entries' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'entries' ? 'var(--color-primary)' : 'var(--color-muted)',
          }}
        >
          Capital Entries
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderColor: activeTab === 'withdrawals' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'withdrawals' ? 'var(--color-primary)' : 'var(--color-muted)',
          }}
        >
          Withdrawals & Drawings
        </button>
      </div>

      {/* Tab 1: Capital Entries Table */}
      {activeTab === 'entries' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {loadingCapital ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading Capital Entries…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Reference</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No capital records found</td></tr>
                ) : (
                  entries.map(e => (
                    <tr key={e.id} className="hover:bg-opacity-50" style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>
                        {new Date(e.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: e.type === 'CAPITAL_IN' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                            color: e.type === 'CAPITAL_IN' ? 'var(--color-success)' : 'var(--color-danger)',
                          }}
                        >
                          {e.type === 'CAPITAL_IN' ? 'Inflow' : 'Withdrawal'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums" style={{ color: e.type === 'CAPITAL_IN' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        ₹{parseFloat(e.amount as any || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-muted)' }}>{e.reference || '—'}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text)' }}>{e.description || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: e.status === 'APPROVED' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                            color: e.status === 'APPROVED' ? 'var(--color-success)' : 'var(--color-warning)',
                          }}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {e.status === 'PENDING' && (
                          <button
                            onClick={() => approveMutation.mutate(e.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded text-white"
                            style={{ background: 'var(--color-success)' }}
                          >
                            <CheckCircle size={12} /> Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Withdrawals Table */}
      {activeTab === 'withdrawals' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {loadingWithdrawals ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading Withdrawals…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No withdrawals recorded</td></tr>
                ) : (
                  withdrawals.map(w => (
                    <tr key={w.id} className="hover:bg-opacity-50" style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>
                        {new Date(w.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-red-500">
                        ₹{parseFloat(w.amount as any || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text)' }}>{w.description || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: w.status === 'APPROVED' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                            color: w.status === 'APPROVED' ? 'var(--color-success)' : 'var(--color-warning)',
                          }}
                        >
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal: New Record */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              {activeTab === 'entries' ? 'New Capital Transaction' : 'Record Withdrawal'}
            </h2>
            <div className="space-y-3">
              {activeTab === 'entries' && (
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Transaction Type</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="CAPITAL_IN">Capital Inflow (Dr Cash / Cr Capital)</option>
                    <option value="WITHDRAWAL">Partner Drawings (Dr Drawings / Cr Cash)</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="50000"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none font-mono"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              {activeTab === 'entries' && (
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Reference / Cheque #</label>
                  <input
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                    placeholder="NEFT / CHQ 482910"
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Description / Narration</label>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Initial working capital contribution"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm rounded-lg"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
              >
                Cancel
              </button>
              <button
                disabled={!amount || parseFloat(amount) <= 0}
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
