import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BadgePercent, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatDateIN, toISODate, getApiErrorMessage } from '../lib/format'
import {
  PageHeader, StatCard, FilterBar, DataTable, StatusBadge, Button,
  FullPageForm, FormField, SearchableCombobox, DatePicker, MoneyInput,
  ColumnDef, inputBaseClass,
} from '../components/ui'

export function OffersPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'list' | 'new'>('list')
  const [search, setSearch] = useState('')

  // Rule builder state
  const [name, setName] = useState('')
  const [scopeType, setScopeType] = useState('ALL')
  const [targetSku, setTargetSku] = useState('')
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE')
  const [discountValue, setDiscountValue] = useState(15)
  const [validFrom, setValidFrom] = useState(toISODate(new Date()))
  const [validTo, setValidTo] = useState('')

  const { data: offersData, isLoading, error, refetch } = useQuery({
    queryKey: ['offers'],
    queryFn: () => api.get('/offers').then((r) => r.data?.data ?? []),
  })

  const { data: stockData } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then((r) => r.data?.data ?? []),
  })

  const offers: any[] = Array.isArray(offersData) ? offersData : []
  const stockList: any[] = Array.isArray(stockData) ? stockData : []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return offers
    return offers.filter((o) => String(o.name || '').toLowerCase().includes(q))
  }, [offers, search])

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/offers', {
        name: name.trim(),
        scopeType,
        targetSku: scopeType === 'FOOTWEAR_SKU' ? targetSku : undefined,
        discountType,
        discountValue: Number(discountValue),
        validFrom,
        validTo: validTo || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] })
      toast.success('Promotional offer created')
      setMode('list')
      setName('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to create offer')),
  })

  const toggleMutation = useMutation({
    mutationFn: (o: any) =>
      o.isActive
        ? api.post(`/offers/${o.id}/deactivate`, {})
        : api.put(`/offers/${o.id}`, { isActive: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] })
      toast.success('Offer status updated')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to update offer')),
  })

  if (mode === 'new') {
    const ruleSentence = `Applies ${
      discountType === 'PERCENTAGE' ? `${discountValue}% off` : `${formatINR(discountValue)} flat off`
    } on ${
      scopeType === 'ALL'
        ? 'all store footwear'
        : scopeType === 'FOOTWEAR_SKU'
        ? targetSku || 'selected SKU'
        : scopeType.toLowerCase()
    } starting ${formatDateIN(validFrom)}.`

    return (
      <FullPageForm
        title="New Offer / Discount Rule"
        subtitle="Define promotional rules, validity dates, and affected footwear items."
        backLabel="Offers"
        onCancel={() => setMode('list')}
        isDirty={Boolean(name)}
        primaryActionLabel="Activate Offer"
        onPrimaryAction={() => {
          if (!name.trim()) {
            toast.error('Offer title is required')
            return
          }
          createMutation.mutate()
        }}
        primaryLoading={createMutation.isPending}
        summaryPanel={
          <div className="space-y-4 text-sm">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Rule Preview
            </h2>
            <p className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs leading-relaxed">
              {ruleSentence}
            </p>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Catalog SKUs in stock</span>
              <span className="font-semibold tabular-nums">{stockList.length}</span>
            </div>
          </div>
        }
      >
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
          <FormField label="Offer title" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekend Sneaker Festival 15% Off"
              className={inputBaseClass}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Applies to">
              <SearchableCombobox
                options={[
                  { value: 'ALL', label: 'Entire Store Inventory' },
                  { value: 'BRAND', label: 'Specific Brand' },
                  { value: 'CATEGORY', label: 'Specific Category' },
                  { value: 'FOOTWEAR_SKU', label: 'Specific Footwear SKU' },
                ]}
                value={scopeType}
                onChange={setScopeType}
              />
            </FormField>

            {scopeType === 'FOOTWEAR_SKU' && (
              <FormField label="Target SKU" required>
                <SearchableCombobox
                  options={stockList.map((s) => ({
                    value: s.sku,
                    label: `${s.sku} — ${s.article_name || s.articleName || 'Footwear'}`,
                  }))}
                  value={targetSku}
                  onChange={setTargetSku}
                  placeholder="Select SKU…"
                />
              </FormField>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Discount type">
              <SearchableCombobox
                options={[
                  { value: 'PERCENTAGE', label: 'Percentage (%)' },
                  { value: 'FLAT', label: 'Flat amount (₹)' },
                ]}
                value={discountType}
                onChange={(v) => setDiscountType(v as 'PERCENTAGE' | 'FLAT')}
              />
            </FormField>
            <FormField label={discountType === 'PERCENTAGE' ? 'Discount (%)' : 'Discount amount (₹)'}>
              {discountType === 'PERCENTAGE' ? (
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                  className={inputBaseClass}
                />
              ) : (
                <MoneyInput value={discountValue} onChange={setDiscountValue} />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Valid from">
              <DatePicker value={validFrom} onChange={setValidFrom} />
            </FormField>
            <FormField label="Valid until (optional)">
              <DatePicker value={validTo} onChange={setValidTo} />
            </FormField>
          </div>
        </div>
      </FullPageForm>
    )
  }

  const columns: ColumnDef<any>[] = [
    {
      id: 'name',
      header: 'Offer name',
      sortable: true,
      accessor: (r) => r.name || '',
      cell: (r) => <span className="font-medium text-slate-900">{r.name}</span>,
    },
    {
      id: 'scope',
      header: 'Scope',
      cell: (r) => r.scopeType || r.scope_type || 'ALL',
    },
    {
      id: 'discount',
      header: 'Discount',
      align: 'right',
      cell: (r) =>
        (r.discountType || r.discount_type) === 'PERCENTAGE'
          ? `${r.discountValue ?? r.discount_value}%`
          : formatINR(r.discountValue ?? r.discount_value ?? 0),
    },
    {
      id: 'valid',
      header: 'Valid from',
      cell: (r) => formatDateIN(r.validFrom || r.valid_from),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (r) => <StatusBadge status={r.isActive === false ? 'INACTIVE' : 'ACTIVE'} />,
    },
    {
      id: 'action',
      header: 'Action',
      align: 'right',
      cell: (r) => (
        <Button
          size="sm"
          variant="outline"
          loading={toggleMutation.isPending}
          onClick={() => toggleMutation.mutate(r)}
        >
          {r.isActive === false ? 'Activate' : 'Deactivate'}
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Offers & Discounts"
        description="Build promotional campaigns, age-based clearance offers, and brand discounts."
        breadcrumbs={[{ label: 'Sales' }, { label: 'Offers & Discounts' }]}
        primaryAction={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setMode('new')}>
            New Offer
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total offers" value={offers.length} icon={<BadgePercent className="w-4 h-4" />} tone="teal" />
        <StatCard label="Active campaigns" value={offers.filter((o) => o.isActive !== false).length} tone="success" />
        <StatCard label="Inactive / Expired" value={offers.filter((o) => o.isActive === false).length} />
      </div>

      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search offers…" onReset={() => setSearch('')} />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r, i) => r.id || String(i)}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        exportFilename="solecontrol-offers"
        emptyIcon={<BadgePercent className="w-6 h-6" />}
        emptyTitle="No promotional offers configured"
        emptyDescription="Create an offer to apply automatic discounts at POS billing."
      />
    </div>
  )
}
