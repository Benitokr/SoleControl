import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Boxes, SlidersHorizontal, ChevronDown, ChevronRight, Layers, List,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatDateIN, getApiErrorMessage } from '../lib/format'
import {
  PageHeader, StatCard, FilterBar, DataTable, Button, Drawer,
  FormField, SearchableCombobox, QuantityStepper, EmptyState, ErrorState,
  TableSkeleton, HubTabs, ColumnDef,
} from '../components/ui'
import { SizeRunGrid, DEFAULT_UK_SIZES, ColourSwatch, StockBadge } from '../components/footwear'

export function InventoryPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const hubTab = searchParams.get('tab') === 'overview' ? 'overview' : 'stock'
  const urlFilter = searchParams.get('filter')

  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>(() =>
    urlFilter === 'LOW' ? 'flat' : 'grouped'
  )
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState(() =>
    urlFilter && ['IN_STOCK', 'LOW', 'OUT'].includes(urlFilter) ? urlFilter : 'ALL'
  )
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (urlFilter && ['IN_STOCK', 'LOW', 'OUT'].includes(urlFilter)) {
      setStockFilter(urlFilter)
      setViewMode('flat')
    }
  }, [urlFilter])

  // Stock adjustment drawer
  const [showAdjDrawer, setShowAdjDrawer] = useState(false)
  const [adjSku, setAdjSku] = useState('')
  const [adjQty, setAdjQty] = useState(1)
  const [adjReason, setAdjReason] = useState('Physical audit cycle discrepancy')

  // Item detail drawer
  const [selectedItem, setSelectedItem] = useState<any | null>(null)

  const { data: stockData, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then((r) => r.data?.data ?? []),
  })

  const { data: variantsData } = useQuery({
    queryKey: ['masters', 'variants'],
    queryFn: () => api.get('/masters/variants').then((r) => r.data?.data ?? []),
  })

  const { data: adjustmentsData } = useQuery({
    queryKey: ['inventory-adjustments'],
    queryFn: () => api.get('/inventory/adjustments').then((r) => r.data?.data ?? []),
  })

  const stockRows: any[] = Array.isArray(stockData) ? stockData : []
  const catalogVariants: any[] = Array.isArray(variantsData) ? variantsData : []
  const adjustments: any[] = Array.isArray(adjustmentsData) ? adjustmentsData : []

  const allPickerVariants = useMemo(() => {
    const map = new Map<string, any>()
    catalogVariants.forEach((v) => {
      if (v.sku) map.set(v.sku, { ...v, quantity: Number(v.quantity ?? 0) })
    })
    stockRows.forEach((s) => {
      if (s.sku) map.set(s.sku, { ...map.get(s.sku), ...s })
    })
    return Array.from(map.values())
  }, [catalogVariants, stockRows])

  const filteredFlat = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allPickerVariants.filter((s) => {
      const qty = Number(s.quantity ?? 0)
      if (stockFilter === 'IN_STOCK' && qty <= 5) return false
      if (stockFilter === 'LOW' && (qty <= 0 || qty > 5)) return false
      if (stockFilter === 'OUT' && qty > 0) return false
      if (!q) return true
      return (
        String(s.sku || '').toLowerCase().includes(q) ||
        String(s.article_name || s.articleName || '').toLowerCase().includes(q) ||
        String(s.colour || s.colour_name || '').toLowerCase().includes(q)
      )
    })
  }, [allPickerVariants, search, stockFilter])

  const groupedArticles = useMemo(() => {
    const artMap = new Map<string, any>()
    filteredFlat.forEach((row) => {
      const artName = row.article_name || row.articleName || row.sku || 'Footwear'
      const colour = row.colour_name || row.colour || 'Standard'
      const size = row.size_label || row.size || 'UK 8'
      if (!artMap.has(artName)) {
        artMap.set(artName, {
          articleName: artName,
          totalQty: 0,
          costValue: 0,
          mrpValue: 0,
          colours: new Map<string, Record<string, number>>(),
          items: [],
        })
      }
      const art = artMap.get(artName)
      const qty = Number(row.quantity ?? 0)
      art.totalQty += qty
      art.costValue += qty * Number(row.cost_price ?? row.costPrice ?? 0)
      art.mrpValue += qty * Number(row.selling_price ?? row.mrp ?? 0)
      art.items.push(row)
      if (!art.colours.has(colour)) {
        art.colours.set(colour, {})
      }
      const sizeMap = art.colours.get(colour)!
      sizeMap[size] = (sizeMap[size] || 0) + qty
    })
    return Array.from(artMap.values()).map((a) => ({
      ...a,
      colourEntries: Array.from(a.colours.entries()) as [string, Record<string, number>][],
    }))
  }, [filteredFlat])

  const totalPairs = allPickerVariants.reduce((s, r) => s + Number(r.quantity ?? 0), 0)
  const totalCost = allPickerVariants.reduce(
    (s, r) => s + Number(r.quantity ?? 0) * Number(r.cost_price ?? r.costPrice ?? 0),
    0
  )
  const totalMrp = allPickerVariants.reduce(
    (s, r) => s + Number(r.quantity ?? 0) * Number(r.selling_price ?? r.mrp ?? 0),
    0
  )

  const adjustMutation = useMutation({
    mutationFn: (payload: { variantSku: string; quantityChange: number; reason: string }) =>
      api.post('/inventory/adjustments', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      qc.invalidateQueries({ queryKey: ['inventory-adjustments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Stock adjustment posted')
      setShowAdjDrawer(false)
      setAdjSku('')
      setAdjQty(1)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to post stock adjustment')),
  })

  const columns: ColumnDef<any>[] = [
    {
      id: 'sku',
      header: 'SKU',
      sortable: true,
      accessor: (r) => r.sku,
      cell: (r) => <span className="font-mono text-xs font-medium text-teal-700">{r.sku}</span>,
    },
    {
      id: 'article',
      header: 'Article',
      sortable: true,
      accessor: (r) => r.article_name || r.articleName || '',
      cell: (r) => (
        <span className="font-medium text-slate-900">
          {r.article_name || r.articleName || 'Footwear'}
        </span>
      ),
    },
    {
      id: 'size',
      header: 'Size',
      sortable: true,
      accessor: (r) => r.size_label || r.size || '',
      cell: (r) => <span className="text-slate-700">{r.size_label || r.size || 'UK 8'}</span>,
    },
    {
      id: 'colour',
      header: 'Colour',
      cell: (r) => <ColourSwatch name={r.colour_name || r.colour || 'Standard'} />,
    },
    {
      id: 'qty',
      header: 'On hand',
      align: 'right',
      sortable: true,
      accessor: (r) => Number(r.quantity ?? 0),
      cell: (r) => <StockBadge quantity={Number(r.quantity ?? 0)} />,
    },
    {
      id: 'mrp',
      header: 'Retail MRP',
      align: 'right',
      sortable: true,
      accessor: (r) => Number(r.selling_price ?? r.mrp ?? 0),
      cell: (r) => formatINR(r.selling_price ?? r.mrp ?? 0),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Warehouse Inventory & Stock"
        description="Live footwear balances grouped by article and size run, with location tracking and cycle adjustments."
        breadcrumbs={[{ label: 'Inventory' }, { label: hubTab === 'overview' ? 'Overview' : 'Stock' }]}
        secondaryActions={
          hubTab === 'stock' ? (
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={
                  viewMode === 'grouped'
                    ? 'px-2.5 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white inline-flex items-center gap-1'
                    : 'px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1'
                }
              >
                <Layers className="w-3.5 h-3.5" />
                Size Run
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className={
                  viewMode === 'flat'
                    ? 'px-2.5 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white inline-flex items-center gap-1'
                    : 'px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1'
                }
              >
                <List className="w-3.5 h-3.5" />
                Flat SKUs
              </button>
            </div>
          ) : undefined
        }
        primaryAction={
          <Button
            variant="primary"
            icon={<SlidersHorizontal className="w-4 h-4" />}
            onClick={() => setShowAdjDrawer(true)}
          >
            Adjust Stock
          </Button>
        }
      />

      <HubTabs
        tabs={[
          { key: 'overview', label: 'Overview', active: hubTab === 'overview', onClick: () => setSearchParams({ tab: 'overview' }) },
          { key: 'stock', label: 'Stock', active: hubTab === 'stock', onClick: () => setSearchParams({}) },
          { key: 'display', label: 'Display Stock', to: '/display' },
          { key: 'transfers', label: 'Transfers', to: '/transfers' },
          { key: 'damage', label: 'Damaged Goods', to: '/damage' },
          { key: 'ageing', label: 'Ageing & Clearance', to: '/ageing' },
          { key: 'barcodes', label: 'Barcodes', to: '/barcodes' },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active SKUs" value={allPickerVariants.length} subtext="Catalog variants" icon={<Boxes className="w-4 h-4" />} tone="teal" />
        <StatCard label="Total pairs on hand" value={totalPairs.toLocaleString('en-IN')} subtext="Across warehouse" tone="success" />
        <StatCard label="Weighted cost value" value={formatINR(totalCost)} subtext="At purchase cost" />
        <StatCard label="Retail MRP value" value={formatINR(totalMrp)} subtext="Gross shelf value" />
      </div>

      {hubTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Needs attention</h2>
            {allPickerVariants.filter((x) => Number(x.quantity ?? 0) <= 5).length === 0 ? (
              <p className="text-sm text-slate-500">All SKUs are healthy above 5 pairs.</p>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between text-sm">
                <span className="text-amber-900">
                  {allPickerVariants.filter((x) => Number(x.quantity ?? 0) <= 5).length} SKUs at ≤5 pairs
                </span>
                <Button size="sm" variant="outline" onClick={() => setSearchParams({ filter: 'LOW' })}>
                  View low stock
                </Button>
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Quick inventory actions</h2>
              <button type="button" onClick={() => setSearchParams({})} className="text-xs font-medium text-teal-700 hover:underline">
                View all stock
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate('/purchases/new')}>Inward Purchase</Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/transfers')}>Transfer Stock</Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/barcodes')}>Print Labels</Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by SKU, article name, or colour…"
            chips={[
              { key: 'ALL', label: 'All SKUs', count: allPickerVariants.length },
              {
                key: 'IN_STOCK',
                label: 'In stock',
                count: allPickerVariants.filter((x) => Number(x.quantity ?? 0) > 5).length,
              },
              {
                key: 'LOW',
                label: 'Low stock (1–5)',
                count: allPickerVariants.filter((x) => {
                  const q = Number(x.quantity ?? 0)
                  return q > 0 && q <= 5
                }).length,
              },
              {
                key: 'OUT',
                label: 'Out of stock',
                count: allPickerVariants.filter((x) => Number(x.quantity ?? 0) <= 0).length,
              },
            ]}
            activeChip={stockFilter}
            onChipChange={setStockFilter}
            onReset={() => {
              setSearch('')
              setStockFilter('ALL')
            }}
          />

          {viewMode === 'flat' ? (
            <DataTable
              data={filteredFlat}
              columns={columns}
              getRowId={(r, i) => r.sku || r.id || String(i)}
              isLoading={isLoading}
              error={error}
              onRetry={refetch}
              onRowClick={(r) => setSelectedItem(r)}
              exportFilename="solecontrol-stock"
            />
          ) : isLoading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : error ? (
            <ErrorState message={getApiErrorMessage(error)} onRetry={refetch} />
          ) : groupedArticles.length === 0 ? (
            <EmptyState
              icon={<Boxes className="w-6 h-6" />}
              title="No stock items match"
              description="Adjust your search filter or inward footwear stock via Purchase Bills."
            />
          ) : (
            <div className="space-y-3">
              {groupedArticles.map((art) => {
                const expanded = expandedKeys[art.articleName] !== false
                return (
                  <div
                    key={art.articleName}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedKeys((p) => ({ ...p, [art.articleName]: !expanded }))
                      }
                      className="w-full px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 hover:bg-slate-50 text-left border-b border-slate-100"
                    >
                      <div className="flex items-center gap-2.5">
                        {expanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-sm font-semibold text-slate-900">{art.articleName}</span>
                        <span className="text-xs text-slate-500">
                          ({art.colourEntries.length} {art.colourEntries.length === 1 ? 'colour' : 'colours'})
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <StockBadge quantity={art.totalQty} />
                        <span className="tabular-nums text-slate-600">
                          Cost: <strong className="text-slate-900">{formatINR(art.costValue)}</strong>
                        </span>
                      </div>
                    </button>

                    {expanded && (
                      <div className="p-4 space-y-3">
                        {art.colourEntries.map(([colour, sizeMap]) => (
                          <div key={colour} className="space-y-1.5">
                            <ColourSwatch name={colour} />
                            <SizeRunGrid
                              readOnly
                              sizes={Array.from(new Set([...DEFAULT_UK_SIZES, ...Object.keys(sizeMap)]))}
                              values={sizeMap}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Stock Adjustment Drawer */}
      <Drawer
        open={showAdjDrawer}
        onClose={() => setShowAdjDrawer(false)}
        title="Record Stock Adjustment"
        subtitle="Adjust warehouse balances with a mandatory audit reason."
        isDirty={Boolean(adjSku)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAdjDrawer(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={adjustMutation.isPending}
              onClick={() => {
                if (!adjSku) {
                  toast.error('Please select a footwear SKU')
                  return
                }
                if (!adjReason.trim()) {
                  toast.error('Reason is required')
                  return
                }
                adjustMutation.mutate({
                  variantSku: adjSku,
                  quantityChange: adjQty,
                  reason: adjReason.trim(),
                })
              }}
            >
              Post Adjustment
            </Button>
          </>
        }
      >
        <FormField label="Footwear SKU / Variant" required helperText="Includes catalog variants even at 0 stock.">
          <SearchableCombobox
            options={allPickerVariants.map((v) => ({
              value: v.sku,
              label: `${v.sku} — ${v.article_name || v.articleName || 'Footwear'}`,
              sublabel: `${v.size_label || v.size || 'UK 8'} · ${v.colour_name || v.colour || 'Standard'} · On-hand: ${v.quantity ?? 0}`,
            }))}
            value={adjSku}
            onChange={setAdjSku}
            placeholder="Select footwear SKU…"
            searchPlaceholder="Search by SKU or article…"
          />
        </FormField>

        <FormField label="Quantity adjustment (+ / -)" required helperText="Positive adds stock; negative writes off units.">
          <QuantityStepper value={adjQty} onChange={setAdjQty} min={-500} max={500} />
        </FormField>

        <FormField label="Reason" required>
          <SearchableCombobox
            options={[
              { value: 'Physical audit cycle discrepancy', label: 'Physical audit cycle discrepancy' },
              { value: 'Opening stock entry', label: 'Opening stock entry' },
              { value: 'Damaged in display shelf transfer', label: 'Damaged in display shelf transfer' },
              { value: 'Supplier consignment excess inward', label: 'Supplier consignment excess inward' },
              { value: 'Customer sample test write-off', label: 'Customer sample test write-off' },
            ]}
            value={adjReason}
            onChange={setAdjReason}
          />
        </FormField>

        {adjustments.length > 0 && (
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <h4 className="text-xs font-semibold text-slate-700">Recent adjustments</h4>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {adjustments.slice(0, 5).map((a: any, i: number) => (
                <div key={a.id || i} className="px-3 py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-slate-800">{a.variant_sku || a.variantSku}</span>
                    <p className="text-slate-500">{a.reason}</p>
                  </div>
                  <span className="font-semibold tabular-nums">
                    {Number(a.quantity_change ?? a.quantityChange ?? 0) > 0 ? '+' : ''}
                    {a.quantity_change ?? a.quantityChange ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      {/* Item Detail Drawer */}
      <Drawer
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.article_name || selectedItem?.articleName || 'SKU Details'}
        subtitle={selectedItem?.sku}
      >
        {selectedItem && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <p className="text-xs text-slate-500">SKU</p>
                <p className="font-mono font-medium text-slate-900 mt-0.5">{selectedItem.sku}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">On hand</p>
                <div className="mt-0.5">
                  <StockBadge quantity={Number(selectedItem.quantity ?? 0)} />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cost price</p>
                <p className="font-medium tabular-nums mt-0.5">
                  {formatINR(selectedItem.cost_price ?? selectedItem.costPrice ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Retail MRP</p>
                <p className="font-medium tabular-nums mt-0.5">
                  {formatINR(selectedItem.selling_price ?? selectedItem.mrp ?? 0)}
                </p>
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500">Location</p>
              <p className="font-medium text-slate-900 mt-0.5">
                {selectedItem.location_name || 'Main Warehouse'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Updated: {formatDateIN(selectedItem.updated_at || new Date())}
              </p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
