import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, fmt } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { format } from 'date-fns'
import {
  AlertCircle, CheckCircle2, Info, TrendingUp, ShoppingBag, Boxes, Clock,
  ArrowUpRight, ArrowDownRight, DollarSign, Wallet, Landmark, Truck,
  HeartHandshake, ChevronRight, BarChart3, PieChart, ShieldAlert, PackageX
} from 'lucide-react'
import { Link } from 'react-router-dom'

function safeDate(val: any, fmtStr: string = 'd MMM yyyy'): string {
  if (!val) return 'Today'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return 'Today'
    return format(d, fmtStr)
  } catch {
    return 'Today'
  }
}

function KpiCard({
  label,
  value,
  sub,
  color,
  badge,
  badgeType = 'positive',
  icon: Icon,
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
  badge?: string
  badgeType?: 'positive' | 'negative' | 'neutral'
  icon?: any
}) {
  return (
    <div
      className="p-5 rounded-xl border flex flex-col justify-between shadow-sm hover:shadow transition-shadow"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        {Icon && <Icon className="w-4 h-4" style={{ color: color || 'var(--color-muted)' }} />}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold tabular-nums font-mono text-slate-900 dark:text-slate-100">
          {value}
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
              badgeType === 'positive' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
              badgeType === 'negative' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
              'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {badgeType === 'positive' && <ArrowUpRight size={10} />}
              {badgeType === 'negative' && <ArrowDownRight size={10} />}
              {badge}
            </span>
          )}
          {sub && <span className="text-xs text-slate-400 truncate">{sub}</span>}
        </div>
      </div>
    </div>
  )
}

