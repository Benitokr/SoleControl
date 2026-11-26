import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { HeartHandshake, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, getApiErrorMessage } from '../lib/format'
import {
  PageHeader, StatCard, FilterBar, DataTable, StatusBadge, Button,
  Drawer, FormField, ColumnDef, inputBaseClass,
} from '../components/ui'

export function CustomersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAddDrawer, setShowAddDrawer] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then((r) => r.data?.data ?? []),
  })

  const customers: any[] = Array.isArray(data) ? data : []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) =>
        String(c.name || '').toLowerCase().includes(q) ||
        String(c.phone || '').toLowerCase().includes(q) ||
        String(c.email || '').toLowerCase().includes(q)
    )
  }, [customers, search])

  const totalLtv = customers.reduce((s, c) => s + Number(c.lifetimeValue ?? c.lifetime_value ?? 0), 0)
  const totalCredit = customers.reduce((s, c) => s + Number(c.creditOutstanding ?? c.credit_outstanding ?? 0), 0)

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/customers', {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer saved')
      setShowAddDrawer(false)
      setName('')
      setPhone('')
      setEmail('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save customer')),
  })

  const columns: ColumnDef<any>[] = [
    {
      id: 'name',
      header: 'Customer',
      sortable: true,
      accessor: (r) => r.name || '',
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.name}</p>
          <p className="text-xs text-slate-500 tabular-nums">{r.phone || 'No phone'}</p>
        </div>
      ),
    },
    {
      id: 'email',
      header: 'Email',
      cell: (r) => <span className="text-slate-600">{r.email || '—'}</span>,
    },
    {
      id: 'ltv',
      header: 'Total spend',
      align: 'right',
      sortable: true,
      accessor: (r) => Number(r.lifetimeValue ?? r.lifetime_value ?? 0),
      cell: (r) => (
        <span className="font-medium text-slate-900">
          {formatINR(r.lifetimeValue ?? r.lifetime_value ?? 0)}
        </span>
      ),
    },
    {
      id: 'credit',
      header: 'Credit due',
      align: 'right',
      sortable: true,
      accessor: (r) => Number(r.creditOutstanding ?? r.credit_outstanding ?? 0),
      cell: (r) => formatINR(r.creditOutstanding ?? r.credit_outstanding ?? 0),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (r) => <StatusBadge status={r.isActive === false ? 'INACTIVE' : 'ACTIVE'} />,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers & CRM"
        description="Search customers by phone or name, review spend history, and manage store credit."
        breadcrumbs={[{ label: 'Sales' }, { label: 'Customers' }]}
        primaryAction={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddDrawer(true)}>
            Add Customer
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total customers" value={customers.length} icon={<HeartHandshake className="w-4 h-4" />} tone="teal" />
        <StatCard label="Lifetime spend" value={formatINR(totalLtv)} tone="success" />
        <StatCard label="Credit receivables" value={formatINR(totalCredit)} tone={totalCredit > 0 ? 'warning' : 'default'} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by phone number or customer name…"
        onReset={() => setSearch('')}
      />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r, i) => r.id || r.phone || String(i)}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        onRowClick={(r) => setSelectedCustomer(r)}
        exportFilename="solecontrol-customers"
        emptyIcon={<HeartHandshake className="w-6 h-6" />}
        emptyTitle="No customers yet"
        emptyDescription="Add customers here or directly from the POS billing screen."
      />

      <Drawer
        open={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        title="Add Customer"
        subtitle="Name and phone number are required."
        isDirty={Boolean(name || phone)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddDrawer(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={createMutation.isPending}
              onClick={() => {
                if (!name.trim() || !phone.trim()) {
                  toast.error('Name and phone are required')
                  return
                }
                createMutation.mutate()
              }}
            >
              Save Customer
            </Button>
          </>
        }
      >
        <FormField label="Full name" required>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ananya Iyer" className={inputBaseClass} />
        </FormField>
        <FormField label="Mobile number" required>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" className={inputBaseClass} />
        </FormField>
        <FormField label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" className={inputBaseClass} />
        </FormField>
      </Drawer>

      <Drawer
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.name || 'Customer Profile'}
        subtitle={selectedCustomer?.phone}
      >
        {selectedCustomer && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Total spend</p>
                <p className="text-base font-semibold tabular-nums text-teal-700 mt-0.5">
                  {formatINR(selectedCustomer.lifetimeValue ?? selectedCustomer.lifetime_value ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Credit balance</p>
                <p className="text-base font-semibold tabular-nums text-slate-900 mt-0.5">
                  {formatINR(selectedCustomer.creditOutstanding ?? selectedCustomer.credit_outstanding ?? 0)}
                </p>
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 space-y-1.5">
              <p><span className="text-slate-500">Phone:</span> {selectedCustomer.phone || '—'}</p>
              <p><span className="text-slate-500">Email:</span> {selectedCustomer.email || '—'}</p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
