import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, toISODate } from '../lib/format'
import { PageHeader, DataTable, DatePicker, FormField, Button, ColumnDef } from '../components/ui'

const REPORT_CATALOG = [
  { id: 'sales-summary', category: 'Sales', title: 'Daily Sales & Margin Report', desc: 'Invoice totals, payment split, and gross margin by day.', endpoint: '/sales' },
  { id: 'stock-valuation', category: 'Inventory', title: 'Stock Valuation Report', desc: 'On-hand pairs, weighted cost value, and retail MRP value.', endpoint: '/inventory/stock' },
  { id: 'purchase-register', category: 'Purchase', title: 'Purchase Bill Register', desc: 'Supplier bills with Class A GST vs Class B breakdown.', endpoint: '/purchases' },
  { id: 'vendor-payables', category: 'Finance', title: 'Vendor Payables Ageing', desc: 'Outstanding balances owed to footwear suppliers.', endpoint: '/vendors' },
  { id: 'gst-summary', category: 'GST', title: 'HSN & GST Summary', desc: 'Taxable turnover and CGST/SGST liability.', endpoint: '/bank-gst/gst' },
  { id: 'customer-spend', category: 'Customer', title: 'Customer Spend & Credit', desc: 'Top repeat customers and credit balances.', endpoint: '/customers' },
]

export function ReportsPage() {
  const [activeReport, setActiveReport] = useState<typeof REPORT_CATALOG[0] | null>(null)
  const [fromDate, setFromDate] = useState(toISODate(new Date(Date.now() - 30 * 86400000)))
  const [toDate, setToDate] = useState(toISODate(new Date()))

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['report-data', activeReport?.id],
    enabled: !!activeReport,
    queryFn: () => api.get(activeReport!.endpoint).then((r) => r.data?.data ?? []),
  })

  if (activeReport) {
    const rows: any[] = Array.isArray(data) ? data : []
    const cols: ColumnDef<any>[] =
      rows.length > 0
        ? Object.keys(rows[0])
            .slice(0, 6)
            .map((k) => ({
              id: k,
              header: k.replace(/_/g, ' '),
              cell: (r) => {
                const v = r[k]
                if (typeof v === 'object' && v !== null) return v.name || JSON.stringify(v)
                if (typeof v === 'number' && k.toLowerCase().includes('amount')) return formatINR(v)
                return String(v ?? '—')
              },
            }))
        : [{ id: 'empty', header: 'Record', cell: () => '—' }]

    return (
      <div className="space-y-5">
        <PageHeader
          title={activeReport.title}
          description={activeReport.desc}
          secondaryActions={
            <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => setActiveReport(null)}>
              All Reports
            </Button>
          }
        />

        <div className="bg-white rounded-lg border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 max-w-lg gap-3">
          <FormField label="From date">
            <DatePicker value={fromDate} onChange={setFromDate} />
          </FormField>
          <FormField label="To date">
            <DatePicker value={toDate} onChange={setToDate} />
          </FormField>
        </div>

        <DataTable
          data={rows}
          columns={cols}
          getRowId={(r, i) => r.id || String(i)}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          exportFilename={`report-${activeReport.id}`}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports & Exports"
        description="Run operational, inventory, GST, and financial reports with CSV export."
        breadcrumbs={[{ label: 'Reports' }, { label: 'Reports & Exports' }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_CATALOG.map((rep) => (
          <button
            key={rep.id}
            type="button"
            onClick={() => setActiveReport(rep)}
            className="text-left bg-white rounded-lg border border-slate-200 hover:border-teal-500 p-5 space-y-2 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                {rep.category}
              </span>
              <BarChart3 className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">{rep.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{rep.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
