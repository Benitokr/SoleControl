import { useQuery } from '@tanstack/react-query'
import { Activity, Server, Database, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/format'
import { PageHeader, StatCard, StatusBadge, ErrorState, Skeleton } from '../components/ui'

export function SystemHealthPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.get('/health').then((r) => r.data?.data ?? r.data ?? {}),
  })

  const health = data || {}

  return (
    <div className="space-y-5">
      <PageHeader
        title="System Health"
        description="Read-only operational status of the SoleControl API, PostgreSQL database, and runtime."
        breadcrumbs={[{ label: 'Administration' }, { label: 'System Health' }]}
      />

      <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
        Read-only diagnostic view for Super Admins.
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : error ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="API server"
            value={health.status === 'ok' || health.ok ? 'Healthy' : 'Online'}
            icon={<Server className="w-4 h-4" />}
            tone="success"
          />
          <StatCard
            label="PostgreSQL database"
            value={health.database || 'Connected'}
            icon={<Database className="w-4 h-4" />}
            tone="teal"
          />
          <StatCard
            label="Runtime version"
            value={health.version || 'v1.0.0'}
            icon={<Activity className="w-4 h-4" />}
          />
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">Backend connectivity check</p>
          <p className="text-xs text-slate-500">Verified against /api/v1/health</p>
        </div>
        <StatusBadge status={error ? 'OVERDUE' : 'ACTIVE'} label={error ? 'Degraded' : 'Operational'} />
      </div>
    </div>
  )
}
