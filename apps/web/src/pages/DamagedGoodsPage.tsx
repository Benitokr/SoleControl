import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PackageX, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { formatDateIN, getApiErrorMessage } from '../lib/format'
import {
  PageHeader, StatCard, FilterBar, DataTable, StatusBadge, Button,
  FullPageForm, FormField, SearchableCombobox, QuantityStepper, ColumnDef, inputBaseClass,
} from '../components/ui'

export function DamagedGoodsPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'list' | 'new'>('list')
  const [search, setSearch] = useState('')

  // Full-page batch entry state
  const [sku, setSku] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('Manufacturing sole defect')
  const [locationId, setLocationId] = useState('Rack R1')
  const [vendorClaim, setVendorClaim] = useState(false)

  const { data: damagesData, isLoading, error, refetch } = useQuery({
    queryKey: ['damages'],
    queryFn: () => api.get('/damages').then((r) => r.data?.data ?? []),
  })

  const { data: stockData } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then((r) => r.data?.data ?? []),
  })

  const damages: any[] = Array.isArray(damagesData) ? damagesData : []
  const stockList: any[] = Array.isArray(stockData) ? stockData : []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return damages
    return damages.filter(
      (d) =>
        String(d.description || '').toLowerCase().includes(q) ||
        String(d.variantId || d.sku || '').toLowerCase().includes(q)
    )
  }, [damages, search])

  const reportMutation = useMutation({
    mutationFn: () =>
      api.post('/damages', {
        variantId: sku,
        quantity,
        description: reason,
        locationId,
        vendorClaim,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['damages'] })
      qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      toast.success('Damaged stock batch logged')
      setMode('list')
      setSku('')
      setQuantity(1)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to log damaged goods')),
  })

  const writeOffMutation = useMutation({
    mutationFn: (id: string) => api.post(`/damages/${id}/write-off`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['damages'] })
      qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      toast.success('Damaged stock written off')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to write off stock')),
  })

  const repairMutation = useMutation({
    mutationFn: (id: string) => api.post(`/damages/${id}/repair`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['damages'] })
      qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      toast.success('Marked as repaired and restored')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to mark repaired')),
  })

  if (mode === 'new') {
    const chosen = stockList.find((s) => s.sku === sku)
    const currentQty = Number(chosen?.quantity ?? 0)

    return (
      <FullPageForm
        title="Log Damaged Goods Batch"
        subtitle="Record defective or transit-damaged pairs and preview stock impact before confirming."
        backLabel="Damaged Goods"
        onCancel={() => setMode('list')}
        isDirty={Boolean(sku)}
        primaryActionLabel="Confirm Damage Log"
        onPrimaryAction={() => {
          if (!sku) {
            toast.error('Please select a footwear SKU')
            return
          }
          reportMutation.mutate()
        }}
        primaryLoading={reportMutation.isPending}
        summaryPanel={
          <div className="space-y-4 text-sm">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Stock Impact Preview
            </h2>
            <div className="flex justify-between">
              <span className="text-slate-600">Current on-hand</span>
              <span className="font-medium tabular-nums">{currentQty} pairs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Damaged quantity</span>
              <span className="font-medium tabular-nums text-red-600">-{quantity} pairs</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 font-semibold">
              <span>Remaining sellable</span>
              <span className="tabular-nums">{Math.max(0, currentQty - quantity)} pairs</span>
            </div>
          </div>
        }
      >
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
          <FormField label="Footwear SKU" required>
            <SearchableCombobox
              options={stockList.map((s) => ({
                value: s.sku,
                label: `${s.sku} — ${s.article_name || s.articleName || 'Footwear'}`,
                sublabel: `${s.size_label || s.size || 'UK 8'} · On-hand: ${s.quantity ?? 0}`,
              }))}
              value={sku}
              onChange={setSku}
              placeholder="Select footwear SKU…"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Damaged quantity" required>
              <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={100} />
            </FormField>
            <FormField label="Origin rack / location">
              <SearchableCombobox
                options={[
                  { value: 'Rack R1', label: 'Rack R1 (Running)' },
                  { value: 'Rack S1', label: 'Rack S1 (Sneakers)' },
                  { value: 'Display Counter', label: 'Display Counter' },
                ]}
                value={locationId}
                onChange={setLocationId}
              />
            </FormField>
          </div>

          <FormField label="Defect reason" required>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputBaseClass}
            />
          </FormField>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={vendorClaim}
              onChange={(e) => setVendorClaim(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-600"
            />
            Raise vendor replacement / debit-note claim
          </label>
        </div>
      </FullPageForm>
    )
  }

  const columns: ColumnDef<any>[] = [
    {
      id: 'id',
      header: 'Incident ID',
      cell: (r) => <span className="font-mono text-xs text-red-600">{String(r.id).slice(0, 10)}</span>,
    },
    {
      id: 'loc',
      header: 'Location',
      cell: (r) => r.location_id || r.locationId || 'Rack R1',
    },
    {
      id: 'qty',
      header: 'Qty',
      align: 'right',
      cell: (r) => <span className="font-semibold tabular-nums">{r.quantity || 1}</span>,
    },
    {
      id: 'desc',
      header: 'Defect reason',
      cell: (r) => r.description || '—',
    },
    {
      id: 'date',
      header: 'Reported',
      cell: (r) => formatDateIN(r.created_at || r.createdAt),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (r) => <StatusBadge status={r.status || 'REPORTED'} />,
    },
    {
      id: 'actions',
      header: 'Action',
      align: 'right',
      cell: (r) =>
        r.status === 'REPORTED' ? (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="danger" loading={writeOffMutation.isPending} onClick={() => writeOffMutation.mutate(r.id)}>
              Write Off
            </Button>
            <Button size="sm" variant="outline" loading={repairMutation.isPending} onClick={() => repairMutation.mutate(r.id)}>
              Repaired
            </Button>
          </div>
        ) : null,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Damaged Goods"
        description="Log defective footwear batches, claim vendor replacements, or post stock write-offs."
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Damaged Goods' }]}
        primaryAction={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setMode('new')}>
            Log Damage Batch
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total incidents" value={damages.length} icon={<PackageX className="w-4 h-4" />} tone="danger" />
        <StatCard label="Pending review" value={damages.filter((d) => d.status === 'REPORTED').length} tone="warning" />
        <StatCard label="Written off" value={damages.filter((d) => d.status === 'WRITTEN_OFF').length} />
      </div>

      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search by SKU or defect reason…" onReset={() => setSearch('')} />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r, i) => r.id || String(i)}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        exportFilename="solecontrol-damaged-goods"
        emptyIcon={<PackageX className="w-6 h-6" />}
        emptyTitle="No damaged goods reported"
        emptyDescription="Use Log Damage Batch when pairs are defective or damaged in transit."
      />
    </div>
  )
}
