import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, MoreHorizontal, CheckCircle, XCircle } from 'lucide-react'
import { api } from '../lib/api'

interface User {
  id: string
  name: string
  email: string
  isActive: boolean
  role?: { name: string }
  lastLoginAt?: string
}

export function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data, isLoading, error } = useQuery<{ data: User[] }>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  const toggle = useMutation({
    mutationFn: (u: User) => api.put(`/users/${u.id}`, { isActive: !u.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const users = (data?.data ?? []).filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Users size={20} /> Users
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>Manage system users and their access</p>
        </div>
        <button className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--color-primary)' }}>
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="card p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users…"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        />

        {isLoading && <div className="text-sm py-8 text-center" style={{ color: 'var(--color-muted)' }}>Loading…</div>}
        {error && <div className="text-sm py-8 text-center" style={{ color: 'var(--color-danger)' }}>Failed to load users</div>}

        {!isLoading && !error && (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left pb-2 font-medium">Name</th>
                <th className="text-left pb-2 font-medium">Email</th>
                <th className="text-left pb-2 font-medium">Role</th>
                <th className="text-left pb-2 font-medium">Status</th>
                <th className="text-left pb-2 font-medium">Last Login</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>No users found</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="py-3 font-medium" style={{ color: 'var(--color-text)' }}>{u.name}</td>
                  <td className="py-3" style={{ color: 'var(--color-muted)' }}>{u.email}</td>
                  <td className="py-3" style={{ color: 'var(--color-muted)' }}>{u.role?.name ?? '—'}</td>
                  <td className="py-3">
                    {u.isActive
                      ? <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-success)' }}><CheckCircle size={12} /> Active</span>
                      : <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-danger)' }}><XCircle size={12} /> Inactive</span>}
                  </td>
                  <td className="py-3 font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-IN') : '—'}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => toggle.mutate(u)}
                      className="text-xs px-3 py-1 rounded-md"
                      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

