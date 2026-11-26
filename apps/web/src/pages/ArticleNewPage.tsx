import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/format'
import {
  FullPageForm, FormField, SearchableCombobox, MoneyInput, inputBaseClass,
} from '../components/ui'
import { DEFAULT_UK_SIZES, MarginBadge } from '../components/footwear'

export function ArticleNewPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [name, setName] = useState('')
  const [brandId, setBrandId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [costPrice, setCostPrice] = useState(1800)
  const [mrp, setMrp] = useState(3999)
  const [hsn, setHsn] = useState('6404')
  const [selectedColours, setSelectedColours] = useState<string[]>(['Black'])
  const [selectedSizes, setSelectedSizes] = useState<string[]>(DEFAULT_UK_SIZES)

  const { data: brandsData } = useQuery({
    queryKey: ['masters', 'brands'],
    queryFn: () => api.get('/masters/brands').then((r) => r.data?.data ?? []),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['masters', 'categories'],
    queryFn: () => api.get('/masters/categories').then((r) => r.data?.data ?? []),
  })

  const brands: any[] = Array.isArray(brandsData) ? brandsData : []
  const categories: any[] = Array.isArray(categoriesData) ? categoriesData : []

  const suggestedGst = mrp > 2500 ? 18 : mrp >= 1000 ? 12 : 5

  const generatedVariants = useMemo(() => {
    const prefix = (name || 'ART')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 6)
      .toUpperCase()
    const list: { sku: string; colour: string; size: string }[] = []
    selectedColours.forEach((c) => {
      const colCode = c.slice(0, 3).toUpperCase()
      selectedSizes.forEach((sz) => {
        const szNum = sz.replace(/[^0-9]/g, '') || sz
        list.push({ sku: `${prefix}-${szNum}-${colCode}`, colour: c, size: sz })
      })
    })
    return list
  }, [name, selectedColours, selectedSizes])

  const saveMutation = useMutation({
    mutationFn: () =>
      api.post('/masters/articles', {
        name: name.trim(),
        brandId: brandId || undefined,
        categoryId: categoryId || undefined,
        hsn,
        gstRate: suggestedGst,
        costPrice,
        mrp,
        variants: generatedVariants,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', 'articles'] })
      qc.invalidateQueries({ queryKey: ['masters', 'variants'] })
      toast.success(`Article saved with ${generatedVariants.length} SKU variants`)
      navigate('/masters')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save article')),
  })

  const toggleColour = (c: string) => {
    setSelectedColours((prev) =>
      prev.includes(c) ? (prev.length > 1 ? prev.filter((x) => x !== c) : prev) : [...prev, c]
    )
  }

  const toggleSize = (sz: string) => {
    setSelectedSizes((prev) =>
      prev.includes(sz) ? (prev.length > 1 ? prev.filter((x) => x !== sz) : prev) : [...prev, sz]
    )
  }

  return (
    <FullPageForm
      title="New Footwear Article"
      subtitle="Define article details, pricing, HSN/GST, and preview generated SKU variants before saving."
      backLabel="Master Data"
      onCancel={() => navigate('/masters')}
      isDirty={Boolean(name)}
      primaryActionLabel="Save Article"
      onPrimaryAction={() => {
        if (!name.trim()) {
          toast.error('Article name is required')
          return
        }
        saveMutation.mutate()
      }}
      primaryLoading={saveMutation.isPending}
      summaryPanel={
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Variant Preview ({generatedVariants.length} SKUs)
          </h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Margin</span>
            <MarginBadge cost={costPrice} mrp={mrp} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Auto-suggested GST</span>
            <span className="font-medium text-slate-900">{suggestedGst}% (HSN {hsn})</span>
          </div>
          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {generatedVariants.map((v) => (
              <div key={v.sku} className="px-3 py-2 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-800">{v.sku}</span>
                <span className="text-slate-500">
                  {v.colour} · {v.size}
                </span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Article name" required className="sm:col-span-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nike Air Max 90"
              className={inputBaseClass}
            />
          </FormField>
          <FormField label="Brand">
            <SearchableCombobox
              options={brands.map((b) => ({ value: b.id, label: b.name }))}
              value={brandId}
              onChange={setBrandId}
              placeholder="Select brand…"
            />
          </FormField>
          <FormField label="Category">
            <SearchableCombobox
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Select category…"
            />
          </FormField>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Pricing & Tax</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Cost price">
            <MoneyInput value={costPrice} onChange={setCostPrice} />
          </FormField>
          <FormField label="Retail MRP">
            <MoneyInput value={mrp} onChange={setMrp} />
          </FormField>
          <FormField label="HSN code">
            <input
              type="text"
              value={hsn}
              onChange={(e) => setHsn(e.target.value)}
              className={inputBaseClass}
            />
          </FormField>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Colours & Size Range</h3>
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">Select colours</p>
          <div className="flex flex-wrap gap-2">
            {['Black', 'White', 'Navy', 'Grey', 'Tan', 'Royal Blue'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleColour(c)}
                className={
                  selectedColours.includes(c)
                    ? 'px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white'
                    : 'px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200'
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">Select UK sizes</p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_UK_SIZES.map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => toggleSize(sz)}
                className={
                  selectedSizes.includes(sz)
                    ? 'px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white'
                    : 'px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200'
                }
              >
                {sz}
              </button>
            ))}
          </div>
        </div>
      </div>
    </FullPageForm>
  )
}
