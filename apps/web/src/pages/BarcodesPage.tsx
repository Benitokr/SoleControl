import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ScanBarcode, Printer } from 'lucide-react'
import { api } from '../lib/api'

interface BarcodeJob { id: string; sku: string; quantity: number; status: string; createdAt: string }

export function BarcodesPage() {
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery<{ data: BarcodeJob[] }>({
    queryKey: ['barcodes-queue'],
    queryFn: () => api.get('/barcodes/queue').then(r => r.data),
  })

  const markPrinted = useMutation({
    mutationFn: (id: string) => api.post(`/barcodes/jobs/${id}/mark-printed`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barcodes-queue'] }),
  })

  const jobs = data?.data ?? []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <ScanBarcode size={20} /> Barcode Management
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>Print queue and label registry</p>
        </div>
      </div>

      <div className="rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {isLoading && <div className="py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading…</div>}
        {error && <div className="py-8 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load queue</div>}
        {!isLoading && !error && (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left px-4 py-3 font-medium">SKU</th>
                <th className="text-right px-4 py-3 font-medium">Qty</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Added</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>Print queue is empty</td></tr>
              )}
              {jobs.map(j => (
                <tr key={j.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{j.sku}</td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--color-text)' }}>{j.quantity}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={j.status === 'PENDING'
                        ? { background: '#FEF3C7', color: '#D97706' }
                        : { background: '#DCFCE7', color: '#059669' }}>
                      {j.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-muted)' }}>{new Date(j.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3">
                    {j.status === 'PENDING' && (
                      <button onClick={() => markPrinted.mutate(j.id)}
                        className="flex items-center gap-1 text-xs px-3 py-1 rounded-md"
                        style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>
                        <Printer size={12} /> Mark Printed
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

