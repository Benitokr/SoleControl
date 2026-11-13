import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Landmark, Plus, FileText, Check, ArrowRightLeft, DollarSign } from 'lucide-react'
import { api } from '../lib/api'

interface BankAccount {
  id: string
  name: string
  accountNumber: string
  ifsc?: string
  bankName?: string
  balance?: number
}

interface StatementLine {
  id: string
  bank_account_id: string
  transaction_date: string
  description?: string
  debit: string | number
  credit: string | number
  balance: string | number
  is_reconciled: boolean
  reconciled_journal_line_id?: string
}

interface GSTTransaction {
  id: string
  transaction_date: string
  type: 'INPUT' | 'OUTPUT'
  taxable_amount: string | number
  tax_amount: string | number
  cgst: string | number
  sgst: string | number
  igst: string | number
  purchase_doc?: string
  sale_doc?: string
  purchase_class?: string
}

interface GSTSummary {
  month: string
  output_taxable: string | number
  output_tax: string | number
  input_taxable: string | number
  input_tax: string | number
}

export function BankGSTPage() {
  const [activeTab, setActiveTab] = useState<'banks' | 'gst-register' | 'gst-summary'>('banks')
  const [selectedBankId, setSelectedBankId] = useState<string>('')
  const [showNewBankModal, setShowNewBankModal] = useState(false)
  const [newBank, setNewBank] = useState({ name: '', accountNumber: '', ifsc: '', bankName: '' })

  const queryClient = useQueryClient()

  // Queries
  const { data: bankData, isLoading: loadingBanks } = useQuery<{ data: BankAccount[] }>({
    queryKey: ['bank-accounts'],
    queryFn: () => api.get('/bank/accounts').then(r => r.data),
  })

  const bankAccounts = Array.isArray(bankData?.data) ? bankData.data : []
  const currentBankId = selectedBankId || bankAccounts[0]?.id

  const { data: statementData, isLoading: loadingStatement } = useQuery<{ data: StatementLine[] }>({
    queryKey: ['bank-statement', currentBankId],
    queryFn: () => api.get(`/bank/accounts/${currentBankId}/statement`).then(r => r.data),
    enabled: !!currentBankId && activeTab === 'banks',
  })

  const { data: gstData, isLoading: loadingGST } = useQuery<{ data: GSTTransaction[] }>({
    queryKey: ['gst-register'],
    queryFn: () => api.get('/bank/gst-register').then(r => r.data),
    enabled: activeTab === 'gst-register',
  })

  const { data: gstSummaryData, isLoading: loadingGSTSummary } = useQuery<{ data: GSTSummary[] }>({
    queryKey: ['gst-summary'],
    queryFn: () => api.get('/bank/gst-summary').then(r => r.data),
    enabled: activeTab === 'gst-summary',
  })

  // Mutations
  const createBankMutation = useMutation({
    mutationFn: (data: typeof newBank) => api.post('/bank/accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      setShowNewBankModal(false)
      setNewBank({ name: '', accountNumber: '', ifsc: '', bankName: '' })
    },
  })

  const reconcileMutation = useMutation({
    mutationFn: (lineId: string) => api.post('/bank/reconcile', { statementLineId: lineId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement', currentBankId] })
    },
  })

  const unreconcileMutation = useMutation({
    mutationFn: (lineId: string) => api.post('/bank/unreconcile', { statementLineId: lineId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement', currentBankId] })
    },
  })

  const gstList = Array.isArray(gstData?.data) ? gstData.data : []
  const gstSummaries = Array.isArray(gstSummaryData?.data) ? gstSummaryData.data : []

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Landmark size={20} /> Bank & GST Compliance
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
            Manage commercial bank accounts, bank reconciliation, and statutory GST return registers
          </p>
        </div>
        {activeTab === 'banks' && (
          <button
            onClick={() => setShowNewBankModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={16} /> Add Bank Account
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => setActiveTab('banks')}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderColor: activeTab === 'banks' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'banks' ? 'var(--color-primary)' : 'var(--color-muted)',
          }}
        >
          <Landmark size={16} /> Bank Accounts & Reconciliation
        </button>
        <button
          onClick={() => setActiveTab('gst-register')}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderColor: activeTab === 'gst-register' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'gst-register' ? 'var(--color-primary)' : 'var(--color-muted)',
          }}
        >
          <FileText size={16} /> GST Register (Input & Output)
        </button>
        <button
          onClick={() => setActiveTab('gst-summary')}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderColor: activeTab === 'gst-summary' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'gst-summary' ? 'var(--color-primary)' : 'var(--color-muted)',
          }}
        >
          <DollarSign size={16} /> Monthly GST Return Summary
        </button>
      </div>

      {/* Tab 1: Bank Accounts & Reconciliation */}
      {activeTab === 'banks' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loadingBanks ? (
              <div className="col-span-3 py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading bank accounts…</div>
            ) : bankAccounts.length === 0 ? (
              <div className="col-span-3 py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>No bank accounts configured</div>
            ) : (
              bankAccounts.map(b => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBankId(b.id)}
                  className="p-4 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: 'var(--color-surface)',
                    border: currentBankId === b.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{b.name}</h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{b.bankName || 'Commercial Bank'}</p>
                    </div>
                    <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-bg)', color: 'var(--color-muted)' }}>
                      {b.ifsc || 'IFSC'}
                    </span>
                  </div>
                  <div className="mt-4 flex justify-between items-end">
                    <span className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
                      •••• {String(b.accountNumber || (b as any).account_number || '0000').slice(-4)}
                    </span>
                    <span className="font-mono text-lg font-bold tabular-nums" style={{ color: 'var(--color-primary)' }}>
                      ₹{parseFloat(String(b.balance ?? (b as any).current_balance ?? (b as any).opening_balance ?? 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Statement Lines Table */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="p-3 border-b flex justify-between items-center text-sm font-medium" style={{ borderColor: 'var(--color-border)' }}>
              <span>Bank Statement Transactions & Reconciliations</span>
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                Showing latest 200 statement entries
              </span>
            </div>
            {loadingStatement ? (
              <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading Statement Lines…</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Description</th>
                    <th className="text-right px-4 py-3 font-medium">Withdrawal (Dr)</th>
                    <th className="text-right px-4 py-3 font-medium">Deposit (Cr)</th>
                    <th className="text-right px-4 py-3 font-medium">Balance</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(!Array.isArray(statementData?.data) || statementData.data.length === 0) ? (
                    <tr><td colSpan={7} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No statement transactions found</td></tr>
                  ) : (
                    statementData.data.map(line => (
                      <tr key={line.id} className="hover:bg-opacity-50" style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>
                          {new Date(line.transaction_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3 font-medium text-xs" style={{ color: 'var(--color-text)' }}>{line.description || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-red-500">
                          {parseFloat(line.debit as any) > 0 ? `₹${parseFloat(line.debit as any).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-600">
                          {parseFloat(line.credit as any) > 0 ? `₹${parseFloat(line.credit as any).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold" style={{ color: 'var(--color-text)' }}>
                          ₹{parseFloat(line.balance as any || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: line.is_reconciled ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                              color: line.is_reconciled ? 'var(--color-success)' : 'var(--color-warning)',
                            }}
                          >
                            {line.is_reconciled ? 'Reconciled' : 'Unmatched'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {line.is_reconciled ? (
                            <button
                              onClick={() => unreconcileMutation.mutate(line.id)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Unreconcile
                            </button>
                          ) : (
                            <button
                              onClick={() => reconcileMutation.mutate(line.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded text-white"
                              style={{ background: 'var(--color-primary)' }}
                            >
                              <Check size={12} /> Match
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
        </div>
      )}

      {/* Tab 2: GST Register */}
      {activeTab === 'gst-register' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {loadingGST ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading GST Transactions…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Doc Ref</th>
                  <th className="text-right px-4 py-3 font-medium">Taxable Value</th>
                  <th className="text-right px-4 py-3 font-medium">CGST</th>
                  <th className="text-right px-4 py-3 font-medium">SGST</th>
                  <th className="text-right px-4 py-3 font-medium">IGST</th>
                  <th className="text-right px-4 py-3 font-medium">Total Tax</th>
                </tr>
              </thead>
              <tbody>
                {gstList.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No statutory GST records found</td></tr>
                ) : (
                  gstList.map(item => (
                    <tr key={item.id} className="hover:bg-opacity-50" style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>
                        {new Date(item.transaction_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: item.type === 'OUTPUT' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(5, 150, 105, 0.1)',
                            color: item.type === 'OUTPUT' ? 'var(--color-primary)' : 'var(--color-success)',
                          }}
                        >
                          {item.type === 'OUTPUT' ? 'Output (Sale)' : 'Input (ITC)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                        {item.sale_doc || item.purchase_doc || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        ₹{parseFloat(item.taxable_amount as any || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-xs" style={{ color: 'var(--color-muted)' }}>
                        ₹{parseFloat(item.cgst as any || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-xs" style={{ color: 'var(--color-muted)' }}>
                        ₹{parseFloat(item.sgst as any || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-xs" style={{ color: 'var(--color-muted)' }}>
                        ₹{parseFloat(item.igst as any || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold" style={{ color: 'var(--color-text)' }}>
                        ₹{parseFloat(item.tax_amount as any || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: GST Summary */}
      {activeTab === 'gst-summary' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {loadingGSTSummary ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Computing Monthly GST Summary…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-4 py-3 font-medium">Tax Period</th>
                  <th className="text-right px-4 py-3 font-medium">Output Taxable</th>
                  <th className="text-right px-4 py-3 font-medium">Output GST (Liability)</th>
                  <th className="text-right px-4 py-3 font-medium">Input Taxable</th>
                  <th className="text-right px-4 py-3 font-medium">Input GST (Credit)</th>
                  <th className="text-right px-4 py-3 font-medium">Net GST Payable / (Credit)</th>
                </tr>
              </thead>
              <tbody>
                {gstSummaries.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No monthly summary available</td></tr>
                ) : (
                  gstSummaries.map((s, idx) => {
                    const outTax = parseFloat(s.output_tax as any || 0)
                    const inTax = parseFloat(s.input_tax as any || 0)
                    const net = outTax - inTax
                    return (
                      <tr key={idx} className="hover:bg-opacity-50" style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                          {s.month ? new Date(s.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Current'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          ₹{parseFloat(s.output_taxable as any || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-red-500 font-medium">
                          ₹{outTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          ₹{parseFloat(s.input_taxable as any || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-600 font-medium">
                          ₹{inTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-bold" style={{ color: net >= 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                          {net >= 0 ? `₹${net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `(₹${Math.abs(net).toLocaleString('en-IN', { minimumFractionDigits: 2 })})`}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal: New Bank */}
      {showNewBankModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Add Bank Account</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Account Nickname / Name</label>
                <input
                  value={newBank.name}
                  onChange={e => setNewBank({ ...newBank, name: e.target.value })}
                  placeholder="e.g. SoleControl Main Current Account"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Bank Name</label>
                <input
                  value={newBank.bankName}
                  onChange={e => setNewBank({ ...newBank, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank Ltd"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Account Number</label>
                <input
                  value={newBank.accountNumber}
                  onChange={e => setNewBank({ ...newBank, accountNumber: e.target.value })}
                  placeholder="50200084729182"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none font-mono"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>IFSC Code</label>
                <input
                  value={newBank.ifsc}
                  onChange={e => setNewBank({ ...newBank, ifsc: e.target.value })}
                  placeholder="HDFC0001234"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none font-mono"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewBankModal(false)}
                className="px-4 py-2 text-sm rounded-lg"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
              >
                Cancel
              </button>
              <button
                disabled={!newBank.name || !newBank.accountNumber || createBankMutation.isPending}
                onClick={() => createBankMutation.mutate(newBank)}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                {createBankMutation.isPending ? 'Saving…' : 'Save Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
