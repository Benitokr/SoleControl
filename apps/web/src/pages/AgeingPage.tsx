import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Hourglass, Plus, Tag } from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, getApiErrorMessage } from '../lib/format'
import {
  PageHeader, StatCard, DataTable, Button, Drawer, FormField,
  StatusBadge, ColumnDef, inputBaseClass,
} from '../components/ui'
import { AgeingBadge } from '../components/footwear'

export function AgeingPage() {
  const qc = useQueryClient()
  const [bucket, setBucket] = useState<'ALL' | '0-30' | '31-60' | '61-90' | '90+'>('ALL')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showRuleDrawer, setShowRuleDrawer] = useState(false)
  const [label, setLabel] = useState('Clearance 20% Off')
  const [thresholdDays, setThresholdDays] = useState(90)
  const [discountPct, setDiscountPct] = useState(20)

  const { data: heatmapData, isLoading, error, refetch } = useQuery({
    queryKey: ['ageing-heatmap'],
    queryFn: () => api.get('/ageing/heatmap').then((r) => r.data?.data ?? []),
  })

  const { data: rulesData } = useQuery({
    queryKey: ['ageing-rules'],
    queryFn: () => api.get('/ageing/rules').then((r) => r.data?.data ?? []),
  })

  const rows: any[] = Array.isArray(heatmapData) ? heatmapData : []
  const rules: any[] = Array.isArray(rulesData) ? rulesData : []

  const b0_30 = rows.filter((h) => Number(h.age_days || 0) <= 30)
  const b31_60 = rows.filter((h) => Number(h.age_days || 0) > 30 && Number(h.age_days || 0) <= 60)
  const b61_90 = rows.filter((h) => Number(h.age_days || 0) > 60 && Number(h.age_days || 0) <= 90)
  const b90_plus = rows.filter((h) => Number(h.age_days || 0) > 90)

  const filtered = useMemo(() => {
    if (bucket === '0-30') return b0_30
    if (bucket === '31-60') return b31_60
    if (bucket === '61-90') return b61_90
    if (bucket === '90+') return b90_plus
    return rows
  }, [bucket, rows, b0_30, b31_60, b61_90, b90_plus])

  const createRuleMutation = useMutation({
    mutationFn: () =>
      api.post('/ageing/rules', {
        label: label.trim(),
        thresholdDays: Number(thresholdDays),
        discountPct: Number(discountPct),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ageing-rules'] })
      toast.success('Clearance rule saved')
      setShowRuleDrawer(false)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save clearance rule')),
  })

  const createClearanceOfferMutation = useMutation({
    mutationFn: (skus: string[]) =>
      api.post('/offers', {
        name: `Clearance Markdown (${skus.length} SKUs)`,
        scopeType: 'FOOTWEAR_SKU',
        discountType: 'PERCENTAGE',
        discountValue: 20,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] })
      toast.success('Clearance offer created for selected SKUs')
      setSelectedIds([])
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to create clearance offer')),
  })

  const sumVal = (arr: any[]) =>
    arr.reduce((s, x) => s + Number(x.quantity || 0) * Number(x.cost_price || 2400), 0)

  const columns: ColumnDef<any>[] = [
    {
      id: 'sku',
      header: 'SKU',
      cell: (r) => <span className="font-mono text-xs text-teal-700">{r.sku}</span>,
    },
    {
      id: 'article',
      header: 'Article',
      cell: (r) => <span className="font-medium text-slate-900">{r.article_name || r.articleName || 'Footwear'}</span>,
    },
    {
      id: 'age',
      header: 'Days in stock',
      sortable: true,
      accessor: (r) => Number(r.age_days || 0),
      cell: (r) => <AgeingBadge days={Number(r.age_days || 0)} />,
    },
    {
      id: 'qty',
      header: 'Pairs',
      align: 'right',
      cell: (r) => Number(r.quantity || 0),
    },
    {
      id: 'value',
      header: 'Stock value',
      align: 'right',
      cell: (r) => formatINR(Number(r.quantity || 0) * Number(r.cost_price || 2400)),
    },
    {
      id: 'markdown',
      header: 'Suggested markdown',
      align: 'right',
      cell: (r) => {
        const d = Number(r.age_days || 0)
        const pct = d > 90 ? 25 : d > 60 ? 15 : d > 30 ? 10 : 0
        return <StatusBadge status={pct > 0 ? 'PENDING' : 'ACTIVE'} label={pct > 0 ? `${pct}% off` : 'Full price'} />
      },
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ageing & Clearance"
        description="Identify slow-moving footwear stock by age bucket and launch targeted clearance markdowns."
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Ageing & Clearance' }]}
        primaryAction={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowRuleDrawer(true)}>
            Add Clearance Rule
          </Button>
        }
      />

      {/* Clickable bucket cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="0–30 days (Fresh)"
          value={formatINR(sumVal(b0_30))}
          subtext={`${b0_30.length} SKUs`}
          tone="success"
          active={bucket === '0-30'}
          onClick={() => setBucket(bucket === '0-30' ? 'ALL' : '0-30')}
        />
        <StatCard
          label="31–60 days"
          value={formatINR(sumVal(b31_60))}
          subtext={`${b31_60.length} SKUs`}
          tone="teal"
          active={bucket === '31-60'}
          onClick={() => setBucket(bucket === '31-60' ? 'ALL' : '31-60')}
        />
        <StatCard
          label="61–90 days (Slow)"
          value={formatINR(sumVal(b61_90))}
          subtext={`${b61_90.length} SKUs`}
          tone="warning"
          active={bucket === '61-90'}
          onClick={() => setBucket(bucket === '61-90' ? 'ALL' : '61-90')}
        />
        <StatCard
          label="90+ days (Deadstock)"
          value={formatINR(sumVal(b90_plus))}
          subtext={`${b90_plus.length} SKUs`}
          tone="danger"
          active={bucket === '90+'}
          onClick={() => setBucket(bucket === '90+' ? 'ALL' : '90+')}
        />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r, i) => r.sku || r.id || String(i)}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={(sel) => (
          <Button
            size="sm"
            variant="primary"
            icon={<Tag className="w-3.5 h-3.5" />}
            loading={createClearanceOfferMutation.isPending}
            onClick={() => createClearanceOfferMutation.mutate(sel.map((x) => x.sku))}
          >
            Create Clearance Offer
          </Button>
        )}
        exportFilename="solecontrol-ageing"
        emptyIcon={<Hourglass className="w-6 h-6" />}
        emptyTitle="No ageing stock in this bucket"
        emptyDescription="Click another bucket card above or receive new stock."
      />

      {rules.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Active Clearance Rules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rules.map((r: any) => (
              <div key={r.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{r.label}</p>
                  <p className="text-xs text-slate-500">After {r.threshold_days || r.thresholdDays} days</p>
                </div>
                <StatusBadge status="ACTIVE" label={`${r.discount_pct || r.discountPct}% off`} tone="teal" />
              </div>
            ))}
          </div>
        </div>
      )}

      <Drawer
        open={showRuleDrawer}
        onClose={() => setShowRuleDrawer(false)}
        title="Add Clearance Rule"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowRuleDrawer(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={createRuleMutation.isPending}
              onClick={() => {
                if (!label.trim()) {
                  toast.error('Rule label is required')
                  return
                }
                createRuleMutation.mutate()
              }}
            >
              Save Rule
            </Button>
          </>
        }
      >
        <FormField label="Rule label" required>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className={inputBaseClass} />
        </FormField>
        <FormField label="Age threshold (days)">
          <input type="number" min={1} value={thresholdDays} onChange={(e) => setThresholdDays(Number(e.target.value) || 90)} className={inputBaseClass} />
        </FormField>
        <FormField label="Suggested markdown (%)">
          <input type="number" min={1} max={90} value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value) || 20)} className={inputBaseClass} />
        </FormField>
      </Drawer>
    </div>
  )
}
