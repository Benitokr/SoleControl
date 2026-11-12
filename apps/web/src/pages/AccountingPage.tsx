import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, Plus, CheckCircle, RotateCcw,
  Scale, FileSpreadsheet, DollarSign, Wallet
} from 'lucide-react'
import { api } from '../lib/api'

interface Account {
  id: string
  code: string
  name: string
  type: string
  parentId?: string
  createdAt?: string
}

interface TrialBalanceRow {
  code: string
  name: string
  type: string
  debit: string | number
  credit: string | number
}

interface PLResponse {
  revenue: { code: string; name: string; net_amount: string | number }[]
  expenses: { code: string; name: string; net_amount: string | number }[]
  totalRevenue: number
  totalExpenses: number
  grossProfit: number
  netProfit: number
}

interface BalanceSheetResponse {
  assets: { code: string; name: string; balance: string | number }[]
  liabilities: { code: string; name: string; balance: string | number }[]
  equity: { code: string; name: string; balance: string | number }[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
}

interface JournalEntry {
  id: string
  reference: string
  type: string
  status: string
  total_debit: string | number
  total_credit: string | number
  notes?: string
  created_at: string
  posted_at?: string
  lines?: {
    id: string
    account_code: string
    account_name: string
    type: 'DEBIT' | 'CREDIT'
    amount: string | number
    description?: string
  }[]
}

interface CashbookRow {
  posted_at: string
  reference: string
  type: 'DEBIT' | 'CREDIT'
  amount: string | number
  description?: string
}

export function AccountingPage() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'trial' | 'pl' | 'bs' | 'journals' | 'cashbook'>('accounts')
  const [showNewAccountModal, setShowNewAccountModal] = useState(false)
  const [showNewJournalModal, setShowNewJournalModal] = useState(false)
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null)

  const queryClient = useQueryClient()

  // Queries
  const { data: accountsData, isLoading: loadingAccounts } = useQuery<{ data: Account[] }>({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounting/accounts').then(r => r.data),
  })

  const { data: trialData, isLoading: loadingTrial } = useQuery<{ data: TrialBalanceRow[]; meta: { totalDebit: number; totalCredit: number; balanced: boolean } }>({
    queryKey: ['trial-balance'],
    queryFn: () => api.get('/accounting/trial-balance').then(r => r.data),
    enabled: activeTab === 'trial',
  })

  const { data: plData, isLoading: loadingPL } = useQuery<{ data: PLResponse }>({
    queryKey: ['pl'],
    queryFn: () => api.get('/accounting/pl').then(r => r.data),
    enabled: activeTab === 'pl',
  })

  const { data: bsData, isLoading: loadingBS } = useQuery<{ data: BalanceSheetResponse }>({
    queryKey: ['balance-sheet'],
    queryFn: () => api.get('/accounting/balance-sheet').then(r => r.data),
    enabled: activeTab === 'bs',
  })

  const { data: journalsData, isLoading: loadingJournals } = useQuery<{ data: JournalEntry[] }>({
    queryKey: ['journals'],
    queryFn: () => api.get('/accounting/journals').then(r => r.data),
    enabled: activeTab === 'journals',
  })

  const { data: cashbookData, isLoading: loadingCashbook } = useQuery<{ data: CashbookRow[] }>({
    queryKey: ['cashbook'],
    queryFn: () => api.get('/accounting/cashbook').then(r => r.data),
    enabled: activeTab === 'cashbook',
  })

  // Account Form State
  const [newAccount, setNewAccount] = useState({ code: '', name: '', type: 'ASSET', parentId: '' })
  const createAccountMutation = useMutation({
    mutationFn: (data: typeof newAccount) => api.post('/accounting/accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setShowNewAccountModal(false)
      setNewAccount({ code: '', name: '', type: 'ASSET', parentId: '' })
    },
  })

  // Journal Form State
  const [journalForm, setJournalForm] = useState({
    reference: '',
    type: 'MANUAL',
    notes: '',
    lines: [
      { accountId: '', type: 'DEBIT' as 'DEBIT' | 'CREDIT', amount: '', description: '' },
      { accountId: '', type: 'CREDIT' as 'DEBIT' | 'CREDIT', amount: '', description: '' },
    ],
  })

  const createJournalMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounting/journals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
      setShowNewJournalModal(false)
      setJournalForm({
        reference: '',
        type: 'MANUAL',
        notes: '',
        lines: [
          { accountId: '', type: 'DEBIT', amount: '', description: '' },
          { accountId: '', type: 'CREDIT', amount: '', description: '' },
        ],
      })
    },
  })

  const approveJournalMutation = useMutation({
    mutationFn: (id: string) => api.post(`/accounting/journals/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] })
      queryClient.invalidateQueries({ queryKey: ['pl'] })
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] })
    },
  })

  const reverseJournalMutation = useMutation({
    mutationFn: (id: string) => api.post(`/accounting/journals/${id}/reverse`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] })
      queryClient.invalidateQueries({ queryKey: ['pl'] })
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] })
    },
  })

  const accounts = accountsData?.data || []
  const journals = journalsData?.data || []

  const totalJournalDebit = journalForm.lines
    .filter(l => l.type === 'DEBIT')
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0)
  const totalJournalCredit = journalForm.lines
    .filter(l => l.type === 'CREDIT')
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0)
  const isJournalBalanced = Math.abs(totalJournalDebit - totalJournalCredit) < 0.01 && totalJournalDebit > 0

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <BookOpen size={20} /> Accounting & Finance
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
            Chart of accounts, general ledger, journals, trial balance, and financial statements
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'accounts' && (
            <button
              onClick={() => setShowNewAccountModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={16} /> New Account
            </button>
          )}
          {activeTab === 'journals' && (
            <button
              onClick={() => setShowNewJournalModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={16} /> New Journal Entry
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {[
          { id: 'accounts', label: 'Chart of Accounts', icon: FileSpreadsheet },
          { id: 'trial', label: 'Trial Balance', icon: Scale },
          { id: 'pl', label: 'Profit & Loss', icon: DollarSign },
          { id: 'bs', label: 'Balance Sheet', icon: Scale },
          { id: 'journals', label: 'Journal Entries', icon: BookOpen },
          { id: 'cashbook', label: 'Cashbook', icon: Wallet },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: isActive ? 'var(--color-primary)' : 'transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--color-muted)',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab 1: Chart of Accounts */}
      {activeTab === 'accounts' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {loadingAccounts ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading Chart of Accounts…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-4 py-3 font-medium">Account Code</th>
                  <th className="text-left px-4 py-3 font-medium">Account Name</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Parent</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No accounts found</td></tr>
                ) : (
                  accounts.map(acc => (
                    <tr key={acc.id} className="hover:bg-opacity-50" style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>{acc.code}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{acc.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: acc.type === 'ASSET' ? 'rgba(79, 70, 229, 0.1)' :
                              acc.type === 'LIABILITY' ? 'rgba(220, 38, 38, 0.1)' :
                              acc.type === 'EQUITY' ? 'rgba(217, 119, 6, 0.1)' :
                              acc.type === 'REVENUE' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                            color: acc.type === 'ASSET' ? 'var(--color-primary)' :
                              acc.type === 'LIABILITY' ? 'var(--color-danger)' :
                              acc.type === 'EQUITY' ? 'var(--color-warning)' :
                              acc.type === 'REVENUE' ? 'var(--color-success)' : 'var(--color-muted)',
                          }}
                        >
                          {acc.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-muted)' }}>{acc.parentId || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Trial Balance */}
      {activeTab === 'trial' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: trialData?.meta?.balanced ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)' }}>
            <span className="text-sm font-medium" style={{ color: trialData?.meta?.balanced ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {trialData?.meta?.balanced ? '✓ Trial Balance is fully balanced' : '⚠ Warning: Debits and Credits do not match'}
            </span>
            <div className="text-sm font-mono space-x-4">
              <span>Debit: ₹{(trialData?.meta?.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span>Credit: ₹{(trialData?.meta?.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {loadingTrial ? (
              <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Computing Trial Balance…</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                    <th className="text-left px-4 py-3 font-medium">Code</th>
                    <th className="text-left px-4 py-3 font-medium">Account Name</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-right px-4 py-3 font-medium">Debit (₹)</th>
                    <th className="text-right px-4 py-3 font-medium">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(trialData?.data || []).map((row, idx) => (
                    <tr key={idx} className="hover:bg-opacity-50" style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>{row.code}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{row.name}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>{row.type}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {parseFloat(row.debit as any) > 0 ? parseFloat(row.debit as any).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {parseFloat(row.credit as any) > 0 ? parseFloat(row.credit as any).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold" style={{ background: 'var(--color-bg)', borderTop: '2px solid var(--color-border)' }}>
                    <td colSpan={3} className="px-4 py-3 text-right">Total:</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums" style={{ color: 'var(--color-primary)' }}>
                      ₹{(trialData?.meta?.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums" style={{ color: 'var(--color-primary)' }}>
                      ₹{(trialData?.meta?.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Profit & Loss */}
      {activeTab === 'pl' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Total Revenue</span>
              <p className="text-2xl font-bold font-mono mt-1 tabular-nums" style={{ color: 'var(--color-success)' }}>
                ₹{(plData?.data?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Net Profit</span>
              <p className="text-2xl font-bold font-mono mt-1 tabular-nums" style={{ color: (plData?.data?.netProfit || 0) >= 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                ₹{(plData?.data?.netProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue Column */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="p-3 border-b font-medium text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-success)' }}>
                Operating Revenue & Income
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {(plData?.data?.revenue || []).map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-4 py-2.5 font-medium">{r.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                        ₹{parseFloat(r.net_amount as any).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {(plData?.data?.revenue || []).length === 0 && (
                    <tr><td colSpan={2} className="py-6 text-center text-xs" style={{ color: 'var(--color-muted)' }}>No posted revenue</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Expenses Column */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="p-3 border-b font-medium text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-danger)' }}>
                Cost of Goods & Operating Expenses
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {(plData?.data?.expenses || []).map((e, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-4 py-2.5 font-medium">{e.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-red-500">
                        ₹{Math.abs(parseFloat(e.net_amount as any)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {(plData?.data?.expenses || []).length === 0 && (
                    <tr><td colSpan={2} className="py-6 text-center text-xs" style={{ color: 'var(--color-muted)' }}>No posted expenses</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Balance Sheet */}
      {activeTab === 'bs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="p-3 border-b flex justify-between items-center font-medium text-sm" style={{ borderColor: 'var(--color-border)' }}>
              <span>Assets</span>
              <span className="font-mono" style={{ color: 'var(--color-primary)' }}>
                ₹{(bsData?.data?.totalAssets || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {(bsData?.data?.assets || []).map((a, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-2.5">{a.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      ₹{parseFloat(a.balance as any).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="p-3 border-b flex justify-between items-center font-medium text-sm" style={{ borderColor: 'var(--color-border)' }}>
              <span>Liabilities & Equity</span>
              <span className="font-mono" style={{ color: 'var(--color-primary)' }}>
                ₹{((bsData?.data?.totalLiabilities || 0) + (bsData?.data?.totalEquity || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="bg-opacity-50 font-semibold text-xs uppercase" style={{ color: 'var(--color-muted)' }}>
                  <td colSpan={2} className="px-4 py-2">Liabilities</td>
                </tr>
                {(bsData?.data?.liabilities || []).map((l, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-2.5">{l.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      ₹{parseFloat(l.balance as any).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                <tr className="bg-opacity-50 font-semibold text-xs uppercase" style={{ color: 'var(--color-muted)' }}>
                  <td colSpan={2} className="px-4 py-2">Equity & Capital</td>
                </tr>
                {(bsData?.data?.equity || []).map((eq, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-2.5">{eq.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      ₹{parseFloat(eq.balance as any).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Journals */}
      {activeTab === 'journals' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {loadingJournals ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading Journals…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-4 py-3 font-medium">Reference</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {journals.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No journal entries found</td></tr>
                ) : (
                  journals.map(j => (
                    <tr key={j.id} className="hover:bg-opacity-50" style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--color-text)' }}>{j.reference}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>{j.type}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold" style={{ color: 'var(--color-primary)' }}>
                        ₹{parseFloat(j.total_debit as any || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: j.status === 'POSTED' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                            color: j.status === 'POSTED' ? 'var(--color-success)' : 'var(--color-warning)',
                          }}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>
                        {new Date(j.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {j.status === 'DRAFT' && (
                          <button
                            onClick={() => approveJournalMutation.mutate(j.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded text-white"
                            style={{ background: 'var(--color-success)' }}
                          >
                            <CheckCircle size={12} /> Post
                          </button>
                        )}
                        {j.status === 'POSTED' && (
                          <button
                            onClick={() => reverseJournalMutation.mutate(j.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded"
                            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-danger)' }}
                          >
                            <RotateCcw size={12} /> Reverse
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

      {/* Tab 6: Cashbook */}
      {activeTab === 'cashbook' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {loadingCashbook ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading Cashbook…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Reference</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-right px-4 py-3 font-medium">Receipt (Debit)</th>
                  <th className="text-right px-4 py-3 font-medium">Payment (Credit)</th>
                </tr>
              </thead>
              <tbody>
                {(cashbookData?.data || []).map((row, i) => (
                  <tr key={i} className="hover:bg-opacity-50" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>
                      {new Date(row.posted_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>{row.reference}</td>
                    <td className="px-4 py-3 text-sm">{row.description || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-600 font-medium">
                      {row.type === 'DEBIT' ? `₹${parseFloat(row.amount as any).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-red-500 font-medium">
                      {row.type === 'CREDIT' ? `₹${parseFloat(row.amount as any).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                  </tr>
                ))}
                {(cashbookData?.data || []).length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No cash transactions found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal: New Account */}
      {showNewAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Create Ledger Account</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Account Code</label>
                <input
                  value={newAccount.code}
                  onChange={e => setNewAccount({ ...newAccount, code: e.target.value })}
                  placeholder="e.g. 1050"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Account Name</label>
                <input
                  value={newAccount.name}
                  onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                  placeholder="e.g. Petty Cash Register"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Type</label>
                <select
                  value={newAccount.type}
                  onChange={e => setNewAccount({ ...newAccount, type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="ASSET">ASSET</option>
                  <option value="LIABILITY">LIABILITY</option>
                  <option value="EQUITY">EQUITY</option>
                  <option value="REVENUE">REVENUE</option>
                  <option value="EXPENSE">EXPENSE</option>
                  <option value="COGS">COGS</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewAccountModal(false)}
                className="px-4 py-2 text-sm rounded-lg"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
              >
                Cancel
              </button>
              <button
                disabled={!newAccount.code || !newAccount.name || createAccountMutation.isPending}
                onClick={() => createAccountMutation.mutate(newAccount)}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                {createAccountMutation.isPending ? 'Saving…' : 'Save Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Journal */}
      {showNewJournalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl p-6 rounded-2xl shadow-xl space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>New Journal Voucher</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Reference / Doc #</label>
                <input
                  value={journalForm.reference}
                  onChange={e => setJournalForm({ ...journalForm, reference: e.target.value })}
                  placeholder="JV-2026-001"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Notes / Narration</label>
                <input
                  value={journalForm.notes}
                  onChange={e => setJournalForm({ ...journalForm, notes: e.target.value })}
                  placeholder="Month-end adjustment"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            {/* Lines */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Journal Lines</span>
                <button
                  type="button"
                  onClick={() => setJournalForm({
                    ...journalForm,
                    lines: [...journalForm.lines, { accountId: '', type: 'DEBIT', amount: '', description: '' }]
                  })}
                  className="text-xs text-primary font-medium"
                >
                  + Add Line
                </button>
              </div>

              {journalForm.lines.map((line, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={line.accountId}
                    onChange={e => {
                      const updated = [...journalForm.lines]
                      updated[idx].accountId = e.target.value
                      setJournalForm({ ...journalForm, lines: updated })
                    }}
                    className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="">Select Account</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                    ))}
                  </select>
                  <select
                    value={line.type}
                    onChange={e => {
                      const updated = [...journalForm.lines]
                      updated[idx].type = e.target.value as any
                      setJournalForm({ ...journalForm, lines: updated })
                    }}
                    className="w-24 px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="DEBIT">DEBIT</option>
                    <option value="CREDIT">CREDIT</option>
                  </select>
                  <input
                    type="number"
                    value={line.amount}
                    onChange={e => {
                      const updated = [...journalForm.lines]
                      updated[idx].amount = e.target.value
                      setJournalForm({ ...journalForm, lines: updated })
                    }}
                    placeholder="Amount"
                    className="w-28 px-2 py-1.5 rounded-lg text-xs outline-none text-right font-mono"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg text-xs font-mono" style={{ background: 'var(--color-bg)' }}>
              <span>Total Debit: ₹{totalJournalDebit.toFixed(2)}</span>
              <span>Total Credit: ₹{totalJournalCredit.toFixed(2)}</span>
              <span style={{ color: isJournalBalanced ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {isJournalBalanced ? 'Balanced' : 'Out of Balance'}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewJournalModal(false)}
                className="px-4 py-2 text-sm rounded-lg"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
              >
                Cancel
              </button>
              <button
                disabled={!journalForm.reference || !isJournalBalanced || createJournalMutation.isPending}
                onClick={() => createJournalMutation.mutate(journalForm)}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                {createJournalMutation.isPending ? 'Saving…' : 'Save Journal Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
