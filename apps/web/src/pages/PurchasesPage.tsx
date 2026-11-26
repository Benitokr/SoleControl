import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ReceiptText, Plus, CheckCircle2, ClipboardList, Truck } from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatDateIN, getApiErrorMessage } from '../lib/format'
import {
  PageHeader, StatCard, FilterBar, DataTable, StatusBadge, Button,
  Drawer, StatusTracker, ConfirmDialog, ColumnDef,
} from '../components/ui'

export function PurchasesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()

  const activeTab = searchParams.get('tab') === 'orders' ? 'orders' : 'bills'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedBill, setSelectedBill] = useState<any | null>(null)
  const [confirmFinalise, setConfirmFinalise] = useState<any | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/purchases').then((r) => r.data?.data ?? []),
  })

  const bills: any[] = Array.isArray(data) ? data : []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bills.filter((b) => {
      const status = String(b.status || 'DRAFT').toUpperCase()
      if (activeTab === 'orders' && !['ORDERED', 'PARTIALLY_RECEIVED', 'DRAFT'].includes(status)) {
        return false
      }
      if (statusFilter !== 'ALL' && status !== statusFilter) return false
      if (!q) return true
      const doc = String(b.document_number || b.docNumber || b.vendorBillNo || b.id || '').toLowerCase()
      const vendor = String(b.vendor?.name || b.vendor_name || b.vendorName || '').toLowerCase()
      return doc.includes(q) || vendor.includes(q)
    })
  }, [bills, activeTab, statusFilter, search])

  const finaliseMutation = useMutation({
    mutationFn: (id: string) => api.post(`/purchases/${id}/finalise`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Stock received and purchase bill finalised')
      setConfirmFinalise(null)
      setSelectedBill(null)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to finalise purchase bill')),
  })

  const totalValue = bills.reduce((s, b) => s + Number(b.total_amount ?? b.totalAmount ?? 0), 0)
  const draftCount = bills.filter((b) => String(b.status || '').toUpperCase() === 'DRAFT').length
  const finalisedCount = bills.filter((b) =>
    ['FINALISED', 'FINALIZED', 'RECEIVED'].includes(String(b.status || '').toUpperCase())
  ).length

  const columns: ColumnDef<any>[] = [
    {
      id: 'doc',
      header: 'Bill / PO no.',
      sortable: true,
      accessor: (r) => r.document_number || r.docNumber || r.vendorBillNo || r.id,
      cell: (r) => (
        <span className="font-mono text-xs font-medium text-teal-700">
          {r.document_number || r.docNumber || r.vendorBillNo || String(r.id).slice(0, 10)}
        </span>
      ),
    },
    {
      id: 'vendor',
      header: 'Vendor',
      sortable: true,
      accessor: (r) => r.vendor?.name || r.vendor_name || r.vendorName || 'Vendor',
      cell: (r) => (
        <span className="font-medium text-slate-900">
          {r.vendor?.name || r.vendor_name || r.vendorName || 'Vendor'}
        </span>
      ),
    },
    {
      id: 'date',
      header: 'Bill date',
      sortable: true,
      accessor: (r) => r.billDate || r.bill_date || r.created_at || r.createdAt || '',
      cell: (r) => (
        <span className="tabular-nums text-slate-600">
          {formatDateIN(r.billDate || r.bill_date || r.created_at || r.createdAt)}
        </span>
      ),
    },
    {
      id: 'class',
      header: 'Tax class',
      accessor: (r) => r.purchaseClass || r.purchase_class || 'A',
      cell: (r) => (
        <span className="text-xs text-slate-600">
          {(r.purchaseClass || r.purchase_class || 'A') === 'A' ? 'Class A (GST)' : 'Class B (Non-GST)'}
        </span>
      ),
    },
    {
      id: 'total',
      header: 'Grand total',
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
      accessor: (r) => r.status || 'DRAFT',
      cell: (r) => <StatusBadge status={r.status || 'DRAFT'} />,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={activeTab === 'orders' ? 'Purchase Orders' : 'Purchase Bills & Goods Inward'}
        description="Manage supplier purchase orders, inward footwear size runs, and GST billing."
        breadcrumbs={[{ label: 'Purchasing' }, { label: activeTab === 'orders' ? 'Purchase Orders' : 'Purchase Bills' }]}
        primaryAction={
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/purchases/new')}
          >
            New Purchase Bill
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setSearchParams({})}
          className={
            activeTab === 'bills'
              ? 'px-3.5 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white inline-flex items-center gap-1.5'
              : 'px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5'
          }
        >
          <ReceiptText className="w-3.5 h-3.5" />
          Purchase Bills / GRN
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'orders' })}
          className={
            activeTab === 'orders'
              ? 'px-3.5 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white inline-flex items-center gap-1.5'
              : 'px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5'
          }
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Purchase Orders
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total bills" value={bills.length} icon={<ReceiptText className="w-4 h-4" />} tone="teal" />
        <StatCard label="Total inward value" value={formatINR(totalValue)} tone="success" />
        <StatCard label="Draft / Pending GRN" value={draftCount} tone={draftCount > 0 ? 'warning' : 'default'} />
        <StatCard label="Finalised / Received" value={finalisedCount} icon={<Truck className="w-4 h-4" />} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by bill number or vendor name…"
        chips={[
          { key: 'ALL', label: 'All', count: bills.length },
          { key: 'DRAFT', label: 'Draft', count: draftCount },
          { key: 'FINALISED', label: 'Finalised', count: finalisedCount },
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
        onRowClick={(row) => setSelectedBill(row)}
        exportFilename="solecontrol-purchases"
        emptyIcon={<ReceiptText className="w-6 h-6" />}
        emptyTitle="No purchase bills recorded"
        emptyDescription="Create a purchase bill using the full-page SizeRunGrid inward form."
        emptyAction={
          <Button variant="primary" onClick={() => navigate('/purchases/new')}>
            New Purchase Bill
          </Button>
        }
      />

      <Drawer
        open={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        title={`Purchase Bill ${selectedBill?.document_number || selectedBill?.docNumber || selectedBill?.vendorBillNo || ''}`}
        subtitle={selectedBill ? `Vendor: ${selectedBill.vendor?.name || selectedBill.vendor_name || selectedBill.vendorName || 'Vendor'}` : undefined}
        width="lg"
        footer={
          selectedBill && (
            <>
              <Button variant="outline" onClick={() => setSelectedBill(null)}>
                Close
              </Button>
              {String(selectedBill.status || '').toUpperCase() === 'DRAFT' && (
                <Button
                  variant="primary"
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={() => setConfirmFinalise(selectedBill)}
                >
                  Receive Stock & Finalise
                </Button>
              )}
            </>
          )
        }
      >
        {selectedBill && (
          <div className="space-y-4 text-sm">
            <StatusTracker
              steps={['Draft', 'Ordered', 'Partially received', 'Received', 'Billed']}
              currentStep={
                String(selectedBill.status || '').toUpperCase() === 'FINALISED'
                  ? 'Billed'
                  : 'Draft'
              }
            />

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Bill date</p>
                <p className="font-medium text-slate-900 mt-0.5">
                  {formatDateIN(selectedBill.billDate || selectedBill.created_at || selectedBill.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Grand total</p>
                <p className="text-base font-semibold tabular-nums text-teal-700 mt-0.5">
                  {formatINR(selectedBill.total_amount ?? selectedBill.totalAmount ?? 0)}
                </p>
              </div>
            </div>

            {Array.isArray(selectedBill.items) && selectedBill.items.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
                  Inwarded line items ({selectedBill.items.length})
                </div>
                <div className="divide-y divide-slate-100">
                  {selectedBill.items.map((it: any, idx: number) => (
                    <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-slate-800">{it.sku || it.variantId}</p>
                        <p className="text-xs text-slate-500">
                          {it.articleName || it.article_name || 'Footwear'} · Qty: {it.quantity}
                        </p>
                      </div>
                      <span className="font-medium tabular-nums">
                        {formatINR((it.unitCost || it.costPrice || 0) * (it.quantity || 1))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {String(selectedBill.status || '').toUpperCase() === 'FINALISED' && (
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                This bill is finalised and read-only. To adjust quantities or return defective pairs, record a return or stock adjustment.
              </p>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!confirmFinalise}
        onClose={() => setConfirmFinalise(null)}
        onConfirm={() => confirmFinalise && finaliseMutation.mutate(confirmFinalise.id)}
        title="Receive stock & finalise bill?"
        description="Finalising posts stock balances, generates barcodes, and updates vendor payables. After finalising, the bill becomes read-only."
        confirmLabel="Receive Stock"
        variant="primary"
        loading={finaliseMutation.isPending}
      />
    </div>
  )
}
