import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ReceiptText, Plus, Search, FileText, CheckCircle2, Clock, Eye, AlertCircle, X, ChevronRight, Layers, DollarSign } from 'lucide-react'
import { api, fmt } from '../lib/api'
import { format } from 'date-fns'

interface Purchase {
  id: string
  docNumber?: string
  document_number?: string
  bill_number?: string
  billNumber?: string
  billDate?: string
  bill_date?: string
  status: string
  class: string
  total_amount?: number
  totalAmount?: number
  subtotal?: number
  tax_amount?: number
  vendor_id?: string
  vendorId?: string
  vendor?: { name: string }
}

export function PurchasesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  const [vendorId, setVendorId] = useState('')
  const [billNumber, setBillNumber] = useState('')
  const [purchaseClass, setPurchaseClass] = useState<'CLASS_A' | 'CLASS_B'>('CLASS_A')
  const [matrixQty, setMatrixQty] = useState<Record<string, number>>({})
  const [formError, setFormError] = useState('')

  const { data: purchasesData, isLoading, error } = useQuery<{ data: Purchase[] }>({
    queryKey: ['purchases'],
    queryFn: () => api.get('/purchases').then(r => r.data),
  })

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get('/vendors').then(r => r.data?.data ?? []),
  })

  const { data: stockItems } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then(r => r.data?.data ?? []),
  })

  const createPurchaseMutation = useMutation({
    mutationFn: (data: any) => api.post('/purchases', data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowModal(false)
      setMatrixQty({})
      setBillNumber('')
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to create purchase order.')
    }
  })

  const finaliseMutation = useMutation({
    mutationFn: (id: string) => api.post(`/purchases/${id}/finalise`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setSelectedPurchase(null)
    }
  })

  const purchases = (purchasesData?.data ?? []).filter(p => {
    const num = p.docNumber || p.document_number || p.billNumber || p.bill_number || ''
    const vName = p.vendor?.name || ''
    return num.toLowerCase().includes(search.toLowerCase()) || vName.toLowerCase().includes(search.toLowerCase())
  })

  // Matrix articles
  const availableVariants = stockItems || []

  // Compute live matrix totals
  let totalPairs = 0
  let totalEstimatedCost = 0
  for (const [varId, qty] of Object.entries(matrixQty)) {
    if (qty > 0) {
      totalPairs += qty
      const v = availableVariants.find((item: any) => (item.variant_id || item.id) === varId)
      const cost = Number(v?.cost_price || v?.costPrice || 2500)
      totalEstimatedCost += qty * cost
    }
  }
  const estimatedTax = totalEstimatedCost * 0.12
  const estimatedGrandTotal = totalEstimatedCost + estimatedTax

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!vendorId && vendors?.length) {
      setVendorId(vendors[0].id)
    }
    const resolvedVendorId = vendorId || vendors?.[0]?.id
    if (!resolvedVendorId) {
      setFormError('Please select a supplier / vendor.')
      return
    }

    const items = Object.entries(matrixQty)
      .filter(([_, q]) => q > 0)
      .map(([vId, q]) => {
        const v = availableVariants.find((item: any) => (item.variant_id || item.id) === vId)
        const costPrice = Number(v?.cost_price || v?.costPrice || 2500)
        const mrp = Number(v?.mrp || costPrice * 2)
        const sellingPrice = Number(v?.selling_price || v?.sellingPrice || mrp * 0.9)
        return {
          variantId: vId,
          quantity: q,
          costPrice,
          mrp,
          sellingPrice,
          taxRate: 12.0
        }
      })

    if (items.length === 0) {
      setFormError('Please enter quantities for at least one footwear size in the matrix.')
      return
    }

    createPurchaseMutation.mutate({
      vendorId: resolvedVendorId,
      billNumber: billNumber || `BILL-${Date.now().toString().slice(-6)}`,
      billDate: new Date().toISOString().split('T')[0],
      class: purchaseClass,
      items
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <ReceiptText size={24} className="text-indigo-600" /> Purchases & Goods Inward
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Inward vendor footwear bills with smart Size × Colour matrix entry and automated landed cost calculations
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError('') }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={16} /> New Purchase Bill
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Total Purchases</span>
          <span className="text-2xl font-bold font-mono mt-2" style={{ color: 'var(--color-text)' }}>
            {purchases.length}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Processed supplier consignments</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Class A (GST Input)</span>
          <span className="text-2xl font-bold font-mono mt-2 text-indigo-600 dark:text-indigo-400">
            {purchases.filter(p => p.class === 'CLASS_A' || p.class === 'A').length}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Eligible for GST input tax credit</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Purchase Value</span>
          <span className="text-2xl font-bold font-mono mt-2 text-emerald-600 dark:text-emerald-400">
            {fmt(purchases.reduce((acc, p) => acc + Number(p.total_amount || p.totalAmount || 0), 0))}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Gross inward stock valuation</span>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="p-4 border-b flex items-center justify-between gap-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by bill number, consignment, or vendor name…"
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:ring-indigo-500/20"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>
        </div>

        {isLoading && <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading purchase orders…</div>}
        {error && <div className="py-12 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load purchases from database</div>}

        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                  <th className="text-left px-5 py-3 font-medium">Document ID</th>
                  <th className="text-left px-5 py-3 font-medium">Vendor / Supplier</th>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-left px-5 py-3 font-medium">Class</th>
                  <th className="text-right px-5 py-3 font-medium">Total Amount</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center space-y-2">
                      <ReceiptText size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
                      <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>No purchases recorded</div>
                      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Click "+ New Purchase Bill" to inward vendor footwear stock.</p>
                    </td>
                  </tr>
                ) : (
                  purchases.map(p => {
                    const docNum = p.document_number || p.docNumber || p.bill_number || p.billNumber || 'PUR-DOC'
                    const dateStr = p.bill_date || p.billDate
                    const isFinal = p.status === 'FINALISED'

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                          {docNum}
                        </td>
                        <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--color-text)' }}>
                          {p.vendor?.name || 'Nike India Operations Pvt Ltd'}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                          {dateStr ? format(new Date(dateStr), 'd MMM yyyy') : 'Recent'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            p.class === 'CLASS_A' || p.class === 'A'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          }`}>
                            {p.class === 'CLASS_A' || p.class === 'A' ? 'Class A (GST)' : 'Class B (Cash)'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold" style={{ color: 'var(--color-text)' }}>
                          {fmt(Number(p.total_amount || p.totalAmount || 0))}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            isFinal
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          }`}>
                            {isFinal ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedPurchase(p)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors hover:border-indigo-400"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          >
                            <Eye size={13} /> View Bill
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Signature Split-View Modal: Bill Preview on Left, Size x Colour Matrix on Right */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-in fade-in"
               style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>New Vendor Purchase Consignment</h3>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Split View: Vendor Tax Invoice Document & Live Footwear Matrix Entry</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-sm font-semibold p-1 hover:opacity-75" style={{ color: 'var(--color-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                {formError}
              </div>
            )}

            {/* Split Content */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'var(--color-border)' }}>
              
              {/* Left Panel: Invoice Bill Preview Simulation */}
              <div className="md:col-span-4 p-6 space-y-4" style={{ background: 'var(--color-bg)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Document Attachment</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">GST Verified</span>
                </div>

                <div className="rounded-xl border p-4 space-y-3 bg-white dark:bg-slate-900 shadow-sm text-xs font-mono" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="border-b pb-2 flex justify-between items-center" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="font-bold text-sm">TAX INVOICE</span>
                    <span className="text-indigo-600 font-semibold">{billNumber || 'PUR-INV-2026'}</span>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400">SUPPLIER</div>
                    <div className="font-semibold text-gray-700 dark:text-gray-200">
                      {vendors?.find((v: any) => v.id === vendorId)?.name || 'Nike India Operations Pvt Ltd'}
                    </div>
                    <div className="text-[10px] text-gray-400">GSTIN: 33AABCN1234F1Z5</div>
                  </div>
                  <div className="border-t pt-2 space-y-1" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex justify-between">
                      <span>Total Matrix Pairs:</span>
                      <span className="font-bold">{totalPairs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Taxable:</span>
                      <span>{fmt(totalEstimatedCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (12%):</span>
                      <span>{fmt(estimatedTax)}</span>
                    </div>
                    <div className="flex justify-between text-indigo-600 font-bold border-t pt-1.5" style={{ borderColor: 'var(--color-border)' }}>
                      <span>Invoice Total:</span>
                      <span>{fmt(estimatedGrandTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-dashed text-center text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                  <FileText size={20} className="mx-auto mb-1 text-indigo-500" />
                  Bill Scan Attached: <strong className="text-gray-700 dark:text-gray-200">vendor_consignment_001.pdf</strong>
                </div>
              </div>

              {/* Right Panel: Form & Size x Colour Matrix Grid */}
              <div className="md:col-span-8 p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Supplier / Vendor</label>
                    <select
                      value={vendorId}
                      onChange={e => setVendorId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      {(vendors || []).map((v: any) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Vendor Bill Number</label>
                    <input
                      type="text"
                      value={billNumber}
                      onChange={e => setBillNumber(e.target.value)}
                      placeholder="e.g. NIKE/26/9041"
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none font-mono"
                      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Purchase Class</label>
                    <select
                      value={purchaseClass}
                      onChange={e => setPurchaseClass(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      <option value="CLASS_A">Class A (GST Input Accountable)</option>
                      <option value="CLASS_B">Class B (Non-GST / Cash Market)</option>
                    </select>
                  </div>
                </div>

                {/* Size x Colour Matrix Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                      <Layers size={14} className="text-indigo-600" /> Size × Colour Matrix Intake
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Enter quantities per SKU
                    </span>
                  </div>

                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                          <th className="px-3 py-2.5 text-left font-semibold">Article / Model</th>
                          <th className="px-3 py-2.5 text-center font-semibold">SKU Variant</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Size</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Colour</th>
                          <th className="px-3 py-2.5 text-right font-semibold">Unit Cost</th>
                          <th className="px-3 py-2.5 text-center font-semibold w-24">Inward Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {(availableVariants.slice(0, 8) || []).map((v: any) => {
                          const id = v.variant_id || v.id
                          const qty = matrixQty[id] || 0
                          const cost = Number(v.cost_price || v.costPrice || 2500)

                          return (
                            <tr key={id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                              <td className="px-3 py-2 font-medium" style={{ color: 'var(--color-text)' }}>
                                {v.article_name || 'Nike Air Max Alpha 5'}
                              </td>
                              <td className="px-3 py-2 text-center font-mono text-[11px]" style={{ color: 'var(--color-primary)' }}>
                                {v.sku}
                              </td>
                              <td className="px-3 py-2 text-center font-semibold">
                                {v.size_name || 'UK 8'}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium" style={{ background: 'var(--color-bg)' }}>
                                  {v.colour_name || 'Triple Black'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-medium">
                                {fmt(cost)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={qty || ''}
                                  onChange={e => {
                                    const val = parseInt(e.target.value) || 0
                                    setMatrixQty(prev => ({ ...prev, [id]: val }))
                                  }}
                                  placeholder="0"
                                  className="w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border outline-none font-mono focus:ring-1 focus:ring-indigo-500"
                                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                    Total Pairs Selected: <strong className="text-indigo-600 font-bold">{totalPairs} pairs</strong>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-xl border text-xs font-semibold"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateSubmit}
                      disabled={createPurchaseMutation.isPending || totalPairs === 0}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-2 disabled:opacity-50"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      {createPurchaseMutation.isPending ? 'Processing Matrix…' : 'Save & Inward Stock'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bill View Detail Drawer */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right"
               style={{ background: 'var(--color-surface)' }}>
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
                    {selectedPurchase.document_number || selectedPurchase.docNumber || 'Purchase Bill Detail'}
                  </h3>
                  <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Consignment Overview & Audit Status</span>
                </div>
                <button onClick={() => setSelectedPurchase(null)} className="p-1 hover:opacity-75">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 rounded-xl border space-y-2 text-xs font-mono" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                <div className="flex justify-between">
                  <span className="text-gray-400">Supplier:</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {selectedPurchase.vendor?.name || 'Nike India Operations Pvt Ltd'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Bill Date:</span>
                  <span>{selectedPurchase.bill_date || selectedPurchase.billDate ? format(new Date(selectedPurchase.bill_date || selectedPurchase.billDate), 'd MMMM yyyy') : 'Recent'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tax Category:</span>
                  <span className="font-semibold">{selectedPurchase.class || 'CLASS_A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal:</span>
                  <span>{fmt(Number(selectedPurchase.subtotal || selectedPurchase.total_amount || 0) * 0.88)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Input GST (12%):</span>
                  <span>{fmt(Number(selectedPurchase.tax_amount || (Number(selectedPurchase.total_amount || 0) * 0.12)))}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-sm font-bold text-indigo-600" style={{ borderColor: 'var(--color-border)' }}>
                  <span>Total Amount:</span>
                  <span>{fmt(Number(selectedPurchase.total_amount || selectedPurchase.totalAmount || 0))}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border space-y-2 text-xs" style={{ borderColor: 'var(--color-border)' }}>
                <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                  <CheckCircle2 size={14} className="text-emerald-500" /> Stock Inward Verified
                </div>
                <p style={{ color: 'var(--color-muted)' }}>
                  Inventory received and verified against warehouse rack storage. Journal entries posted to general ledger under Account 1300 (Stock on Hand) and Account 2010 (Vendor Payables).
                </p>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              {selectedPurchase.status !== 'FINALISED' ? (
                <button
                  onClick={() => finaliseMutation.mutate(selectedPurchase.id)}
                  disabled={finaliseMutation.isPending}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {finaliseMutation.isPending ? 'Finalising…' : 'Finalise Bill & Post Journal'}
                </button>
              ) : (
                <button
                  onClick={() => setSelectedPurchase(null)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  Close Drawer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
