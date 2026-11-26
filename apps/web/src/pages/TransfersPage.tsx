import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeftRight, Plus, Truck, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'
import { formatDateIN, getApiErrorMessage } from '../lib/format'
import {
  PageHeader, StatCard, FilterBar, DataTable, StatusBadge, Button,
  FullPageForm, FormField, SearchableCombobox, StatusTracker, ColumnDef, inputBaseClass,
} from '../components/ui'
import { SizeRunGrid, DEFAULT_UK_SIZES } from '../components/footwear'

export function TransfersPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'list' | 'new'>('list')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Full-page transfer form state
  const [fromLoc, setFromLoc] = useState('Main Warehouse')
  const [toLoc, setToLoc] = useState('Sales Floor Rack R1')
  const [articleSku, setArticleSku] = useState('')
  const [sizes, setSizes] = useState<Record<string, number>>({
    'UK 6': 0, 'UK 7': 1, 'UK 8': 2, 'UK 9': 1, 'UK 10': 0, 'UK 11': 0,
  })
  const [notes, setNotes] = useState('')

  const { data: transfersData, isLoading, error, refetch } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => api.get('/transfers').then((r) => r.data?.data ?? []),
  })

  const { data: stockData } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then((r) => r.data?.data ?? []),
  })

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data?.data ?? []),
  })

  const transfers: any[] = Array.isArray(transfersData) ? transfersData : []
  const stockList: any[] = Array.isArray(stockData) ? stockData : []
  const locations: any[] = Array.isArray(locationsData) ? locationsData : []

  const locationOptions =
    locations.length > 0
      ? locations.map((l) => ({ value: l.name, label: l.name, sublabel: l.type }))
      : [
          { value: 'Main Warehouse', label: 'Main Warehouse' },
          { value: 'Sales Floor Rack R1', label: 'Sales Floor Rack R1' },
          { value: 'Display Counter', label: 'Display Counter' },
        ]

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return transfers.filter((t) => {
      const st = String(t.status || 'REQUESTED').toUpperCase()
      if (statusFilter !== 'ALL' && st !== statusFilter) return false
      if (!q) return true
      return (
        String(t.id || '').toLowerCase().includes(q) ||
        String(t.notes || '').toLowerCase().includes(q)
      )
    })
  }, [transfers, search, statusFilter])

  const totalPairs = DEFAULT_UK_SIZES.reduce((s, sz) => s + (Number(sizes[sz]) || 0), 0)

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/transfers', {
        fromLocation: fromLoc,
        toLocation: toLoc,
        variantId: articleSku,
        quantity: totalPairs,
        sizes,
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] })
      toast.success('Stock transfer requested')
      setMode('list')
      setNotes('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to create transfer')),
  })

  const dispatchMutation = useMutation({
    mutationFn: (id: string) => api.post(`/transfers/${id}/dispatch`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] })
      toast.success('Transfer dispatched')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to dispatch transfer')),
  })

  const receiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/transfers/${id}/receive`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] })
      qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      toast.success('Transfer received and stock updated')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to receive transfer')),
  })

  if (mode === 'new') {
    const selectedVar = stockList.find((s) => s.sku === articleSku)
    const sourceAvail = Number(selectedVar?.quantity ?? 0)
    const stockLimits: Record<string, number> = {}
    DEFAULT_UK_SIZES.forEach((sz) => {
      stockLimits[sz] = selectedVar ? sourceAvail : 99
    })

    return (
      <FullPageForm
        title="New Stock Transfer"
        subtitle="Move footwear pairs between warehouse racks, display counters, or store branches."
        backLabel="Transfers"
        onCancel={() => setMode('list')}
        isDirty={Boolean(articleSku || notes)}
        primaryActionLabel="Submit Transfer"
        onPrimaryAction={() => {
          if (!articleSku) {
            toast.error('Please select a footwear SKU')
            return
          }
          if (fromLoc === toLoc) {
            toast.error('Origin and destination must be different')
            return
          }
          if (totalPairs <= 0) {
            toast.error('Enter at least 1 pair to transfer')
            return
          }
          createMutation.mutate()
        }}
        primaryLoading={createMutation.isPending}
        headerFields={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="From location" required>
              <SearchableCombobox options={locationOptions} value={fromLoc} onChange={setFromLoc} />
            </FormField>
            <FormField label="To location" required>
              <SearchableCombobox options={locationOptions} value={toLoc} onChange={setToLoc} />
            </FormField>
          </div>
        }
        summaryPanel={
          <div className="space-y-4 text-sm">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Transfer Summary
            </h2>
            <div className="flex justify-between">
              <span className="text-slate-600">Route</span>
              <span className="font-medium text-slate-900 text-right">{fromLoc} → {toLoc}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total pairs</span>
              <span className="font-semibold tabular-nums text-teal-700">{totalPairs} pairs</span>
            </div>
            <StatusTracker
              steps={['Requested', 'Approved', 'Dispatched', 'Received']}
              currentStep="Requested"
            />
          </div>
        }
      >
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
          <FormField label="Footwear SKU / Article" required>
            <SearchableCombobox
              options={stockList.map((s) => ({
                value: s.sku,
                label: `${s.sku} — ${s.article_name || s.articleName || 'Footwear'}`,
                sublabel: `Available at source: ${s.quantity ?? 0} pairs`,
              }))}
              value={articleSku}
              onChange={setArticleSku}
              placeholder="Select footwear SKU…"
            />
          </FormField>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Quantity per size</label>
            <SizeRunGrid
              values={sizes}
              stockLimits={stockLimits}
              onChange={(sz, qty) => setSizes((p) => ({ ...p, [sz]: qty }))}
            />
          </div>

          <FormField label="Transfer notes">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Weekend floor replenishment"
              className={inputBaseClass}
            />
          </FormField>
        </div>
      </FullPageForm>
    )
  }

  const columns: ColumnDef<any>[] = [
    {
      id: 'id',
      header: 'Transfer ID',
      cell: (r) => <span className="font-mono text-xs text-teal-700">{String(r.id).slice(0, 10)}</span>,
    },
    {
      id: 'route',
      header: 'From → To',
      cell: (r) => `${r.fromLocation || 'Main Warehouse'} → ${r.toLocation || 'Sales Floor Rack R1'}`,
    },
    {
      id: 'qty',
      header: 'Pairs',
      align: 'right',
      cell: (r) => <span className="font-medium tabular-nums">{r.quantity ?? 1}</span>,
    },
    {
      id: 'date',
      header: 'Date',
      cell: (r) => formatDateIN(r.created_at || r.createdAt),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (r) => <StatusBadge status={r.status || 'REQUESTED'} />,
    },
    {
      id: 'actions',
      header: 'Action',
      align: 'right',
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          {r.status === 'REQUESTED' && (
            <Button
              size="sm"
              variant="outline"
              icon={<Truck className="w-3.5 h-3.5" />}
              loading={dispatchMutation.isPending}
              onClick={() => dispatchMutation.mutate(r.id)}
            >
              Dispatch
            </Button>
          )}
          {r.status === 'DISPATCHED' && (
            <Button
              size="sm"
              variant="primary"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              loading={receiveMutation.isPending}
              onClick={() => receiveMutation.mutate(r.id)}
            >
              Receive
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Transfers"
        description="Coordinate stock movements between warehouse racks, display zones, and stores."
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Stock Transfers' }]}
        primaryAction={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setMode('new')}>
            New Stock Transfer
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total transfers" value={transfers.length} icon={<ArrowLeftRight className="w-4 h-4" />} tone="teal" />
        <StatCard label="In transit" value={transfers.filter((t) => t.status === 'DISPATCHED').length} tone="warning" />
        <StatCard label="Received" value={transfers.filter((t) => t.status === 'RECEIVED').length} tone="success" />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by transfer ID or notes…"
        chips={[
          { key: 'ALL', label: 'All', count: transfers.length },
          { key: 'REQUESTED', label: 'Requested', count: transfers.filter((t) => t.status === 'REQUESTED').length },
          { key: 'DISPATCHED', label: 'In transit', count: transfers.filter((t) => t.status === 'DISPATCHED').length },
          { key: 'RECEIVED', label: 'Received', count: transfers.filter((t) => t.status === 'RECEIVED').length },
        ]}
        activeChip={statusFilter}
        onChipChange={setStatusFilter}
        onReset={() => { setSearch(''); setStatusFilter('ALL') }}
      />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r, i) => r.id || String(i)}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        exportFilename="solecontrol-transfers"
        emptyIcon={<ArrowLeftRight className="w-6 h-6" />}
        emptyTitle="No stock transfers found"
        emptyDescription="Create a transfer to move footwear size runs between locations."
      />
    </div>
  )
}
