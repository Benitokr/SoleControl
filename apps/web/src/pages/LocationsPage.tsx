import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Warehouse, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/format'
import {
  PageHeader, FilterBar, DataTable, StatusBadge, Button, Drawer,
  FormField, SearchableCombobox, ColumnDef, inputBaseClass,
} from '../components/ui'

export function LocationsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showDrawer, setShowDrawer] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [type, setType] = useState('RACK')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data?.data ?? []),
  })

  const locations: any[] = Array.isArray(data) ? data : []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return locations
    return locations.filter(
      (l) =>
        String(l.name || '').toLowerCase().includes(q) ||
        String(l.code || '').toLowerCase().includes(q) ||
        String(l.type || '').toLowerCase().includes(q)
    )
  }, [locations, search])

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/locations', { name: name.trim(), code: code.trim(), type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Location saved')
      setShowDrawer(false)
      setName('')
      setCode('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save location')),
  })

  const columns: ColumnDef<any>[] = [
    {
      id: 'name',
      header: 'Location name',
      sortable: true,
      accessor: (r) => r.name || '',
      cell: (r) => <span className="font-medium text-slate-900">{r.name}</span>,
    },
    {
      id: 'code',
      header: 'Code',
      sortable: true,
      accessor: (r) => r.code || '',
      cell: (r) => <span className="font-mono text-xs text-slate-600">{r.code || '—'}</span>,
    },
    {
      id: 'type',
      header: 'Type',
      sortable: true,
      accessor: (r) => r.type || 'WAREHOUSE',
      cell: (r) => <StatusBadge status="APPROVED" label={r.type || 'Location'} tone="teal" />,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (r) => (
        <StatusBadge status={r.isActive === false || r.is_active === false ? 'INACTIVE' : 'ACTIVE'} />
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Locations, Racks & Store Tree"
        description="Configure floors, departments, storage racks, shelves, and display counters."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Locations' }]}
        primaryAction={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowDrawer(true)}>
            Add Location
          </Button>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, code, or type…"
        onReset={() => setSearch('')}
      />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r, i) => r.id || r.code || String(i)}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        exportFilename="solecontrol-locations"
        emptyIcon={<Warehouse className="w-6 h-6" />}
        emptyTitle="No locations configured"
        emptyDescription="Add warehouse racks or display shelves to organize footwear stock."
      />

      <Drawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        title="Add Location"
        isDirty={Boolean(name || code)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDrawer(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={createMutation.isPending}
              onClick={() => {
                if (!name.trim()) {
                  toast.error('Location name is required')
                  return
                }
                createMutation.mutate()
              }}
            >
              Save Location
            </Button>
          </>
        }
      >
        <FormField label="Location name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rack R4 - Running Wall"
            className={inputBaseClass}
          />
        </FormField>
        <FormField label="Code">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. RCK-R4"
            className={`${inputBaseClass} font-mono`}
          />
        </FormField>
        <FormField label="Location type">
          <SearchableCombobox
            options={[
              { value: 'FLOOR', label: 'Floor' },
              { value: 'DEPARTMENT', label: 'Department' },
              { value: 'RACK', label: 'Warehouse Rack' },
              { value: 'SHELF', label: 'Shelf' },
              { value: 'DISPLAY', label: 'Display Counter' },
            ]}
            value={type}
            onChange={setType}
          />
        </FormField>
      </Drawer>
    </div>
  )
}
