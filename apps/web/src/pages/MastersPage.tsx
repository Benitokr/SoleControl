import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Database, Plus, LayoutGrid, List } from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, getApiErrorMessage } from '../lib/format'
import {
  PageHeader, FilterBar, DataTable, StatusBadge, Button, Drawer,
  FormField, inputBaseClass, ColumnDef, EmptyState,
} from '../components/ui'
import { ArticleCard, ColourSwatch } from '../components/footwear'

type MasterTab = 'articles' | 'brands' | 'categories' | 'sizes' | 'colours' | 'hsn'

export function MastersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<MasterTab>('articles')
  const [search, setSearch] = useState('')
  const [articleView, setArticleView] = useState<'table' | 'cards'>('table')

  // Drawer form for simple masters (brand, category, size, colour)
  const [showDrawer, setShowDrawer] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [hex, setHex] = useState('#0D9488')

  const endpoint = tab === 'hsn' ? 'categories' : tab
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['masters', endpoint],
    queryFn: () => api.get(`/masters/${endpoint}`).then((r) => r.data?.data ?? []),
  })

  const items: any[] = Array.isArray(data) ? data : []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (i) =>
        String(i.name || '').toLowerCase().includes(q) ||
        String(i.code || i.hsn || '').toLowerCase().includes(q)
    )
  }, [items, search])

  const duplicateWarning = useMemo(() => {
    const n = name.trim().toLowerCase()
    if (!n) return false
    return items.some((i) => String(i.name || '').trim().toLowerCase() === n)
  }, [name, items])

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post(`/masters/${endpoint}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', endpoint] })
      toast.success('Master record saved')
      setShowDrawer(false)
      setName('')
      setCode('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save master record')),
  })

  const columns: ColumnDef<any>[] = [
    {
      id: 'name',
      header: 'Name',
      sortable: true,
      accessor: (r) => r.name || '',
      cell: (r) => (
        <div className="flex items-center gap-2">
          {tab === 'colours' && <ColourSwatch name={r.name} hex={r.hex} />}
          {tab !== 'colours' && <span className="font-medium text-slate-900">{r.name}</span>}
        </div>
      ),
    },
    {
      id: 'code',
      header: tab === 'hsn' ? 'HSN / GST' : 'Code',
      sortable: true,
      accessor: (r) => r.code || r.hsn || '',
      cell: (r) => (
        <span className="font-mono text-xs text-slate-600">{r.code || r.hsn || '6404'}</span>
      ),
    },
    ...(tab === 'articles'
      ? [
          {
            id: 'mrp',
            header: 'Default MRP',
            align: 'right' as const,
            accessor: (r: any) => Number(r.mrp ?? r.selling_price ?? 0),
            cell: (r: any) => formatINR(r.mrp ?? r.selling_price ?? 0),
          },
        ]
      : []),
    {
      id: 'status',
      header: 'Status',
      cell: (r) => <StatusBadge status={r.is_active === false || r.isActive === false ? 'INACTIVE' : 'ACTIVE'} />,
    },
  ]

  const TABS: { key: MasterTab; label: string }[] = [
    { key: 'articles', label: 'Articles' },
    { key: 'brands', label: 'Brands' },
    { key: 'categories', label: 'Categories' },
    { key: 'sizes', label: 'Sizes' },
    { key: 'colours', label: 'Colours' },
    { key: 'hsn', label: 'HSN & GST' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Master Data"
        description="Manage footwear brands, categories, articles, size ranges, colours, and HSN GST slabs."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Master Data' }]}
        secondaryActions={
          tab === 'articles' ? (
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setArticleView('table')}
                className={
                  articleView === 'table'
                    ? 'px-2.5 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white inline-flex items-center gap-1'
                    : 'px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600'
                }
              >
                <List className="w-3.5 h-3.5" />
                Table
              </button>
              <button
                type="button"
                onClick={() => setArticleView('cards')}
                className={
                  articleView === 'cards'
                    ? 'px-2.5 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white inline-flex items-center gap-1'
                    : 'px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600'
                }
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cards
              </button>
            </div>
          ) : undefined
        }
        primaryAction={
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              if (tab === 'articles') navigate('/masters/articles/new')
              else setShowDrawer(true)
            }}
          >
            {tab === 'articles' ? 'New Article' : `Add ${tab.slice(0, -1)}`}
          </Button>
        }
      />

      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key)
              setSearch('')
            }}
            className={
              tab === t.key
                ? 'px-3.5 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white whitespace-nowrap'
                : 'px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Search ${tab}…`}
        onReset={() => setSearch('')}
      />

      {tab === 'articles' && articleView === 'cards' ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={<Database className="w-6 h-6" />}
            title="No articles found"
            description="Create a footwear article to generate size-colour SKU variants."
            action={
              <Button variant="primary" onClick={() => navigate('/masters/articles/new')}>
                New Article
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((art) => (
              <ArticleCard
                key={art.id || art.name}
                name={art.name}
                brand={art.brand?.name || art.brandName || 'Footwear'}
                sku={art.code}
                mrp={Number(art.mrp ?? art.selling_price ?? 3999)}
                stockQty={Number(art.stockQty ?? 0)}
              />
            ))}
          </div>
        )
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(r, i) => r.id || r.name || String(i)}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          exportFilename={`solecontrol-${tab}`}
          emptyIcon={<Database className="w-6 h-6" />}
          emptyTitle={`No ${tab} found`}
          emptyDescription={`Add your first ${tab.slice(0, -1)} record to build your footwear catalog.`}
        />
      )}

      <Drawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={`Add ${tab.slice(0, -1)}`}
        isDirty={Boolean(name || code)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDrawer(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createMutation.isPending}
              onClick={() => {
                if (!name.trim()) {
                  toast.error('Name is required')
                  return
                }
                createMutation.mutate({
                  name: name.trim(),
                  code: (code || name.slice(0, 4)).toUpperCase(),
                  hex: tab === 'colours' ? hex : undefined,
                })
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <FormField
          label="Name"
          required
          error={duplicateWarning ? 'An entry with this name already exists' : undefined}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name…"
            className={inputBaseClass}
          />
        </FormField>
        <FormField label="Short code" helperText="Used when auto-generating SKU codes">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. NK"
            className={inputBaseClass}
          />
        </FormField>
        {tab === 'colours' && (
          <FormField label="Swatch colour">
            <input
              type="color"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              className="h-10 w-20 rounded border border-slate-200 cursor-pointer"
            />
          </FormField>
        )}
      </Drawer>
    </div>
  )
}
