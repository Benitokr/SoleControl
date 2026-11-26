import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BookOpen, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatDateIN, toISODate, getApiErrorMessage } from '../lib/format'
import {
  PageHeader, DataTable, StatusBadge, Button, FullPageForm, FormField,
  SearchableCombobox, DatePicker, MoneyInput, HubTabs, ColumnDef, inputBaseClass,
} from '../components/ui'

type AccTab = 'daybook' | 'ledgers' | 'journals' | 'trial' | 'pnl' | 'bs'

interface JournalLine {
  id: string
  accountId: string
  debit: number
  credit: number
}

export function AccountingPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<AccTab>('daybook')
  const [newJournalMode, setNewJournalMode] = useState(false)

  // Manual journal state
  const [entryDate, setEntryDate] = useState(toISODate(new Date()))
  const [narration, setNarration] = useState('')
  const [jLines, setJLines] = useState<JournalLine[]>([
    { id: 'jl-1', accountId: '', debit: 0, credit: 0 },
    { id: 'jl-2', accountId: '', debit: 0, credit: 0 },
  ])

  const { data: accountsData, isLoading: loadingAcc, error: accErr, refetch: refetchAcc } = useQuery({
    queryKey: ['accounting-accounts'],
    queryFn: () => api.get('/accounting/accounts').then((r) => r.data?.data ?? []),
  })

  const { data: journalsData, isLoading: loadingJour, error: jourErr, refetch: refetchJour } = useQuery({
    queryKey: ['accounting-journals'],
    queryFn: () => api.get('/accounting/journals').then((r) => r.data?.data ?? []),
  })

  const accounts: any[] = Array.isArray(accountsData) ? accountsData : []
  const journals: any[] = Array.isArray(journalsData) ? journalsData : []

  const totalDebit = jLines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const totalCredit = jLines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01

  const createJournalMutation = useMutation({
    mutationFn: () =>
      api.post('/accounting/journals', {
        entryDate,
        narration: narration.trim(),
        lines: jLines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting-journals'] })
      qc.invalidateQueries({ queryKey: ['accounting-accounts'] })
      toast.success('Journal entry posted')
      setNewJournalMode(false)
      setNarration('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to post journal entry')),
  })

  if (newJournalMode) {
    return (
      <FullPageForm
        title="New Manual Journal Entry"
        subtitle="Double-entry voucher. Total debits must equal total credits before posting."
        backLabel="Accounting"
        onCancel={() => setNewJournalMode(false)}
        isDirty={Boolean(narration || totalDebit > 0)}
        primaryActionLabel="Post Journal"
        primaryDisabled={!isBalanced}
        onPrimaryAction={() => {
          if (!narration.trim()) {
            toast.error('Narration is required')
            return
          }
          if (jLines.some((l) => !l.accountId)) {
            toast.error('Select an account for every line')
            return
          }
          createJournalMutation.mutate()
        }}
        primaryLoading={createJournalMutation.isPending}
        headerFields={
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Voucher date" required>
              <DatePicker value={entryDate} onChange={setEntryDate} />
            </FormField>
            <FormField label="Narration" required className="sm:col-span-2">
              <input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="e.g. Monthly showroom rent adjustment"
                className={inputBaseClass}
              />
            </FormField>
          </div>
        }
        summaryPanel={
          <div className="space-y-4 text-sm">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Balance Check
            </h2>
            <div className="flex justify-between">
              <span className="text-slate-600">Total debit</span>
              <span className="font-semibold tabular-nums">{formatINR(totalDebit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total credit</span>
              <span className="font-semibold tabular-nums">{formatINR(totalCredit)}</span>
            </div>
            <div
              className={
                isBalanced
                  ? 'p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-medium'
                  : 'p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2 text-xs font-medium'
              }
            >
              {isBalanced ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Entry is balanced and ready to post.
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Difference: {formatINR(Math.abs(totalDebit - totalCredit))}
                </>
              )}
            </div>
          </div>
        }
      >
        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
          {jLines.map((line, idx) => (
            <div key={line.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end border-b border-slate-100 pb-3 last:border-b-0">
              <FormField label={`Account #${idx + 1}`} className="sm:col-span-5">
                <SearchableCombobox
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: a.name,
                    sublabel: `${a.code || ''} · ${a.type || ''}`,
                  }))}
                  value={line.accountId}
                  onChange={(v) =>
                    setJLines((p) => p.map((x) => (x.id === line.id ? { ...x, accountId: v } : x)))
                  }
                  placeholder="Select ledger account…"
                />
              </FormField>
              <FormField label="Debit (Dr)" className="sm:col-span-3">
                <MoneyInput
                  value={line.debit}
                  onChange={(val) =>
                    setJLines((p) =>
                      p.map((x) => (x.id === line.id ? { ...x, debit: val, credit: val > 0 ? 0 : x.credit } : x))
                    )
                  }
                />
              </FormField>
              <FormField label="Credit (Cr)" className="sm:col-span-3">
                <MoneyInput
                  value={line.credit}
                  onChange={(val) =>
                    setJLines((p) =>
                      p.map((x) => (x.id === line.id ? { ...x, credit: val, debit: val > 0 ? 0 : x.debit } : x))
                    )
                  }
                />
              </FormField>
              <div className="sm:col-span-1 flex justify-end">
                {jLines.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setJLines((p) => p.filter((x) => x.id !== line.id))}
                    className="p-2 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() =>
              setJLines((p) => [...p, { id: `jl-${Date.now()}`, accountId: '', debit: 0, credit: 0 }])
            }
          >
            Add line
          </Button>
        </div>
      </FullPageForm>
    )
  }

  const journalCols: ColumnDef<any>[] = [
    {
      id: 'voucher',
      header: 'Voucher no.',
      cell: (r) => (
        <span className="font-mono text-xs text-teal-700">
          {r.entry_number || r.entryNumber || String(r.id).slice(0, 10)}
        </span>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      cell: (r) => formatDateIN(r.entry_date || r.entryDate || r.created_at),
    },
    {
      id: 'narration',
      header: 'Narration / Source',
      cell: (r) => <span className="font-medium text-slate-900">{r.narration || r.description || '—'}</span>,
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (r) => formatINR(r.total_amount ?? r.totalAmount ?? 0),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (r) => <StatusBadge status={r.status || 'POSTED'} />,
    },
  ]

  const accountCols: ColumnDef<any>[] = [
    {
      id: 'code',
      header: 'Code',
      cell: (r) => <span className="font-mono text-xs text-slate-600">{r.code || '—'}</span>,
    },
    {
      id: 'name',
      header: 'Account name',
      cell: (r) => <span className="font-medium text-slate-900">{r.name}</span>,
    },
    {
      id: 'type',
      header: 'Group',
      cell: (r) => <StatusBadge status="ACTIVE" label={r.type || 'Ledger'} tone="teal" />,
    },
    {
      id: 'balance',
      header: 'Balance',
      align: 'right',
      cell: (r) => formatINR(r.balance ?? 0),
    },
  ]

  const TABS: { key: AccTab; label: string }[] = [
    { key: 'daybook', label: 'Day Book' },
    { key: 'ledgers', label: 'Ledgers (COA)' },
    { key: 'journals', label: 'Journal Entries' },
    { key: 'trial', label: 'Trial Balance' },
    { key: 'pnl', label: 'P&L' },
    { key: 'bs', label: 'Balance Sheet' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Accounting & Ledgers"
        description="Double-entry day book, chart of accounts, manual journals, and financial statements."
        breadcrumbs={[{ label: 'Finance' }, { label: 'Accounting & Ledgers' }]}
        primaryAction={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setNewJournalMode(true)}>
            New Journal Entry
          </Button>
        }
      />

      <HubTabs
        tabs={[
          ...TABS.map((t) => ({
            key: t.key,
            label: t.label,
            active: tab === t.key,
            onClick: () => setTab(t.key),
          })),
          { key: 'capital', label: 'Capital & Withdrawals', to: '/capital' },
          { key: 'bank-gst', label: 'Bank & GST', to: '/bank-gst' },
        ]}
      />

      {tab === 'ledgers' || tab === 'trial' ? (
        <DataTable
          data={accounts}
          columns={accountCols}
          getRowId={(r, i) => r.id || r.code || String(i)}
          isLoading={loadingAcc}
          error={accErr}
          onRetry={refetchAcc}
          exportFilename={`solecontrol-${tab}`}
          emptyIcon={<BookOpen className="w-6 h-6" />}
          emptyTitle="No ledger accounts found"
          emptyDescription="Accounts are initialized from your Chart of Accounts."
        />
      ) : (
        <DataTable
          data={journals}
          columns={journalCols}
          getRowId={(r, i) => r.id || String(i)}
          isLoading={loadingJour}
          error={jourErr}
          onRetry={refetchJour}
          exportFilename={`solecontrol-${tab}`}
          emptyIcon={<BookOpen className="w-6 h-6" />}
          emptyTitle="No journal entries yet"
          emptyDescription="Automated entries are posted on every purchase and sale, or you can create a manual journal."
        />
      )}
    </div>
  )
}
