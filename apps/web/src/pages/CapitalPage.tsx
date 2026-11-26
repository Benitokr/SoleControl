import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Wallet, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatDateIN, toISODate, getApiErrorMessage } from '../lib/format'
import {
  PageHeader, StatCard, DataTable, StatusBadge, Button, Drawer,
  FormField, SearchableCombobox, DatePicker, MoneyInput, ColumnDef, inputBaseClass,
} from '../components/ui'

export function CapitalPage() {
  const qc = useQueryClient()
  const [showDrawer, setShowDrawer] = useState(false)
  const [entryType, setEntryType] = useState<'CAPITAL' | 'WITHDRAWAL'>('CAPITAL')
  const [amount, setAmount] = useState(0)
  const [entryDate, setEntryDate] = useState(toISODate(new Date()))
  const [mode, setMode] = useState('BANK_TRANSFER')
  const [narration, setNarration] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['capital-entries'],
    queryFn: () => api.get('/capital').then((r) => r.data?.data ?? []),
  })

  const entries: any[] = Array.isArray(data) ? data : []

  const totalCapital = entries
    .filter((e) => String(e.type || '').toUpperCase() === 'CAPITAL')
    .reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalDrawings = entries
    .filter((e) => String(e.type || '').toUpperCase() !== 'CAPITAL')
    .reduce((s, e) => s + Number(e.amount || 0), 0)

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/capital', {
        type: entryType,
        amount,
        entryDate,
        paymentMode: mode,
        narration: narration.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['capital-entries'] })
      toast.success('Capital entry recorded')
      setShowDrawer(false)
      setAmount(0)
      setNarration('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to record capital entry')),
  })

  const columns: ColumnDef<any>[] = [
    {
      id: 'date',
      header: 'Date',
      cell: (r) => formatDateIN(r.entry_date || r.entryDate || r.created_at),
    },
    {
      id: 'type',
      header: 'Type',
      cell: (r) => (
        <StatusBadge
          status={String(r.type || '').toUpperCase() === 'CAPITAL' ? 'ACTIVE' : 'PENDING'}
          label={String(r.type || '').toUpperCase() === 'CAPITAL' ? 'Capital introduced' : 'Owner drawings'}
          tone={String(r.type || '').toUpperCase() === 'CAPITAL' ? 'success' : 'warning'}
        />
      ),
    },
    {
      id: 'mode',
      header: 'Mode',
      cell: (r) => r.payment_mode || r.paymentMode || 'Bank',
    },
    {
      id: 'narration',
      header: 'Narration',
      cell: (r) => r.narration || r.notes || '—',
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (r) => <span className="font-semibold tabular-nums">{formatINR(r.amount || 0)}</span>,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Capital & Withdrawals"
        description="Track owner capital infusions and proprietor drawings with running equity balance."
        breadcrumbs={[{ label: 'Finance' }, { label: 'Capital & Withdrawals' }]}
        primaryAction={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowDrawer(true)}>
            Record Entry
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Net equity balance" value={formatINR(totalCapital - totalDrawings)} icon={<Wallet className="w-4 h-4" />} tone="teal" />
        <StatCard label="Capital introduced" value={formatINR(totalCapital)} tone="success" />
        <StatCard label="Owner drawings" value={formatINR(totalDrawings)} tone="warning" />
      </div>

      <DataTable
        data={entries}
        columns={columns}
        getRowId={(r, i) => r.id || String(i)}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        exportFilename="solecontrol-capital"
        emptyIcon={<Wallet className="w-6 h-6" />}
        emptyTitle="No capital or withdrawal entries"
        emptyDescription="Record owner capital infusions or drawings."
      />

      <Drawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        title="Record Capital / Withdrawal"
        isDirty={amount > 0 || Boolean(narration)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDrawer(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={createMutation.isPending}
              onClick={() => {
                if (amount <= 0) {
                  toast.error('Amount must be greater than 0')
                  return
                }
                createMutation.mutate()
              }}
            >
              Save Entry
            </Button>
          </>
        }
      >
        <FormField label="Entry type" required>
          <SearchableCombobox
            options={[
              { value: 'CAPITAL', label: 'Capital introduced' },
              { value: 'WITHDRAWAL', label: 'Owner drawings / withdrawal' },
            ]}
            value={entryType}
            onChange={(v) => setEntryType(v as 'CAPITAL' | 'WITHDRAWAL')}
          />
        </FormField>
        <FormField label="Amount" required>
          <MoneyInput value={amount} onChange={setAmount} />
        </FormField>
        <FormField label="Date" required>
          <DatePicker value={entryDate} onChange={setEntryDate} />
        </FormField>
        <FormField label="Payment mode">
          <SearchableCombobox
            options={[
              { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/IMPS)' },
              { value: 'UPI', label: 'UPI' },
              { value: 'CASH', label: 'Cash' },
            ]}
            value={mode}
            onChange={setMode}
          />
        </FormField>
        <FormField label="Narration">
          <input type="text" value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Purpose or reference…" className={inputBaseClass} />
        </FormField>
      </Drawer>
    </div>
  )
}
