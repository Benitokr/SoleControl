import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Building2, Receipt, Boxes, Printer, Shield, Save } from 'lucide-react'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/format'
import {
  PageHeader, Button, FormField, SearchableCombobox, ErrorState,
  Skeleton, StatusBadge, inputBaseClass,
} from '../components/ui'

type Tab = 'profile' | 'tax' | 'inventory' | 'print' | 'security'

export function CompanyConfigPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('profile')
  const [dirty, setDirty] = useState(false)

  // Profile
  const [name, setName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [gstin, setGstin] = useState('')
  const [stateName, setStateName] = useState('Tamil Nadu (33)')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // Tax & invoice
  const [invoicePrefix, setInvoicePrefix] = useState('INV-26-27-')
  const [financialYear, setFinancialYear] = useState('2026-2027')
  const [roundingMode, setRoundingMode] = useState('NEAREST_RUPEE')

  // Inventory rules
  const [allowNegativeStock, setAllowNegativeStock] = useState(false)
  const [sizeScheme, setSizeScheme] = useState('UK')

  // Print settings
  const [receiptWidth, setReceiptWidth] = useState('80mm')

  // Security
  const [sessionTimeout, setSessionTimeout] = useState('15')
  const [adminSalesEnabled, setAdminSalesEnabled] = useState(true)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => api.get('/company/profile').then((r) => r.data?.data ?? {}),
  })

  useEffect(() => {
    if (data) {
      setName(data.name || '')
      setLegalName(data.legalName || data.legal_name || '')
      setGstin(data.gstin || '')
      setAddress(data.address || '')
      setPhone(data.phone || '')
      setEmail(data.email || '')
      setDirty(false)
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put('/company/profile', {
        name,
        legalName,
        gstin,
        stateName,
        address,
        phone,
        email,
        invoicePrefix,
        financialYear,
        roundingMode,
        allowNegativeStock,
        sizeScheme,
        receiptWidth,
        adminSalesEnabled,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-profile'] })
      setDirty(false)
      toast.success('Company configuration saved')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save configuration')),
  })

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Business profile', icon: <Building2 className="w-3.5 h-3.5" /> },
    { key: 'tax', label: 'Tax & invoice', icon: <Receipt className="w-3.5 h-3.5" /> },
    { key: 'inventory', label: 'Inventory rules', icon: <Boxes className="w-3.5 h-3.5" /> },
    { key: 'print', label: 'Print settings', icon: <Printer className="w-3.5 h-3.5" /> },
    { key: 'security', label: 'Security', icon: <Shield className="w-3.5 h-3.5" /> },
  ]

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Company Configuration" breadcrumbs={[{ label: 'Administration' }, { label: 'Company Settings' }]} />
        <ErrorState message={getApiErrorMessage(error)} onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Company Configuration"
        description="Configure business identity, GST & invoice series, footwear size schemes, and security rules."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Company Settings' }]}
        secondaryActions={dirty ? <StatusBadge status="PENDING" label="Unsaved changes" tone="warning" /> : undefined}
      />

      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? 'px-3.5 py-2 rounded-md text-xs font-medium bg-teal-600 text-white inline-flex items-center gap-1.5 whitespace-nowrap'
                : 'px-3.5 py-2 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 whitespace-nowrap'
            }
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-6 space-y-5">
            {tab === 'profile' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Business display name" required>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setDirty(true) }}
                    className={inputBaseClass}
                  />
                </FormField>
                <FormField label="Registered legal name">
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => { setLegalName(e.target.value); setDirty(true) }}
                    className={inputBaseClass}
                  />
                </FormField>
                <FormField label="GSTIN" helperText="15-character Goods & Services Tax ID">
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => { setGstin(e.target.value.toUpperCase()); setDirty(true) }}
                    className={`${inputBaseClass} font-mono`}
                  />
                </FormField>
                <FormField label="Registered state">
                  <SearchableCombobox
                    options={[
                      { value: 'Tamil Nadu (33)', label: 'Tamil Nadu (33)' },
                      { value: 'Karnataka (29)', label: 'Karnataka (29)' },
                      { value: 'Maharashtra (27)', label: 'Maharashtra (27)' },
                      { value: 'Kerala (32)', label: 'Kerala (32)' },
                      { value: 'Delhi (07)', label: 'Delhi (07)' },
                    ]}
                    value={stateName}
                    onChange={(v) => { setStateName(v); setDirty(true) }}
                  />
                </FormField>
                <FormField label="Support phone">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setDirty(true) }}
                    className={inputBaseClass}
                  />
                </FormField>
                <FormField label="Business email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setDirty(true) }}
                    className={inputBaseClass}
                  />
                </FormField>
                <FormField label="Registered address" className="sm:col-span-2">
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => { setAddress(e.target.value); setDirty(true) }}
                    className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                  />
                </FormField>
              </div>
            )}

            {tab === 'tax' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Invoice prefix">
                  <input
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => { setInvoicePrefix(e.target.value); setDirty(true) }}
                    className={`${inputBaseClass} font-mono`}
                  />
                </FormField>
                <FormField label="Active financial year">
                  <SearchableCombobox
                    options={[
                      { value: '2025-2026', label: 'FY 2025–2026' },
                      { value: '2026-2027', label: 'FY 2026–2027' },
                    ]}
                    value={financialYear}
                    onChange={(v) => { setFinancialYear(v); setDirty(true) }}
                  />
                </FormField>
                <FormField label="Invoice rounding">
                  <SearchableCombobox
                    options={[
                      { value: 'NEAREST_RUPEE', label: 'Round to nearest ₹1' },
                      { value: 'NONE', label: 'Exact paise (no rounding)' },
                    ]}
                    value={roundingMode}
                    onChange={(v) => { setRoundingMode(v); setDirty(true) }}
                  />
                </FormField>
              </div>
            )}

            {tab === 'inventory' && (
              <div className="space-y-4 max-w-lg">
                <FormField label="Default footwear size scheme">
                  <SearchableCombobox
                    options={[
                      { value: 'UK', label: 'UK / India Sizes (UK 6 – UK 11)' },
                      { value: 'EU', label: 'EU Sizes (EU 39 – EU 46)' },
                    ]}
                    value={sizeScheme}
                    onChange={(v) => { setSizeScheme(v); setDirty(true) }}
                  />
                </FormField>
                <label className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowNegativeStock}
                    onChange={(e) => { setAllowNegativeStock(e.target.checked); setDirty(true) }}
                    className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-900">Allow negative stock at POS</span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Permits billing even if warehouse balance is 0 (reconciled later during GRN).
                    </p>
                  </div>
                </label>
              </div>
            )}

            {tab === 'print' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                <FormField label="Thermal receipt width">
                  <SearchableCombobox
                    options={[
                      { value: '80mm', label: '80mm Standard Thermal' },
                      { value: '58mm', label: '58mm Compact Thermal' },
                      { value: 'A4', label: 'A4 Laser Tax Invoice' },
                    ]}
                    value={receiptWidth}
                    onChange={(v) => { setReceiptWidth(v); setDirty(true) }}
                  />
                </FormField>
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                  <p className="font-semibold text-slate-900">Print preview ({receiptWidth})</p>
                  <p className="text-slate-600">{name || 'SoleControl Retail'}</p>
                  <p className="font-mono text-slate-500">GSTIN: {gstin || '—'}</p>
                  <p className="text-slate-400 pt-2 border-t border-slate-200">Powered by Forty V</p>
                </div>
              </div>
            )}

            {tab === 'security' && (
              <div className="space-y-4 max-w-lg">
                <FormField label="Access token timeout (minutes)">
                  <SearchableCombobox
                    options={[
                      { value: '15', label: '15 minutes (recommended)' },
                      { value: '30', label: '30 minutes' },
                      { value: '60', label: '60 minutes' },
                    ]}
                    value={sessionTimeout}
                    onChange={(v) => { setSessionTimeout(v); setDirty(true) }}
                  />
                </FormField>
                <label className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminSalesEnabled}
                    onChange={(e) => { setAdminSalesEnabled(e.target.checked); setDirty(true) }}
                    className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-900">Allow Super Admin to create POS bills</span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Disable if Super Admin should only monitor sales and approve returns.
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>

          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {dirty ? 'You have unsaved changes in this tab.' : 'All changes saved.'}
            </span>
            <Button
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
