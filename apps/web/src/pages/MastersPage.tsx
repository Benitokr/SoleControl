import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Database, Plus, LayoutGrid, List, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatDateIN, getApiErrorMessage } from '../lib/format'
import {
  PageHeader, FilterBar, DataTable, StatusBadge, Button, Drawer,
  FormField, inputBaseClass, ColumnDef, EmptyState,
} from '../components/ui'
import { ArticleCard, ColourSwatch } from '../components/footwear'

export function MastersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('ALL')
  const [catFilter, setCatFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [articleView, setArticleView] = useState<'table' | 'cards'>('table')
  const [showManageLists, setShowManageLists] = useState(false)

  // Inline quick-add state per list
  const [addingList, setAddingList] = useState<'brands' | 'categories' | 'sizes' | 'colours' | null>(null)
  const [inlineName, setInlineName] = useState('')
  const [inlineCode, setInlineCode] = useState('')
  const [inlineHex, setInlineHex] = useState('#0D9488')

  // Article detail drawer
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null)
  const [detailTab, setDetailTab] = useState<'overview' | 'variants' | 'stock' | 'purchases' | 'sales' | 'price'>('overview')

  const { data: articlesData, isLoading, error, refetch } = useQuery({
    queryKey: ['masters', 'articles'],
    queryFn: () => api.get('/masters/articles').then((r) => r.data?.data ?? []),
  })
  const { data: brandsData } = useQuery({
    queryKey: ['masters', 'brands'],
    queryFn: () => api.get('/masters/brands').then((r) => r.data?.data ?? []),
  })
  const { data: categoriesData } = useQuery({
    queryKey: ['masters', 'categories'],
    queryFn: () => api.get('/masters/categories').then((r) => r.data?.data ?? []),
  })
  const { data: sizesData } = useQuery({
    queryKey: ['masters', 'sizes'],
    queryFn: () => api.get('/masters/sizes').then((r) => r.data?.data ?? []),
  })
  const { data: coloursData } = useQuery({
    queryKey: ['masters', 'colours'],
    queryFn: () => api.get('/masters/colours').then((r) => r.data?.data ?? []),
  })
  const { data: stockData } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then((r) => r.data?.data ?? []),
  })

  const articles: any[] = Array.isArray(articlesData) ? articlesData : []
  const brands: any[] = Array.isArray(brandsData) ? brandsData : []
  const categories: any[] = Array.isArray(categoriesData) ? categoriesData : []
  const sizes: any[] = Array.isArray(sizesData) ? sizesData : []
  const colours: any[] = Array.isArray(coloursData) ? coloursData : []
  const stockRows: any[] = Array.isArray(stockData) ? stockData : []

  // Setup progress steps
  const setupSteps = [
    { key: 'brands', label: 'Brands', count: brands.length },
    { key: 'categories', label: 'Categories', count: categories.length },
    { key: 'sizes', label: 'Sizes', count: sizes.length },
    { key: 'colours', label: 'Colours', count: colours.length },
    { key: 'hsn', label: 'HSN & GST', count: categories.length > 0 ? categories.length : 3 },
    { key: 'articles', label: 'Articles', count: articles.length },
  ]
  const firstIncompleteIdx = setupSteps.findIndex((s) => s.count === 0)

  // Enrich articles with stock & variant counts
  const enrichedArticles = useMemo(() => {
    return articles.map((a) => {
      const matchingStock = stockRows.filter(
        (s) =>
          String(s.article_name || s.articleName || '').toLowerCase() ===
          String(a.name || '').toLowerCase()
      )
      const totalStock = matchingStock.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
      return {
        ...a,
        brandName: a.brand?.name || a.brandName || '—',
        categoryName: a.category?.name || a.categoryName || '—',
        totalStock,
        variantCount: a._count?.variants ?? matchingStock.length,
        variantsList: matchingStock,
      }
    })
  }, [articles, stockRows])

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enrichedArticles.filter((a) => {
      if (brandFilter !== 'ALL' && a.brandName !== brandFilter) return false
      if (catFilter !== 'ALL' && a.categoryName !== catFilter) return false
      const isAct = a.is_active !== false && a.isActive !== false
      if (statusFilter === 'ACTIVE' && !isAct) return false
      if (statusFilter === 'INACTIVE' && isAct) return false
      if (!q) return true
      return (
        String(a.name || '').toLowerCase().includes(q) ||
        String(a.code || '').toLowerCase().includes(q) ||
        String(a.brandName || '').toLowerCase().includes(q)
      )
    })
  }, [enrichedArticles, brandFilter, catFilter, statusFilter, search])

  const addMasterMutation = useMutation({
    mutationFn: (listKey: 'brands' | 'categories' | 'sizes' | 'colours') =>
      api.post(`/masters/${listKey}`, {
        name: inlineName.trim(),
        code: (inlineCode || inlineName.slice(0, 4)).toUpperCase(),
        hex: listKey === 'colours' ? inlineHex : undefined,
      }),
    onSuccess: (_res, listKey) => {
      qc.invalidateQueries({ queryKey: ['masters', listKey] })
      toast.success('Added to catalog list')
      setAddingList(null)
      setInlineName('')
      setInlineCode('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to add item')),
  })

  const columns: ColumnDef<any>[] = [
    {
      id: 'name',
      header: 'Article',
      sortable: true,
      accessor: (r) => r.name || '',
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.name}</p>
          {r.code && <p className="font-mono text-xs text-slate-500">{r.code}</p>}
        </div>
      ),
    },
    { id: 'brand', header: 'Brand', cell: (r) => r.brandName },
    { id: 'category', header: 'Category', cell: (r) => r.categoryName },
    { id: 'hsn', header: 'HSN', cell: (r) => <span className="font-mono text-xs">{r.hsn || '6404'}</span> },
    {
      id: 'mrp',
      header: 'MRP',
      align: 'right',
      sortable: true,
      accessor: (r) => Number(r.mrp ?? r.selling_price ?? 0),
      cell: (r) => formatINR(r.mrp ?? r.selling_price ?? 0),
    },
    {
      id: 'variants',
      header: 'Variants',
      align: 'right',
      cell: (r) => <span className="tabular-nums">{r.variantCount}</span>,
    },
    {
      id: 'stock',
      header: 'Stock',
      align: 'right',
      cell: (r) => <span className="font-semibold tabular-nums">{r.totalStock}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (r) => <StatusBadge status={r.is_active === false || r.isActive === false ? 'INACTIVE' : 'ACTIVE'} />,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Footwear Catalog & Master Data"
        description="Unified catalog for footwear articles, variants, brands, categories, sizes, colours, and HSN slabs."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Master Data (Catalog)' }]}
        secondaryActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManageLists((s) => !s)}
              icon={showManageLists ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            >
              Manage lists
            </Button>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setArticleView('table')}
                className={articleView === 'table' ? 'px-2.5 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white' : 'px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600'}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setArticleView('cards')}
                className={articleView === 'cards' ? 'px-2.5 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white' : 'px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600'}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        }
        primaryAction={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/masters/articles/new')}>
            New Article
          </Button>
        }
      />

      {/* Setup Progress Row */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500">Catalog setup progress</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {setupSteps.map((step, idx) => {
            const done = step.count > 0
            const isNext = idx === firstIncompleteIdx
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => {
                  if (step.key === 'articles') navigate('/masters/articles/new')
                  else setShowManageLists(true)
                }}
                className={
                  isNext
                    ? 'p-2.5 rounded-lg border-2 border-teal-600 bg-teal-50/50 text-left'
                    : 'p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 text-left'
                }
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">{step.label}</span>
                  {done ? (
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-semibold tabular-nums text-slate-900 mt-1">{step.count}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Inline Manage Lists Panel */}
      {showManageLists && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(
            [
              ['brands', 'Brands', brands],
              ['categories', 'Categories', categories],
              ['sizes', 'Sizes', sizes],
              ['colours', 'Colours', colours],
            ] as const
          ).map(([key, title, list]) => (
            <div key={key} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  {title} ({list.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setAddingList(addingList === key ? null : key)
                    setInlineName('')
                    setInlineCode('')
                  }}
                  className="text-xs font-medium text-teal-700 hover:underline inline-flex items-center gap-0.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {addingList === key && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <input
                    type="text"
                    value={inlineName}
                    onChange={(e) => setInlineName(e.target.value)}
                    placeholder={`New ${title.slice(0, -1)} name`}
                    className={inputBaseClass}
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inlineCode}
                      onChange={(e) => setInlineCode(e.target.value.toUpperCase())}
                      placeholder="Code"
                      className={`${inputBaseClass} font-mono`}
                    />
                    {key === 'colours' && (
                      <input
                        type="color"
                        value={inlineHex}
                        onChange={(e) => setInlineHex(e.target.value)}
                        className="h-9 w-12 rounded border border-slate-200"
                      />
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full"
                    loading={addMasterMutation.isPending}
                    onClick={() => {
                      if (!inlineName.trim()) {
                        toast.error('Name is required')
                        return
                      }
                      addMasterMutation.mutate(key)
                    }}
                  >
                    Save
                  </Button>
                </div>
              )}

              <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 text-xs">
                {list.length === 0 ? (
                  <p className="text-slate-400 py-3 text-center">Empty list</p>
                ) : (
                  list.map((item: any) => (
                    <div key={item.id || item.name} className="py-1.5 flex items-center justify-between gap-2">
                      {key === 'colours' ? (
                        <ColourSwatch name={item.name} hex={item.hex} />
                      ) : (
                        <span className="text-slate-800 font-medium truncate">{item.name}</span>
                      )}
                      {item.code && <span className="font-mono text-slate-400">{item.code}</span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Catalog View: Left Filters + Right Articles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <aside className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-700 mb-2">Brands</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              <button
                type="button"
                onClick={() => setBrandFilter('ALL')}
                className={brandFilter === 'ALL' ? 'w-full text-left px-2 py-1 rounded text-xs font-medium bg-teal-50 text-teal-800' : 'w-full text-left px-2 py-1 rounded text-xs text-slate-600 hover:bg-slate-50'}
              >
                All brands ({enrichedArticles.length})
              </button>
              {brands.map((b: any) => (
                <button
                  key={b.id || b.name}
                  type="button"
                  onClick={() => setBrandFilter(b.name)}
                  className={brandFilter === b.name ? 'w-full text-left px-2 py-1 rounded text-xs font-medium bg-teal-50 text-teal-800' : 'w-full text-left px-2 py-1 rounded text-xs text-slate-600 hover:bg-slate-50'}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <h3 className="text-xs font-semibold text-slate-700 mb-2">Categories</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              <button
                type="button"
                onClick={() => setCatFilter('ALL')}
                className={catFilter === 'ALL' ? 'w-full text-left px-2 py-1 rounded text-xs font-medium bg-teal-50 text-teal-800' : 'w-full text-left px-2 py-1 rounded text-xs text-slate-600 hover:bg-slate-50'}
              >
                All categories
              </button>
              {categories.map((c: any) => (
                <button
                  key={c.id || c.name}
                  type="button"
                  onClick={() => setCatFilter(c.name)}
                  className={catFilter === c.name ? 'w-full text-left px-2 py-1 rounded text-xs font-medium bg-teal-50 text-teal-800' : 'w-full text-left px-2 py-1 rounded text-xs text-slate-600 hover:bg-slate-50'}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="lg:col-span-9 space-y-4 min-w-0">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search articles by name, code, or brand…"
            chips={[
              { key: 'ALL', label: 'All', count: enrichedArticles.length },
              { key: 'ACTIVE', label: 'Active' },
              { key: 'INACTIVE', label: 'Inactive' },
            ]}
            activeChip={statusFilter}
            onChipChange={(k) => setStatusFilter(k as any)}
            onReset={() => {
              setSearch('')
              setBrandFilter('ALL')
              setCatFilter('ALL')
              setStatusFilter('ALL')
            }}
          />

          {articleView === 'cards' ? (
            filteredArticles.length === 0 ? (
              <EmptyState
                icon={<Database className="w-6 h-6" />}
                title="No articles match"
                description="Create a footwear article or clear your filters."
                action={
                  <Button variant="primary" onClick={() => navigate('/masters/articles/new')}>
                    New Article
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredArticles.map((art) => (
                  <ArticleCard
                    key={art.id || art.name}
                    name={art.name}
                    brand={art.brandName}
                    sku={art.code}
                    mrp={Number(art.mrp ?? art.selling_price ?? 3999)}
                    stockQty={art.totalStock}
                    onClick={() => {
                      setSelectedArticle(art)
                      setDetailTab('overview')
                    }}
                  />
                ))}
              </div>
            )
          ) : (
            <DataTable
              data={filteredArticles}
              columns={columns}
              getRowId={(r, i) => r.id || r.name || String(i)}
              isLoading={isLoading}
              error={error}
              onRetry={refetch}
              onRowClick={(r) => {
                setSelectedArticle(r)
                setDetailTab('overview')
              }}
              exportFilename="solecontrol-articles"
              emptyIcon={<Database className="w-6 h-6" />}
              emptyTitle="No footwear articles yet"
              emptyDescription="Create your first article to generate size-run SKU variants."
              emptyAction={
                <Button variant="primary" onClick={() => navigate('/masters/articles/new')}>
                  New Article
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Article Detail Drawer with 6 tabs */}
      <Drawer
        open={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
        title={selectedArticle?.name || 'Article Details'}
        subtitle={`${selectedArticle?.brandName || ''} · HSN ${selectedArticle?.hsn || '6404'}`}
        width="xl"
      >
        {selectedArticle && (
          <div className="space-y-4 text-sm">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
              {(
                [
                  ['overview', 'Overview'],
                  ['variants', 'Variants & barcodes'],
                  ['stock', 'Stock by location'],
                  ['purchases', 'Purchase history'],
                  ['sales', 'Sales history'],
                  ['price', 'Price history'],
                ] as const
              ).map(([k, lbl]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDetailTab(k)}
                  className={
                    detailTab === k
                      ? 'px-2.5 py-1 rounded bg-white text-xs font-medium text-slate-900 shadow-xs whitespace-nowrap'
                      : 'px-2.5 py-1 text-xs text-slate-600 whitespace-nowrap'
                  }
                >
                  {lbl}
                </button>
              ))}
            </div>

            {detailTab === 'overview' && (
              <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Brand</p>
                  <p className="font-medium text-slate-900">{selectedArticle.brandName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Category</p>
                  <p className="font-medium text-slate-900">{selectedArticle.categoryName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Default MRP</p>
                  <p className="font-semibold tabular-nums">
                    {formatINR(selectedArticle.mrp ?? selectedArticle.selling_price ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total stock</p>
                  <p className="font-semibold tabular-nums">{selectedArticle.totalStock} pairs</p>
                </div>
              </div>
            )}

            {(detailTab === 'variants' || detailTab === 'stock') && (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                {selectedArticle.variantsList?.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500 text-center">No variants in stock yet.</p>
                ) : (
                  selectedArticle.variantsList.map((v: any) => (
                    <div key={v.sku} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-medium text-teal-700">{v.sku}</span>
                        <span className="text-slate-500 ml-2">
                          {v.size_label || v.size || 'UK 8'} · {v.colour_name || v.colour || 'Standard'}
                        </span>
                      </div>
                      <span className="font-semibold tabular-nums">
                        {detailTab === 'stock' ? `${v.quantity ?? 0} pairs` : v.barcode || '—'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {(detailTab === 'purchases' || detailTab === 'sales' || detailTab === 'price') && (
              <div className="p-6 text-center border border-slate-200 rounded-lg text-xs text-slate-500">
                Article-level {detailTab} history is linked as transactions are posted. Last updated:{' '}
                {formatDateIN(selectedArticle.updatedAt || new Date())}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
