import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Users, Plus, KeyRound, UserX } from 'lucide-react'
import { api } from '../lib/api'
import { formatDateTimeIN, getApiErrorMessage } from '../lib/format'
import {
  PageHeader, FilterBar, DataTable, StatusBadge, Button, Drawer,
  ConfirmDialog, FormField, SearchableCombobox, ColumnDef, inputBaseClass,
} from '../components/ui'

const ROLE_DESCRIPTIONS: Record<string, string> = {
  SUPER_ADMIN: 'Full system access including security settings, accounting, and role management.',
  ADMINISTRATOR: 'Manages daily store operations, master data, purchases, and staff.',
  MANAGEMENT: 'Read-only executive access to dashboards, reports, insights, and audit logs.',
  SALES_EXECUTIVE: 'Operates POS billing, customer lookup, and returns.',
  ACCOUNTS_USER: 'Manages journals, vendor payments, bank reconciliation, and GST registers.',
  INVENTORY_USER: 'Manages warehouse stock, GRN receiving, transfers, and physical audits.',
}

export function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [showDrawer, setShowDrawer] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [roleId, setRoleId] = useState('')
  const [password, setPassword] = useState('')

  const [confirmDeactivate, setConfirmDeactivate] = useState<any | null>(null)

  const { data: usersData, isLoading, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data?.data ?? []),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r) => r.data?.data ?? []),
  })

  const users: any[] = Array.isArray(usersData) ? usersData : []
  const roles: any[] = Array.isArray(rolesData) ? rolesData : []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      const active = u.isActive !== false && u.is_active !== false
      if (statusFilter === 'ACTIVE' && !active) return false
      if (statusFilter === 'INACTIVE' && active) return false
      if (!q) return true
      return (
        String(u.name || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q)
      )
    })
  }, [users, search, statusFilter])

  const selectedRoleObj = roles.find((r) => r.id === roleId)
  const roleCode = String(selectedRoleObj?.code || '').toUpperCase()

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingUser) {
        return api.put(`/users/${editingUser.id}`, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          roleId: roleId || undefined,
        })
      }
      return api.post('/users', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        roleId: roleId || roles[0]?.id,
        password: password || 'Welcome@123',
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(editingUser ? 'User updated' : 'User created')
      setShowDrawer(false)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save user')),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/deactivate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deactivated')
      setConfirmDeactivate(null)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to deactivate user')),
  })

  const openAdd = () => {
    setEditingUser(null)
    setName('')
    setEmail('')
    setPhone('')
    setRoleId(roles[0]?.id || '')
    setPassword('')
    setShowDrawer(true)
  }

  const openEdit = (u: any) => {
    setEditingUser(u)
    setName(u.name || '')
    setEmail(u.email || '')
    setPhone(u.phone || '')
    setRoleId(u.roleId || u.role_id || u.role?.id || '')
    setPassword('')
    setShowDrawer(true)
  }

  const columns: ColumnDef<any>[] = [
    {
      id: 'name',
      header: 'User',
      sortable: true,
      accessor: (r) => r.name || '',
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.name}</p>
          <p className="text-xs text-slate-500">{r.email}</p>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      sortable: true,
      accessor: (r) => r.role?.name || r.roleName || r.role_name || '',
      cell: (r) => (
        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
          {r.role?.name || r.roleName || r.role_name || 'Staff'}
        </span>
      ),
    },
    {
      id: 'lastLogin',
      header: 'Last login',
      cell: (r) => (
        <span className="text-xs text-slate-500 tabular-nums">
          {formatDateTimeIN(r.lastLoginAt || r.last_login_at)}
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
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
            Edit
          </Button>
          {r.role?.code !== 'SUPER_ADMIN' && r.isActive !== false && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDeactivate(r)}
              title="Deactivate user"
              icon={<UserX className="w-3.5 h-3.5 text-red-600" />}
            />
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users & Personnel"
        description="Manage staff accounts, assigned roles, and account status."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Users' }]}
        primaryAction={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openAdd}>
            Add User
          </Button>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email…"
        chips={[
          { key: 'ALL', label: 'All', count: users.length },
          {
            key: 'ACTIVE',
            label: 'Active',
            count: users.filter((u) => u.isActive !== false && u.is_active !== false).length,
          },
          {
            key: 'INACTIVE',
            label: 'Inactive',
            count: users.filter((u) => u.isActive === false || u.is_active === false).length,
          },
        ]}
        activeChip={statusFilter}
        onChipChange={setStatusFilter}
        onReset={() => {
          setSearch('')
          setStatusFilter('ALL')
        }}
      />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r, i) => r.id || r.email || String(i)}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        onRowClick={openEdit}
        exportFilename="solecontrol-users"
        emptyIcon={<Users className="w-6 h-6" />}
        emptyTitle="No users found"
        emptyDescription="Add staff members and assign their store role."
      />

      <Drawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editingUser ? `Edit ${editingUser.name}` : 'Add Staff User'}
        subtitle="Assign role and login credentials."
        isDirty={Boolean(name || email)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDrawer(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={saveMutation.isPending}
              onClick={() => {
                if (!name.trim() || (!editingUser && !email.trim())) {
                  toast.error('Name and email are required')
                  return
                }
                saveMutation.mutate()
              }}
            >
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </>
        }
      >
        <FormField label="Full name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya Sharma"
            className={inputBaseClass}
          />
        </FormField>

        <FormField label="Email address" required>
          <input
            type="email"
            disabled={!!editingUser}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="priya@fortyv.local"
            className={inputBaseClass}
          />
        </FormField>

        <FormField label="Mobile number">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className={inputBaseClass}
          />
        </FormField>

        <FormField
          label="Role"
          required
          helperText={ROLE_DESCRIPTIONS[roleCode] || 'Select the access role for this user.'}
        >
          <SearchableCombobox
            options={roles.map((r) => ({ value: r.id, label: r.name, sublabel: r.code }))}
            value={roleId}
            onChange={setRoleId}
            placeholder="Select role…"
          />
        </FormField>

        {!editingUser && (
          <FormField label="Initial password" helperText="User will be asked to change this at first login.">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className={inputBaseClass}
            />
          </FormField>
        )}

        {editingUser && (
          <div className="pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              icon={<KeyRound className="w-3.5 h-3.5" />}
              onClick={() => toast.info('Password reset link/action queued for user')}
            >
              Reset Password
            </Button>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        onConfirm={() => confirmDeactivate && deactivateMutation.mutate(confirmDeactivate.id)}
        title={`Deactivate ${confirmDeactivate?.name}?`}
        description="Deactivated users cannot sign in, but their historical invoices and audit records remain intact."
        confirmLabel="Deactivate User"
        variant="danger"
        loading={deactivateMutation.isPending}
      />
    </div>
  )
}
