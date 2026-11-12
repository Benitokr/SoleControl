import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { api } from '../lib/api'

type Tab = 'profile' | 'stores' | 'settings'

export function CompanyConfigPage() {
  const [tab, setTab] = useState<Tab>('profile')
  const qc = useQueryClient()

  const profile = useQuery({ queryKey: ['company-profile'], queryFn: () => api.get('/company/profile').then(r => r.data?.data) })
  const stores = useQuery({ queryKey: ['stores'], queryFn: () => api.get('/company/stores').then(r => r.data?.data ?? []) })
  const settings = useQuery({ queryKey: ['company-settings'], queryFn: () => api.get('/company/settings').then(r => r.data?.data ?? []) })

  const saveProfile = useMutation({
    mutationFn: (body: Record<string, string>) => api.put('/company/profile', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-profile'] }),
  })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'stores', label: 'Stores' },
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Building2 size={20} /> Company Configuration
        </h1>
      </div>

      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-1.5 text-sm rounded-md transition-all"
            style={tab === t.key
              ? { background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,.08)' }
              : { color: 'var(--color-muted)' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {tab === 'profile' && (
          profile.isLoading ? <Spinner /> : profile.error ? <Err /> : (
            <div className="space-y-4 max-w-lg">
              {(['name','legalName','gstin','pan','email','phone','address'] as const).map(f => (
                <div key={f}>
                  <label className="block text-xs font-medium mb-1 capitalize" style={{ color: 'var(--color-muted)' }}>{f}</label>
                  <input defaultValue={profile.data?.[f] ?? ''}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                </div>
              ))}
              <button onClick={() => saveProfile.mutate(profile.data)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: 'var(--color-primary)' }}>
                Save Profile
              </button>
            </div>
          )
        )}

        {tab === 'stores' && (
          stores.isLoading ? <Spinner /> : stores.error ? <Err /> : (
            <div className="space-y-3">
              {(stores.data as any[]).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ border: '1px solid var(--color-border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{s.name}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{s.code} · {s.gstin ?? 'No GSTIN'}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={s.isActive ? { background: 'var(--color-success)', color: '#fff' } : { background: 'var(--color-bg)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'settings' && (
          settings.isLoading ? <Spinner /> : settings.error ? <Err /> : (
            <div className="space-y-2">
              {(settings.data as any[]).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2"
                  style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{s.key}</p>
                    {s.description && <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{s.description}</p>}
                  </div>
                  <span className="text-sm font-mono" style={{ color: 'var(--color-text)' }}>{s.value}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

function Spinner() { return <div className="py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Loading…</div> }
function Err() { return <div className="py-8 text-center text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load</div> }

