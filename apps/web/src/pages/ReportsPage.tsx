import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, fmt } from '../lib/api'
import { Download, Filter } from 'lucide-react'
import { format } from 'date-fns'

type TabKey = 'sales' | 'purchases' | 'inventory' | 'ageing' | 'gst' | 'trial-balance'

function exportCSV(filename: string, rows: any[], headers: string[]) {
  if (!rows || rows.length === 0) return
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = r[h] ?? ''
          return JSON.stringify(val)
        })
        .join(',')
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('sales')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filterText, setFilterText] = useState('')

  // Query tab data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports', activeTab, startDate, endDate],
    queryFn: async () => {
      let url = `/reports/${activeTab}`
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      const q = params.toString()
      if (q) url += `?${q}`
      const res = await api.get(url)
      return res.data.data || []
    },
  })

  const rows = (reportData || []) as any[]

  // Handle Export
  const handleExport = () => {
    if (rows.length === 0) return
    const filename = `report_${activeTab}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`

    let headers: string[] = []
    if (activeTab === 'sales') {
      headers = ['doc_number', 'customer', 'sale_date', 'total_amount', 'paid_amount', 'status', 'payment_mode']
    } else if (activeTab === 'purchases') {
      headers = ['doc_number', 'vendor', 'bill_date', 'total_amount', 'purchase_class', 'status']
    } else if (activeTab === 'inventory') {
      headers = ['sku', 'barcode', 'article', 'size', 'colour', 'qty', 'mrp', 'cost']
    } else if (activeTab === 'ageing') {
      headers = ['sku', 'article', 'category', 'qty', 'first_movement']
    } else if (activeTab === 'gst') {
      headers = ['transaction_type', 'doc_number', 'doc_date', 'party_name', 'party_gstin', 'taxable_value', 'cgst', 'sgst', 'igst', 'total_tax', 'total_invoice_value']
    } else if (activeTab === 'trial-balance') {
      headers = ['code', 'name', 'type', 'debit', 'credit']
    } else {
      headers = Object.keys(rows[0] || {})
    }

    exportCSV(filename, rows, headers)
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'sales', label: 'Sales' },
    { key: 'purchases', label: 'Purchases' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'ageing', label: 'Ageing' },
    { key: 'gst', label: 'GST Register' },
    { key: 'trial-balance', label: 'Trial Balance' },
  ]

  const cardStyle = { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>
            Reports & Analytics
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Exportable operational, stock valuation, and tax audit reports
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={isLoading || rows.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: 'var(--color-primary)',
            color: '#FFFFFF',
          }}
        >
          <Download className="w-4 h-4" />
          Export CSV ({rows.length})
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b overflow-x-auto gap-2" style={{ borderColor: 'var(--color-border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key)
              setFilterText('')
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary'
                : 'border-transparent text-muted hover:text-text'
            }`}
            style={{
              borderColor: activeTab === tab.key ? 'var(--color-primary)' : 'transparent',
              color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-muted)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl border flex flex-wrap items-center gap-4 justify-between" style={cardStyle}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            <Filter className="w-4 h-4" />
            <span>Date Range:</span>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          />
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          />

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('')
                setEndDate('')
              }}
              className="text-xs px-2 py-1 rounded hover:underline"
              style={{ color: 'var(--color-danger)' }}
            >
              Clear dates
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Quick search..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm w-48"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          />
          <span className="text-xs px-2.5 py-1 rounded-full font-mono font-medium" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
            {rows.length} rows
          </span>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="rounded-xl border overflow-hidden" style={cardStyle}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', background: 'var(--color-bg)' }}>
              {activeTab === 'sales' && (
                <tr>
                  <th className="px-4 py-3">Doc Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Sale Date</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3 text-right">Paid Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              )}
              {activeTab === 'purchases' && (
                <tr>
                  <th className="px-4 py-3">Doc Number</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Bill Date</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              )}
              {activeTab === 'inventory' && (
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Article</th>
                  <th className="px-4 py-3">Size / Colour</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">MRP</th>
                </tr>
              )}
              {activeTab === 'ageing' && (
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Article</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Stock Qty</th>
                  <th className="px-4 py-3">First Movement</th>
                </tr>
              )}
              {activeTab === 'gst' && (
                <tr>
                  <th className="px-4 py-3">Doc Number</th>
                  <th className="px-4 py-3">Party Name</th>
                  <th className="px-4 py-3">GSTIN</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Taxable</th>
                  <th className="px-4 py-3 text-right">CGST</th>
                  <th className="px-4 py-3 text-right">SGST</th>
                  <th className="px-4 py-3 text-right">IGST</th>
                  <th className="px-4 py-3 text-right">Invoice Value</th>
                </tr>
              )}
              {activeTab === 'trial-balance' && (
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Account Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center" style={{ color: 'var(--color-muted)' }}>
                    Loading report data...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center" style={{ color: 'var(--color-muted)' }}>
                    No records found for the selected criteria
                  </td>
                </tr>
              ) : (
                rows
                  .filter((r) => {
                    if (!filterText) return true
                    const str = JSON.stringify(r).toLowerCase()
                    return str.includes(filterText.toLowerCase())
                  })
                  .map((row: any, idx: number) => {
                    return (
                      <tr key={idx} className="hover:opacity-90 transition-opacity">
                        {activeTab === 'sales' && (
                          <>
                            <td className="px-4 py-3 font-mono font-medium">{row.doc_number}</td>
                            <td className="px-4 py-3">{row.customer || 'Walk-in'}</td>
                            <td className="px-4 py-3">{row.sale_date ? format(new Date(row.sale_date), 'dd/MM/yyyy') : '-'}</td>
                            <td className="px-4 py-3 text-xs uppercase">{row.payment_mode || 'CASH'}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(Number(row.total_amount || 0))}</td>
                            <td className="px-4 py-3 text-right font-mono">{fmt(Number(row.paid_amount || 0))}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                                {row.status}
                              </span>
                            </td>
                          </>
                        )}

                        {activeTab === 'purchases' && (
                          <>
                            <td className="px-4 py-3 font-mono font-medium">{row.doc_number}</td>
                            <td className="px-4 py-3">{row.vendor || 'Supplier'}</td>
                            <td className="px-4 py-3">{row.bill_date ? format(new Date(row.bill_date), 'dd/MM/yyyy') : '-'}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: row.purchase_class === 'A' ? 'var(--color-primary-soft)' : 'var(--color-surface)', color: 'var(--color-text)' }}>
                                Class {row.purchase_class || 'A'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(Number(row.total_amount || 0))}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                                {row.status}
                              </span>
                            </td>
                          </>
                        )}

                        {activeTab === 'inventory' && (
                          <>
                            <td className="px-4 py-3 font-mono font-medium">{row.sku}</td>
                            <td className="px-4 py-3 font-mono text-xs">{row.barcode || '-'}</td>
                            <td className="px-4 py-3">{row.article}</td>
                            <td className="px-4 py-3 text-xs">{row.size} / {row.colour}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">{row.qty}</td>
                            <td className="px-4 py-3 text-right font-mono">{fmt(Number(row.cost || 0))}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(Number(row.mrp || 0))}</td>
                          </>
                        )}

                        {activeTab === 'ageing' && (
                          <>
                            <td className="px-4 py-3 font-mono font-medium">{row.sku}</td>
                            <td className="px-4 py-3">{row.article}</td>
                            <td className="px-4 py-3 text-xs">{row.category}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">{row.qty}</td>
                            <td className="px-4 py-3 text-xs font-mono">
                              {row.first_movement ? format(new Date(row.first_movement), 'dd/MM/yyyy') : 'Initial'}
                            </td>
                          </>
                        )}

                        {activeTab === 'gst' && (
                          <>
                            <td className="px-4 py-3 font-mono font-medium">{row.doc_number || '-'}</td>
                            <td className="px-4 py-3">{row.party_name || '-'}</td>
                            <td className="px-4 py-3 font-mono text-xs">{row.party_gstin || '-'}</td>
                            <td className="px-4 py-3 text-xs">{row.doc_date ? format(new Date(row.doc_date), 'dd/MM/yyyy') : '-'}</td>
                            <td className="px-4 py-3 text-right font-mono">{fmt(Number(row.taxable_value || 0))}</td>
                            <td className="px-4 py-3 text-right font-mono">{fmt(Number(row.cgst || 0))}</td>
                            <td className="px-4 py-3 text-right font-mono">{fmt(Number(row.sgst || 0))}</td>
                            <td className="px-4 py-3 text-right font-mono">{fmt(Number(row.igst || 0))}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(Number(row.total_invoice_value || 0))}</td>
                          </>
                        )}

                        {activeTab === 'trial-balance' && (
                          <>
                            <td className="px-4 py-3 font-mono font-medium">{row.code}</td>
                            <td className="px-4 py-3">{row.name}</td>
                            <td className="px-4 py-3 text-xs uppercase">{row.type}</td>
                            <td className="px-4 py-3 text-right font-mono">{fmt(Number(row.debit || 0))}</td>
                            <td className="px-4 py-3 text-right font-mono">{fmt(Number(row.credit || 0))}</td>
                          </>
                        )}
                      </tr>
                    )
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
