import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft, Search, ShoppingBag, Trash2, UserPlus, PauseCircle,
  PlayCircle, CreditCard, Banknote, QrCode, CheckCircle2, Printer,
  Calculator, Plus, X, Percent, Tag,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatDateTimeIN, getApiErrorMessage } from '../lib/format'
import {
  Button, SearchableCombobox, QuantityStepper, MoneyInput, PrintPreview,
  StatusBadge, EmptyState, ErrorState, Skeleton, Drawer, FormField, inputBaseClass,
} from '../components/ui'
import { ArticleCard, ColourSwatch } from '../components/footwear'

interface CartItem {
  variantId: string
  sku: string
  articleName: string
  size: string
  colour: string
  unitPrice: number
  gstRate: number
  quantity: number
  discountPct: number
  maxStock: number
}

interface HoldBill {
  id: string
  label: string
  customerId: string
  items: CartItem[]
  createdAt: string
}

export function PosBillingPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const scanInputRef = useRef<HTMLInputElement>(null)

  const [scanQuery, setScanQuery] = useState('')
  const [brandFilter, setBrandFilter] = useState('ALL')
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerId, setCustomerId] = useState('')
  const [selectedOfferId, setSelectedOfferId] = useState('')
  const [holdBills, setHoldBills] = useState<HoldBill[]>([])

  // Article size picker modal
  const [pickingArticle, setPickingArticle] = useState<any | null>(null)

  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false)
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'CASH' | 'CARD' | 'SPLIT'>('UPI')
  const [cashTendered, setCashTendered] = useState(0)
  const [splitCash, setSplitCash] = useState(0)

  // Quick-add customer drawer
  const [showCustDrawer, setShowCustDrawer] = useState(false)
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')

  // End-of-day cash close modal
  const [showEodModal, setShowEodModal] = useState(false)
  const [eodActualCash, setEodActualCash] = useState(0)

  // Completed sale receipt
  const [completedSale, setCompletedSale] = useState<any | null>(null)
  const [showPrint, setShowPrint] = useState(false)

  const { data: stockData, isLoading: loadingStock, error: stockError, refetch: refetchStock } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then((r) => r.data?.data ?? []),
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then((r) => r.data?.data ?? []),
  })

  const { data: offersData } = useQuery({
    queryKey: ['offers'],
    queryFn: () => api.get('/offers').then((r) => r.data?.data ?? []),
  })

  const { data: salesData } = useQuery({
    queryKey: ['sales'],
    queryFn: () => api.get('/sales').then((r) => r.data?.data ?? []),
  })

  const variants: any[] = Array.isArray(stockData) ? stockData : []
  const customers: any[] = Array.isArray(customersData) ? customersData : []
  const offers: any[] = (Array.isArray(offersData) ? offersData : []).filter(
    (o) => o.isActive !== false && o.is_active !== false
  )

  // Group variants by article for touch-friendly ArticleCard grid
  const articles = useMemo(() => {
    const map = new Map<string, any>()
    variants.forEach((v) => {
      const name = v.article_name || v.articleName || v.sku || 'Footwear'
      const brand = v.brand_name || v.brandName || name.split(' ')[0] || 'Brand'
      const key = `${brand}::${name}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          brand,
          mrp: Number(v.selling_price ?? v.mrp ?? 0),
          totalStock: 0,
          colours: new Set<string>(),
          variants: [],
        })
      }
      const entry = map.get(key)
      entry.totalStock += Number(v.quantity ?? 0)
      if (v.colour_name || v.colour) entry.colours.add(v.colour_name || v.colour)
      entry.variants.push(v)
    })
    return Array.from(map.values()).map((a) => ({
      ...a,
      colours: Array.from(a.colours),
    }))
  }, [variants])

  const brands = useMemo(() => {
    const set = new Set<string>()
    articles.forEach((a) => set.add(a.brand))
    return ['ALL', ...Array.from(set)]
  }, [articles])

  const filteredArticles = useMemo(() => {
    const q = scanQuery.trim().toLowerCase()
    return articles.filter((a) => {
      if (brandFilter !== 'ALL' && a.brand !== brandFilter) return false
      if (!q) return true
      if (a.name.toLowerCase().includes(q) || a.brand.toLowerCase().includes(q)) return true
      return a.variants.some(
        (v: any) =>
          (v.sku || '').toLowerCase().includes(q) ||
          (v.barcode || '').toLowerCase().includes(q)
      )
    })
  }, [articles, brandFilter, scanQuery])

  const addVariantToCart = (v: any) => {
    const sku = v.sku || v.variant_id || v.id
    const avail = Number(v.quantity ?? 0)
    const price = Number(v.selling_price ?? v.mrp ?? 0)
    const gstRate = price > 2500 ? 18 : price >= 1000 ? 12 : 5

    setCart((prev) => {
      const idx = prev.findIndex((i) => i.sku === sku)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 }
        return next
      }
      return [
        ...prev,
        {
          variantId: v.variant_id || v.id || sku,
          sku,
          articleName: v.article_name || v.articleName || sku,
          size: v.size_label || v.size || 'UK 8',
          colour: v.colour_name || v.colour || 'Standard',
          unitPrice: price,
          gstRate,
          quantity: 1,
          discountPct: 0,
          maxStock: avail,
        },
      ]
    })
    toast.success(`Added ${sku} to bill`)
  }

  // Handle Enter on scan/search bar for direct barcode/SKU match
  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const q = scanQuery.trim().toLowerCase()
    if (!q) return
    const exact = variants.find(
      (v) => (v.sku || '').toLowerCase() === q || (v.barcode || '').toLowerCase() === q
    )
    if (exact) {
      e.preventDefault()
      addVariantToCart(exact)
      setScanQuery('')
    } else if (filteredArticles.length === 1) {
      e.preventDefault()
      setPickingArticle(filteredArticles[0])
    }
  }

  // Calculations
  const subtotal = cart.reduce((s, item) => {
    const lineGross = item.unitPrice * item.quantity
    const lineDisc = lineGross * (item.discountPct / 100)
    return s + (lineGross - lineDisc)
  }, 0)

  const activeOffer = offers.find((o) => o.id === selectedOfferId)
  const offerDiscount = activeOffer
    ? activeOffer.discountType === 'PERCENTAGE'
      ? (subtotal * Number(activeOffer.discountValue || 0)) / 100
      : Math.min(subtotal, Number(activeOffer.discountValue || 0))
    : 0

  const taxableTotal = Math.max(0, subtotal - offerDiscount)
  const gstTotal = cart.reduce((s, item) => {
    const lineNet = item.unitPrice * item.quantity * (1 - item.discountPct / 100)
    const ratio = subtotal > 0 ? lineNet / subtotal : 0
    const afterOffer = taxableTotal * ratio
    return s + (afterOffer * item.gstRate) / 100
  }, 0)
  const grandTotal = Math.round(taxableTotal + gstTotal)

  const createCustomerMutation = useMutation({
    mutationFn: (payload: { name: string; phone: string }) => api.post('/customers', payload),
    onSuccess: (res) => {
      const created = res.data?.data
      qc.invalidateQueries({ queryKey: ['customers'] })
      if (created?.id) setCustomerId(created.id)
      setShowCustDrawer(false)
      setNewCustName('')
      setNewCustPhone('')
      toast.success('Customer added')
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to add customer'))
    },
  })

  const createSaleMutation = useMutation({
    mutationFn: (payload: any) => api.post('/sales', payload),
    onSuccess: (res) => {
      const created = res.data?.data
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setShowPayModal(false)
      setCompletedSale({
        ...created,
        itemsSnapshot: cart,
        grandTotal,
        taxableTotal,
        gstTotal,
        paymentMode,
      })
      setCart([])
      setSelectedOfferId('')
      setCustomerId('')
      toast.success(`Invoice ${created?.document_number || created?.docNumber || ''} completed`)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Could not complete sale. Please try again.'))
    },
  })

  const handleCompletePayment = () => {
    if (cart.length === 0 || createSaleMutation.isPending) return
    const payments =
      paymentMode === 'SPLIT'
        ? [
            { paymentMode: 'CASH', amount: splitCash },
            { paymentMode: 'UPI', amount: Math.max(0, grandTotal - splitCash) },
          ]
        : [{ paymentMode, amount: grandTotal }]

    createSaleMutation.mutate({
      customerId: customerId || undefined,
      offerId: selectedOfferId || undefined,
      items: cart.map((c) => ({
        variantId: c.variantId,
        sku: c.sku,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        discountPct: c.discountPct,
      })),
      payments,
      totalAmount: grandTotal,
    })
  }

  const handleHoldBill = () => {
    if (cart.length === 0) return
    const held: HoldBill = {
      id: `hold-${Date.now()}`,
      label: `Hold #${holdBills.length + 1} (${cart.reduce((s, i) => s + i.quantity, 0)} pairs)`,
      customerId,
      items: cart,
      createdAt: new Date().toISOString(),
    }
    setHoldBills((prev) => [...prev, held])
    setCart([])
    setCustomerId('')
    toast.info('Bill placed on hold')
  }

  const handleResumeHold = (hold: HoldBill) => {
    if (cart.length > 0) {
      handleHoldBill()
    }
    setCart(hold.items)
    setCustomerId(hold.customerId)
    setHoldBills((prev) => prev.filter((h) => h.id !== hold.id))
    toast.info(`Resumed ${hold.label}`)
  }

  // Keyboard shortcuts: F2 scan, F4 pay, F8 hold
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        scanInputRef.current?.focus()
      } else if (e.key === 'F4' && cart.length > 0 && !showPayModal) {
        e.preventDefault()
        setCashTendered(grandTotal)
        setSplitCash(Math.floor(grandTotal / 2))
        setShowPayModal(true)
      } else if (e.key === 'F8' && cart.length > 0) {
        e.preventDefault()
        handleHoldBill()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Today's cash summary for EOD
  const todayStr = new Date().toISOString().split('T')[0]
  const todaysSales = (Array.isArray(salesData) ? salesData : []).filter((s: any) =>
    String(s.created_at || s.createdAt || s.saleDate || '').startsWith(todayStr)
  )
  const expectedCash = todaysSales
    .filter((s: any) => (s.payment_mode || s.paymentMode) === 'CASH')
    .reduce((sum: number, s: any) => sum + Number(s.total_amount || s.totalAmount || 0), 0)

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA]">
      {/* POS Top Bar */}
      <header className="h-14 bg-[#0F172A] text-white px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit POS
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-semibold">Point of Sale</span>
          </div>
        </div>

        {/* Hold bills bar */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {holdBills.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => handleResumeHold(h)}
              className="h-8 px-2.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap hover:bg-amber-500/30"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              {h.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden xl:inline text-[11px] text-slate-400 mr-2">
            F2 Scan · F4 Pay · F8 Hold
          </span>
          <button
            type="button"
            onClick={() => setShowEodModal(true)}
            className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Calculator className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Day Close</span>
          </button>
        </div>
      </header>

      {/* Main 2-column POS workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* Left Zone: Scan/Search + Catalogue */}
        <div className="lg:col-span-7 xl:col-span-8 p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={scanInputRef}
                autoFocus
                type="text"
                value={scanQuery}
                onChange={(e) => setScanQuery(e.target.value)}
                onKeyDown={handleScanKeyDown}
                placeholder="Scan barcode, type SKU, or search article name… (Press Enter for exact barcode)"
                className="w-full h-11 pl-10 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {brands.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBrandFilter(b)}
                  className={
                    brandFilter === b
                      ? 'px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white'
                      : 'px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }
                >
                  {b === 'ALL' ? 'All brands' : b}
                </button>
              ))}
            </div>
          </div>

          {loadingStock ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-6 w-1/3" />
                </div>
              ))}
            </div>
          ) : stockError ? (
            <ErrorState message={getApiErrorMessage(stockError)} onRetry={refetchStock} />
          ) : filteredArticles.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="w-6 h-6" />}
              title="No footwear articles match"
              description="Clear your search filter or add stock from Purchasing / Inventory."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredArticles.map((art) => (
                <ArticleCard
                  key={art.key}
                  name={art.name}
                  brand={art.brand}
                  mrp={art.mrp}
                  stockQty={art.totalStock}
                  colours={art.colours}
                  onClick={() => setPickingArticle(art)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Zone: Cart, Customer, Totals & Pay */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col justify-between">
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">Current Bill</span>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={handleHoldBill}
                    className="text-xs font-medium text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 border border-amber-200"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    Hold (F8)
                  </button>
                )}
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-xs text-slate-500 hover:text-red-600 px-2 py-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <SearchableCombobox
                  options={[
                    { value: '', label: 'Walk-in Customer' },
                    ...customers.map((c: any) => ({
                      value: c.id,
                      label: c.name,
                      sublabel: c.phone || c.email,
                    })),
                  ]}
                  value={customerId}
                  onChange={setCustomerId}
                  placeholder="Select customer (Walk-in)…"
                  searchPlaceholder="Search by phone or name…"
                  onQuickAdd={() => setShowCustDrawer(true)}
                  quickAddLabel="Quick add customer"
                />
              </div>
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowCustDrawer(true)}
                title="Add customer"
                icon={<UserPlus className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[240px]">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400">
                <ShoppingBag className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm font-medium text-slate-600">Cart is empty</p>
                <p className="text-xs text-slate-400 mt-1">
                  Tap any article on the left or scan a barcode to add pairs.
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const lineTotal = item.unitPrice * item.quantity * (1 - item.discountPct / 100)
                return (
                  <div
                    key={item.sku}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 break-words">
                          {item.articleName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs font-mono text-slate-500">{item.sku}</span>
                          <span className="text-xs text-slate-600">
                            {item.size} · {item.colour}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCart((p) => p.filter((x) => x.sku !== item.sku))}
                        aria-label={`Remove ${item.sku}`}
                        className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <QuantityStepper
                        size="touch"
                        min={1}
                        value={item.quantity}
                        onChange={(qty) =>
                          setCart((p) =>
                            p.map((x) => (x.sku === item.sku ? { ...x, quantity: qty } : x))
                          )
                        }
                      />

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 border border-slate-200 rounded-lg bg-white px-2 h-9">
                          <Percent className="w-3 h-3 text-slate-400" />
                          <input
                            type="number"
                            min={0}
                            max={100}
                            aria-label="Line discount percent"
                            value={item.discountPct || ''}
                            placeholder="0"
                            onChange={(e) => {
                              const pct = Math.min(100, Math.max(0, Number(e.target.value) || 0))
                              setCart((p) =>
                                p.map((x) => (x.sku === item.sku ? { ...x, discountPct: pct } : x))
                              )
                            }}
                            className="w-10 text-xs text-right tabular-nums focus:outline-none"
                          />
                        </div>
                        <div className="text-right min-w-[84px]">
                          <div className="text-sm font-semibold tabular-nums text-slate-900">
                            {formatINR(lineTotal)}
                          </div>
                          <div className="text-[11px] tabular-nums text-slate-500">
                            GST {item.gstRate}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Offers, Totals & Pay */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
            {offers.length > 0 && (
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-teal-600 shrink-0" />
                <div className="flex-1">
                  <SearchableCombobox
                    clearable
                    options={offers.map((o: any) => ({
                      value: o.id,
                      label: o.name,
                      sublabel:
                        o.discountType === 'PERCENTAGE'
                          ? `${o.discountValue}% off`
                          : `${formatINR(o.discountValue)} off`,
                    }))}
                    value={selectedOfferId}
                    onChange={setSelectedOfferId}
                    placeholder="Apply promotional offer…"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} pairs)</span>
                <span className="tabular-nums">{formatINR(subtotal)}</span>
              </div>
              {offerDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Offer discount</span>
                  <span className="tabular-nums">-{formatINR(offerDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>CGST + SGST</span>
                <span className="tabular-nums">{formatINR(gstTotal)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand total</span>
                <span className="tabular-nums text-lg text-teal-700">{formatINR(grandTotal)}</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              disabled={cart.length === 0}
              onClick={() => {
                setCashTendered(grandTotal)
                setSplitCash(Math.floor(grandTotal / 2))
                setShowPayModal(true)
              }}
              className="w-full h-12 text-base font-semibold"
            >
              Pay {formatINR(grandTotal)} (F4)
            </Button>
          </div>
        </div>
      </div>

      {/* Size & Colour Picker Modal */}
      {pickingArticle && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPickingArticle(null)
          }}
        >
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-teal-700">{pickingArticle.brand}</p>
                <h3 className="text-base font-semibold text-slate-900">{pickingArticle.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPickingArticle(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-500">Tap any size to add one pair to the bill.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {pickingArticle.variants.map((v: any) => {
                  const qty = Number(v.quantity ?? 0)
                  const size = v.size_label || v.size || 'UK 8'
                  const colour = v.colour_name || v.colour || 'Standard'
                  return (
                    <button
                      key={v.sku}
                      type="button"
                      onClick={() => {
                        addVariantToCart(v)
                        setPickingArticle(null)
                      }}
                      className="min-h-[68px] p-3 rounded-lg border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 text-left flex flex-col justify-between transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-semibold text-slate-900">{size}</span>
                        <span className="text-xs font-medium tabular-nums text-slate-700">
                          {formatINR(v.selling_price ?? v.mrp ?? 0, 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-1">
                        <ColourSwatch name={colour} />
                        <span
                          className={
                            qty <= 0
                              ? 'text-[11px] font-medium text-red-600'
                              : qty <= 3
                              ? 'text-[11px] font-medium text-amber-700'
                              : 'text-[11px] font-medium text-emerald-700'
                          }
                        >
                          {qty} left
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Collect Payment</h3>
              <button
                type="button"
                disabled={createSaleMutation.isPending}
                onClick={() => setShowPayModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <p className="text-xs text-slate-500">Total payable</p>
                <p className="text-2xl font-semibold tabular-nums text-slate-900 mt-0.5">
                  {formatINR(grandTotal)}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    ['UPI', 'UPI', QrCode],
                    ['CASH', 'Cash', Banknote],
                    ['CARD', 'Card', CreditCard],
                    ['SPLIT', 'Split', Plus],
                  ] as const
                ).map(([mode, lbl, Icon]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={
                      paymentMode === mode
                        ? 'h-12 rounded-lg border-2 border-teal-600 bg-teal-50 text-teal-800 font-medium text-xs flex flex-col items-center justify-center gap-1'
                        : 'h-12 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium text-xs flex flex-col items-center justify-center gap-1'
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {lbl}
                  </button>
                ))}
              </div>

              {paymentMode === 'CASH' && (
                <div className="space-y-2">
                  <FormField label="Cash received">
                    <MoneyInput value={cashTendered} onChange={setCashTendered} />
                  </FormField>
                  <div className="flex justify-between text-sm font-medium pt-1">
                    <span className="text-slate-600">Change to return</span>
                    <span className="tabular-nums text-emerald-700">
                      {formatINR(Math.max(0, cashTendered - grandTotal))}
                    </span>
                  </div>
                </div>
              )}

              {paymentMode === 'SPLIT' && (
                <div className="space-y-2">
                  <FormField label="Cash portion">
                    <MoneyInput value={splitCash} onChange={setSplitCash} max={grandTotal} />
                  </FormField>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Remaining via UPI / Card</span>
                    <span className="tabular-nums font-medium text-slate-900">
                      {formatINR(Math.max(0, grandTotal - splitCash))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPayModal(false)}
                disabled={createSaleMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={createSaleMutation.isPending}
                onClick={handleCompletePayment}
              >
                Confirm & Print Bill
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Sale Success Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Sale Completed</h3>
              <p className="text-sm text-slate-500 mt-1">
                Invoice{' '}
                <span className="font-mono font-medium text-slate-800">
                  {completedSale.document_number || completedSale.docNumber || completedSale.id}
                </span>
              </p>
              <p className="text-2xl font-semibold tabular-nums text-teal-700 mt-2">
                {formatINR(completedSale.grandTotal)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <Button
                variant="outline"
                icon={<Printer className="w-4 h-4" />}
                onClick={() => setShowPrint(true)}
              >
                Print Receipt
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setCompletedSale(null)
                  scanInputRef.current?.focus()
                }}
              >
                New Sale
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print Receipt Preview */}
      <PrintPreview
        open={showPrint && !!completedSale}
        onClose={() => setShowPrint(false)}
        title="Tax Invoice / Receipt"
      >
        {completedSale && (
          <div className="space-y-4 text-xs">
            <div className="text-center border-b border-slate-200 pb-3">
              <h4 className="text-base font-bold">Tax Invoice / Receipt</h4>
              <p className="text-slate-500">SoleControl Retail POS</p>
              <p className="font-mono mt-1">
                {completedSale.document_number || completedSale.docNumber || completedSale.id}
              </p>
              <p className="text-slate-500">{formatDateTimeIN(new Date())}</p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-1 text-left">Item</th>
                  <th className="py-1 text-right">Qty</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(completedSale.itemsSnapshot || []).map((it: CartItem) => (
                  <tr key={it.sku}>
                    <td className="py-1.5">
                      <div className="font-medium">{it.articleName}</div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {it.sku} ({it.size})
                      </div>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{it.quantity}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {formatINR(it.unitPrice * it.quantity * (1 - it.discountPct / 100))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-200 pt-2 space-y-1">
              <div className="flex justify-between">
                <span>Taxable value</span>
                <span className="tabular-nums">{formatINR(completedSale.taxableTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (CGST + SGST)</span>
                <span className="tabular-nums">{formatINR(completedSale.gstTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200">
                <span>Grand Total ({completedSale.paymentMode})</span>
                <span className="tabular-nums">{formatINR(completedSale.grandTotal)}</span>
              </div>
            </div>
            <p className="text-center text-[10px] text-slate-400 pt-2">
              Thank you for shopping with us
            </p>
          </div>
        )}
      </PrintPreview>

      {/* Quick-add Customer Drawer */}
      <Drawer
        open={showCustDrawer}
        onClose={() => setShowCustDrawer(false)}
        title="Quick Add Customer"
        subtitle="Only name and mobile number are required at billing."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCustDrawer(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createCustomerMutation.isPending}
              onClick={() => {
                if (!newCustName.trim() || !newCustPhone.trim()) {
                  toast.error('Name and phone number are required')
                  return
                }
                createCustomerMutation.mutate({ name: newCustName.trim(), phone: newCustPhone.trim() })
              }}
            >
              Save Customer
            </Button>
          </>
        }
      >
        <FormField label="Customer name" required>
          <input
            type="text"
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            placeholder="e.g. Karthik Sundaram"
            className={inputBaseClass}
          />
        </FormField>
        <FormField label="Mobile number" required>
          <input
            type="tel"
            value={newCustPhone}
            onChange={(e) => setNewCustPhone(e.target.value)}
            placeholder="10-digit mobile number"
            className={inputBaseClass}
          />
        </FormField>
      </Drawer>

      {/* End-of-day Cash Close Modal */}
      {showEodModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">End-of-Day Cash Close</h3>
              <button
                type="button"
                onClick={() => setShowEodModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Today&apos;s bills</span>
                <span className="font-medium tabular-nums">{todaysSales.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Expected cash in drawer</span>
                <span className="font-semibold tabular-nums">{formatINR(expectedCash)}</span>
              </div>
              <FormField label="Actual counted cash">
                <MoneyInput value={eodActualCash} onChange={setEodActualCash} />
              </FormField>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-600">Variance</span>
                <StatusBadge
                  status={eodActualCash === expectedCash ? 'ACTIVE' : 'PENDING'}
                  label={formatINR(eodActualCash - expectedCash)}
                  tone={eodActualCash === expectedCash ? 'success' : 'warning'}
                />
              </div>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEodModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
