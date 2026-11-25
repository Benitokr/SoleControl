import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus, Store, Settings, Check, X, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'

type Tab = 'profile' | 'stores' | 'settings'

export function CompanyConfigPage() {
  const [tab, setTab] = useState<Tab>('profile')
  const [showAddStoreModal, setShowAddStoreModal] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState<Record<string, string>>({})

  // New Store form
  const [storeName, setStoreName] = useState('')
  const [storeCode, setStoreCode] = useState('')
  const [storeGstin, setStoreGstin] = useState('')
  const [storeAddress, setStoreAddress] = useState('')

  const qc = useQueryClient()

  const profile = useQuery({ queryKey: ['company-profile'], queryFn: () => api.get('/company/profile').then(r => r.data?.data) })
  const stores = useQuery({ queryKey: ['stores'], queryFn: () => api.get('/company/stores').then(r => r.data?.data ?? []) })
  const settings = useQuery({ queryKey: ['company-settings'], queryFn: () => api.get('/company/settings').then(r => r.data?.data ?? []) })

  useEffect(() => {
    if (profile.data) {
      setFormData(profile.data)
    }
  }, [profile.data])

  const saveProfile = useMutation({
    mutationFn: (body: Record<string, string>) => api.put('/company/profile', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-profile'] })
      setSuccessMsg('Company profile details saved successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to update company profile.')
    }
  })

  const addStoreMutation = useMutation({
    mutationFn: (body: any) => api.post('/company/stores', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stores'] })
      setShowAddStoreModal(false)
      setStoreName('')
      setStoreCode('')
      setStoreGstin('')
      setStoreAddress('')
      setSuccessMsg('New store location registered successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to add store location.')
    }
  })

  const handleFieldChange = (key: string, val: string) => {
    setFormData(prev => ({ ...prev, [key]: val }))
  }

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    saveProfile.mutate(formData)
  }

  const handleAddStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeName.trim() || !storeCode.trim()) {
      setFormError('Store name and code are required.')
      return
    }
    setFormError('')
    addStoreMutation.mutate({
      name: storeName,
      code: storeCode.toUpperCase(),
      gstin: storeGstin,
      address: storeAddress,
      isActive: true
    })
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'Company Profile' },
    { key: 'stores', label: 'Store Locations' },
    { key: 'settings', label: 'System Configuration' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Building2 size={24} className="text-indigo-600" /> Company & Store Configuration
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Statutory entity profiles, multi-store physical outlets, and inventory accounting policies
          </p>
        </div>
        {tab === 'stores' && (
          <button
            onClick={() => { setShowAddStoreModal(true); setFormError('') }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xs transition-all hover:opacity-95"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={16} /> Add Store Outlet
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 flex items-center gap-2">
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 text-xs font-bold rounded-lg transition-all"
            style={tab === t.key
              ? { background: 'var(--color-surface)', color: 'var(--color-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.08)' }
              : { color: 'var(--color-muted)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content Card */}
      <div className="rounded-xl border p-6 shadow-xs" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {tab === 'profile' && (
          profile.isLoading ? <Spinner /> : profile.error ? <Err /> : (
            <form onSubmit={handleProfileSubmit} className="space-y-5 max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['name', 'legalName', 'gstin', 'pan', 'email', 'phone', 'address'] as const).map(f => (
                  <div key={f} className={f === 'address' ? 'md:col-span-2' : ''}>
                    <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-500">
                      {f === 'legalName' ? 'Legal Entity Name' : f === 'name' ? 'Company Display Name' : f.toUpperCase()}
                    </label>
                    <input
                      value={formData[f] ?? ''}
                      onChange={e => handleFieldChange(f, e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:ring-indigo-500/20"
                      style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saveProfile.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-95"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {saveProfile.isPending ? 'Saving Profile…' : 'Save Company Profile'}
                </button>
              </div>
            </form>
          )
        )}

        {tab === 'stores' && (
          stores.isLoading ? <Spinner /> : stores.error ? <Err /> : (
            <div className="space-y-3">
              {(Array.isArray(stores.data) ? stores.data : []).map((s: any) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-4 rounded-xl border hover:border-indigo-300 transition-colors"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                      <Store size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{s.name}</p>
                      <p className="text-xs font-mono text-slate-400">{s.code} · GSTIN: {s.gstin ?? '33AABCF4050M1Z2'}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Store
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'settings' && (
          settings.isLoading ? <Spinner /> : settings.error ? <Err /> : (
            <div className="divide-y max-w-2xl" style={{ borderColor: 'var(--color-border)' }}>
              {(Array.isArray(settings.data) ? settings.data : []).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-3.5">
                  <div className="pr-4">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{s.key}</p>
                    {s.description && <p className="text-xs text-slate-400 mt-0.5">{s.description}</p>}
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border bg-slate-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400"
                        style={{ borderColor: 'var(--color-border)' }}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Add Store Modal */}
      {showAddStoreModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl border space-y-4 animate-in fade-in"
               style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Register Store Location</h3>
              <button onClick={() => setShowAddStoreModal(false)} className="p-1 hover:opacity-75"><X size={18} /></button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddStoreSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Store Outlet Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Retail Express - Downtown"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Store Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STR-02"
                  value={storeCode}
                  onChange={e => setStoreCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>GSTIN (Optional / Store specific)</label>
                <input
                  type="text"
                  placeholder="33AABCF4050M1Z2"
                  value={storeGstin}
                  onChange={e => setStoreGstin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddStoreModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addStoreMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {addStoreMutation.isPending ? 'Registering…' : 'Add Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading configuration…</div>
}

function Err() {
  return <div className="py-12 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load configuration</div>
}
