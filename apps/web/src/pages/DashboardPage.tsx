import { useQuery } from '@tanstack/react-query'
import { api, fmt } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { format } from 'date-fns'
import { AlertCircle, CheckCircle2, Info, TrendingUp, ShoppingBag, Boxes, Clock } from 'lucide-react'

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
  icon: Icon,
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
  icon?: any
}) {
  return (
    <div
      className="p-5 rounded-xl border flex flex-col justify-between"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
          {label}
        </div>
        {Icon && <Icon className="w-4 h-4" style={{ color: color || 'var(--color-muted)' }} />}
      </div>
      <div className="text-2xl font-semibold tabular-nums font-mono" style={{ color: color || 'var(--color-text)' }}>
        {value}
      </div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{sub}</div>}
    </div>
  )
}

function InsightCard({ type, message, severity }: { type: string; message: string; severity: 'info' | 'warning' | 'danger' }) {
  const getBadgeStyle = () => {
    switch (severity) {
      case 'danger':
        return {
          bg: 'rgba(239, 68, 68, 0.1)',
          border: 'var(--color-danger)',
          text: 'var(--color-danger)',
          Icon: AlertCircle,
        }
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.1)',
          border: 'var(--color-warning)',
          text: 'var(--color-warning)',
          Icon: AlertCircle,
        }
      case 'info':
      default:
        return {
          bg: 'var(--color-primary-soft)',
          border: 'var(--color-primary)',
          text: 'var(--color-primary)',
          Icon: Info,
        }
    }
  }

  const { bg, border, text, Icon } = getBadgeStyle()

  return (
    <div
      className="p-3.5 rounded-lg border flex items-start gap-3"
      style={{ background: bg, borderColor: border }}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: text }} />
      <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
        <span className="uppercase text-xs font-semibold mr-2 px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface)', color: text }}>
          {type}
        </span>
        {message}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

  const { data: kpisData, isLoading: loadingKpis } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => api.get('/dashboard/kpis').then((r) => r.data.data),
  })

  const { data: insightsData } = useQuery({
    queryKey: ['dashboard', 'insights'],
    queryFn: () => api.get('/dashboard/insights').then((r) => r.data.data),
  })

  const { data: recentSales } = useQuery({
    queryKey: ['dashboard', 'recent-sales'],
    queryFn: () => api.get('/dashboard/recent-sales').then((r) => r.data.data),
  })

  const { data: targets } = useQuery({
    queryKey: ['dashboard', 'targets'],
    queryFn: () => api.get('/dashboard/targets').then((r) => r.data.data),
  })

  const cardStyle = { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>
            {greeting}, {user?.name?.split(' ')[0] || 'Super Admin'} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            {format(new Date(), 'EEEE, d MMMM yyyy')} · Store real-time overview & performance
          </p>
        </div>
      </div>

      {/* 4 KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Today's Sales"
          value={loadingKpis ? '...' : fmt(kpisData?.todaySales || 0)}
          sub="Gross revenue today"
          color="var(--color-primary)"
          icon={TrendingUp}
        />
        <KpiCard
          label="Transactions"
          value={loadingKpis ? '...' : (kpisData?.todayTransactions ?? 0)}
          sub="Completed sales today"
          color="var(--color-success)"
          icon={ShoppingBag}
        />
        <KpiCard
          label="Total Stock Units"
          value={loadingKpis ? '...' : (kpisData?.totalStock?.toLocaleString('en-IN') ?? 0)}
          sub="Units on hand in active inventory"
          color="var(--color-text)"
          icon={Boxes}
        />
        <KpiCard
          label="Pending Purchases"
          value={loadingKpis ? '...' : (kpisData?.pendingPurchases ?? 0)}
          sub="Draft bills awaiting finalisation"
          color={kpisData?.pendingPurchases > 0 ? 'var(--color-warning)' : 'var(--color-muted)'}
          icon={Clock}
        />
      </div>

      {/* Insights Section */}
      {insightsData && insightsData.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--color-muted)' }}>
            System Alerts & Operational Insights
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insightsData.map((item: any, i: number) => (
              <InsightCard key={i} type={item.type} message={item.message} severity={item.severity} />
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Recent Sales & Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales Table */}
        <div className="rounded-xl border overflow-hidden flex flex-col" style={cardStyle}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Recent Sales</h2>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Latest completed customer sales</p>
            </div>
            <a href="/sales" className="text-xs font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
              View all sales →
            </a>
          </div>

          <div className="flex-1 divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {(!recentSales || recentSales.length === 0) ? (
              <div className="p-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>
                No sales recorded yet
              </div>
            ) : (
              recentSales.map((s: any, idx: number) => (
                <div key={idx} className="px-5 py-3.5 flex items-center justify-between hover:opacity-90 transition-opacity">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold font-mono" style={{ color: 'var(--color-text)' }}>
                      {s.doc_number || 'SALE-DOC'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      {s.customer_name || 'Walk-in Customer'} · {safeDate(s.sale_date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold font-mono" style={{ color: 'var(--color-success)' }}>
                      {fmt(Number(s.total_amount || 0))}
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
            {(!targets || targets.length === 0) ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>
                No active sales targets configured
              </div>
            ) : (
              targets.map((t: any, idx: number) => {
                const targetVal = Number(t.target_amount || t.target || 0)
                const achievedVal = Number(t.achieved || 0)
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
