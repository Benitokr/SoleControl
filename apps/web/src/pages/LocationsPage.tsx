import { useQuery } from '@tanstack/react-query'
import { Warehouse, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'

interface LocationNode {
  id: string; name: string; code: string; type: string
  children?: LocationNode[]
}

function TreeNode({ node, depth = 0 }: { node: LocationNode; depth?: number }) {
  return (
    <div>
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-opacity-50 cursor-pointer"
        style={{ paddingLeft: 12 + depth * 20, background: depth === 0 ? 'var(--color-primary-soft)' : 'transparent' }}>
        {node.children && node.children.length > 0 && <ChevronRight size={14} style={{ color: 'var(--color-muted)' }} />}
        <span className="text-xs font-medium uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: 'var(--color-bg)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
          {node.type}
        </span>
        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{node.name}</span>
        <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{node.code}</span>
      </div>
      {node.children?.map(child => <TreeNode key={child.id} node={child} depth={depth + 1} />)}
    </div>
  )
}

export function LocationsPage() {
  const { data, isLoading, error } = useQuery<{ data: LocationNode[] }>({
    queryKey: ['locations-tree'],
    queryFn: () => api.get('/locations/tree').then(r => r.data),
  })
  const nodes = data?.data ?? []

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Warehouse size={20} /> Rack &amp; Location
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>Floor → Department → Rack → Shelf → Position</p>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {isLoading && <div className="py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading…</div>}
        {error && <div className="py-8 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load locations</div>}
        {!isLoading && !error && nodes.length === 0 && (
          <div className="py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>No locations configured yet</div>
        )}
        {nodes.map(n => <TreeNode key={n.id} node={n} />)}
      </div>
    </div>
  )
}

