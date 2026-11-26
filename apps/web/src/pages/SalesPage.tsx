import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Receipt, ShoppingBag, Printer, RotateCcw, Ban, IndianRupee } from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatDateIN, getApiErrorMessage } from '../lib/format'
import {
  PageHeader, StatCard, FilterBar, DataTable, StatusBadge, Button,
  Drawer, ConfirmDialog, PrintPreview, FormField, inputBaseClass, ColumnDef,
} from '../components/ui'

export function SalesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedSale, setSelectedSale] = useState<any | null>(null)
  const [showPrint, setShowPrint] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sales'],
    queryFn: () => api.get('/sales').then((r) => r.data?.data ?? []),
  })

  const sales: any[] = Array.isArray(data) ? data : []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sales.filter((s) => {
      const status = String(s.status || 'COMPLETED').toUpperCase()
      if (statusFilter !== 'ALL' && status !== statusFilter) return false
      if (!q) return true
      const doc = String(s.document_number || s.documentNumber || s.docNumber || s.id || '').toLowerCase()
      const cust = String(s.customer?.name || s.customer_name || 'Walk-in').toLowerCase()
      return doc.includes(q) || cust.includes(q)
    })
  }, [sales, search, statusFilter])

  const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total_amount ?? s.totalAmount ?? 0), 0)
  const avgBill = sales.length > 0 ? totalRevenue / sales.length : 0
  const returnedCount = sales.filter((s) =>
    ['RETURNED', 'CANCELLED'].includes(String(s.status || '').toUpperCase())
  ).length

  const returnMutation = useMutation({
    mutationFn: (id: string) => api.post(`/sales/${id}/return`, { reason: 'Customer exchange / return' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      toast.success('Return processed and stock restored')
      setSelectedSale(null)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to process return')),
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/sales/${id}/cancel`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      toast.success('Invoice cancelled')
      setShowCancelConfirm(false)
      setSelectedSale(null)
      setCancelReason('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to cancel invoice')),
  })

  const columns: ColumnDef<any>[] = [
    {
      id: 'invoice',
      header: 'Invoice no.',
      sortable: true,
      accessor: (r) => r.document_number || r.documentNumber || r.docNumber || r.id,
      cell: (r) => (
        <span className="font-mono text-xs font-medium text-teal-700">
          {r.document_number || r.documentNumber || r.docNumber || String(r.id).slice(0, 10)}
        </span>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      sortable: true,
      accessor: (r) => r.created_at || r.createdAt || r.saleDate || '',
      cell: (r) => (
        <span className="tabular-nums text-slate-600">
          {formatDateIN(r.created_at || r.createdAt || r.saleDate)}
        </span>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      sortable: true,
      accessor: (r) => r.customer?.name || r.customer_name || 'Walk-in Customer',
      cell: (r) => (
        <span className="font-medium text-slate-900">
          {r.customer?.name || r.customer_name || 'Walk-in Customer'}
        </span>
      ),
    },
    {
      id: 'mode',
      header: 'Payment mode',
      sortable: true,
      accessor: (r) => r.payment_mode || r.paymentMode || 'UPI',
      cell: (r) => <span className="text-slate-700">{r.payment_mode || r.paymentMode || 'UPI'}</span>,
    },
    {
      id: 'total',
      header: 'Total amount',
      align: 'right',
      sortable: true,
      accessor: (r) => Number(r.total_amount ?? r.totalAmount ?? 0),
      cell: (r) => (
        <span className="font-semibold text-slate-900">
          {formatINR(r.total_amount ?? r.totalAmount ?? 0)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      accessor: (r) => r.status || 'COMPLETED',
      cell: (r) => <StatusBadge status={r.status || 'COMPLETED'} />,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales History & Returns"
        description="Review POS invoices, reprint receipts, and process customer returns or cancellations."
        breadcrumbs={[{ label: 'Sales' }, { label: 'Sales History & Returns' }]}
        primaryAction={
          <Button
            variant="primary"
            icon={<ShoppingBag className="w-4 h-4" />}
            onClick={() => navigate('/sales/pos')}
          >
            Open POS Billing
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total invoices"
          value={sales.length}
          icon={<Receipt className="w-4 h-4" />}
          tone="teal"
        />
        <StatCard
          label="Gross sales"
          value={formatINR(totalRevenue)}
          icon={<IndianRupee className="w-4 h-4" />}
          tone="success"
        />
        <StatCard label="Average bill value" value={formatINR(avgBill)} />
        <StatCard
          label="Returns / Cancelled"
          value={returnedCount}
          tone={returnedCount > 0 ? 'warning' : 'default'}
        />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by invoice number or customer…"
        chips={[
          { key: 'ALL', label: 'All', count: sales.length },
          {
            key: 'COMPLETED',
            label: 'Completed',
            count: sales.filter((s) => (s.status || 'COMPLETED').toUpperCase() === 'COMPLETED').length,
          },
          {
            key: 'RETURNED',
            label: 'Returned',
            count: sales.filter((s) => (s.status || '').toUpperCase() === 'RETURNED').length,
          },
          {
            key: 'CANCELLED',
            label: 'Cancelled',
            count: sales.filter((s) => (s.status || '').toUpperCase() === 'CANCELLED').length,
          },
        ]}
        activeChip={statusFilter}
        onChipChange={setStatusFilter}
        onReset={() => {
          setSearch('')
          setStatusFilter('ALL')
        }}
      />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r, i) => r.id || String(i)}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        onRowClick={(row) => setSelectedSale(row)}
        exportFilename="solecontrol-sales"
        emptyIcon={<Receipt className="w-6 h-6" />}
        emptyTitle="No sales invoices yet"
        emptyDescription="Open the POS billing screen to create your first retail invoice."
        emptyAction={
          <Button variant="primary" onClick={() => navigate('/sales/pos')}>
            Start POS Billing
          </Button>
        }
      />

      <Drawer
        open={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        title={`Invoice ${
          selectedSale?.document_number || selectedSale?.documentNumber || selectedSale?.docNumber || ''
        }`}
        subtitle={selectedSale ? `Issued on ${formatDateIN(selectedSale.created_at || selectedSale.createdAt)}` : undefined}
        width="lg"
        footer={
          selectedSale && (
            <>
              <Button
                variant="outline"
                icon={<Printer className="w-4 h-4" />}
                onClick={() => setShowPrint(true)}
              >
                Reprint
              </Button>
              {String(selectedSale.status || 'COMPLETED').toUpperCase() === 'COMPLETED' && (
                <>
                  <Button
                    variant="secondary"
                    icon={<RotateCcw className="w-4 h-4" />}
                    loading={returnMutation.isPending}
                    onClick={() => returnMutation.mutate(selectedSale.id)}
                  >
                    Process Return
                  </Button>
                  <Button
                    variant="danger"
                    icon={<Ban className="w-4 h-4" />}
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    Cancel Invoice
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {selectedSale && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Customer</p>
                <p className="font-medium text-slate-900">
                  {selectedSale.customer?.name || selectedSale.customer_name || 'Walk-in Customer'}
                </p>
              </div>
              <StatusBadge status={selectedSale.status || 'COMPLETED'} />
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg border border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Payment mode</p>
                <p className="font-medium text-slate-900 mt-0.5">
                  {selectedSale.payment_mode || selectedSale.paymentMode || 'UPI'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Grand total</p>
                <p className="text-base font-semibold tabular-nums text-teal-700 mt-0.5">
                  {formatINR(selectedSale.total_amount ?? selectedSale.totalAmount ?? 0)}
                </p>
              </div>
            </div>

            {Array.isArray(selectedSale.items) && selectedSale.items.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
                  Line items
                </div>
                <div className="divide-y divide-slate-100">
                  {selectedSale.items.map((it: any, idx: number) => (
                    <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-slate-800">{it.sku || it.variantId}</p>
                        <p className="text-xs text-slate-500">Qty: {it.quantity}</p>
                      </div>
                      <span className="font-medium tabular-nums">
                        {formatINR((it.unitPrice || 0) * (it.quantity || 1))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <PrintPreview
        open={showPrint && !!selectedSale}
        onClose={() => setShowPrint(false)}
        title="Invoice Reprint"
      >
        {selectedSale && (
          <div className="space-y-3 text-xs">
            <div className="text-center border-b border-slate-200 pb-3">
              <h4 className="text-base font-bold">Forty V Footwear</h4>
              <p className="font-mono mt-1">
                {selectedSale.document_number || selectedSale.documentNumber || selectedSale.id}
              </p>
              <p className="text-slate-500">{formatDateIN(selectedSale.created_at || selectedSale.createdAt)}</p>
            </div>
            <div className="flex justify-between font-bold text-sm pt-2">
              <span>Total Paid ({selectedSale.payment_mode || selectedSale.paymentMode || 'UPI'})</span>
              <span className="tabular-nums">
                {formatINR(selectedSale.total_amount ?? selectedSale.totalAmount ?? 0)}
              </span>
            </div>
          </div>
        )}
      </PrintPreview>

      <ConfirmDialog
        open={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={() => {
          if (!selectedSale) return
          cancelMutation.mutate({
            id: selectedSale.id,
            reason: cancelReason.trim() || 'Cancelled by Super Admin',
          })
        }}
        title="Cancel this invoice?"
        description="Cancelling reverses the sale and restores stock balances. Enter a reason below."
        confirmLabel="Cancel Invoice"
        variant="danger"
        loading={cancelMutation.isPending}
      />
    </div>
  )
}
