import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Landmark, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatDateIN, getApiErrorMessage } from '../lib/format'
import { PageHeader, StatCard, DataTable, StatusBadge, Button, ColumnDef } from '../components/ui'

export function BankGSTPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'bank' | 'gst'>('bank')

  const { data: bankData, isLoading: loadingBank, error: bankErr, refetch: refetchBank } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.get('/bank-gst/accounts').then((r) => r.data?.data ?? []),
  })

  const { data: gstData, isLoading: loadingGst, error: gstErr, refetch: refetchGst } = useQuery({
    queryKey: ['gst-summary'],
    queryFn: () => api.get('/bank-gst/gst').then((r) => r.data?.data ?? {}),
  })

  const accounts: any[] = Array.isArray(bankData) ? bankData : []
  const gst = gstData || {}

  const totalBankBalance = accounts.reduce((s, a) => s + Number(a.balance ?? a.current_balance ?? 0), 0)

  const reconcileMutation = useMutation({
    mutationFn: (id: string) => api.post(`/bank-gst/reconcile/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast.success('Bank account marked reconciled')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to reconcile')),
  })

  const bankCols: ColumnDef<any>[] = [
    {
      id: 'name',
      header: 'Bank & account',
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.bank_name || r.bankName || r.name}</p>
          <p className="font-mono text-xs text-slate-500">{r.account_number || r.accountNumber || '—'}</p>
        </div>
      ),
    },
    {
      id: 'ifsc',
      header: 'IFSC',
      cell: (r) => <span className="font-mono text-xs text-slate-600">{r.ifsc || '—'}</span>,
    },
    {
      id: 'balance',
      header: 'Book balance',
      align: 'right',
      cell: (r) => <span className="font-semibold tabular-nums">{formatINR(r.balance ?? r.current_balance ?? 0)}</span>,
    },
    {
      id: 'action',
      header: 'Action',
      align: 'right',
      cell: (r) => (
        <Button
          size="sm"
          variant="outline"
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          loading={reconcileMutation.isPending}
          onClick={() => reconcileMutation.mutate(r.id)}
        >
          Reconcile
        </Button>
      ),
    },
  ]

  const gstRegs: any[] = Array.isArray(gst.transactions) ? gst.transactions : []
  const gstCols: ColumnDef<any>[] = [
    { id: 'doc', header: 'Document', cell: (r) => <span className="font-mono text-xs text-teal-700">{r.document_number || r.id}</span> },
    { id: 'date', header: 'Date', cell: (r) => formatDateIN(r.date || r.created_at) },
    { id: 'type', header: 'Register', cell: (r) => <StatusBadge status={r.type === 'OUTPUT' ? 'ACTIVE' : 'PENDING'} label={r.type || 'GST'} /> },
    { id: 'taxable', header: 'Taxable value', align: 'right', cell: (r) => formatINR(r.taxable_value || 0) },
    { id: 'tax', header: 'GST amount', align: 'right', cell: (r) => formatINR(r.gst_amount || 0) },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bank & GST"
        description="Reconcile bank accounts and review GSTR-1 / GSTR-3B output vs input tax registers."
        breadcrumbs={[{ label: 'Finance' }, { label: 'Bank & GST' }]}
      />

      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab('bank')}
          className={tab === 'bank' ? 'px-3.5 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white' : 'px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-600'}
        >
          Bank Accounts
        </button>
        <button
          type="button"
          onClick={() => setTab('gst')}
          className={tab === 'gst' ? 'px-3.5 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white' : 'px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-600'}
        >
          GST Registers (Class A)
        </button>
      </div>

      {tab === 'bank' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard label="Linked bank accounts" value={accounts.length} icon={<Landmark className="w-4 h-4" />} tone="teal" />
            <StatCard label="Total bank balance" value={formatINR(totalBankBalance)} tone="success" />
          </div>
          <DataTable
            data={accounts}
            columns={bankCols}
            getRowId={(r, i) => r.id || String(i)}
            isLoading={loadingBank}
            error={bankErr}
            onRetry={refetchBank}
            exportFilename="solecontrol-bank-accounts"
          />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Output GST (Sales)" value={formatINR(gst.outputGst || 0)} tone="teal" />
            <StatCard label="Input GST (Class A Purchases)" value={formatINR(gst.inputGst || 0)} tone="success" />
            <StatCard label="Net GST payable" value={formatINR((gst.outputGst || 0) - (gst.inputGst || 0))} tone="warning" />
          </div>
          <DataTable
            data={gstRegs}
            columns={gstCols}
            getRowId={(r, i) => r.id || String(i)}
            isLoading={loadingGst}
            error={gstErr}
            onRetry={refetchGst}
            exportFilename="solecontrol-gst-register"
            emptyTitle="No GST transactions in this period"
            emptyDescription="Class A GST purchases and POS sales invoices appear here automatically."
          />
        </>
      )}
    </div>
  )
}
