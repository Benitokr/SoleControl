import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Database } from 'lucide-react'
import { api } from '../lib/api'

type Tab = 'brands' | 'categories' | 'sizes' | 'colours' | 'articles'

export function MastersPage() {
  const [tab, setTab] = useState<Tab>('brands')

  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api.get('/masters/brands').then(r => r.data?.data ?? []) })
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/masters/categories').then(r => r.data?.data ?? []) })
  const sizes = useQuery({ queryKey: ['sizes'], queryFn: () => api.get('/masters/sizes').then(r => r.data?.data ?? []) })
  const colours = useQuery({ queryKey: ['colours'], queryFn: () => api.get('/masters/colours').then(r => r.data?.data ?? []) })
  const articles = useQuery({ queryKey: ['articles'], queryFn: () => api.get('/masters/articles').then(r => r.data?.data ?? []) })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'brands', label: 'Brands' },
    { key: 'categories', label: 'Categories' },
    { key: 'sizes', label: 'Sizes' },
    { key: 'colours', label: 'Colours' },
    { key: 'articles', label: 'Articles' },
  ]

  const queries: Record<Tab, typeof brands> = { brands, categories, sizes, colours, articles }
  const q = queries[tab]
  const rows: any[] = (q.data as any) ?? []

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Database size={20} /> Master Data
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>Brands, categories, sizes, colours and articles</p>
      </div>

      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-3 py-1.5 text-sm rounded-md transition-all"
            style={tab === t.key
              ? { background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,.08)' }
              : { color: 'var(--color-muted)' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {q.isLoading && <div className="py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading…</div>}
        {q.error && <div className="py-8 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load</div>}
        {!q.isLoading && !q.error && (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                {tab === 'articles' && <><th className="text-left px-4 py-3 font-medium">Code</th><th className="text-left px-4 py-3 font-medium">Variants</th></>}
                {tab === 'sizes' && <th className="text-left px-4 py-3 font-medium">Sort Order</th>}
                {tab === 'colours' && <th className="text-left px-4 py-3 font-medium">Hex</th>}
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No {tab} found</td></tr>
              )}
              {rows.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{r.name}</td>
                  {tab === 'articles' && <>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-muted)' }}>{r.code}</td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-muted)' }}>{r._count?.variants ?? 0}</td>
                  </>}
                  {tab === 'sizes' && <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-muted)' }}>{r.sortOrder ?? '—'}</td>}
                  {tab === 'colours' && <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      {r.hex && <span className="w-4 h-4 rounded-full border" style={{ background: r.hex, border: '1px solid var(--color-border)' }} />}
                      <span className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>{r.hex ?? '—'}</span>
                    </span>
                  </td>}
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={r.isActive !== false
                        ? { background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }
                        : { background: 'var(--color-bg)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                      {r.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
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

