import * as React from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'

interface FullPageFormProps {
  title: string
  subtitle?: string
  backLabel?: string
  onCancel: () => void
  isDirty?: boolean
  headerFields?: React.ReactNode
  summaryPanel: React.ReactNode
  primaryActionLabel: string
  onPrimaryAction: () => void
  primaryLoading?: boolean
  primaryDisabled?: boolean
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  secondaryLoading?: boolean
  children: React.ReactNode
}

export function FullPageForm({
  title,
  subtitle,
  backLabel = 'Back',
  onCancel,
  isDirty = false,
  headerFields,
  summaryPanel,
  primaryActionLabel,
  onPrimaryAction,
  primaryLoading = false,
  primaryDisabled = false,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryLoading = false,
  children,
}: FullPageFormProps) {
  const [confirmDiscard, setConfirmDiscard] = React.useState(false)

  const handleBack = () => {
    if (isDirty) setConfirmDiscard(true)
    else onCancel()
  }

  return (
    <div className="min-h-full flex flex-col">
      {/* Top document header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200 mb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Compact header fields (max 2 rows) */}
      {headerFields && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-5">
          {headerFields}
        </div>
      )}

      {/* Main grid: line-items left + sticky summary right */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pb-24">
        <div className="lg:col-span-8 space-y-4 min-w-0">{children}</div>
        <aside className="lg:col-span-4 lg:sticky lg:top-20 bg-white rounded-lg border border-slate-200 p-5 space-y-4">
          {summaryPanel}
        </aside>
      </div>

      {/* Sticky bottom action bar */}
      <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shadow-sm">
        <Button variant="outline" onClick={handleBack} disabled={primaryLoading || secondaryLoading}>
          Cancel
        </Button>
        <div className="flex items-center gap-2.5">
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="secondary"
              onClick={onSecondaryAction}
              loading={secondaryLoading}
              disabled={primaryLoading}
            >
              {secondaryActionLabel}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={onPrimaryAction}
            loading={primaryLoading}
            disabled={primaryDisabled || secondaryLoading}
          >
            {primaryActionLabel}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false)
          onCancel()
        }}
        title="Discard unsaved document?"
        description="You have unsaved line items or header edits. Leaving now will discard them."
        confirmLabel="Discard"
        variant="warning"
      />
    </div>
  )
}
