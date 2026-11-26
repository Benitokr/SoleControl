import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ScanBarcode, Printer, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, getApiErrorMessage } from '../lib/format'
import {
  PageHeader, Button, FormField, SearchableCombobox, QuantityStepper,
  PrintPreview, DataTable, ColumnDef,
} from '../components/ui'

export function BarcodesPage() {
  const qc = useQueryClient()
  const [selectedSku, setSelectedSku] = useState('')
  const [copies, setCopies] = useState(4)
  const [templateSize, setTemplateSize] = useState('50x25')
  const [showPrint, setShowPrint] = useState(false)

  const { data: stockData } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then((r) => r.data?.data ?? []),
  })

  const { data: queueData, isLoading, error, refetch } = useQuery({
    queryKey: ['barcode-queue'],
    queryFn: () => api.get('/barcodes/queue').then((r) => r.data?.data ?? []),
  })

  const stockList: any[] = Array.isArray(stockData) ? stockData : []
  const queue: any[] = Array.isArray(queueData) ? queueData : []

  const activeVariant =
    stockList.find((s) => s.sku === selectedSku) || stockList[0] || {
      sku: 'NI-AIR-8-BLK',
      article_name: 'Footwear Sample',
      size: 'UK 8',
      selling_price: 4999,
      barcode: '890100100001',
    }

  const addQueueMutation = useMutation({
    mutationFn: () =>
      api.post('/barcodes/queue', {
        variantSku: activeVariant.sku,
        copies,
        templateSize,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barcode-queue'] })
      toast.success(`Added ${copies} labels to print queue`)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to queue labels')),
  })

  const columns: ColumnDef<any>[] = [
    {
      id: 'sku',
      header: 'SKU',
      cell: (r) => <span className="font-mono text-xs text-teal-700">{r.variant_sku || r.sku}</span>,
    },
    {
      id: 'article',
      header: 'Article',
      cell: (r) => r.article_name || r.articleName || 'Footwear',
    },
    {
      id: 'copies',
      header: 'Copies',
      align: 'right',
      cell: (r) => <span className="font-semibold tabular-nums">{r.copies ?? 1}</span>,
    },
    {
      id: 'template',
      header: 'Label size',
      cell: (r) => `${r.template_size || templateSize} mm`,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Barcodes & Thermal Labels"
        description="Configure thermal box/sole stickers, preview barcode layout, and print batches."
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Barcodes & Labels' }]}
        primaryAction={
          <Button
            variant="primary"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => setShowPrint(true)}
          >
            Print Preview
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Label Configuration</h2>

          <FormField label="Footwear SKU" required>
            <SearchableCombobox
              options={stockList.map((s) => ({
                value: s.sku,
                label: `${s.sku} — ${s.article_name || s.articleName || 'Footwear'}`,
                sublabel: `${s.size_label || s.size || 'UK 8'} · MRP ${formatINR(s.selling_price ?? s.mrp ?? 0)}`,
              }))}
              value={selectedSku || activeVariant.sku}
              onChange={setSelectedSku}
              placeholder="Select footwear SKU…"
            />
          </FormField>

          <FormField label="Label template size">
            <SearchableCombobox
              options={[
                { value: '50x25', label: '50 × 25 mm (Shoe Box Sticker)' },
                { value: '38x25', label: '38 × 25 mm (Compact Sole Label)' },
                { value: 'A4-24', label: 'A4 Sheet (24 Labels)' },
              ]}
              value={templateSize}
              onChange={setTemplateSize}
            />
          </FormField>

          <FormField label="Copies">
            <QuantityStepper value={copies} onChange={setCopies} min={1} max={200} />
          </FormField>

          <Button
            variant="primary"
            className="w-full"
            icon={<Plus className="w-4 h-4" />}
            loading={addQueueMutation.isPending}
            onClick={() => addQueueMutation.mutate()}
          >
            Add to Print Queue
          </Button>
        </div>

        {/* Live WYSIWYG Preview */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Live Label Preview ({templateSize} mm)</h2>
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-6 flex justify-center">
              <div className="w-64 bg-white border border-slate-300 rounded p-3 shadow-xs space-y-1.5 text-slate-900">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-bold leading-tight">
                    {activeVariant.article_name || activeVariant.articleName}
                  </span>
                  <span className="text-xs font-semibold px-1.5 py-0.5 bg-slate-100 rounded">
                    {activeVariant.size_label || activeVariant.size || 'UK 8'}
                  </span>
                </div>
                <div className="py-2 flex flex-col items-center border-y border-slate-100">
                  <ScanBarcode className="w-16 h-8 text-slate-800" />
                  <span className="font-mono text-[11px] tracking-widest mt-0.5">
                    {activeVariant.barcode || activeVariant.sku}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="font-mono text-[10px] text-slate-500">{activeVariant.sku}</span>
                  <span className="font-bold tabular-nums">
                    MRP {formatINR(activeVariant.selling_price ?? activeVariant.mrp ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DataTable
            data={queue}
            columns={columns}
            getRowId={(r, i) => r.id || String(i)}
            isLoading={isLoading}
            error={error}
            onRetry={refetch}
            emptyIcon={<ScanBarcode className="w-6 h-6" />}
            emptyTitle="Print queue is empty"
            emptyDescription="Select a footwear SKU on the left to queue barcode stickers."
          />
        </div>
      </div>

      <PrintPreview open={showPrint} onClose={() => setShowPrint(false)} title="Barcode Label Batch">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: Math.min(copies, 12) }).map((_, i) => (
            <div key={i} className="border border-slate-300 p-2.5 rounded text-xs space-y-1">
              <div className="font-bold truncate">
                {activeVariant.article_name || activeVariant.articleName}
              </div>
              <div className="font-mono text-[11px]">{activeVariant.sku}</div>
              <div className="flex justify-between font-semibold">
                <span>{activeVariant.size_label || activeVariant.size || 'UK 8'}</span>
                <span>{formatINR(activeVariant.selling_price ?? activeVariant.mrp ?? 0)}</span>
              </div>
            </div>
          ))}
        </div>
      </PrintPreview>
    </div>
  )
}
