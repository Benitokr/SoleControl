import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Store, ArrowRightLeft, RotateCcw } from 'lucide-react'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/format'
import {
  PageHeader, StatCard, Button, Drawer, FormField, SearchableCombobox,
  QuantityStepper, EmptyState, ErrorState, Skeleton, StatusBadge,
} from '../components/ui'

export function DisplayStockPage() {
  const qc = useQueryClient()
  const [showMoveDrawer, setShowMoveDrawer] = useState(false)
  const [sku, setSku] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [displayLocation, setDisplayLocation] = useState('Front Showcase Window')

  const { data: displaysData, isLoading, error, refetch } = useQuery({
    queryKey: ['display-stock'],
    queryFn: () => api.get('/display-stock').then((r) => r.data?.data ?? []),
  })

  const { data: stockData } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then((r) => r.data?.data ?? []),
  })

  const displays: any[] = Array.isArray(displaysData) ? displaysData : []
  const stockVariants: any[] = Array.isArray(stockData) ? stockData : []

  const groupedByShelf = useMemo(() => {
    const map = new Map<string, any[]>()
    displays.forEach((d) => {
      const shelf = d.display_location || d.displayLocation || 'Front Showcase Window'
      if (!map.has(shelf)) map.set(shelf, [])
      map.get(shelf)!.push(d)
    })
    return Array.from(map.entries())
  }, [displays])

  const allocateMutation = useMutation({
    mutationFn: () =>
      api.post('/display-stock/allocate', {
        variantSku: sku,
        quantity,
        displayLocation,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['display-stock'] })
      qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      toast.success('Moved pairs to display shelf')
      setShowMoveDrawer(false)
      setSku('')
      setQuantity(1)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to allocate display stock')),
  })

  const returnMutation = useMutation({
    mutationFn: (id: string) => api.post(`/display-stock/${id}/return`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['display-stock'] })
      qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      toast.success('Returned pair to warehouse')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to return display stock')),
  })

  const totalOnDisplay = displays.reduce((s, d) => s + Number(d.quantity ?? 1), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Display Stock"
        description="Track single-shoe or pair samples placed on retail shelves and return them to warehouse."
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Display Stock' }]}
        primaryAction={
          <Button
            variant="primary"
            icon={<ArrowRightLeft className="w-4 h-4" />}
            onClick={() => setShowMoveDrawer(true)}
          >
            Move to Display
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Units on display" value={totalOnDisplay} icon={<Store className="w-4 h-4" />} tone="teal" />
        <StatCard label="Active display shelves" value={groupedByShelf.length} />
        <StatCard label="Active allocations" value={displays.length} />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : error ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={refetch} />
      ) : groupedByShelf.length === 0 ? (
        <EmptyState
          icon={<Store className="w-6 h-6" />}
          title="No pairs on display"
          description="Move footwear units from warehouse racks onto front-of-store display shelves."
          action={
            <Button variant="primary" onClick={() => setShowMoveDrawer(true)}>
              Move to Display
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groupedByShelf.map(([shelf, items]) => (
            <div key={shelf} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">{shelf}</span>
                <StatusBadge status="ACTIVE" label={`${items.length} items`} tone="teal" />
              </div>
              <div className="divide-y divide-slate-100">
                {items.map((item: any) => (
                  <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {item.article_name || item.articleName || item.sku}
                      </p>
                      <p className="text-xs font-mono text-slate-500">
                        {item.sku || item.variant_id} · Qty: {item.quantity ?? 1}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                      loading={returnMutation.isPending}
                      onClick={() => returnMutation.mutate(item.id)}
                    >
                      Return to Warehouse
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={showMoveDrawer}
        onClose={() => setShowMoveDrawer(false)}
        title="Move Stock to Display"
        subtitle="Two-pane transfer: Warehouse → Retail Display Shelf"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowMoveDrawer(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={allocateMutation.isPending}
              onClick={() => {
                if (!sku) {
                  toast.error('Select a footwear SKU')
                  return
                }
                allocateMutation.mutate()
              }}
            >
              Allocate to Display
            </Button>
          </>
        }
      >
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <span>From: <strong className="text-slate-900">Main Warehouse</strong></span>
          <span>→</span>
          <span>To: <strong className="text-teal-700">{displayLocation}</strong></span>
        </div>

        <FormField label="Footwear SKU" required>
          <SearchableCombobox
            options={stockVariants.map((v) => ({
              value: v.sku,
              label: `${v.sku} — ${v.article_name || v.articleName || 'Footwear'}`,
              sublabel: `${v.size_label || v.size || 'UK 8'} · Avail: ${v.quantity ?? 0}`,
            }))}
            value={sku}
            onChange={setSku}
            placeholder="Select footwear SKU…"
          />
        </FormField>

        <FormField label="Display shelf">
          <SearchableCombobox
            options={[
              { value: 'Front Showcase Window', label: 'Front Showcase Window' },
              { value: 'Running Wall Aisle', label: 'Running Wall Aisle' },
              { value: 'Sneaker Island', label: 'Sneaker Island' },
              { value: 'Clearance Stand', label: 'Clearance Stand' },
            ]}
            value={displayLocation}
            onChange={setDisplayLocation}
          />
        </FormField>

        <FormField label="Quantity">
          <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={10} />
        </FormField>
      </Drawer>
    </div>
  )
}
