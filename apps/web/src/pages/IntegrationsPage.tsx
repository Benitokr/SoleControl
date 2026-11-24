import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plug,
  MessageSquare,
  ScanBarcode,
  Landmark,
  FileCheck2,
  Printer,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Settings2,
  History,
  X
} from 'lucide-react'
import { api } from '../lib/api'

interface IntegrationSetting {
  id: string | null
  provider: string
  isActive: boolean
  config: Record<string, string>
  lastTestedAt: string | null
  lastStatus: string | null
}

interface IntegrationLog {
  id: string
  provider: string
  action: string
  status: string
  message: string
  createdAt: string
  created_at?: string
}

const PROVIDER_METADATA: Record<
  string,
  { name: string; description: string; icon: any; fields: { key: string; label: string; placeholder: string; type?: string }[] }
> = {
  whatsapp: {
    name: 'WhatsApp Business API',
    description: 'Automated receipt dispatch, promotional campaigns, and customer notifications via Twilio/Meta.',
    icon: MessageSquare,
    fields: [
      { key: 'account_sid', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'auth_token', label: 'Auth Token / Secret', placeholder: '••••••••••••••••', type: 'password' },
      { key: 'from_phone', label: 'Sender Phone Number', placeholder: '+14155238886' },
      { key: 'api_url', label: 'API Base URL', placeholder: 'https://api.twilio.com' }
    ]
  },
  barcode_service: {
    name: 'Barcode Generation & Label Service',
    description: 'Thermal printer barcode rendering and label layout service (bwip-js / ESC/POS server).',
    icon: ScanBarcode,
    fields: [
      { key: 'base_url', label: 'Service URL', placeholder: 'http://localhost:4000/api/v1/barcodes' },
      { key: 'api_key', label: 'API Key (Optional)', placeholder: '••••••••••••••••', type: 'password' }
    ]
  },
  bank_api: {
    name: 'Bank Feeds & Payment API',
    description: 'Direct bank statement ingestion, reconciliation sync, and instant payment validation.',
    icon: Landmark,
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'BANK_CLIENT_ID_XYZ' },
      { key: 'client_secret', label: 'Client Secret', placeholder: '••••••••••••••••', type: 'password' },
      { key: 'api_url', label: 'Bank Gateway URL', placeholder: 'https://api.bankgateway.com/v1' }
    ]
  },
  gst_portal: {
    name: 'GSTN Portal & E-Way / GSTR API',
    description: 'Real-time GSTIN validation, GSTR-1 preparation, and tax compliance data verification.',
    icon: FileCheck2,
    fields: [
      { key: 'gstin', label: 'Default GSTIN', placeholder: '33AAAAA0000A1Z5' },
      { key: 'username', label: 'Portal Username', placeholder: 'gst_user_cbe' },
      { key: 'auth_token', label: 'Auth Token / Passkey', placeholder: '••••••••••••••••', type: 'password' },
      { key: 'api_url', label: 'GSTN Gateway URL', placeholder: 'https://api.gst.gov.in' }
    ]
  }
}

