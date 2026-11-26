import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Truck, Plus, IndianRupee } from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, getApiErrorMessage } from '../lib/format'
import {
  PageHeader, StatCard, FilterBar, DataTable, StatusBadge, Button,
  Drawer, FormField, MoneyInput, SearchableCombobox, ColumnDef, inputBaseClass,
} from '../components/ui'

export function VendorsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAddDrawer, setShowAddDrawer] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null)
  const [detailTab, setDetailTab] = useState<'profile' | 'payment'>('profile')

  // Add vendor fields
  const [name, setName] = useState('')
  const [gstin, setGstin] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')

  // Record payment fields
  const [payAmount, setPayAmount] = useState(0)
  const [payMode, setPayMode] = useState('BANK_TRANSFER')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get('/vendors').then((r) => r.data?.data ?? []),
  })

  const vendors: any[] = Array.isArray(data) ? data : []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vendors
    return vendors.filter(
      (v) =>
        String(v.name || '').toLowerCase().includes(q) ||
        String(v.gstin || '').toLowerCase().includes(q) ||
        String(v.phone || '').toLowerCase().includes(q)
    )
  }, [vendors, search])

  const totalPayables = vendors.reduce((s, v) => s + Number(v.balance ?? 0), 0)

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/vendors', {
        name: name.trim(),
        gstin: gstin.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor added')
      setShowAddDrawer(false)
      setName('')
      setGstin('')
      setPhone('')
      setEmail('')
      setAddress('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to add vendor')),
  })

  const paymentMutation = useMutation({
    mutationFn: () =>
      api.post('/accounting/payments', {
        vendorId: selectedVendor.id,
        amount: payAmount,
        paymentMode: payMode,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor payment recorded')
      setSelectedVendor(null)
      setPayAmount(0)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to record payment')),
  })

  const columns: ColumnDef<any>[] = [
    {
      id: 'name',
      header: 'Vendor',
      sortable: true,
      accessor: (r) => r.name || '',
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.name}</p>
          <p className="text-xs text-slate-500">{r.contactPerson || r.phone || r.email || '—'}</p>
        </div>
      ),
    },
    {
      id: 'gstin',
      header: 'GSTIN',
      accessor: (r) => r.gstin || '',
      cell: (r) => <span className="font-mono text-xs text-slate-700">{r.gstin || 'Unregistered'}</span>,
    },
    {
      id: 'balance',
      header: 'Payable balance',
      align: 'right',
      sortable: true,
      accessor: (r) => Number(r.balance ?? 0),
      cell: (r) => (
        <span className={Number(r.balance ?? 0) > 0 ? 'font-semibold text-red-600' : 'text-slate-700'}>
          {formatINR(r.balance ?? 0)}
        </span>
      ),
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
        title="Vendors & Suppliers"
        description="Manage footwear brands, wholesale distributors, GSTIN details, and supplier payables."
        breadcrumbs={[{ label: 'Purchasing' }, { label: 'Vendors' }]}
        primaryAction={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddDrawer(true)}>
            Add Vendor
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total vendors" value={vendors.length} icon={<Truck className="w-4 h-4" />} tone="teal" />
        <StatCard
          label="Total payables"
          value={formatINR(totalPayables)}
          icon={<IndianRupee className="w-4 h-4" />}
          tone={totalPayables > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Active suppliers"
          value={vendors.filter((v) => v.isActive !== false && v.is_active !== false).length}
        />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by vendor name, GSTIN, or phone…"
        onReset={() => setSearch('')}
      />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r, i) => r.id || r.name || String(i)}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        onRowClick={(r) => {
          setSelectedVendor(r)
          setDetailTab('profile')
          setPayAmount(Number(r.balance ?? 0))
        }}
        exportFilename="solecontrol-vendors"
        emptyIcon={<Truck className="w-6 h-6" />}
        emptyTitle="No vendors added"
        emptyDescription="Add your footwear suppliers to create purchase orders and inward bills."
      />

      {/* Add Vendor Drawer */}
      <Drawer
        open={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        title="Add Vendor"
        isDirty={Boolean(name || gstin || phone)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddDrawer(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={createMutation.isPending}
              onClick={() => {
                if (!name.trim()) {
                  toast.error('Vendor name is required')
                  return
                }
                createMutation.mutate()
              }}
            >
              Save Vendor
            </Button>
          </>
        }
      >
        <FormField label="Vendor name" required>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nike India Operations Pvt Ltd" className={inputBaseClass} />
        </FormField>
        <FormField label="GSTIN">
          <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="15-digit GSTIN" className={`${inputBaseClass} font-mono`} />
        </FormField>
        <FormField label="Phone">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" className={inputBaseClass} />
        </FormField>
        <FormField label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="accounts@vendor.com" className={inputBaseClass} />
        </FormField>
        <FormField label="Address">
          <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg" />
        </FormField>
      </Drawer>

      {/* Vendor Detail & Record Payment Drawer */}
      <Drawer
        open={!!selectedVendor}
        onClose={() => setSelectedVendor(null)}
        title={selectedVendor?.name || 'Vendor Details'}
        subtitle={selectedVendor?.gstin ? `GSTIN: ${selectedVendor.gstin}` : 'Supplier account'}
        width="lg"
      >
        {selectedVendor && (
          <div className="space-y-4 text-sm">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setDetailTab('profile')}
                className={detailTab === 'profile' ? 'px-3 py-1 rounded bg-white text-xs font-medium shadow-xs' : 'px-3 py-1 text-xs text-slate-600'}
              >
                Profile & Balance
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('payment')}
                className={detailTab === 'payment' ? 'px-3 py-1 rounded bg-white text-xs font-medium shadow-xs' : 'px-3 py-1 text-xs text-slate-600'}
              >
                Record Payment
              </button>
            </div>

            {detailTab === 'profile' ? (
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <span className="text-slate-600">Outstanding payable</span>
                  <span className="text-lg font-semibold tabular-nums text-red-600">
                    {formatINR(selectedVendor.balance ?? 0)}
                  </span>
                </div>
                <div className="p-4 rounded-lg border border-slate-200 space-y-2">
                  <p><span className="text-slate-500">Phone:</span> {selectedVendor.phone || '—'}</p>
                  <p><span className="text-slate-500">Email:</span> {selectedVendor.email || '—'}</p>
                  <p><span className="text-slate-500">Address:</span> {selectedVendor.address || '—'}</p>
                </div>
                <Button variant="primary" onClick={() => setDetailTab('payment')}>
                  Record Payment
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <FormField label="Payment amount" required>
                  <MoneyInput value={payAmount} onChange={setPayAmount} />
                </FormField>
                <FormField label="Payment mode">
                  <SearchableCombobox
                    options={[
                      { value: 'BANK_TRANSFER', label: 'NEFT / RTGS / IMPS' },
                      { value: 'UPI', label: 'UPI' },
                      { value: 'CHEQUE', label: 'Cheque' },
                      { value: 'CASH', label: 'Cash' },
                    ]}
                    value={payMode}
                    onChange={setPayMode}
                  />
                </FormField>
                <Button
                  variant="primary"
                  loading={paymentMutation.isPending}
                  onClick={() => {
                    if (payAmount <= 0) {
                      toast.error('Enter an amount greater than 0')
                      return
                    }
                    paymentMutation.mutate()
                  }}
                >
                  Confirm Payment
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
