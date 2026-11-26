import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plug, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/format'
import { PageHeader, StatusBadge, Button, ErrorState, Skeleton } from '../components/ui'

export function IntegrationsPage() {
  const qc = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.get('/integrations').then((r) => r.data?.data ?? []),
  })

  const providers: any[] = Array.isArray(data) ? data : []

  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/integrations/${id}/test`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
      toast.success('Connection test completed')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Connection test failed')),
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Integrations"
        description="Manage WhatsApp receipts, GST portal sync, payment gateways, and thermal printer connectors."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Integrations' }]}
      />

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : error ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((p: any, i: number) => (
            <div key={p.id || i} className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Plug className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{p.name || p.provider}</h3>
                    <p className="text-xs text-slate-500">{p.category || 'Connector'}</p>
                  </div>
                </div>
                <StatusBadge
                  status={p.isConnected || p.status === 'CONNECTED' ? 'ACTIVE' : 'INACTIVE'}
                  label={p.isConnected || p.status === 'CONNECTED' ? 'Connected' : 'Not configured'}
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                loading={testMutation.isPending}
                onClick={() => testMutation.mutate(p.id || p.provider)}
              >
                Test Connection
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
