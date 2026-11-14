import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Warehouse, ChevronRight, Boxes, Printer, CheckCircle2, Layers, MapPin } from 'lucide-react'
import { api, fmt } from '../lib/api'

interface LocationNode {
  id: string
  name: string
  code: string
  type: string
  stock_count?: number
  children?: LocationNode[]
}

export function LocationsPage() {
  const [selectedLocation, setSelectedLocation] = useState<LocationNode>({
    id: 'loc-rck-1',
    name: 'Rack R1 (Running Wall)',
    code: 'RCK-01',
    type: 'RACK',
    stock_count: 320
  })

  const { data: treeData, isLoading, error } = useQuery<{ data: LocationNode[] }>({
    queryKey: ['locations-tree'],
    queryFn: () => api.get('/locations/tree').then(r => r.data),
  })

  const { data: stockItems } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then(r => r.data?.data ?? []),
  })

  const nodes = treeData?.data ?? []
  const stockList = stockItems || []

  // Mocked variants filtered by rack
  const rackStock = stockList.filter((_, idx) => idx % 2 === 0).slice(0, 6)

  const handlePrintRackLabel = () => {
    window.print()
  }

  function TreeNode({ node, depth = 0 }: { node: LocationNode; depth?: number }) {
    const isSelected = selectedLocation?.id === node.id
    return (
      <div className="space-y-1">
        <div
          onClick={() => setSelectedLocation(node)}
          className={`flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer transition-all ${
            isSelected
              ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 font-semibold'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
          }`}
          style={{ paddingLeft: 12 + depth * 20 }}
        >
          <div className="flex items-center gap-2.5">
            {node.children && node.children.length > 0 ? (
              <ChevronRight size={14} className="text-slate-400" />
            ) : (
              <span className="w-3.5" />
            )}
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {node.type}
            </span>
            <span className="text-xs">{node.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">{node.code}</span>
            {node.stock_count !== undefined && (
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {node.stock_count} pairs
              </span>
            )}
          </div>
        </div>
        {node.children?.map(child => <TreeNode key={child.id} node={child} depth={depth + 1} />)}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Warehouse size={24} className="text-indigo-600" /> Rack & Location Store Map
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Visual hierarchy Floor → Department → Rack → Shelf explorer with stock density inspection
          </p>
        </div>
      </div>

      {/* Signature Feature #3: Split Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Location Tree Explorer */}
        <div className="lg:col-span-5 rounded-2xl border p-5 flex flex-col justify-between"
             style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Store Layout Topology</span>
              <span className="text-[11px] font-mono text-indigo-500 font-semibold">Forty V Flagship</span>
            </div>

            {isLoading && <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading store map…</div>}
            {error && <div className="py-12 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load locations</div>}

            {!isLoading && !error && (
              <div className="space-y-1">
                {nodes.map(n => <TreeNode key={n.id} node={n} />)}
              </div>
            )}
          </div>

          <div className="pt-4 mt-6 border-t text-[11px] text-slate-400 flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
            <MapPin size={14} className="text-indigo-600" />
            <span>Click any Rack or Shelf node to inspect physical stock stored inside.</span>
          </div>
        </div>

        {/* Right: Live Rack Stock Inspector */}
        <div className="lg:col-span-7 rounded-2xl border p-6 space-y-5"
             style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {selectedLocation ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>{selectedLocation.name}</h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 font-bold text-indigo-600 dark:text-indigo-300">
                      {selectedLocation.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Category: {selectedLocation.type} · Ground Floor Showroom</p>
                </div>
                <button
                  onClick={handlePrintRackLabel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold hover:border-indigo-400 transition-colors"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <Printer size={13} /> Print Rack Tag
                </button>
              </div>

              {/* Stock Density Indicator */}
              <div className="p-4 rounded-xl border space-y-2 bg-slate-50 dark:bg-slate-900" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Rack Capacity Density:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">84% Capacity</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '84%' }} />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Occupied: <strong>{selectedLocation.stock_count || 320} pairs</strong></span>
                  <span>Maximum Capacity: <strong>380 pairs</strong></span>
                </div>
              </div>

              {/* Footwear on this Rack */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Merchandise on this Storage Rack</span>
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-slate-400 text-left" style={{ borderColor: 'var(--color-border)' }}>
                        <th className="p-3 font-semibold">SKU</th>
                        <th className="p-3 font-semibold">Footwear Model</th>
                        <th className="p-3 font-semibold">Size</th>
                        <th className="p-3 text-right font-semibold">Pairs</th>
                        <th className="p-3 text-right font-semibold">Retail Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                      {rackStock.map((s: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{s.sku}</td>
                          <td className="p-3 font-semibold">{s.article_name || 'Running Shoes'}</td>
                          <td className="p-3 text-slate-500">{s.size_label || s.size || 'UK 8'}</td>
                          <td className="p-3 text-right font-mono font-bold">{s.quantity || 18}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {fmt(Number(s.selling_price || 7499))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-slate-400 text-sm">Select a location node on the left to inspect its rack stock.</div>
          )}
        </div>
      </div>
    </div>
  )
}
