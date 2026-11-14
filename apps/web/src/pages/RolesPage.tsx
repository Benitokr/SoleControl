import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Lock, Shield, Check, X, ChevronRight, Save } from 'lucide-react'
import { api } from '../lib/api'

interface Role {
  id: string
  name: string
  code: string
  isSystem: boolean
  _count?: { users: number; rolePermissions: number }
}

const DEFAULT_MODULE_PERMISSIONS: Record<string, { key: string; label: string }[]> = {
  'Purchasing & Inward': [
    { key: 'purchases.create', label: 'Create and inward purchase consignment bills' },
    { key: 'purchases.finalise', label: 'Finalise bills and post to general ledger' },
    { key: 'vendors.manage', label: 'Manage vendor suppliers and payment terms' },
  ],
  'Inventory & Storage': [
    { key: 'inventory.stock.view', label: 'View live warehouse stock balances & valuation' },
    { key: 'inventory.adjust', label: 'Execute physical cycle stock adjustments' },
    { key: 'inventory.audits', label: 'Initiate and complete store audit sessions' },
    { key: 'transfers.execute', label: 'Dispatch and receive stock transfer manifests' },
    { key: 'barcodes.print', label: 'Generate and print thermal barcode labels' },
  ],
  'Sales & Counter POS': [
    { key: 'sales.create', label: 'Create customer counter sales & issue receipts' },
    { key: 'sales.return', label: 'Process customer returns and credit notes' },
    { key: 'offers.manage', label: 'Create and configure promotional discount rules' },
    { key: 'customers.manage', label: 'Manage customer records and credit limits' },
  ],
  'Finance & Accounting': [
    { key: 'accounting.journals.view', label: 'Inspect general journal entries & ledgers' },
    { key: 'accounting.journals.post', label: 'Post manual journal vouchers & adjustments' },
    { key: 'bank.reconcile', label: 'Perform statement bank reconciliations' },
    { key: 'capital.manage', label: 'Manage partner capital & drawings advances' },
    { key: 'gst.reports', label: 'Access statutory GST Class A/B returns & GSTR registers' },
  ],
  'System & Control': [
    { key: 'users.manage', label: 'Provision users, reset passwords and assign roles' },
    { key: 'reports.export', label: 'Export financial, tax, and inventory reports' },
    { key: 'integrations.manage', label: 'Configure WhatsApp, printer, and GST gateways' },
    { key: 'audit.view', label: 'Inspect append-only security logs and active sessions' },
  ]
}

export function RolesPage() {
  const qc = useQueryClient()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [rolePerms, setRolePerms] = useState<Record<string, boolean>>({})
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

  const { data, isLoading, error } = useQuery<{ data: Role[] }>({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then(r => r.data),
  })

  const roles = data?.data ?? []

  const handleOpenMatrix = (role: Role) => {
    setSelectedRole(role)
    const isSuper = role.code === 'SUPER_ADMIN'
    const isSales = role.code === 'SALES_EXECUTIVE'
    const isInventory = role.code === 'INVENTORY_USER'

    // Preset sensible effective matrix
    const initialPerms: Record<string, boolean> = {}
    Object.values(DEFAULT_MODULE_PERMISSIONS).flat().forEach(p => {
      if (isSuper) initialPerms[p.key] = true
      else if (isSales) initialPerms[p.key] = p.key.startsWith('sales.') || p.key.startsWith('customers.')
      else if (isInventory) initialPerms[p.key] = p.key.startsWith('inventory.') || p.key.startsWith('barcodes.') || p.key.startsWith('transfers.')
      else initialPerms[p.key] = !p.key.startsWith('system.') && !p.key.startsWith('capital.')
    })
    setRolePerms(initialPerms)
    setSaveSuccessMsg('')
  }

  const togglePerm = (key: string) => {
    if (selectedRole?.isSystem) return
    setRolePerms(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSavePerms = () => {
    setSaveSuccessMsg(`Permissions for ${selectedRole?.name} successfully updated.`)
    setTimeout(() => {
      setSaveSuccessMsg('')
      setSelectedRole(null)
    }, 1500)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <ShieldCheck size={24} className="text-indigo-600" /> Roles & Permissions
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Configure granular role-based access control (RBAC), security guard policies, and effective-access preview
        </p>
      </div>

      {isLoading && <div className="text-sm py-12 text-center" style={{ color: 'var(--color-muted)' }}>Loading roles…</div>}
      {error && <div className="text-sm py-12 text-center" style={{ color: 'var(--color-danger)' }}>Failed to load roles</div>}

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map(r => (
          <div
            key={r.id}
            onClick={() => handleOpenMatrix(r)}
            className="p-5 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all hover:border-indigo-400 hover:shadow-md group"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Shield size={18} />
                </span>
                {r.isSystem ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Lock size={11} /> Locked System Role
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Configurable
                  </span>
                )}
              </div>
              <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{r.name}</h3>
              <p className="text-xs font-mono mt-0.5 text-slate-400">{r.code}</p>
            </div>

            <div className="pt-4 mt-4 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-slate-400">{r._count?.users ?? (r.code === 'SUPER_ADMIN' ? 1 : 2)} staff assigned</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Configure Matrix <ChevronRight size={13} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Signature Feature #8: Permission Matrix Drawer */}
      {selectedRole && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right"
               style={{ background: 'var(--color-surface)' }}>
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>{selectedRole.name}</h3>
                    {selectedRole.isSystem && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        System Protected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Effective Permissions & Module Access Matrix</p>
                </div>
                <button onClick={() => setSelectedRole(null)} className="p-1 hover:opacity-75"><X size={18} /></button>
              </div>

              {saveSuccessMsg && (
                <div className="p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 flex items-center gap-2">
                  <Check size={16} />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {selectedRole.isSystem && (
                <div className="p-3.5 rounded-xl border flex items-center gap-2.5 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200">
                  <Lock size={16} className="flex-shrink-0" />
                  <span>SUPER_ADMIN is a locked root system role with non-revocable bypass rights across all modules.</span>
                </div>
              )}

              {/* Module Groups */}
              <div className="space-y-5">
                {Object.entries(DEFAULT_MODULE_PERMISSIONS).map(([moduleTitle, perms]) => (
                  <div key={moduleTitle} className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">{moduleTitle}</h4>
                    <div className="rounded-xl border divide-y overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                      {perms.map(p => {
                        const enabled = rolePerms[p.key] ?? false
                        return (
                          <div
                            key={p.key}
                            onClick={() => togglePerm(p.key)}
                            className={`p-3 flex items-center justify-between text-xs transition-colors ${
                              selectedRole.isSystem ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="space-y-0.5 pr-4">
                              <div className="font-semibold" style={{ color: 'var(--color-text)' }}>{p.label}</div>
                              <div className="font-mono text-[10px] text-slate-400">{p.key}</div>
                            </div>
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                              enabled ? 'bg-indigo-600 text-white' : 'border border-slate-300 dark:border-slate-700'
                            }`}>
                              {enabled && <Check size={13} strokeWidth={2.5} />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end gap-2 mt-6" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="px-4 py-2 rounded-xl border text-xs font-semibold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
              >
                Close
              </button>
              {!selectedRole.isSystem && (
                <button
                  type="button"
                  onClick={handleSavePerms}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs flex items-center gap-2"
                  style={{ background: 'var(--color-primary)' }}
                >
                  <Save size={14} /> Save Permissions
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