export function IntegrationsPage() {
  const queryClient = useQueryClient()
  const [activeConfigureProvider, setActiveConfigureProvider] = useState<string | null>(null)
  const [activeLogsProvider, setActiveLogsProvider] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [printerPaperSize, setPrinterPaperSize] = useState('50x25')

  // Fetch integrations list
  const { data, isLoading, error } = useQuery<{ data: IntegrationSetting[] }>({
    queryKey: ['integrations'],
    queryFn: () => api.get('/integrations').then(r => r.data)
  })

  // Fetch logs for active provider
  const { data: logsData, isLoading: logsLoading } = useQuery<{ data: IntegrationLog[] }>({
    queryKey: ['integration-logs', activeLogsProvider],
    queryFn: () => api.get(`/integrations/${activeLogsProvider}/logs`).then(r => r.data),
    enabled: !!activeLogsProvider
  })

  // Test mutation
  const testMutation = useMutation({
    mutationFn: (provider: string) => api.post(`/integrations/${provider}/test`).then(r => r.data),
    onSuccess: (res, provider) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      if (res.data?.connected) {
        setStatusMessage({
          text: `Success: ${PROVIDER_METADATA[provider]?.name || provider} connected! (Latency: ${res.data.latencyMs ?? 0}ms)`,
          type: 'success'
        })
      } else {
        setStatusMessage({
          text: `Connection Failed for ${PROVIDER_METADATA[provider]?.name || provider}: ${res.data?.error || 'Unknown error'}`,
          type: 'error'
        })
      }
    },
    onError: (err: any) => {
      setStatusMessage({
        text: `Test failed: ${err.response?.data?.error?.message || err.message}`,
        type: 'error'
      })
    }
  })

  // Save config mutation
  const saveMutation = useMutation({
    mutationFn: ({ provider, config }: { provider: string; config: Record<string, string> }) =>
      api.put(`/integrations/${provider}`, { config, isActive: true }).then(r => r.data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      setActiveConfigureProvider(null)
      setStatusMessage({ text: `Configuration for ${PROVIDER_METADATA[vars.provider]?.name || vars.provider} saved. Run Test Connection to verify.`, type: 'success' })
    },
    onError: (err: any) => {
      setStatusMessage({ text: `Failed to save configuration: ${err.message}`, type: 'error' })
    }
  })

  // Printer test mutation
  const printerTestMutation = useMutation({
    mutationFn: () => api.post('/integrations/printer/test', { paperSize: printerPaperSize }).then(r => r.data),
    onSuccess: (res) => {
      if (res.data?.connected) {
        setStatusMessage({ text: 'Printer test page simulated successfully (PDF print ready).', type: 'success' })
      } else {
        setStatusMessage({ text: `Printer test failed: ${res.data?.error || 'Unknown error'}`, type: 'error' })
      }
    },
    onError: (err: any) => {
      setStatusMessage({ text: `Printer test error: ${err.message}`, type: 'error' })
    }
  })

  const settingsMap = new Map<string, IntegrationSetting>()
  for (const s of data?.data || []) {
    settingsMap.set(s.provider, s)
  }

  const handleOpenConfig = (provider: string) => {
    const existing = settingsMap.get(provider)
    setFormData(existing?.config || {})
    setActiveConfigureProvider(provider)
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Plug size={22} className="text-primary" /> Integrations & External Gateways
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
            Manage external service connections, credentials, real-time status, and thermal printer setups.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['integrations'] })}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Status
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {statusMessage && (
        <div
          className="p-4 rounded-xl flex items-center justify-between text-sm animate-fade-in"
          style={{
            background: statusMessage.type === 'success' ? 'var(--color-primary-soft)' : 'rgba(220, 38, 38, 0.1)',
            border: `1px solid ${statusMessage.type === 'success' ? 'var(--color-primary)' : 'var(--color-danger)'}`,
            color: statusMessage.type === 'success' ? 'var(--color-primary)' : 'var(--color-danger)'
          }}
        >
          <div className="flex items-center gap-2 font-medium">
            {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="p-1 hover:opacity-80">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(220, 38, 38, 0.1)', color: 'var(--color-danger)' }}>
          Failed to load integration settings: {(error as any).message}
        </div>
      )}

      {/* Four Core Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Object.entries(PROVIDER_METADATA).map(([providerKey, meta]) => {
          const setting = settingsMap.get(providerKey)
          const IconComponent = meta.icon
          const isConnected = setting?.lastStatus === 'CONNECTED'
          const isConfigured = setting?.config && Object.keys(setting.config).length > 0
          const isTesting = testMutation.isPending && testMutation.variables === providerKey

          return (
            <div
              key={providerKey}
              className="p-5 rounded-2xl flex flex-col justify-between transition-shadow hover:shadow-sm"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)'
              }}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                      style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
                    >
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
                        {meta.name}
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                        Provider: <span className="font-mono">{providerKey}</span>
                      </p>
                    </div>
                  </div>

                  {/* Real Status Badge (Never fake connected) */}
                  <div>
                    {isConnected ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(5, 150, 105, 0.12)', color: 'var(--color-success)' }}
                      >
                        <CheckCircle2 size={13} /> Connected
                      </span>
                    ) : setting?.lastStatus === 'FAILED' ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(220, 38, 38, 0.12)', color: 'var(--color-danger)' }}
                      >
                        <XCircle size={13} /> Connection Failed
                      </span>
                    ) : isConfigured ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(217, 119, 6, 0.12)', color: 'var(--color-warning)' }}
                      >
                        <AlertCircle size={13} /> Not Tested
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: 'var(--color-bg)', color: 'var(--color-muted)' }}
                      >
                        Not Configured
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                  {meta.description}
                </p>

                {setting?.lastTestedAt && (
                  <p className="text-[11px] mt-2 font-mono" style={{ color: 'var(--color-muted)' }}>
                    Last test: {new Date(setting.lastTestedAt).toLocaleString('en-IN')}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 flex items-center justify-between gap-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenConfig(providerKey)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <Settings2 size={14} /> Configure
                  </button>
                  <button
                    onClick={() => setActiveLogsProvider(providerKey)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    <History size={14} /> View Logs
                  </button>
                </div>

                <button
                  onClick={() => testMutation.mutate(providerKey)}
                  disabled={isTesting}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all text-white shadow-sm"
                  style={{
                    background: isTesting ? 'var(--color-muted)' : 'var(--color-primary)'
                  }}
                >
                  <RefreshCw size={13} className={isTesting ? 'animate-spin' : ''} />
                  {isTesting ? 'Testing…' : 'Test Connection'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Printer Section */}
      <div
        className="p-6 rounded-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
              style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
            >
              <Printer size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                Thermal Barcode Label Printer
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                Direct thermal label generator (ESC/POS & Standard Vector PDF formats for 50x25mm and 38x25mm rolls).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={printerPaperSize}
              onChange={(e) => setPrinterPaperSize(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="50x25">50 × 25 mm (Footwear Box Tag)</option>
              <option value="38x25">38 × 25 mm (Compact Tag)</option>
              <option value="100x150">100 × 150 mm (Shipping Slip)</option>
            </select>

            <button
              onClick={() => printerTestMutation.mutate()}
              disabled={printerTestMutation.isPending}
              className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 text-white shadow-sm"
              style={{ background: 'var(--color-primary)' }}
            >
              <Printer size={15} className={printerTestMutation.isPending ? 'animate-bounce' : ''} />
              {printerTestMutation.isPending ? 'Printing…' : 'Print Test Page'}
            </button>
          </div>
        </div>
      </div>

      {/* Configure Modal */}
      {activeConfigureProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-lg p-6 rounded-2xl shadow-xl space-y-5 animate-scale-in"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
                  Configure {PROVIDER_METADATA[activeConfigureProvider]?.name}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  Enter credentials. Sensitive keys are stored encrypted.
                </p>
              </div>
              <button
                onClick={() => setActiveConfigureProvider(null)}
                className="p-1 rounded-lg hover:opacity-75"
                style={{ color: 'var(--color-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              {PROVIDER_METADATA[activeConfigureProvider]?.fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                    {f.label}
                  </label>
                  <input
                    type={f.type || 'text'}
                    value={formData[f.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none font-mono"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setActiveConfigureProvider(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate({ provider: activeConfigureProvider, config: formData })}
                disabled={saveMutation.isPending}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm"
                style={{ background: 'var(--color-primary)' }}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save Credentials'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {activeLogsProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-2xl max-h-[80vh] flex flex-col p-6 rounded-2xl shadow-xl space-y-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
                  Integration Logs: {PROVIDER_METADATA[activeLogsProvider]?.name || activeLogsProvider}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  Historical connection tests, pings, and delivery attempts
                </p>
              </div>
              <button
                onClick={() => setActiveLogsProvider(null)}
                className="p-1 rounded-lg hover:opacity-75"
                style={{ color: 'var(--color-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {logsLoading && (
                <div className="py-8 text-center text-xs" style={{ color: 'var(--color-muted)' }}>
                  Loading logs…
                </div>
              )}
              {!logsLoading && (Array.isArray(logsData?.data) ? logsData.data : (Array.isArray(logsData) ? (logsData as any) : [])).length === 0 && (
                <div className="py-8 text-center text-xs" style={{ color: 'var(--color-muted)' }}>
                  No log entries recorded for this provider yet.
                </div>
              )}
              {(Array.isArray(logsData?.data) ? logsData.data : (Array.isArray(logsData) ? (logsData as any) : [])).map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg text-xs flex items-start justify-between gap-3"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-semibold"
                        style={{
                          background: log.status === 'SUCCESS' ? 'rgba(5, 150, 105, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                          color: log.status === 'SUCCESS' ? 'var(--color-success)' : 'var(--color-danger)'
                        }}
                      >
                        {log.status}
                      </span>
                      <span className="font-mono text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                        {log.action}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text)' }}>
                      {log.message}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono shrink-0" style={{ color: 'var(--color-muted)' }}>
                    {new Date(log.createdAt || log.created_at || '').toLocaleTimeString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setActiveLogsProvider(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
