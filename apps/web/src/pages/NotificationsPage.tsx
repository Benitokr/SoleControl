import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bell, CheckCheck } from 'lucide-react'
import { api } from '../lib/api'
import { formatDateTimeIN, getApiErrorMessage } from '../lib/format'
import { PageHeader, FilterBar, StatusBadge, Button, EmptyState, ErrorState, Skeleton } from '../components/ui'

export function NotificationsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'inbox' | 'rules'>('inbox')
  const [filter, setFilter] = useState('ALL')

  const { data: alertsData, isLoading, error, refetch } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get('/alerts').then((r) => r.data?.data ?? []),
  })

  const { data: rulesData } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => api.get('/alerts/rules').then((r) => r.data?.data ?? []),
    enabled: tab === 'rules',
  })

  const alerts: any[] = Array.isArray(alertsData) ? alertsData : []
  const rules: any[] = Array.isArray(rulesData) ? rulesData : []

  const filtered = useMemo(() => {
    if (filter === 'UNREAD') return alerts.filter((a) => !a.isRead && !a.is_read)
    return alerts
  }, [alerts, filter])

  const markAllMutation = useMutation({
    mutationFn: () => api.post('/alerts/read-all', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('All notifications marked as read')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to mark notifications read')),
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications & Alerts"
        description="Operational stock alerts, payment reminders, and threshold settings."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Notifications' }]}
        primaryAction={
          tab === 'inbox' ? (
            <Button
              variant="outline"
              icon={<CheckCheck className="w-4 h-4" />}
              loading={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab('inbox')}
          className={tab === 'inbox' ? 'px-3.5 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white' : 'px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-600'}
        >
          Inbox ({alerts.filter((a) => !a.isRead && !a.is_read).length} unread)
        </button>
        <button
          type="button"
          onClick={() => setTab('rules')}
          className={tab === 'rules' ? 'px-3.5 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white' : 'px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-600'}
        >
          Alert Thresholds
        </button>
      </div>

      {tab === 'inbox' ? (
        <>
          <FilterBar
            chips={[
              { key: 'ALL', label: 'All', count: alerts.length },
              { key: 'UNREAD', label: 'Unread', count: alerts.filter((a) => !a.isRead && !a.is_read).length },
            ]}
            activeChip={filter}
            onChipChange={setFilter}
          />
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : error ? (
            <ErrorState message={getApiErrorMessage(error)} onRetry={refetch} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Bell className="w-6 h-6" />}
              title="No notifications"
              description="You are caught up on all store alerts."
            />
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
              {filtered.map((a: any, i: number) => (
                <div key={a.id || i} className="p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{a.title || 'System Alert'}</span>
                      <StatusBadge status={a.severity || 'INFO'} />
                    </div>
                    <p className="text-xs text-slate-600">{a.message}</p>
                    <p className="text-[11px] text-slate-400 tabular-nums">
                      {formatDateTimeIN(a.createdAt || a.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
          {rules.map((r: any, i: number) => (
            <div key={r.id || i} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">{r.name}</p>
                <p className="text-xs font-mono text-slate-500 mt-0.5">{r.condition}</p>
              </div>
              <StatusBadge status={r.isActive || r.is_active ? 'ACTIVE' : 'INACTIVE'} label={`Threshold: ${r.threshold}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
