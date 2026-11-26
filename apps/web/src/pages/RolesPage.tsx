import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck, Lock, Eye, Save } from 'lucide-react'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/format'
import { PageHeader, Button, StatusBadge, ErrorState, Skeleton } from '../components/ui'

const MODULES = [
  'dashboard', 'sales', 'customers', 'offers', 'inventory', 'display_stock',
  'stock_transfers', 'ageing', 'damaged_goods', 'barcodes', 'purchases',
  'vendors', 'accounting', 'capital', 'bank_gst', 'reports', 'masters',
  'company', 'locations', 'users', 'roles', 'audit',
]
const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'] as const

export function RolesPage() {
  const qc = useQueryClient()
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [compareMode, setCompareMode] = useState(false)
  const [draftPerms, setDraftPerms] = useState<string[] | null>(null)

  const { data: rolesData, isLoading, error, refetch } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r) => r.data?.data ?? []),
  })

  const roles: any[] = Array.isArray(rolesData) ? rolesData : []
  const activeRole = roles.find((r) => r.id === selectedRoleId) || roles[0]

  const currentPerms: string[] = useMemo(() => {
    if (draftPerms) return draftPerms
    const rp = activeRole?.permissions || []
    return rp.map((p: any) => (typeof p === 'string' ? p : p.key || p.permission?.key)).filter(Boolean)
  }, [activeRole, draftPerms])

  const isLocked = String(activeRole?.code || '').toUpperCase() === 'SUPER_ADMIN'

  const togglePerm = (key: string) => {
    if (isLocked) return
    const next = currentPerms.includes(key)
      ? currentPerms.filter((k) => k !== key)
      : [...currentPerms, key]
    setDraftPerms(next)
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put(`/roles/${activeRole.id}/permissions`, { permissions: currentPerms }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      setDraftPerms(null)
      toast.success(`Updated permissions for ${activeRole.name}`)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to update permissions')),
  })

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Roles & Permissions" breadcrumbs={[{ label: 'Administration' }, { label: 'Roles' }]} />
        <ErrorState message={getApiErrorMessage(error)} onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roles & Permissions"
        description="Configure module-level access rights across View, Create, Edit, Delete, Approve, and Export."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Roles & Permissions' }]}
        secondaryActions={
          <Button
            variant={compareMode ? 'primary' : 'outline'}
            size="sm"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => setCompareMode((c) => !c)}
          >
            {compareMode ? 'Matrix view' : 'Compare roles'}
          </Button>
        }
        primaryAction={
          draftPerms && !isLocked ? (
            <Button
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Save Permissions
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : compareMode ? (
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">Module</th>
                {roles.map((r) => (
                  <th key={r.id} className="px-3 py-2.5 text-center font-medium text-slate-700">
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MODULES.map((m) => (
                <tr key={m}>
                  <td className="px-4 py-2.5 font-medium text-slate-800 capitalize">
                    {m.replace(/_/g, ' ')}
                  </td>
                  {roles.map((r) => {
                    const perms = (r.permissions || []).map((p: any) =>
                      typeof p === 'string' ? p : p.key || p.permission?.key
                    )
                    const isSuper = r.code === 'SUPER_ADMIN'
                    const count = isSuper
                      ? ACTIONS.length
                      : ACTIONS.filter((a) => perms.includes(`${m}.${a}`)).length
                    return (
                      <td key={r.id} className="px-3 py-2.5 text-center tabular-nums">
                        <StatusBadge
                          status={count > 0 ? 'ACTIVE' : 'INACTIVE'}
                          label={`${count}/${ACTIONS.length}`}
                          tone={count === ACTIONS.length ? 'success' : count > 0 ? 'teal' : 'neutral'}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Role List */}
          <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200 p-2 space-y-1">
            {roles.map((r) => {
              const selected = activeRole?.id === r.id
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRoleId(r.id)
                    setDraftPerms(null)
                  }}
                  className={
                    selected
                      ? 'w-full px-3 py-2.5 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 text-left flex items-center justify-between'
                      : 'w-full px-3 py-2.5 rounded-lg hover:bg-slate-50 text-slate-700 text-left flex items-center justify-between'
                  }
                >
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.code}</div>
                  </div>
                  {r.code === 'SUPER_ADMIN' && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              )
            })}
          </div>

          {/* Right Matrix */}
          <div className="lg:col-span-9 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold text-slate-900">{activeRole?.name}</span>
                {isLocked && <StatusBadge status="ACTIVE" label="Locked system role" tone="neutral" />}
              </div>
              <span className="text-xs text-slate-500">
                Can view{' '}
                {isLocked
                  ? MODULES.length
                  : MODULES.filter((m) => currentPerms.includes(`${m}.view`)).length}{' '}
                of {MODULES.length} modules
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-600">Module</th>
                    {ACTIONS.map((a) => (
                      <th key={a} className="px-3 py-2.5 text-center font-medium text-slate-600 capitalize">
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MODULES.map((m) => (
                    <tr key={m} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-medium text-slate-800 capitalize">
                        {m.replace(/_/g, ' ')}
                      </td>
                      {ACTIONS.map((a) => {
                        const key = `${m}.${a}`
                        const checked = isLocked || currentPerms.includes(key)
                        return (
                          <td key={a} className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              disabled={isLocked}
                              checked={checked}
                              onChange={() => togglePerm(key)}
                              aria-label={`${m} ${a}`}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-600 disabled:opacity-60"
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
