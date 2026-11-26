import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Database, Lock } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader, FilterBar, DataTable, StatusBadge, ColumnDef } from '../components/ui'

export function DatabasePage() {
  const [search, setSearch] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['db-tables'],
    queryFn: () => api.get('/database/tables').then((r) => r.data?.data ?? []),
  })

  const tables: any[] = Array.isArray(data) ? data : []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tables
    return tables.filter(
      (t) =>
        String(t.name || t.table_name || '').toLowerCase().includes(q) ||
        String(t.group || '').toLowerCase().includes(q)
    )
  }, [tables, search])

  const columns: ColumnDef<any>[] = [
    {
      id: 'name',
      header: 'Table name',
      sortable: true,
      accessor: (r) => r.name || r.table_name || '',
      cell: (r) => <span className="font-mono text-xs text-teal-700">{r.name || r.table_name}</span>,
    },
    {
      id: 'group',
      header: 'Module group',
      cell: (r) => <StatusBadge status="ACTIVE" label={r.group || 'Core'} tone="neutral" />,
    },
    {
      id: 'rows',
      header: 'Row count',
      align: 'right',
      sortable: true,
      accessor: (r) => Number(r.rowCount ?? r.row_count ?? 0),
      cell: (r) => <span className="font-semibold tabular-nums">{r.rowCount ?? r.row_count ?? 0}</span>,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Database Explorer"
        description="Read-only schema browser and live row counts across PostgreSQL tables."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Database Explorer' }]}
      />

      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
        <Lock className="w-4 h-4 shrink-0" />
        Read-only mode: Direct table edits are disabled to protect double-entry and stock integrity.
      </div>

      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search tables…" onReset={() => setSearch('')} />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r, i) => r.name || r.table_name || String(i)}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        exportFilename="solecontrol-db-tables"
        emptyIcon={<Database className="w-6 h-6" />}
        emptyTitle="No table metadata returned"
        emptyDescription="Verify database connectivity from System Health."
      />
    </div>
  )
}
