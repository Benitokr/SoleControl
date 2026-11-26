import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText } from 'lucide-react'
import { api } from '../lib/api'
import { formatDateTimeIN } from '../lib/format'
import { PageHeader, FilterBar, DataTable, StatusBadge, Drawer, ColumnDef } from '../components/ui'

export function AuditPage() {
  const [search, setSearch] = useState('')
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/audit-logs').then((r) => r.data?.data ?? []),
  })

  const logs: any[] = Array.isArray(data) ? data : []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return logs
    return logs.filter(
      (l) =>
        String(l.entity || l.module || '').toLowerCase().includes(q) ||
        String(l.action || '').toLowerCase().includes(q) ||
        String(l.user?.name || l.actorName || '').toLowerCase().includes(q)
    )
  }, [logs, search])

  const columns: ColumnDef<any>[] = [
    {
      id: 'time',
      header: 'Timestamp',
      cell: (r) => (
        <span className="text-xs tabular-nums text-slate-600">
          {formatDateTimeIN(r.createdAt || r.created_at)}
        </span>
      ),
    },
    {
      id: 'user',
      header: 'User',
      cell: (r) => r.user?.name || r.actorName || 'Super Admin',
    },
    {
      id: 'module',
      header: 'Module / Entity',
      cell: (r) => <span className="font-medium text-slate-900">{r.entity || r.module || 'System'}</span>,
    },
    {
      id: 'action',
      header: 'Action',
      cell: (r) => <StatusBadge status="ACTIVE" label={r.action || 'UPDATE'} tone="teal" />,
    },
    {
      id: 'record',
      header: 'Record ID',
      cell: (r) => <span className="font-mono text-xs text-slate-600">{String(r.entityId || r.recordId || r.id).slice(0, 12)}</span>,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Trail"
        description="Read-only append-only log of system actions with before/after value diffs."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Audit Trail' }]}
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter by user, module, or action…"
        onReset={() => setSearch('')}
      />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r, i) => r.id || String(i)}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        onRowClick={(r) => setSelectedLog(r)}
        exportFilename="solecontrol-audit-trail"
        emptyIcon={<ScrollText className="w-6 h-6" />}
        emptyTitle="No audit events recorded"
        emptyDescription="System mutations and approvals appear here automatically."
      />

      <Drawer
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Diff"
        subtitle={selectedLog ? formatDateTimeIN(selectedLog.createdAt || selectedLog.created_at) : undefined}
        width="lg"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-500">Module:</span>{' '}
                <strong className="text-slate-900">{selectedLog.entity || selectedLog.module}</strong>
              </div>
              <div>
                <span className="text-slate-500">Action:</span>{' '}
                <strong className="text-slate-900">{selectedLog.action}</strong>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-red-200 rounded-lg p-3 bg-red-50/40">
                <p className="font-semibold text-red-800 mb-1.5">Before</p>
                <pre className="font-mono text-[11px] text-slate-700 whitespace-pre-wrap break-all">
                  {JSON.stringify(selectedLog.before || selectedLog.oldValues || {}, null, 2)}
                </pre>
              </div>
              <div className="border border-emerald-200 rounded-lg p-3 bg-emerald-50/40">
                <p className="font-semibold text-emerald-800 mb-1.5">After</p>
                <pre className="font-mono text-[11px] text-slate-700 whitespace-pre-wrap break-all">
                  {JSON.stringify(selectedLog.after || selectedLog.newValues || selectedLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
