import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/format'
import { PageHeader, StatusBadge, Button, EmptyState, ErrorState, Skeleton } from '../components/ui'

export function InsightsPage() {
  const navigate = useNavigate()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'insights'],
    queryFn: () => api.get('/dashboard/insights').then((r) => r.data?.data ?? []),
  })

  const insights: any[] = Array.isArray(data) ? data : []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Business Insights"
        description="Automated operational intelligence computed from live sales, stock ageing, and vendor payables."
        breadcrumbs={[{ label: 'Reports' }, { label: 'Business Insights' }]}
      />

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : error ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={refetch} />
      ) : insights.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="w-6 h-6" />}
          title="No insights generated yet"
          description="As sales and stock movements accumulate, automated recommendations appear here."
        />
      ) : (
        <div className="space-y-3">
          {insights.map((ins: any, i: number) => (
            <div key={ins.id || i} className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={ins.severity || 'INFO'} />
                  <h3 className="text-sm font-semibold text-slate-900">{ins.title || 'Insight'}</h3>
                </div>
                <p className="text-xs text-slate-600">{ins.message}</p>
              </div>
              {ins.actionRoute && (
                <Button size="sm" variant="outline" onClick={() => navigate(ins.actionRoute)}>
                  {ins.actionText || 'Open'}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
