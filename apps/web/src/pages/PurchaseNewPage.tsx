import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, toISODate, getApiErrorMessage } from '../lib/format'
import {
  FullPageForm, FormField, SearchableCombobox, DatePicker, MoneyInput,
  Button, ConfirmDialog, inputBaseClass,
} from '../components/ui'
import { SizeRunGrid, DEFAULT_UK_SIZES, MarginBadge } from '../components/footwear'

interface PurchaseArticleLine {
  id: string
  articleId: string
  articleName: string
  brandName: string
  hsn: string
  gstPct: number
  colour: string
  costPrice: number
  mrp: number
  sizes: Record<string, number>
}

function emptyLine(idx = 1): PurchaseArticleLine {
  return {
    id: `line-${Date.now()}-${idx}`,
    articleId: '',
    articleName: '',
    brandName: '',
    hsn: '6404',
    gstPct: 12,
    colour: 'Black',
    costPrice: 1800,
    mrp: 3999,
    sizes: { 'UK 6': 0, 'UK 7': 2, 'UK 8': 4, 'UK 9': 4, 'UK 10': 2, 'UK 11': 0 },
  }
}

export function PurchaseNewPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Header state
  const [vendorId, setVendorId] = useState('')
  const [vendorBillNo, setVendorBillNo] = useState('')
  const [billDate, setBillDate] = useState(toISODate(new Date()))
  const [paymentTerms, setPaymentTerms] = useState('NET_30')
  const [purchaseClass, setPurchaseClass] = useState<'A' | 'B'>('A')
  const [showMoreDetails, setShowMoreDetails] = useState(false)
  const [freight, setFreight] = useState(0)
  const [packaging, setPackaging] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [transportRemarks, setTransportRemarks] = useState('')

  const [lines, setLines] = useState<PurchaseArticleLine[]>([emptyLine(1)])
  const [showConfirmReceive, setShowConfirmReceive] = useState(false)

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get('/vendors').then((r) => r.data?.data ?? []),
  })

  const { data: articlesData } = useQuery({
    queryKey: ['masters', 'articles'],
    queryFn: () => api.get('/masters/articles').then((r) => r.data?.data ?? []),
  })

  const { data: coloursData } = useQuery({
    queryKey: ['masters', 'colours'],
    queryFn: () => api.get('/masters/colours').then((r) => r.data?.data ?? []),
  })

  const { data: existingBillsData } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/purchases').then((r) => r.data?.data ?? []),
  })

  const vendors: any[] = Array.isArray(vendorsData) ? vendorsData : []
  const articles: any[] = Array.isArray(articlesData) ? articlesData : []
  const colours: any[] = Array.isArray(coloursData) ? coloursData : []
  const existingBills: any[] = Array.isArray(existingBillsData) ? existingBillsData : []

  // Duplicate bill number warning
  const duplicateBillWarning = useMemo(() => {
    const clean = vendorBillNo.trim().toLowerCase()
    if (!clean) return false
    return existingBills.some(
      (b) =>
        String(b.vendorBillNo || b.vendor_bill_no || b.document_number || '')
          .trim()
          .toLowerCase() === clean
    )
  }, [vendorBillNo, existingBills])

  // Calculations
  const totals = useMemo(() => {
    let pairs = 0
    let subtotal = 0
    let gstTotal = 0

    lines.forEach((l) => {
      const linePairs = DEFAULT_UK_SIZES.reduce((s, sz) => s + (Number(l.sizes[sz]) || 0), 0)
      const lineSub = linePairs * (Number(l.costPrice) || 0)
      const lineGst = purchaseClass === 'A' ? (lineSub * (Number(l.gstPct) || 0)) / 100 : 0
      pairs += linePairs
      subtotal += lineSub
      gstTotal += lineGst
    })

    const grandTotal = Math.max(0, subtotal + gstTotal + freight + packaging - discount)
    return {
      pairs,
      subtotal,
      cgst: gstTotal / 2,
      sgst: gstTotal / 2,
      gstTotal,
      grandTotal,
    }
  }, [lines, purchaseClass, freight, packaging, discount])

  const buildPayload = (status: 'DRAFT' | 'FINALISED') => {
    const flattenedItems: any[] = []
    lines.forEach((l) => {
      const artPrefix = (l.articleName || 'FTW')
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 6)
        .toUpperCase()
      const colCode = (l.colour || 'BLK').slice(0, 3).toUpperCase()
      DEFAULT_UK_SIZES.forEach((sz) => {
        const qty = Number(l.sizes[sz]) || 0
        if (qty > 0) {
          const szNum = sz.replace(/[^0-9]/g, '') || sz
          flattenedItems.push({
            articleId: l.articleId || undefined,
            articleName: l.articleName || 'Footwear Article',
            sku: `${artPrefix}-${szNum}-${colCode}`,
            size: sz,
            colour: l.colour,
            quantity: qty,
            unitCost: l.costPrice,
            mrp: l.mrp,
            gstRate: purchaseClass === 'A' ? l.gstPct : 0,
          })
        }
      })
    })
    return {
      vendorId,
      vendorBillNo: vendorBillNo.trim() || `BILL-${Date.now().toString().slice(-6)}`,
      billDate,
      paymentTerms,
      purchaseClass,
      freight,
      packaging,
      discount,
      notes: transportRemarks,
      status,
      items: flattenedItems,
      totalAmount: totals.grandTotal,
    }
  }

  const saveMutation = useMutation({
    mutationFn: async ({ mode }: { mode: 'DRAFT' | 'FINALISED' }) => {
      const payload = buildPayload(mode)
      const res = await api.post('/purchases', payload)
      const created = res.data?.data
      if (mode === 'FINALISED' && created?.id) {
        await api.post(`/purchases/${created.id}/finalise`, {})
      }
      return res
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setShowConfirmReceive(false)
      toast.success(
        vars.mode === 'FINALISED'
          ? `Received ${totals.pairs} pairs into stock`
          : 'Purchase bill saved as draft'
      )
      navigate('/purchases')
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to save purchase bill'))
    },
  })

  const validateBeforeSubmit = () => {
    if (!vendorId) {
      toast.error('Please select a vendor')
      return false
    }
    if (totals.pairs <= 0) {
      toast.error('Enter at least 1 pair in the SizeRunGrid')
      return false
    }
    if (lines.some((l) => !l.articleName)) {
      toast.error('Please select an article on every card')
      return false
    }
    return true
  }

  const handleSelectArticle = (lineId: string, articleId: string) => {
    const art = articles.find((a) => a.id === articleId || a.name === articleId)
    setLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? {
              ...l,
              articleId: art?.id || articleId,
              articleName: art?.name || articleId,
              brandName: art?.brand?.name || art?.brandName || '',
              hsn: art?.hsn || '6404',
              gstPct: Number(art?.mrp || l.mrp) > 2500 ? 18 : 12,
            }
          : l
      )
    )
  }

  const isDirty = Boolean(vendorId || vendorBillNo || totals.pairs > 0)

  return (
    <>
      <FullPageForm
        title="New Purchase Bill / Goods Inward"
        subtitle="Inward footwear stock by article and size run with automatic SKU preview and GST split."
        backLabel="Purchases"
        onCancel={() => navigate('/purchases')}
        isDirty={isDirty}
        primaryActionLabel="Receive Stock"
        onPrimaryAction={() => {
          if (validateBeforeSubmit()) setShowConfirmReceive(true)
        }}
        primaryLoading={saveMutation.isPending}
        secondaryActionLabel="Save Draft"
        onSecondaryAction={() => {
          if (validateBeforeSubmit()) saveMutation.mutate({ mode: 'DRAFT' })
        }}
        secondaryLoading={saveMutation.isPending}
        headerFields={
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <FormField label="Vendor" required className="lg:col-span-2">
                <SearchableCombobox
                  options={vendors.map((v) => ({
                    value: v.id,
                    label: v.name,
                    sublabel: v.gstin || v.phone,
                  }))}
                  value={vendorId}
                  onChange={setVendorId}
                  placeholder="Select supplier…"
                  searchPlaceholder="Search vendor name or GSTIN…"
                />
              </FormField>

              <FormField
                label="Vendor bill number"
                error={duplicateBillWarning ? 'A bill with this number already exists' : undefined}
              >
                <input
                  type="text"
                  value={vendorBillNo}
                  onChange={(e) => setVendorBillNo(e.target.value)}
                  placeholder="e.g. INV/26-27/104"
                  className={inputBaseClass}
                />
              </FormField>

              <FormField label="Bill date" required>
                <DatePicker value={billDate} onChange={setBillDate} />
              </FormField>

              <FormField label="Tax classification">
                <SearchableCombobox
                  options={[
                    { value: 'A', label: 'Class A (GST Invoice)' },
                    { value: 'B', label: 'Class B (Non-GST)' },
                  ]}
                  value={purchaseClass}
                  onChange={(v) => setPurchaseClass(v as 'A' | 'B')}
                />
              </FormField>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowMoreDetails((s) => !s)}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
              >
                {showMoreDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                More details (freight, packaging, payment terms)
              </button>
            </div>

            {showMoreDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                <FormField label="Payment terms">
                  <SearchableCombobox
                    options={[
                      { value: 'IMMEDIATE', label: 'Immediate / Cash' },
                      { value: 'NET_15', label: 'Net 15 days' },
                      { value: 'NET_30', label: 'Net 30 days' },
                      { value: 'NET_45', label: 'Net 45 days' },
                    ]}
                    value={paymentTerms}
                    onChange={setPaymentTerms}
                  />
                </FormField>
                <FormField label="Freight charges">
                  <MoneyInput value={freight} onChange={setFreight} />
                </FormField>
                <FormField label="Packaging charges">
                  <MoneyInput value={packaging} onChange={setPackaging} />
                </FormField>
                <FormField label="Transport / LR remarks">
                  <input
                    type="text"
                    value={transportRemarks}
                    onChange={(e) => setTransportRemarks(e.target.value)}
                    placeholder="LR no. or transporter"
                    className={inputBaseClass}
                  />
                </FormField>
              </div>
            )}
          </div>
        }
        summaryPanel={
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2.5">
              Bill Summary
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Total pairs</span>
                <span className="font-semibold tabular-nums text-slate-900">{totals.pairs} pairs</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (cost)</span>
                <span className="tabular-nums">{formatINR(totals.subtotal)}</span>
              </div>
              {purchaseClass === 'A' && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Input CGST</span>
                    <span className="tabular-nums">{formatINR(totals.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Input SGST</span>
                    <span className="tabular-nums">{formatINR(totals.sgst)}</span>
                  </div>
                </>
              )}
              {freight > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Freight</span>
                  <span className="tabular-nums">{formatINR(freight)}</span>
                </div>
              )}
              {packaging > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Packaging</span>
                  <span className="tabular-nums">{formatINR(packaging)}</span>
                </div>
              )}
              <FormField label="Bill discount">
                <MoneyInput value={discount} onChange={setDiscount} />
              </FormField>
              <div className="flex justify-between items-baseline pt-3 border-t border-slate-200">
                <span className="text-base font-semibold text-slate-900">Grand total</span>
                <span className="text-xl font-semibold tabular-nums text-teal-700">
                  {formatINR(totals.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        }
      >
        {/* Article cards */}
        {lines.map((line, idx) => {
          const linePairs = DEFAULT_UK_SIZES.reduce((s, sz) => s + (Number(line.sizes[sz]) || 0), 0)
          const previewSkus = DEFAULT_UK_SIZES.filter((sz) => (Number(line.sizes[sz]) || 0) > 0).map(
            (sz) => {
              const artPrefix = (line.articleName || 'FTW')
                .replace(/[^A-Za-z0-9]/g, '')
                .slice(0, 6)
                .toUpperCase()
              const colCode = (line.colour || 'BLK').slice(0, 3).toUpperCase()
              const szNum = sz.replace(/[^0-9]/g, '') || sz
              return `${artPrefix}-${szNum}-${colCode}`
            }
          )

          return (
            <div key={line.id} className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <span className="text-sm font-semibold text-slate-900">
                  Article #{idx + 1}
                  {line.articleName ? ` — ${line.articleName}` : ''}
                </span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLines((p) => p.filter((x) => x.id !== line.id))}
                    className="text-xs text-slate-500 hover:text-red-600 inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FormField label="Footwear article" required className="sm:col-span-2">
                  <SearchableCombobox
                    options={articles.map((a) => ({
                      value: a.id,
                      label: a.name,
                      sublabel: a.brand?.name || a.brandName || `HSN ${a.hsn || '6404'}`,
                    }))}
                    value={line.articleId}
                    onChange={(val) => handleSelectArticle(line.id, val)}
                    placeholder="Select footwear article…"
                  />
                </FormField>

                <FormField label="Colour">
                  <SearchableCombobox
                    options={
                      colours.length > 0
                        ? colours.map((c) => ({ value: c.name, label: c.name }))
                        : [
                            { value: 'Black', label: 'Black' },
                            { value: 'White', label: 'White' },
                            { value: 'Navy', label: 'Navy' },
                            { value: 'Tan', label: 'Tan' },
                            { value: 'Grey', label: 'Grey' },
                          ]
                    }
                    value={line.colour}
                    onChange={(v) =>
                      setLines((p) => p.map((x) => (x.id === line.id ? { ...x, colour: v } : x)))
                    }
                  />
                </FormField>

                <FormField label="HSN / GST %">
                  <div className="flex items-center gap-2 h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm tabular-nums text-slate-700">
                    <span>HSN {line.hsn}</span>
                    <span className="text-slate-300">·</span>
                    <span>{purchaseClass === 'A' ? `${line.gstPct}% GST` : '0%'}</span>
                  </div>
                </FormField>
              </div>

              {/* SizeRunGrid in one horizontal row */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Quantity by size (UK)
                </label>
                <SizeRunGrid
                  values={line.sizes}
                  onChange={(sz, qty) =>
                    setLines((p) =>
                      p.map((x) =>
                        x.id === line.id ? { ...x, sizes: { ...x.sizes, [sz]: qty } } : x
                      )
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <FormField label="Unit cost (excl. GST)">
                  <MoneyInput
                    value={line.costPrice}
                    onChange={(val) =>
                      setLines((p) =>
                        p.map((x) => (x.id === line.id ? { ...x, costPrice: val } : x))
                      )
                    }
                  />
                </FormField>
                <FormField label="Retail MRP">
                  <MoneyInput
                    value={line.mrp}
                    onChange={(val) =>
                      setLines((p) =>
                        p.map((x) => (x.id === line.id ? { ...x, mrp: val } : x))
                      )
                    }
                  />
                </FormField>
                <div className="flex items-center justify-between h-9 px-3 rounded-lg bg-slate-50 border border-slate-200">
                  <MarginBadge cost={line.costPrice} mrp={line.mrp} />
                  <span className="text-xs font-medium tabular-nums text-slate-700">
                    {formatINR(linePairs * line.costPrice)}
                  </span>
                </div>
              </div>

              {line.mrp < line.costPrice && (
                <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Retail MRP is lower than unit cost. Verify pricing before receiving stock.
                </div>
              )}

              {previewSkus.length > 0 && line.articleName && (
                <div className="pt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-500">SKUs to generate:</span>
                  {previewSkus.map((sku) => (
                    <span
                      key={sku}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]"
                    >
                      {sku}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        <Button
          variant="outline"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setLines((p) => [...p, emptyLine(p.length + 1)])}
        >
          Add another article
        </Button>
      </FullPageForm>

      <ConfirmDialog
        open={showConfirmReceive}
        onClose={() => setShowConfirmReceive(false)}
        onConfirm={() => saveMutation.mutate({ mode: 'FINALISED' })}
        title="Confirm Goods Inward"
        description={`You are about to receive ${totals.pairs} pairs worth ${formatINR(
          totals.grandTotal
        )} into warehouse inventory. Once finalised, the bill cannot be edited directly.`}
        confirmLabel="Confirm & Receive Stock"
        variant="primary"
        loading={saveMutation.isPending}
      />
    </>
  )
}
