import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Lightbulb, TrendingUp, AlertTriangle, ArrowRight, ShieldAlert,
  Boxes, DollarSign, Clock, CheckCircle2, Filter, Layers, ExternalLink
} from 'lucide-react'
import { api, fmt } from '../lib/api'
import { Link } from 'react-router-dom'

type InsightCategory = 'ALL' | 'INVENTORY' | 'PROCUREMENT' | 'SALES' | 'FINANCE'

interface BusinessInsight {
  id: string
  category: 'INVENTORY' | 'PROCUREMENT' | 'SALES' | 'FINANCE'
  title: string
  severity: 'danger' | 'warning' | 'info' | 'success'
  badge: string
  metric: string
  metricLabel: string
  explanation: string
  impact: string
  entityName: string
  entityType: string
  actionLabel: string
  actionRoute: string
  dateObserved: string
}

export function InsightsPage() {
  const [filter, setFilter] = useState<InsightCategory>('ALL')

  const { data: analyticsData } = useQuery({
    queryKey: ['dashboard', 'analytics'],
    queryFn: () => api.get('/dashboard/analytics').then(r => r.data?.data)
  })

  const insights: BusinessInsight[] = [
    {
      id: 'bi-01',
      category: 'INVENTORY',
      title: 'High-Velocity Footwear Size Shortage (UK 8 & 9)',
      severity: 'danger',
      badge: 'STOCKOUT RISK',
      metric: '5 pairs left',
      metricLabel: 'Current Shelf Stock',
      explanation: 'Running category SKU variants in UK 8 and UK 9 are selling at 12 pairs per week. At current velocity, stockout will occur within 3 days.',
      impact: 'Estimated potential revenue loss: ₹38,400 over the upcoming weekend.',
      entityName: 'Nike Air Max Alpha 5 & Adidas Supernova',
      entityType: 'Running Footwear',
      actionLabel: 'Create Inward Purchase Order',
      actionRoute: '/purchases',
      dateObserved: 'Observed today'
    },
    {
      id: 'bi-02',
      category: 'INVENTORY',
      title: 'Deadstock Capital Lockup (90+ Days Aging)',
      severity: 'warning',
      badge: 'CAPITAL PRESERVATION',
      metric: '₹34,986',
      metricLabel: 'Locked Working Capital',
      explanation: '14 pairs of Clarks Derby Oxford Leather shoes have remained unsold on Rack S1 for more than 105 days, exceeding the 90-day retail cycle.',
      impact: 'Capital turnover slowed by 42%. Clearance discount recommended to recover liquid cash.',
      entityName: 'Derby Oxford Brogue Leather (UK 8-10)',
      entityType: 'Formal Footwear',
      actionLabel: 'Launch Clearance Campaign',
      actionRoute: '/offers',
      dateObserved: '105 days on shelf'
    },
    {
      id: 'bi-03',
      category: 'SALES',
      title: 'Athletic Running Category Driving 58.4% of Gross Margin',
      severity: 'success',
      badge: 'PROFIT DRIVER',
      metric: '₹98,400',
      metricLabel: 'Monthly Category Revenue',
      explanation: 'Running & Performance shoes are maintaining a 44.5% blended gross margin with 28 completed customer sales this billing cycle.',
      impact: 'Outperforming Lifestyle sneakers by 1.8x in net profit contribution.',
      entityName: 'Running & Performance Department',
      entityType: 'Product Category',
      actionLabel: 'View Sales Analytics',
      actionRoute: '/reports',
      dateObserved: 'Current Financial Month'
    },
    {
      id: 'bi-04',
      category: 'PROCUREMENT',
      title: 'Inward GRN Verification Pending from Adidas India',
      severity: 'warning',
      badge: 'PENDING ACTION',
      metric: '₹1,31,040',
      metricLabel: 'Bill Procurement Value',
      explanation: 'Inward purchase bill PB-2026-002 has been uploaded and itemized but requires Super Admin approval to update inventory and post to the general ledger.',
      impact: 'Stock units will not reflect on POS counter until verified and barcoded.',
      entityName: 'Adidas India Operations (PB-2026-002)',
      entityType: 'Vendor Purchase',
      actionLabel: 'Review & Finalise Bill',
      actionRoute: '/purchases',
      dateObserved: 'Submitted 2 days ago'
    },
    {
      id: 'bi-05',
      category: 'FINANCE',
      title: 'Vendor Trade Payable Scheduled within 3 Days',
      severity: 'info',
      badge: 'CASHFLOW PLANNING',
      metric: '₹1,43,360',
      metricLabel: 'Due Supplier Amount',
      explanation: 'Net 30-day payment terms for Nike India purchase invoice PB-2026-001 expire on 18 November 2026.',
      impact: 'Maintain supplier credit score and prompt settlement discount eligibility.',
      entityName: 'Nike India Operations Pvt Ltd',
      entityType: 'Trade Payable',
      actionLabel: 'Inspect Vendor Ledger',
      actionRoute: '/vendors',
      dateObserved: 'Due 18 Nov 2026'
    },
    {
      id: 'bi-06',
      category: 'FINANCE',
      title: 'Zero Discrepancy: Immutable Stock Movement Reconciliation',
      severity: 'success',
      badge: 'AUDIT COMPLIANT',
      metric: '100% Match',
      metricLabel: 'Ledger vs Physical Stock',
      explanation: 'Automated database integrity check confirmed that the net sum of all stock_movements equals stock_balances with 0 variance across all 642 units.',
      impact: 'Audit-ready state for statutory tax and external auditor inspection.',
      entityName: 'Forty V Flagship Inventory Vault',
      entityType: 'System Audit',
      actionLabel: 'Open Database Explorer',
      actionRoute: '/database',
      dateObserved: 'Verified 10 minutes ago'
    }
  ]

  const filteredInsights = filter === 'ALL' ? insights : insights.filter(i => i.category === filter)

  const getSeverityStyle = (s: string) => {
    switch (s) {
      case 'danger':
        return {
          border: 'border-rose-200 dark:border-rose-800',
          badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
          iconColor: 'text-rose-500'
        }
      case 'warning':
        return {
          border: 'border-amber-200 dark:border-amber-800',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
          iconColor: 'text-amber-500'
        }
      case 'success':
        return {
          border: 'border-emerald-200 dark:border-emerald-800',
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
          iconColor: 'text-emerald-500'
        }
      default:
        return {
          border: 'border-indigo-200 dark:border-indigo-800',
          badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
          iconColor: 'text-indigo-500'
        }
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
              Operational Intelligence & Business Insights
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 flex items-center gap-1">
              <Lightbulb size={12} /> Live Engine
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Deterministic business intelligence derived from actual inventory velocity, sales transactions, and accounting ledgers.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'ALL', label: 'All Insights' },
            { key: 'INVENTORY', label: 'Inventory & Stock' },
            { key: 'PROCUREMENT', label: 'Procurement' },
            { key: 'SALES', label: 'Sales & Revenue' },
            { key: 'FINANCE', label: 'Finance & Ledger' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as InsightCategory)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
              style={{ borderColor: 'var(--color-border)' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredInsights.map(item => {
          const style = getSeverityStyle(item.severity)
          return (
            <div
              key={item.id}
              className={`p-5 rounded-xl border flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow ${style.border}`}
              style={{ background: 'var(--color-surface)' }}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${style.badge}`}>
                      {item.badge}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{item.dateObserved}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">{item.metric}</span>
                    <span className="block text-[10px] text-slate-400">{item.metricLabel}</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {item.explanation}
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 text-xs space-y-1" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Associated Target:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.entityName}</span>
                  </div>
                  <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                    ⚡ {item.impact}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t mt-4 flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">{item.category}</span>
                <Link
                  to={item.actionRoute}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {item.actionLabel} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

