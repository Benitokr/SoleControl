import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Database, Plus, Search, X, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'

type Tab = 'brands' | 'categories' | 'sizes' | 'colours' | 'articles'

export function MastersPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('brands')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [formError, setFormError] = useState('')

  // Form states
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [hex, setHex] = useState('#0F172A')
  const [sortOrder, setSortOrder] = useState(1)

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
  const rawData: any[] = Array.isArray(q.data)
    ? q.data
    : Array.isArray((q.data as any)?.data)
    ? (q.data as any).data
    : []
  const rows: any[] = rawData.filter((r: any) =>
    (r?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r?.code ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const createMasterMutation = useMutation({
    mutationFn: (body: any) => api.post(`/masters/${tab}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [tab] })
      setShowAddModal(false)
      setName('')
      setCode('')
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || `Failed to add ${tab.slice(0, -1)}.`)
    }
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Name is required.')
      return
    }
    setFormError('')
    createMasterMutation.mutate({
      name,
      code: code || name.toUpperCase().slice(0, 4),
      hex,
      sortOrder: Number(sortOrder),
      isActive: true
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Database size={24} className="text-indigo-600" /> Master Data Catalog
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Core catalog taxonomies: Brands, Categories, Sizes, Colours, and Footwear Articles
          </p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setFormError('') }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xs transition-all hover:opacity-95"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={16} /> Add {tab.charAt(0).toUpperCase() + tab.slice(1, -1)}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch('') }}
            className="px-4 py-2 text-xs font-bold rounded-lg transition-all"
            style={tab === t.key
              ? { background: 'var(--color-surface)', color: 'var(--color-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.08)' }
              : { color: 'var(--color-muted)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="rounded-xl border overflow-hidden shadow-xs" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="p-4 border-b flex items-center justify-between gap-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${tab}…`}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:ring-indigo-500/20"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">{rows.length} {tab} recorded</span>
        </div>

        {q.isLoading && <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading {tab}…</div>}
        {q.error && <div className="py-12 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load {tab}</div>}

        {!q.isLoading && !q.error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-slate-400" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="text-left px-5 py-3 font-semibold">Name</th>
                  {tab === 'articles' && (
                    <>
                      <th className="text-left px-5 py-3 font-semibold">Model Code</th>
                      <th className="text-right px-5 py-3 font-semibold">SKU Variants</th>
                    </>
                  )}
                  {tab === 'sizes' && <th className="text-left px-5 py-3 font-semibold">Sort Index</th>}
                  {tab === 'colours' && <th className="text-left px-5 py-3 font-semibold">Colour Swatch</th>}
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-xs text-slate-400">No {tab} found matching search</td></tr>
                )}
                {rows.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-xs" style={{ color: 'var(--color-text)' }}>{r.name}</td>
                    {tab === 'articles' && (
                      <>
                        <td className="px-5 py-3.5 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">{r.code}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-500 font-bold">{r._count?.variants ?? 8} variants</td>
                      </>
                    )}
                    {tab === 'sizes' && (
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500">Rank {r.sortOrder ?? 1}</td>
                    )}
                    {tab === 'colours' && (
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-2">
                          {r.hex && (
                            <span className="w-4 h-4 rounded-full border shadow-2xs" style={{ background: r.hex, borderColor: 'var(--color-border)' }} />
                          )}
                          <span className="font-mono text-xs text-slate-500">{r.hex ?? '#000000'}</span>
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-3.5">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl border space-y-4 animate-in fade-in"
               style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                Add {tab.charAt(0).toUpperCase() + tab.slice(1, -1)}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:opacity-75"><X size={18} /></button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Name</label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${tab === 'brands' ? 'New Balance' : tab === 'sizes' ? 'UK 10.5' : tab === 'colours' ? 'Olive Green' : 'Running Pro'}`}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              {tab === 'articles' && (
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Article Model Code</label>
                  <input
                    type="text"
                    placeholder="e.g. NB-574-GRY"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono"
                    style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              )}

              {tab === 'colours' && (
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Hex Colour Code</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={hex}
                      onChange={e => setHex(e.target.value)}
                      className="w-12 h-10 rounded-lg cursor-pointer border p-1"
                    />
                    <input
                      type="text"
                      value={hex}
                      onChange={e => setHex(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none font-mono"
                      style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>
                </div>
              )}

              {tab === 'sizes' && (
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Sort Sequence Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={e => setSortOrder(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono"
                    style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMasterMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {createMasterMutation.isPending ? 'Saving…' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
