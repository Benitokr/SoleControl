import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { format } from 'date-fns'
import {
  Bell,
  ShieldAlert,
  History,
  Monitor,
  CheckCircle,
  Trash2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'

type TabKey = 'notifications' | 'rules' | 'audit' | 'sessions'

export function AuditPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('notifications')
  const [entityFilter, setEntityFilter] = useState('')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const qc = useQueryClient()

  // 1. Notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['alerts', 'notifications'],
    queryFn: () => api.get('/alerts').then((r) => r.data.data || []),
  })

  // 2. Alert Rules
  const { data: rules = [] } = useQuery({
    queryKey: ['alerts', 'rules'],
    queryFn: () => api.get('/alerts/rules').then((r) => r.data.data || []),
  })

  // 3. Audit Logs
  const { data: auditLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['alerts', 'audit-log', entityFilter],
    queryFn: () => {
      const url = entityFilter ? `/alerts/audit-log?entity=${entityFilter}` : '/alerts/audit-log'
      return api.get(url).then((r) => r.data.data || [])
    },
  })

  // 4. User Sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['alerts', 'sessions'],
    queryFn: () => api.get('/alerts/sessions').then((r) => r.data.data || []),
  })

  // Mutations
  const markReadMut = useMutation({
    mutationFn: (id: string) => api.post(`/alerts/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts', 'notifications'] }),
  })

  const deleteNotifMut = useMutation({
    mutationFn: (id: string) => api.delete(`/alerts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts', 'notifications'] }),
  })

  const revokeSessionMut = useMutation({
    mutationFn: (id: string) => api.post(`/alerts/sessions/${id}/revoke`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts', 'sessions'] }),
  })

  const unreadCount = notifications.filter((n: any) => !n.isRead).length

  const cardStyle = { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>
          Notifications & Audit Trail
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Security logging, real-time alerts, system rule policies, and active user sessions
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b overflow-x-auto gap-2" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap`}
          style={{
            borderColor: activeTab === 'notifications' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'notifications' ? 'var(--color-primary)' : 'var(--color-muted)',
          }}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: 'var(--color-danger)', color: '#FFFFFF' }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap`}
          style={{
            borderColor: activeTab === 'rules' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'rules' ? 'var(--color-primary)' : 'var(--color-muted)',
          }}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Alert Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap`}
          style={{
            borderColor: activeTab === 'audit' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'audit' ? 'var(--color-primary)' : 'var(--color-muted)',
          }}
        >
          <History className="w-4 h-4" />
          <span>Audit Log</span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap`}
          style={{
            borderColor: activeTab === 'sessions' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'sessions' ? 'var(--color-primary)' : 'var(--color-muted)',
          }}
        >
          <Monitor className="w-4 h-4" />
          <span>Active Sessions</span>
        </button>
      </div>

      {/* TAB 1: Notifications */}
      {activeTab === 'notifications' && (
        <div className="rounded-xl border overflow-hidden" style={cardStyle}>
          <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>System Notifications</h2>
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{notifications.length} total</span>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>
                No notifications present
              </div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  className="p-4 flex items-start justify-between gap-4 transition-colors hover:opacity-95"
                  style={{
                    background: n.isRead ? 'transparent' : 'var(--color-primary-soft)',
                  }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        {n.title || 'System Notification'}
                      </span>
                      {!n.isRead && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--color-primary)', color: '#FFFFFF' }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--color-text)' }}>
                      {n.message || n.body}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      {n.createdAt ? format(new Date(n.createdAt), 'dd MMM yyyy, HH:mm') : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={() => markReadMut.mutate(n.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition-colors"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', background: 'var(--color-surface)' }}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotifMut.mutate(n.id)}
                      className="p-1 text-xs rounded hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--color-danger)' }}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Alert Rules */}
      {activeTab === 'rules' && (
        <div className="rounded-xl border overflow-hidden" style={cardStyle}>
          <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Automated Alert Rules</h2>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Threshold triggers for stock, ageing, and security</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', background: 'var(--color-bg)' }}>
                <tr>
                  <th className="px-4 py-3">Rule Name</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3 text-right">Threshold</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>
                      No alert rules configured
                    </td>
                  </tr>
                ) : (
                  rules.map((r: any) => (
                    <tr key={r.id} className="hover:opacity-90">
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.condition}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{r.threshold}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded font-semibold uppercase"
                          style={{
                            background:
                              r.severity === 'DANGER'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : r.severity === 'WARNING'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'var(--color-primary-soft)',
                            color:
                              r.severity === 'DANGER'
                                ? 'var(--color-danger)'
                                : r.severity === 'WARNING'
                                ? 'var(--color-warning)'
                                : 'var(--color-primary)',
                          }}
                        >
                          {r.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{
                            background: r.isActive ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-border)',
                            color: r.isActive ? 'var(--color-success)' : 'var(--color-muted)',
                          }}
                        >
                          {r.isActive ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Audit Log */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border text-sm"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="">All Entities</option>
              <option value="USER">USER</option>
              <option value="ROLE">ROLE</option>
              <option value="PURCHASE">PURCHASE</option>
              <option value="SALE">SALE</option>
              <option value="STOCK_ADJUSTMENT">STOCK_ADJUSTMENT</option>
              <option value="JOURNAL_ENTRY">JOURNAL_ENTRY</option>
            </select>
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
              Showing {auditLogs.length} audit trail entries
            </span>
          </div>

          <div className="rounded-xl border overflow-hidden" style={cardStyle}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', background: 'var(--color-bg)' }}>
                  <tr>
                    <th className="px-4 py-3 w-8"></th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>
                        Loading audit log trail...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>
                        No audit events found
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log: any) => {
                      const isExpanded = expandedLogId === log.id
                      const hasChanges = Boolean(log.old_data || log.new_data || log.changes)

                      return (
                        <tr key={log.id} className="hover:opacity-95">
                          <td colSpan={6} className="p-0">
                            <div
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="px-4 py-3 flex items-center gap-3 cursor-pointer select-none"
                            >
                              <div className="w-4 flex items-center justify-center">
                                {hasChanges ? (
                                  isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-muted" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-muted" />
                                  )
                                ) : null}
                              </div>
                              <div className="w-40 text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                                {log.created_at ? format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss') : '-'}
                              </div>
                              <div className="w-36 text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
                                {log.user_name || 'System / Auto'}
                              </div>
                              <div className="w-32">
                                <span className="text-xs px-2 py-0.5 rounded font-mono font-medium" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
                                  {log.entity}
                                </span>
                              </div>
                              <div className="w-24">
                                <span
                                  className="text-xs px-2 py-0.5 rounded font-semibold uppercase"
                                  style={{
                                    background:
                                      log.action === 'DELETE'
                                        ? 'rgba(239, 68, 68, 0.15)'
                                        : log.action === 'CREATE'
                                        ? 'rgba(16, 185, 129, 0.15)'
                                        : 'var(--color-primary-soft)',
                                    color:
                                      log.action === 'DELETE'
                                        ? 'var(--color-danger)'
                                        : log.action === 'CREATE'
                                        ? 'var(--color-success)'
                                        : 'var(--color-primary)',
                                  }}
                                >
                                  {log.action}
                                </span>
                              </div>
                              <div className="flex-1 font-mono text-xs text-muted truncate">
                                {log.entity_id}
                              </div>
                            </div>

                            {/* Diff Viewer Accordion */}
                            {isExpanded && hasChanges && (
                              <div className="p-4 border-t space-y-2" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                                  Data Payload / Changes Diff
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {log.old_data && (
                                    <div className="p-3 rounded border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                                      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--color-danger)' }}>
                                        Before (Old State)
                                      </div>
                                      <pre className="text-xs font-mono overflow-x-auto p-2 rounded" style={{ background: 'var(--color-bg)' }}>
                                        {typeof log.old_data === 'string'
                                          ? log.old_data
                                          : JSON.stringify(log.old_data, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.new_data && (
                                    <div className="p-3 rounded border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                                      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--color-success)' }}>
                                        After (New State)
                                      </div>
                                      <pre className="text-xs font-mono overflow-x-auto p-2 rounded" style={{ background: 'var(--color-bg)' }}>
                                        {typeof log.new_data === 'string'
                                          ? log.new_data
                                          : JSON.stringify(log.new_data, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Active Sessions */}
      {activeTab === 'sessions' && (
        <div className="rounded-xl border overflow-hidden" style={cardStyle}>
          <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Authenticated User Sessions</h2>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Active JWT tokens and device sessions</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', background: 'var(--color-bg)' }}>
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Device / User Agent</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>
                      No active user sessions recorded
                    </td>
                  </tr>
                ) : (
                  sessions.map((s: any) => {
                    const isRevoked = Boolean(s.revoked_at || s.revokedAt)

                    return (
                      <tr key={s.id} className="hover:opacity-90">
                        <td className="px-4 py-3">
                          <div className="font-medium">{s.user_name || 'Admin'}</div>
                          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{s.user_email}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs max-w-xs truncate" title={s.user_agent || s.userAgent || 'Web Browser'}>
                          {s.user_agent || s.userAgent || 'Web Browser'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{s.ip_address || s.ipAddress || '127.0.0.1'}</td>
                        <td className="px-4 py-3 text-xs">
                          {s.created_at || s.createdAt ? format(new Date(s.created_at || s.createdAt), 'dd/MM/yyyy HH:mm') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs px-2 py-0.5 rounded font-medium"
                            style={{
                              background: isRevoked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: isRevoked ? 'var(--color-danger)' : 'var(--color-success)',
                            }}
                          >
                            {isRevoked ? 'REVOKED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isRevoked && (
                            <button
                              onClick={() => revokeSessionMut.mutate(s.id)}
                              className="px-2.5 py-1 text-xs rounded border transition-colors hover:bg-danger hover:text-white"
                              style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
