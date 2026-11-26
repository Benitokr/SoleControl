import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, Receipt, Boxes, AlertTriangle, ShoppingBag, Truck,
  HeartHandshake, Percent, ArrowRight,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatDateIN, getApiErrorMessage } from '../lib/format'
import { useAuthStore } from '../store/authStore'
import {
  PageHeader, StatCard, StatusBadge, Button, SearchableCombobox,
  StatCardsSkeleton, ErrorState, EmptyState,
} from '../components/ui'

const CHART_COLORS = ['#0D9488', '#0284C7', '#D97706', '#059669', '#64748B']

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('today')
  const [storeId, setStoreId] = useState('ALL')

  const isCashier = ['CASHIER', 'SALES_EXECUTIVE'].includes(
    String(user?.roleCode || '').toUpperCase()
  )

  const { data: kpisData, isLoading: loadingKpis, error: kpisError, refetch } = useQuery({
    queryKey: ['dashboard', 'kpis', period, storeId],
    queryFn: () => api.get('/dashboard/kpis', { params: { period, storeId } }).then((r) => r.data?.data ?? {}),
  })

  const { data: analyticsData } = useQuery({
    queryKey: ['dashboard', 'analytics', period],
    queryFn: () => api.get('/dashboard/analytics').then((r) => r.data?.data ?? {}),
  })

  const { data: recentSalesData } = useQuery({
    queryKey: ['dashboard', 'recent-sales'],
    queryFn: () => api.get('/dashboard/recent-sales').then((r) => r.data?.data ?? []),
  })

  const { data: insightsData } = useQuery({
    queryKey: ['dashboard', 'insights'],
    queryFn: () => api.get('/dashboard/insights').then((r) => r.data?.data ?? []),
  })

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/company/stores').then((r) => r.data?.data ?? []),
  })

  const { data: stockData } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then((r) => r.data?.data ?? []),
  })

  const kpis = kpisData || {}
  const analytics = analyticsData || {}
  const recentSales: any[] = Array.isArray(recentSalesData) ? recentSalesData : []
  const insights: any[] = Array.isArray(insightsData) ? insightsData : []
  const stores: any[] = Array.isArray(storesData) ? storesData : []
  const stockRows: any[] = Array.isArray(stockData) ? stockData : []

  const lowStockCount = useMemo(
    () => stockRows.filter((s) => Number(s.quantity ?? 0) > 0 && Number(s.quantity ?? 0) <= 5).length,
    [stockRows]
  )

  const todaySalesVal = Number(kpis.todaySales ?? 0)
  const todayBills = Number(kpis.todayTransactions ?? 0)
  const avgBill = todayBills > 0 ? todaySalesVal / todayBills : 0
  const trendData: any[] = Array.isArray(analytics.salesTrend7d) ? analytics.salesTrend7d : []
  const paymentSplit: any[] = Array.isArray(analytics.paymentModeSplit)
    ? analytics.paymentModeSplit
    : []

  if (isCashier) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome, ${user?.name || 'Cashier'}`}
          description="Quick POS billing and today's shift summary."
          primaryAction={
            <Button
              variant="primary"
              size="lg"
              icon={<ShoppingBag className="w-4 h-4" />}
              onClick={() => navigate('/sales/pos')}
            >
              Start Billing
            </Button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Today's sales" value={formatINR(todaySalesVal)} tone="teal" />
          <StatCard label="Today's bills" value={todayBills} tone="success" />
          <StatCard label="Average bill value" value={formatINR(avgBill)} />
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Today&apos;s Bills</h2>
          {recentSales.length === 0 ? (
            <EmptyState
              title="No bills created today"
              description="Open POS billing to ring up your first customer."
              action={
                <Button variant="primary" onClick={() => navigate('/sales/pos')}>
                  Start Billing
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentSales.slice(0, 8).map((s: any, idx: number) => (
                <div key={s.id || idx} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-mono text-xs font-medium text-teal-700">
                      {s.document_number || s.docNumber || s.id}
                    </span>
                    <span className="text-slate-500 ml-2">
                      {s.customer?.name || 'Walk-in'}
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums">
                    {formatINR(s.total_amount ?? s.totalAmount ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const firstName = user?.name?.trim()?.split(/\s+/)[0]
  const greetingText = firstName
    ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${firstName}`
    : 'Welcome back'

  return (
    <div className="space-y-6">
      <PageHeader
        title={greetingText}
        description="Executive retail overview across sales, inventory, and payables."
        secondaryActions={
          <div className="flex items-center gap-2 flex-wrap">
            {stores.length > 1 && (
              <div className="w-44">
                <SearchableCombobox
                  options={[
                    { value: 'ALL', label: 'All stores' },
                    ...stores.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                  value={storeId}
                  onChange={setStoreId}
                />
              </div>
            )}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              {(
                [
                  ['today', 'Today'],
                  ['7d', '7 days'],
                  ['30d', '30 days'],
                ] as const
              ).map(([k, lbl]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPeriod(k)}
                  className={
                    period === k
                      ? 'px-3 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white'
                      : 'px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900'
                  }
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {loadingKpis ? (
        <StatCardsSkeleton count={8} />
      ) : kpisError ? (
        <ErrorState message={getApiErrorMessage(kpisError)} onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Today's sales"
            value={formatINR(todaySalesVal)}
            subtext="Gross retail turnover"
            icon={<TrendingUp className="w-4 h-4" />}
            tone="teal"
            onClick={() => navigate('/sales')}
          />
          <StatCard
            label="Bills count"
            value={todayBills}
            subtext="Completed POS invoices"
            icon={<Receipt className="w-4 h-4" />}
            tone="success"
            onClick={() => navigate('/sales')}
          />
          <StatCard
            label="Average bill value"
            value={formatINR(avgBill)}
            subtext="Revenue per invoice"
            onClick={() => navigate('/sales')}
          />
          <StatCard
            label="Gross margin"
            value={`${Number(kpis.grossMarginPct ?? 0).toFixed(1)}%`}
            subtext="Estimated retail margin"
            icon={<Percent className="w-4 h-4" />}
            tone="success"
            onClick={() => navigate('/reports')}
          />
          <StatCard
            label="Stock value (cost)"
            value={formatINR(kpis.inventoryValuation ?? 0)}
            subtext={`${Number(kpis.totalStock ?? 0).toLocaleString('en-IN')} pairs on hand`}
            icon={<Boxes className="w-4 h-4" />}
            onClick={() => navigate('/inventory')}
          />
          <StatCard
            label="Low stock (≤5 pairs)"
            value={lowStockCount}
            subtext="Threshold: ≤5 pairs per SKU"
            icon={<AlertTriangle className="w-4 h-4" />}
            tone={lowStockCount > 0 ? 'warning' : 'default'}
            onClick={() => navigate('/inventory?filter=LOW')}
          />
          <StatCard
            label="Vendor payables"
            value={formatINR(kpis.vendorOutstanding ?? 0)}
            subtext="Outstanding supplier dues"
            icon={<Truck className="w-4 h-4" />}
            tone={Number(kpis.vendorOutstanding ?? 0) > 0 ? 'danger' : 'default'}
            onClick={() => navigate('/vendors')}
          />
          <StatCard
            label="Customer receivables"
            value={formatINR(kpis.customerOutstanding ?? 0)}
            subtext="Credit balance due"
            icon={<HeartHandshake className="w-4 h-4" />}
            onClick={() => navigate('/customers')}
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">7-day sales trend</h2>
          {!trendData.some((d) => Number(d.amount || 0) > 0) ? (
            <EmptyState
              title="No sales trend data yet"
              description="Complete POS invoices to see daily sales performance."
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip formatter={(v: any) => formatINR(v)} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#0D9488"
                    fill="#CCFBF1"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Payment mode split</h2>
          {paymentSplit.length === 0 ? (
            <EmptyState
              title="No payment data yet"
              description="Payment distribution appears once bills are settled."
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentSplit}
                    dataKey="amount"
                    nameKey="mode"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {paymentSplit.map((_entry, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatINR(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Needs Attention & Recent Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Needs attention</h2>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="text-xs font-medium text-teal-700 hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {insights.length === 0 && Number(kpis.pendingPurchases ?? 0) === 0 && lowStockCount === 0 ? (
            <p className="text-sm text-slate-500 py-4">No urgent operational alerts right now.</p>
          ) : (
            <div className="space-y-2">
              {lowStockCount > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-sm">
                  <span className="text-amber-900">
                    {lowStockCount} SKUs are at low stock (5 pairs or fewer)
                  </span>
                  <Button size="sm" variant="outline" onClick={() => navigate('/inventory')}>
                    Review
                  </Button>
                </div>
              )}
              {Number(kpis.pendingPurchases ?? 0) > 0 && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-800">
                    {kpis.pendingPurchases} draft purchase bills awaiting goods inward
                  </span>
                  <Button size="sm" variant="outline" onClick={() => navigate('/purchases')}>
                    Open
                  </Button>
                </div>
              )}
              {insights.slice(0, 4).map((ins: any, i: number) => (
                <div
                  key={ins.id || i}
                  className="p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">{ins.title || 'Alert'}</p>
                    <p className="text-xs text-slate-500">{ins.message}</p>
                  </div>
                  {ins.actionRoute && (
                    <Button size="sm" variant="outline" onClick={() => navigate(ins.actionRoute)}>
                      {ins.actionText || 'View'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Recent bills</h2>
            <button
              type="button"
              onClick={() => navigate('/sales')}
              className="text-xs font-medium text-teal-700 hover:underline inline-flex items-center gap-1"
            >
              All sales <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentSales.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No recent invoices yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentSales.slice(0, 6).map((s: any, idx: number) => (
                <div key={s.id || idx} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                  <div>
                    <span className="font-mono text-xs font-medium text-teal-700">
                      {s.document_number || s.docNumber || String(s.id).slice(0, 10)}
                    </span>
                    <span className="text-slate-600 ml-2">
                      {s.customer?.name || 'Walk-in'}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">
                      {formatDateIN(s.created_at || s.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={s.status || 'COMPLETED'} />
                    <span className="font-semibold tabular-nums">
                      {formatINR(s.total_amount ?? s.totalAmount ?? 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
