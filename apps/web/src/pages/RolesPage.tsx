import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, Lock } from 'lucide-react'
import { api } from '../lib/api'

interface Role { id: string; name: string; code: string; isSystem: boolean; _count?: { users: number; rolePermissions: number } }

export function RolesPage() {
  const { data, isLoading, error } = useQuery<{ data: Role[] }>({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then(r => r.data),
  })

  const roles = data?.data ?? []

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <ShieldCheck size={20} /> Roles &amp; Permissions
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>Define roles and assign permissions</p>
      </div>

      {isLoading && <div className="text-sm py-8 text-center" style={{ color: 'var(--color-muted)' }}>Loading…</div>}
      {error && <div className="text-sm py-8 text-center" style={{ color: 'var(--color-danger)' }}>Failed to load roles</div>}

      <div className="grid gap-3">
        {roles.map(r => (
          <div key={r.id} className="p-4 rounded-xl flex items-center justify-between"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-3">
              {r.isSystem && <Lock size={14} style={{ color: 'var(--color-muted)' }} />}
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{r.name}</p>
                <p className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{r.code}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>{r._count?.rolePermissions ?? 0} permissions</p>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{r._count?.users ?? 0} users</p>
            </div>
          </div>
        ))}
        {!isLoading && roles.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--color-muted)' }}>No roles found</p>
        )}
      </div>
    </div>
  )
}