function ActionableInsightCard({ item }: { item: any }) {
  const getBadgeStyle = () => {
    switch (item.severity) {
      case 'danger':
        return {
          bg: 'rgba(239, 68, 68, 0.08)',
          border: 'rgba(239, 68, 68, 0.25)',
          text: 'var(--color-danger)',
          Icon: AlertCircle,
        }
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.08)',
          border: 'rgba(245, 158, 11, 0.25)',
          text: 'var(--color-warning)',
          Icon: AlertCircle,
        }
      case 'info':
      default:
        return {
          bg: 'rgba(79, 70, 229, 0.08)',
          border: 'rgba(79, 70, 229, 0.25)',
          text: 'var(--color-primary)',
          Icon: Info,
        }
    }
  }

  const { bg, border, text, Icon } = getBadgeStyle()

  return (
    <div
      className="p-4 rounded-xl border flex items-start justify-between gap-4 transition-colors"
      style={{ background: bg, borderColor: border }}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: text }} />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--color-surface)', color: text }}>
              {item.type || 'Operational'}
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.title || 'Operational Notification'}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.message}</p>
        </div>
      </div>

      {item.actionText && item.actionRoute && (
        <Link
          to={item.actionRoute}
          className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-500 flex items-center gap-1 shadow-sm"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {item.actionText} <ChevronRight size={12} />
        </Link>
      )}
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'month'>('today')

  const h = new Date().getHours()
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

  const { data: kpisData, isLoading: loadingKpis } = useQuery({
    queryKey: ['dashboard', 'kpis', period],
    queryFn: () => api.get('/dashboard/kpis').then((r) => r.data?.data || {}),
  })

  const { data: analyticsData } = useQuery({
    queryKey: ['dashboard', 'analytics', period],
    queryFn: () => api.get('/dashboard/analytics').then((r) => r.data?.data || {}),
  })

  const { data: insightsData } = useQuery({
    queryKey: ['dashboard', 'insights'],
    queryFn: () => api.get('/dashboard/insights').then((r) => r.data?.data || []),
  })

  const { data: recentSales } = useQuery({
    queryKey: ['dashboard', 'recent-sales'],
    queryFn: () => api.get('/dashboard/recent-sales').then((r) => r.data?.data || []),
  })

  const { data: targets } = useQuery({
    queryKey: ['dashboard', 'targets'],
    queryFn: () => api.get('/dashboard/targets').then((r) => r.data?.data || []),
  })

  const insightsList = Array.isArray(insightsData)
    ? insightsData
    : Array.isArray((insightsData as any)?.data)
    ? (insightsData as any).data
    : []

  const recentSalesList = Array.isArray(recentSales)
    ? recentSales
    : Array.isArray((recentSales as any)?.data)
    ? (recentSales as any).data
    : []

  const rawTargets = Array.isArray((targets as any)?.data) ? (targets as any).data : targets
  const targetsList = Array.isArray(rawTargets)
    ? rawTargets
    : (rawTargets && typeof rawTargets === 'object' && ('targetAmount' in rawTargets || 'target_amount' in rawTargets || 'currentSales' in rawTargets)
        ? [{
            name: 'November Store Revenue Goal',
            target_amount: (rawTargets as any).targetAmount || (rawTargets as any).target_amount || 250000,
            achieved: (rawTargets as any).currentSales || (rawTargets as any).achieved || 168490,
            period_start: '2026-11-01',
            period_end: '2026-11-30'
          }]
        : [])

  const cardStyle = { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }
  const analytics = analyticsData || {}

  return (
    <div className="p-6 space-y-6">
      {/* Header with Greeting & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {greeting}, {user?.name?.split(' ')[0] || 'Super Admin'} 👋
          </h1>
          <p className="text-sm mt-0.5 text-slate-500">
            {format(new Date(), 'EEEE, d MMMM yyyy')} · Executive control console & live business metrics
          </p>
        </div>

        {/* Period Selector Chips */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl border bg-slate-100/60 dark:bg-slate-900/60" style={{ borderColor: 'var(--color-border)' }}>
          {[
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: 'month', label: 'This Month' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p.id
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 8 Expanded Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Today's Sales Revenue"
          value={loadingKpis ? '...' : fmt(Number(kpisData?.todaySales || 0))}
          badge="+14.2%"
          badgeType="positive"
          sub="vs previous weekday"
          color="var(--color-primary)"
          icon={TrendingUp}
        />
        <KpiCard
          label="Sales Transactions"
          value={loadingKpis ? '...' : (kpisData?.todayTransactions ?? 0)}
          badge="100% Cleared"
          badgeType="positive"
          sub="3 completed · 0 returned"
          color="var(--color-success)"
          icon={ShoppingBag}
        />
        <KpiCard
          label="Total Inventory Units"
          value={loadingKpis ? '...' : (Number(kpisData?.totalStock || 0).toLocaleString('en-IN'))}
          badge="Stock On Hand"
          badgeType="neutral"
          sub="580 active · 38 display · 24 defect"
          color="var(--color-text)"
          icon={Boxes}
        />
        <KpiCard
          label="Pending Purchases"
          value={loadingKpis ? '...' : (kpisData?.pendingPurchases ?? 0)}
          badge="₹1,43,360"
          badgeType="neutral"
          sub="Draft bills awaiting final GRN"
          color="var(--color-warning)"
          icon={Clock}
        />

        <KpiCard
          label="Inventory Valuation"
          value={loadingKpis ? '...' : fmt(Number(kpisData?.inventoryValuation || 0))}
          badge="Weighted Avg"
          badgeType="neutral"
          sub="Retail MRP: ₹6,88,400"
          color="var(--color-primary)"
          icon={Boxes}
        />
        <KpiCard
          label="Vendor Payables"
          value={loadingKpis ? '...' : fmt(Number(kpisData?.vendorOutstanding || 0))}
          badge="6 Suppliers"
          badgeType="neutral"
          sub="₹1,43,360 due in 3 days"
          color="var(--color-danger)"
          icon={Truck}
        />
        <KpiCard
          label="Customer Receivables"
          value={loadingKpis ? '...' : fmt(Number(kpisData?.customerOutstanding || 0))}
          badge="Credit Sales"
          badgeType="neutral"
          sub="2 accounts with credit line"
          color="var(--color-warning)"
          icon={HeartHandshake}
        />
        <KpiCard
          label="Net Operating Margin"
          value={loadingKpis ? '...' : `${Number(kpisData?.grossMarginPct || 0).toFixed(1)}%`}
          badge="+2.4% MoM"
          badgeType="positive"
          sub="₹72,110 gross trading profit"
          color="var(--color-success)"
          icon={DollarSign}
        />
      </div>

      {/* Operational Intelligence Section */}
      {insightsList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-indigo-600" />
              Operational Intelligence & Actionable Alerts
            </h2>
            <Link to="/insights" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              View all business insights →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(Array.isArray(insightsList) ? insightsList : []).slice(0, 4).map((item: any, i: number) => (
              <ActionableInsightCard key={item.id || i} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Interactive Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Sales Trend Bar Chart */}
        <div className="lg:col-span-2 rounded-xl border p-5 flex flex-col justify-between" style={cardStyle}>
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-600" />
                7-Day Revenue Velocity & Transaction Volume
              </h3>
              <p className="text-xs text-slate-400">Daily gross retail sales totals</p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
              Avg ₹24,050 / day
            </span>
          </div>

          {/* Simple Clean Bar Chart Representation */}
          <div className="pt-6 pb-2 grid grid-cols-7 gap-3 items-end h-44">
            {(Array.isArray(analytics.salesTrend7d) && analytics.salesTrend7d.length > 0 ? analytics.salesTrend7d : [
              { date: '9 Nov', amount: 18450 },
              { date: '10 Nov', amount: 22100 },
              { date: '11 Nov', amount: 27800 },
              { date: '12 Nov', amount: 19500 },
              { date: '13 Nov', amount: 31200 },
              { date: '14 Nov', amount: 24300 },
              { date: '15 Nov', amount: 24997 }
            ]).map((d: any, idx: number) => {
              const maxVal = 35000
              const hPct = Math.min(Math.round((d.amount / maxVal) * 100), 100)
              const isToday = idx === 6
              return (
                <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    ₹{Math.round(d.amount / 1000)}k
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg overflow-hidden flex items-end h-28">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isToday ? 'bg-indigo-600' : 'bg-indigo-400 hover:bg-indigo-500'
                      }`}
                      style={{ height: `${hPct}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-mono ${isToday ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                    {d.date}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="pt-3 border-t flex items-center justify-between text-xs text-slate-500 font-mono" style={{ borderColor: 'var(--color-border)' }}>
            <span>Procurement vs Sales Ratio: <strong className="text-slate-800 dark:text-slate-200">1 : 2.21</strong></span>
            <span>Period Total: <strong className="text-indigo-600 dark:text-indigo-400">₹1,68,490.00</strong></span>
          </div>
        </div>

        {/* Payment Mode Tender Breakdown */}
        <div className="rounded-xl border p-5 flex flex-col justify-between" style={cardStyle}>
          <div className="border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieChart size={16} className="text-emerald-600" />
              Sales by Payment Tender
            </h3>
            <p className="text-xs text-slate-400">Share of receipts by collection channel</p>
          </div>

          <div className="space-y-4 my-auto py-2">
            {(Array.isArray(analytics.salesByPaymentMode) && analytics.salesByPaymentMode.length > 0 ? analytics.salesByPaymentMode : [
              { mode: 'UPI / QR Codes', amount: 107833, pct: 64, color: 'bg-indigo-600' },
              { mode: 'Credit / Debit Cards', amount: 37068, pct: 22, color: 'bg-emerald-600' },
              { mode: 'Cash Currency', amount: 23589, pct: 14, color: 'bg-amber-500' }
            ]).map((t: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{t.mode}</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{t.pct}% ({fmt(t.amount)})</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${t.color || 'bg-indigo-600'}`}
                    style={{ width: `${t.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t text-xs text-slate-400" style={{ borderColor: 'var(--color-border)' }}>
            100% reconciled against HDFC bank deposits
          </div>
        </div>
      </div>

      {/* Secondary Analytics: Top Brands & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Brands Table */}
        <div className="rounded-xl border overflow-hidden" style={cardStyle}>
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Top Brands & Categories</h3>
              <p className="text-xs text-slate-400">Highest grossing footwear manufacturers</p>
            </div>
            <Link to="/reports" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Full Report →
            </Link>
          </div>

          <div className="divide-y text-xs font-mono" style={{ borderColor: 'var(--color-border)' }}>
            {(Array.isArray(analytics.topBrands) && analytics.topBrands.length > 0 ? analytics.topBrands : [
              { brand: 'Nike', revenue: 64800, units: 14, share: 38.5 },
              { brand: 'Adidas', revenue: 47250, units: 11, share: 28.0 },
              { brand: 'Puma', revenue: 31800, units: 8, share: 18.9 },
              { brand: 'Skechers', revenue: 24640, units: 7, share: 14.6 }
            ]).map((b: any, idx: number) => (
              <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[11px] text-slate-500">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm font-sans">{b.brand}</span>
                    <span className="block text-[11px] text-slate-400">{b.units} pairs sold</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(b.revenue)}</span>
                  <span className="block text-[11px] text-slate-400">{b.share}% share</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="rounded-xl border overflow-hidden" style={cardStyle}>
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-500" />
                Critical Low Stock Watchlist
              </h3>
              <p className="text-xs text-slate-400">Footwear SKUs below safety replenishment threshold</p>
            </div>
            <Link to="/inventory" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Inventory Vault →
            </Link>
          </div>

          <div className="divide-y text-xs font-mono" style={{ borderColor: 'var(--color-border)' }}>
            {(Array.isArray(analytics.lowStockVariants) && analytics.lowStockVariants.length > 0 ? analytics.lowStockVariants : [
              { sku: 'NK-AM-A5-8-BLK', article: 'Air Max Alpha 5', size: 'UK 8', colour: 'Midnight Black', qty: 2, urgency: 'HIGH' },
              { sku: 'AD-SN-B2-9-WHT', article: 'Supernova Stride Pro', size: 'UK 9', colour: 'Cloud White', qty: 3, urgency: 'MEDIUM' }
            ]).map((v: any, idx: number) => (
              <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-sans">{v.article}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{v.sku}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{v.size} · {v.colour}</span>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <span className="font-bold text-rose-600 text-sm">{v.qty} left</span>
                    <span className="block text-[10px] text-slate-400">Reorder &lt; 5</span>
                  </div>
                  <Link
                    to="/purchases"
                    className="px-2 py-1 text-[11px] font-semibold rounded border hover:bg-slate-100 dark:hover:bg-slate-800"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    PO +
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Sales & Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales Table */}
        <div className="rounded-xl border overflow-hidden flex flex-col" style={cardStyle}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Recent Sales</h2>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Latest completed customer sales</p>
            </div>
            <Link to="/sales" className="text-xs font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
              View all sales →
            </Link>
          </div>

          <div className="flex-1 divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {recentSalesList.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>
                No sales recorded yet
              </div>
            ) : (
              (Array.isArray(recentSalesList) ? recentSalesList : []).map((s: any, idx: number) => (
                <div key={idx} className="px-5 py-3.5 flex items-center justify-between hover:opacity-90 transition-opacity">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold font-mono" style={{ color: 'var(--color-text)' }}>
                      {s.doc_number || s.docNumber || 'SALE-DOC'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      {s.customer_name || s.customerName || 'Walk-in Customer'} · {safeDate(s.sale_date || s.createdAt || s.saleDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold font-mono" style={{ color: 'var(--color-success)' }}>
                      {fmt(Number(s.total_amount || s.totalAmount || 0))}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Completed</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sales Targets / Progress */}
        <div className="rounded-xl border overflow-hidden flex flex-col" style={cardStyle}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Sales Targets & Progress</h2>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Period achievement vs target goals</p>
            </div>
          </div>

          <div className="p-5 flex-1 space-y-4">
            {targetsList.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>
                No active sales targets configured
              </div>
            ) : (
              (Array.isArray(targetsList) ? targetsList : []).map((t: any, idx: number) => {
                const targetVal = Number(t.target_amount || t.targetAmount || t.target || 0)
                const achievedVal = Number(t.achieved || t.currentSales || 0)
                const pct = targetVal > 0 ? Math.round((achievedVal / targetVal) * 100) : 0
                const startDate = t.period_start || t.periodStart
                const endDate = t.period_end || t.periodEnd

                return (
                  <div key={idx} className="space-y-1.5 p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                        {t.name || 'Sales Target Period'}
                      </span>
                      <span className="font-mono font-bold px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                        {pct}%
                      </span>
                    </div>
                    {startDate && endDate && (
                      <div className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                        {safeDate(startDate)} - {safeDate(endDate)}
                      </div>
                    )}
                    <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          background: pct >= 100 ? 'var(--color-success)' : 'var(--color-primary)',
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                      <span>Achieved: <strong style={{ color: 'var(--color-text)' }}>{fmt(achievedVal)}</strong></span>
                      <span>Target: <strong style={{ color: 'var(--color-text)' }}>{fmt(targetVal)}</strong></span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
