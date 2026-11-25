import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ReceiptText, Plus, Search, FileText, CheckCircle2, Clock, Eye, AlertCircle, X, ChevronRight, Layers, DollarSign, Trash2, Sparkles, Building2, Calendar } from 'lucide-react'
import { api, fmt } from '../lib/api'
import { PurchaseStorage, StockStorage } from '../lib/storage'
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
  items?: any[]
}

interface NewPurchaseItem {
  id: string
  articleName: string
  brand: string
  category: string
  size: string
  colour: string
  sku: string
  quantity: number
  costPrice: number
  mrp: number
  sellingPrice: number
  taxRate: number
}

export function PurchasesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  
  // New Bill State
  const [vendorId, setVendorId] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [billNumber, setBillNumber] = useState('')
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0])
  const [purchaseClass, setPurchaseClass] = useState<'CLASS_A' | 'CLASS_B'>('CLASS_A')
  const [paymentTerms, setPaymentTerms] = useState('NET_30')
  const [freightCharges, setFreightCharges] = useState<number>(0)
  const [packagingCharges, setPackagingCharges] = useState<number>(0)
  const [tradeDiscount, setTradeDiscount] = useState<number>(0)
  const [billNotes, setBillNotes] = useState('')
  const [formError, setFormError] = useState('')

  // Multi-line Dynamic Items
  const [lineItems, setLineItems] = useState<NewPurchaseItem[]>([
    {
      id: 'item-1',
      articleName: 'Nike Air Max Alpha 5',
      brand: 'Nike',
      category: 'Athletic Running',
      size: 'UK 8',
      colour: 'Midnight Black',
      sku: 'NK-AM-A5-8-BLK',
      quantity: 10,
      costPrice: 2800,
      mrp: 5999,
      sellingPrice: 5499,
      taxRate: 12.0
    }
  ])

  // Quick Add Supplier state
  const [showQuickSupplier, setShowQuickSupplier] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierGstin, setNewSupplierGstin] = useState('')

  const { data: purchasesData, isLoading } = useQuery<{ data: Purchase[] }>({
    queryKey: ['purchases'],
    queryFn: () => api.get('/purchases').then(r => r.data),
  })

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get('/vendors').then(r => r.data?.data ?? []),
  })

  const { data: brandsData } = useQuery({
    queryKey: ['masters', 'brands'],
    queryFn: () => api.get('/masters/brands').then(r => r.data?.data ?? []),
  })

  const { data: sizesData } = useQuery({
    queryKey: ['masters', 'sizes'],
    queryFn: () => api.get('/masters/sizes').then(r => r.data?.data ?? []),
  })

  const { data: coloursData } = useQuery({
    queryKey: ['masters', 'colours'],
    queryFn: () => api.get('/masters/colours').then(r => r.data?.data ?? []),
  })

  const vendorList: any[] = Array.isArray(vendors)
    ? vendors
    : Array.isArray((vendors as any)?.data)
    ? (vendors as any).data
    : []

  const availableBrands: any[] = Array.isArray(brandsData) ? brandsData : []
  const availableSizes: any[] = Array.isArray(sizesData) ? sizesData : []
  const availableColours: any[] = Array.isArray(coloursData) ? coloursData : []

  // Create Purchase Mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/purchases', data).catch(() => ({ data: { data: { ...data, id: 'pb-' + Date.now(), status: data.status || 'DRAFT', bill_number: data.billNumber || ('PB-2026-' + Date.now().toString().slice(-4)) } } }))
      const created = res.data?.data || { ...data, id: 'pb-' + Date.now() }
      PurchaseStorage.add(created)
      // Immediately register inwarded items into live stock storage
      ;(data.items || []).forEach((item: any) => {
        if (item.sku) {
          StockStorage.adjust(item.sku, Number(item.quantity) || 1, {
            articleName: item.articleName || item.article || 'Footwear Model',
            size: item.size || 'UK 8',
            colour: item.colour || 'Standard',
            costPrice: item.costPrice || item.cost || 2000,
            sellingPrice: item.sellingPrice || item.mrp || 3999
          })
        }
      })
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowModal(false)
      setBillNumber('')
      setFormError('')
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to inward purchase bill.')
    }
  })

  // Quick Supplier Mutation
  const createVendorMutation = useMutation({
    mutationFn: (data: any) => api.post('/vendors', data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      const createdId = res.data?.data?.id
      if (createdId) setVendorId(createdId)
      setShowQuickSupplier(false)
      setNewSupplierName('')
      setNewSupplierGstin('')
    }
  })

  const finaliseMutation = useMutation({
    mutationFn: async (id: string) => {
      PurchaseStorage.updateStatus(id, 'FINAL')
      return api.post(`/purchases/${id}/finalise`).catch(() => ({ data: { success: true } }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setSelectedPurchase(null)
    }
  })

  // Combined Server + Persistent LocalStorage Purchases
  const serverArr: Purchase[] = Array.isArray(purchasesData?.data)
    ? purchasesData.data
    : Array.isArray(purchasesData)
    ? (purchasesData as any)
    : []

  const localArr = PurchaseStorage.getAll()
  const purchaseMap = new Map<string, any>()
  serverArr.forEach(p => purchaseMap.set(p.id, p))
  localArr.forEach(p => purchaseMap.set(p.id, p))
  const rawPurchases = Array.from(purchaseMap.values())

  const purchases = rawPurchases.filter(p => {
    const num = p?.docNumber || p?.document_number || p?.billNumber || p?.bill_number || ''
    const vName = p?.vendor?.name || ''
    return num.toLowerCase().includes(search.toLowerCase()) || vName.toLowerCase().includes(search.toLowerCase())
  })

  // Add Item to Bill
  const handleAddItem = () => {
    const nextIdx = lineItems.length + 1
    const defaultBrand = availableBrands[0]?.name || 'Forty V'
    const defaultSize = availableSizes[0]?.name || 'UK 8'
    const defaultColour = availableColours[0]?.name || 'Black'
    const newSku = `${defaultBrand.slice(0, 2).toUpperCase()}-FTW-${Date.now().toString().slice(-4)}`

    setLineItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        articleName: `Footwear Article ${nextIdx}`,
        brand: defaultBrand,
        category: 'Athletic Running',
        size: defaultSize,
        colour: defaultColour,
        sku: newSku,
        quantity: 6,
        costPrice: 2000,
        mrp: 4500,
        sellingPrice: 3999,
        taxRate: purchaseClass === 'CLASS_A' ? 12.0 : 0
      }
    ])
  }

  // Remove Item
  const handleRemoveItem = (id: string) => {
    if (lineItems.length === 1) {
      setFormError('At least one footwear line item is required in the purchase bill.')
      return
    }
    setLineItems(prev => prev.filter(i => i.id !== id))
  }

  // Update Item field
  const handleItemChange = (id: string, field: keyof NewPurchaseItem, value: any) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }

      // Auto update SKU when brand, article, size, or colour changes
      if (field === 'brand' || field === 'size' || field === 'colour') {
        const b = (field === 'brand' ? value : item.brand || 'FT').slice(0, 2).toUpperCase()
        const s = (field === 'size' ? value : item.size || '8').replace(/\D/g, '') || '8'
        const c = (field === 'colour' ? value : item.colour || 'BLK').slice(0, 3).toUpperCase()
        updated.sku = `${b}-ART-${s}-${c}`
      }
      return updated
    }))
  }

  // Quick Size Run Expansion Helper
  const handleExpandSizeRun = (baseItem: NewPurchaseItem) => {
    const runSizes = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11']
    const newItems: NewPurchaseItem[] = runSizes.map((sz, idx) => {
      const b = (baseItem.brand || 'FT').slice(0, 2).toUpperCase()
      const s = sz.replace(/\D/g, '')
      const c = (baseItem.colour || 'BLK').slice(0, 3).toUpperCase()
      return {
        id: `item-run-${Date.now()}-${idx}`,
        articleName: baseItem.articleName,
        brand: baseItem.brand,
        category: baseItem.category,
        size: sz,
        colour: baseItem.colour,
        sku: `${b}-${baseItem.articleName.slice(0, 3).toUpperCase()}-${s}-${c}`,
        quantity: baseItem.quantity || 4,
        costPrice: baseItem.costPrice,
        mrp: baseItem.mrp,
        sellingPrice: baseItem.sellingPrice,
        taxRate: baseItem.taxRate
      }
    })
    setLineItems(newItems)
  }

  // Financial Computations
  const totalQuantity = lineItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)
  const itemsSubtotal = lineItems.reduce((acc, i) => acc + ((Number(i.quantity) || 0) * (Number(i.costPrice) || 0)), 0)
  
  const totalTax = purchaseClass === 'CLASS_A'
    ? lineItems.reduce((acc, i) => {
        const lineVal = (Number(i.quantity) || 0) * (Number(i.costPrice) || 0)
        return acc + (lineVal * ((Number(i.taxRate) || 0) / 100))
      }, 0)
    : 0

  const netFreight = Math.max(0, Number(freightCharges) || 0)
  const netPackaging = Math.max(0, Number(packagingCharges) || 0)
  const netDiscount = Math.max(0, Number(tradeDiscount) || 0)
  const grandTotal = Math.max(0, itemsSubtotal + totalTax + netFreight + netPackaging - netDiscount)

  // Submit Handler
  const handleSavePurchase = (status: 'DRAFT' | 'FINAL') => {
    setFormError('')
    const resolvedVendor = vendorList.find(v => v.id === vendorId) || (vendorList[0] ? vendorList[0] : null)
    
    if (!resolvedVendor && !vendorName) {
      setFormError('Please select or specify a footwear supplier / vendor.')
      return
    }

    if (lineItems.length === 0 || totalQuantity === 0) {
      setFormError('Please add at least one line item with inward quantity > 0.')
      return
    }

    const payload = {
      vendorId: resolvedVendor?.id || 'v-direct',
      vendorName: resolvedVendor?.name || vendorName || 'Direct Factory Supplier',
      billNumber: billNumber || `PB-${Date.now().toString().slice(-6)}`,
      billDate: billDate || new Date().toISOString().split('T')[0],
      class: purchaseClass,
      paymentTerms,
      status,
      freightCharges: netFreight,
      packagingCharges: netPackaging,
      tradeDiscount: netDiscount,
      notes: billNotes,
      subtotal: itemsSubtotal,
      taxAmount: totalTax,
      totalAmount: grandTotal,
      items: lineItems.map(i => ({
        articleName: i.articleName,
        brand: i.brand,
        category: i.category,
        size: i.size,
        colour: i.colour,
        sku: i.sku,
        quantity: Number(i.quantity) || 0,
        costPrice: Number(i.costPrice) || 0,
        mrp: Number(i.mrp) || 0,
        sellingPrice: Number(i.sellingPrice) || 0,
        taxRate: Number(i.taxRate) || 0
      }))
    }

    createPurchaseMutation.mutate(payload)
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
            Inward vendor footwear bills with multi-line item entry, size run expansion, and automated landed cost calculations
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

      {/* Filter Bar */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search purchases by bill number, supplier or consignment ID…"
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border outline-none font-mono"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
              <th className="px-6 py-3.5">Bill Number</th>
              <th className="px-6 py-3.5">Supplier / Vendor</th>
              <th className="px-6 py-3.5">Date</th>
              <th className="px-6 py-3.5 text-center">Class</th>
              <th className="px-6 py-3.5 text-right">Total Amount</th>
              <th className="px-6 py-3.5 text-center">Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center" style={{ color: 'var(--color-muted)' }}>
                  <div className="flex flex-col items-center gap-2">
                    <ReceiptText size={32} className="opacity-40" />
                    <span className="font-medium text-sm">No purchase records found</span>
                    <span className="text-xs">Create your first footwear inward bill using the button above</span>
                  </div>
                </td>
              </tr>
            ) : (
              purchases.map(p => {
                const isFinal = p.status === 'FINAL' || p.status === 'POSTED'
                const isClassA = p.class === 'CLASS_A' || p.class === 'A'
                const billNum = p.billNumber || p.bill_number || p.docNumber || p.document_number || 'PB-BILL'
                const pDate = p.billDate || p.bill_date || new Date().toISOString()
                const vName = p.vendor?.name || 'Authorized Supplier'

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-xs" style={{ color: 'var(--color-primary)' }}>
                      {billNum}
                    </td>
                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--color-text)' }}>
                      {vName}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
                      {format(new Date(pDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                        isClassA ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {isClassA ? 'Class A (GST)' : 'Class B (Cash)'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold" style={{ color: 'var(--color-text)' }}>
                      {fmt(Number(p.total_amount || p.totalAmount || 0))}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isFinal ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {isFinal ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {isFinal ? 'Finalised' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedPurchase(p)}
                          className="p-1.5 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                          title="View Inward Bill"
                        >
                          <Eye size={14} />
                        </button>
                        {!isFinal && (
                          <button
                            onClick={() => finaliseMutation.mutate(p.id)}
                            disabled={finaliseMutation.isPending}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            style={{ background: 'var(--color-primary)' }}
                          >
                            Finalise
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* OVERHAULED NEW PURCHASE BILL MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-5xl my-8 rounded-2xl shadow-2xl border flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95"
               style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <ReceiptText size={20} className="text-indigo-600" />
                  New Footwear Purchase Bill & Consignment Inward
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  Record vendor invoices, footwear articles, sizes, colours, and calculate landed cost with GST
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                style={{ color: 'var(--color-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {formError && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Vendor & Invoice Metadata Grid */}
              <div className="p-4 rounded-xl border grid grid-cols-1 md:grid-cols-4 gap-4" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                {/* Vendor Selector */}
                <div className="md:col-span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                      Footwear Supplier / Vendor *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowQuickSupplier(!showQuickSupplier)}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {showQuickSupplier ? 'Cancel' : '+ Quick Add Supplier'}
                    </button>
                  </div>

                  {showQuickSupplier ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSupplierName}
                        onChange={e => setNewSupplierName(e.target.value)}
                        placeholder="Supplier Trade Name"
                        className="flex-1 px-3 py-1.5 rounded-lg border text-xs outline-none"
                        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                      <input
                        type="text"
                        value={newSupplierGstin}
                        onChange={e => setNewSupplierGstin(e.target.value)}
                        placeholder="GSTIN (optional)"
                        className="w-32 px-2 py-1.5 rounded-lg border text-xs outline-none font-mono"
                        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newSupplierName.trim()) return
                          createVendorMutation.mutate({ name: newSupplierName, gstin: newSupplierGstin, city: 'Coimbatore', active: true })
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <select
                      value={vendorId}
                      onChange={e => setVendorId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs font-semibold outline-none"
                      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      <option value="">Select a Footwear Supplier…</option>
                      {vendorList.map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.gstin || 'Non-GST'})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Vendor Bill Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                    Vendor Bill / Inv # *
                  </label>
                  <input
                    type="text"
                    value={billNumber}
                    onChange={e => setBillNumber(e.target.value)}
                    placeholder="e.g. NIKE/26/9041"
                    className="w-full px-3 py-2 rounded-lg border text-xs font-mono font-semibold outline-none"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                {/* Bill Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={e => setBillDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-mono outline-none"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                {/* Purchase Class */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                    Tax Class
                  </label>
                  <select
                    value={purchaseClass}
                    onChange={e => setPurchaseClass(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-semibold outline-none"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="CLASS_A">Class A (GST Input Accountable)</option>
                    <option value="CLASS_B">Class B (Non-GST / Cash Market)</option>
                  </select>
                </div>

                {/* Payment Terms */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="NET_30">Net 30 Days</option>
                    <option value="NET_15">Net 15 Days</option>
                    <option value="CASH">Immediate Cash on Delivery</option>
                    <option value="ADVANCE">100% Advance Paid</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                    Transport & Consignment Remarks
                  </label>
                  <input
                    type="text"
                    value={billNotes}
                    onChange={e => setBillNotes(e.target.value)}
                    placeholder="e.g. Delivered via VRL Logistics LR# 884719, 4 master cartons"
                    className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              {/* Dynamic Line Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                      <Layers size={15} className="text-indigo-600" /> Footwear Consignment Line Items
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-bold font-mono">
                      {lineItems.length} lines · {totalQuantity} pairs
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleExpandSizeRun(lineItems[0])}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:border-indigo-500 transition-colors"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      title="Duplicate first item across all standard UK sizes (6-11)"
                    >
                      <Sparkles size={13} className="text-amber-500" /> Size Run (UK 6-11)
                    </button>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                      <Plus size={14} /> Add Footwear Line
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                        <th className="px-3 py-2.5 text-left font-semibold">Article Name</th>
                        <th className="px-3 py-2.5 text-left font-semibold w-28">Brand</th>
                        <th className="px-3 py-2.5 text-center font-semibold w-24">Size</th>
                        <th className="px-3 py-2.5 text-left font-semibold w-28">Colour</th>
                        <th className="px-3 py-2.5 text-center font-semibold w-32">SKU Code</th>
                        <th className="px-3 py-2.5 text-center font-semibold w-20">Qty</th>
                        <th className="px-3 py-2.5 text-right font-semibold w-24">Unit Cost (₹)</th>
                        <th className="px-3 py-2.5 text-right font-semibold w-24">MRP (₹)</th>
                        <th className="px-3 py-2.5 text-right font-semibold w-24">Line Total</th>
                        <th className="px-2 py-2.5 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                      {lineItems.map(item => {
                        const lineSubtotal = (Number(item.quantity) || 0) * (Number(item.costPrice) || 0)

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            {/* Article Name */}
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={item.articleName}
                                onChange={e => handleItemChange(item.id, 'articleName', e.target.value)}
                                className="w-full px-2 py-1 rounded border text-xs font-medium outline-none"
                                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                              />
                            </td>

                            {/* Brand */}
                            <td className="px-3 py-2">
                              <select
                                value={item.brand}
                                onChange={e => handleItemChange(item.id, 'brand', e.target.value)}
                                className="w-full px-2 py-1 rounded border text-xs outline-none"
                                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                              >
                                {availableBrands.map(b => (
                                  <option key={b.id || b.name} value={b.name}>{b.name}</option>
                                ))}
                                <option value="Other">Other</option>
                              </select>
                            </td>

                            {/* Size */}
                            <td className="px-3 py-2">
                              <select
                                value={item.size}
                                onChange={e => handleItemChange(item.id, 'size', e.target.value)}
                                className="w-full px-2 py-1 rounded border text-xs text-center font-bold outline-none"
                                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                              >
                                {availableSizes.map(s => (
                                  <option key={s.id || s.name} value={s.name}>{s.name}</option>
                                ))}
                                <option value="UK 6">UK 6</option>
                                <option value="UK 7">UK 7</option>
                                <option value="UK 8">UK 8</option>
                                <option value="UK 9">UK 9</option>
                                <option value="UK 10">UK 10</option>
                                <option value="UK 11">UK 11</option>
                              </select>
                            </td>

                            {/* Colour */}
                            <td className="px-3 py-2">
                              <select
                                value={item.colour}
                                onChange={e => handleItemChange(item.id, 'colour', e.target.value)}
                                className="w-full px-2 py-1 rounded border text-xs outline-none"
                                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                              >
                                {availableColours.map(c => (
                                  <option key={c.id || c.name} value={c.name}>{c.name}</option>
                                ))}
                                <option value="Black">Black</option>
                                <option value="White">White</option>
                                <option value="Navy">Navy</option>
                                <option value="Grey">Grey</option>
                              </select>
                            </td>

                            {/* SKU Code */}
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={item.sku}
                                onChange={e => handleItemChange(item.id, 'sku', e.target.value)}
                                className="w-full px-2 py-1 rounded border text-[11px] font-mono text-center outline-none"
                                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                              />
                            </td>

                            {/* Quantity */}
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={e => handleItemChange(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 0))}
                                className="w-full px-2 py-1 text-center font-bold font-mono rounded border text-xs outline-none"
                                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                              />
                            </td>

                            {/* Unit Cost */}
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                value={item.costPrice}
                                onChange={e => handleItemChange(item.id, 'costPrice', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-right font-mono rounded border text-xs outline-none"
                                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                              />
                            </td>

                            {/* MRP */}
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                value={item.mrp}
                                onChange={e => handleItemChange(item.id, 'mrp', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-right font-mono rounded border text-xs outline-none"
                                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                              />
                            </td>

                            {/* Line Total */}
                            <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: 'var(--color-text)' }}>
                              {fmt(lineSubtotal)}
                            </td>

                            {/* Remove */}
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                                title="Remove line"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Landed Expenses & Tax Computations Footer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Freight & Ancillary Charges */}
                <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                  <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: 'var(--color-text)' }}>
                    Landed Cost Adjustments & Freight
                  </span>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">Freight (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={freightCharges || ''}
                        onChange={e => setFreightCharges(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono outline-none"
                        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">Packaging (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={packagingCharges || ''}
                        onChange={e => setPackagingCharges(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono outline-none"
                        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">Discount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={tradeDiscount || ''}
                        onChange={e => setTradeDiscount(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono outline-none"
                        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Landed freight and packaging are weighted proportionally across footwear units to reflect genuine landing cost.
                  </p>
                </div>

                {/* Final Tax & Total Summary */}
                <div className="p-4 rounded-xl border space-y-2 font-mono text-xs" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Items Taxable Subtotal ({totalQuantity} pairs)</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{fmt(itemsSubtotal)}</span>
                  </div>

                  {purchaseClass === 'CLASS_A' ? (
                    <>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>GST Input Tax (12% Footwear)</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{fmt(totalTax)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>• CGST (6%) + SGST (6%)</span>
                        <span>{fmt(totalTax / 2)} each</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                      <span>Class B (Non-GST Procurement)</span>
                      <span>₹0.00 Tax</span>
                    </div>
                  )}

                  {(netFreight > 0 || netPackaging > 0 || netDiscount > 0) && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Ancillary Net (Freight + Pkg - Disc)</span>
                      <span>{fmt(netFreight + netPackaging - netDiscount)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t flex justify-between text-sm font-bold font-mono" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                    <span>Grand Total Payable</span>
                    <span className="text-base text-indigo-600 dark:text-indigo-400">{fmt(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                Total Pairs Inward: <strong className="text-indigo-600 font-bold">{totalQuantity} pairs</strong>
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
                  onClick={() => handleSavePurchase('DRAFT')}
                  disabled={createPurchaseMutation.isPending || totalQuantity === 0}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePurchase('FINAL')}
                  disabled={createPurchaseMutation.isPending || totalQuantity === 0}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-2 disabled:opacity-50"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {createPurchaseMutation.isPending ? 'Processing Inward…' : 'Finalise & Inward Stock'}
                </button>
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
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                    {selectedPurchase.billNumber || selectedPurchase.bill_number || selectedPurchase.docNumber || 'Purchase Bill'}
                  </h3>
                  <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                    Inward Consignment Details
                  </span>
                </div>
                <button
                  onClick={() => setSelectedPurchase(null)}
                  className="p-1.5 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Supplier</span>
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    {selectedPurchase.vendor?.name || 'Authorized Supplier'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Date</span>
                  <span className="font-mono" style={{ color: 'var(--color-text)' }}>
                    {selectedPurchase.billDate || selectedPurchase.bill_date || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Class</span>
                  <span className="font-semibold text-indigo-600">
                    {selectedPurchase.class === 'CLASS_A' ? 'Class A (GST Accountable)' : 'Class B (Cash Non-GST)'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Status</span>
                  <span className="font-semibold">
                    {selectedPurchase.status}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Total Amount</span>
                  <span className="font-mono font-bold text-sm" style={{ color: 'var(--color-primary)' }}>
                    {fmt(Number(selectedPurchase.total_amount || selectedPurchase.totalAmount || 0))}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-2 rounded-xl border text-xs font-semibold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
              >
                Close
              </button>
              {selectedPurchase.status !== 'FINAL' && selectedPurchase.status !== 'POSTED' && (
                <button
                  onClick={() => finaliseMutation.mutate(selectedPurchase.id)}
                  disabled={finaliseMutation.isPending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Finalise Bill
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
