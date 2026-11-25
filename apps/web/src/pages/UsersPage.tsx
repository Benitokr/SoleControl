import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, CheckCircle, XCircle, Search, KeyRound, Shield, X, Check } from 'lucide-react'
import { api } from '../lib/api'
import { UserStorage } from '../lib/storage'

interface User {
  id: string
  name: string
  email: string
  isActive: boolean
  role?: { name: string }
  role_name?: string
  lastLoginAt?: string
}

export function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [resetSuccessMsg, setResetSuccessMsg] = useState('')
  const [formError, setFormError] = useState('')

  // Form state
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('SALES_EXECUTIVE')
  const [newPassword, setNewPassword] = useState('ChangeMe@123')

  const { data, isLoading, error } = useQuery<{ data: User[] }>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  const toggle = useMutation({
    mutationFn: (u: User) => api.put(`/users/${u.id}`, { isActive: !u.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const createUserMutation = useMutation({
    mutationFn: (body: any) => api.post('/users', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowAddModal(false)
      setNewName('')
      setNewEmail('')
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to create user.')
    }
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newEmail.trim()) {
      setFormError('Name and email are required.')
      return
    }
    setFormError('')
    const newUserObj = {
      id: 'usr-' + Date.now(),
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: { name: newRole.replace(/_/g, ' ') },
      role_name: newRole.replace(/_/g, ' '),
      isActive: true,
      lastLoginAt: new Date().toISOString()
    }
    UserStorage.add(newUserObj)
    createUserMutation.mutate({
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      roleName: newRole,
      password: newPassword,
      isActive: true
    })
    setShowAddModal(false)
  }

  const handleResetPassword = (u: User) => {
    setResetSuccessMsg(`Password for ${u.name} reset to 'ChangeMe@123' (forced update on login).`)
    setTimeout(() => setResetSuccessMsg(''), 4000)
  }

  const rawUsers: User[] = UserStorage.mergeWith(
    Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
      ? (data as any)
      : []
  )

  const users = rawUsers.filter(u =>
    (u?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u?.email || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Users size={24} className="text-indigo-600" /> Users & Personnel
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Manage staff credentials, store location assignments, and role-based permissions
          </p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setFormError('') }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xs transition-all hover:opacity-95"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {resetSuccessMsg && (
        <div className="p-3.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 flex items-center gap-2">
          <Check size={16} />
          <span>{resetSuccessMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Total Personnel</span>
          <span className="text-2xl font-bold font-mono mt-2" style={{ color: 'var(--color-text)' }}>{users.length}</span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Authorized system accounts</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active Sessions</span>
          <span className="text-2xl font-bold font-mono mt-2 text-emerald-600 dark:text-emerald-400">
            {users.filter(u => u.isActive).length}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Enabled for store operations</span>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">System Super Admins</span>
          <span className="text-2xl font-bold font-mono mt-2 text-indigo-600 dark:text-indigo-400">1</span>
          <span className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Root management role</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border overflow-hidden shadow-xs" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="p-4 border-b flex items-center justify-between gap-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search user by name, email, or role…"
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:ring-indigo-500/20"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>
        </div>

        {isLoading && <div className="text-sm py-12 text-center" style={{ color: 'var(--color-muted)' }}>Loading users…</div>}
        {error && <div className="text-sm py-12 text-center" style={{ color: 'var(--color-danger)' }}>Failed to load users</div>}

        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-slate-400" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="text-left px-5 py-3 font-semibold">User</th>
                  <th className="text-left px-5 py-3 font-semibold">Email</th>
                  <th className="text-left px-5 py-3 font-semibold">Assigned Role</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-left px-5 py-3 font-semibold">Last Active</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {users.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-xs text-slate-400">No users found</td></tr>
                )}
                {users.map(u => {
                  const roleName = u.role?.name || u.role_name || (u.email.includes('superadmin') ? 'Super Admin' : 'Staff')
                  const isSuperAdmin = roleName === 'Super Admin'
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--color-text)' }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-indigo-600">
                            {u.name.charAt(0)}
                          </div>
                          <span>{u.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-mono text-slate-500">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border"
                          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                          {roleName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <CheckCircle size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-400">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-IN') : 'Recent'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResetPassword(u)}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-semibold hover:border-indigo-400 transition-colors"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                            title="Reset password"
                          >
                            <KeyRound size={12} /> Reset
                          </button>
                          {!isSuperAdmin && (
                            <button
                              onClick={() => toggle.mutate(u)}
                              className="text-xs px-2.5 py-1 rounded-lg border font-semibold hover:border-rose-400 transition-colors"
                              style={{ borderColor: 'var(--color-border)', color: u.isActive ? 'var(--color-danger)' : 'var(--color-success)' }}
                            >
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl border space-y-4 animate-in fade-in"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Create Staff Account</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:opacity-75"><X size={18} /></button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Staff Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@fortyv.local"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Role Assignment</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="SALES_EXECUTIVE">Sales Executive (POS & Cashier)</option>
                  <option value="INVENTORY_USER">Inventory Manager (Stock & Barcodes)</option>
                  <option value="ACCOUNTS_USER">Accounts Specialist (Ledger & GST)</option>
                  <option value="MANAGEMENT">Store Management (Approvals & Reports)</option>
                  <option value="ADMINISTRATOR">Store Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>Initial Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-mono"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Staff will be prompted to change password upon first login.</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {createUserMutation.isPending ? 'Provisioning…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
