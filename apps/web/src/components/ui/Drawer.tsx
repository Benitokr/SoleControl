import * as React from 'react'
import { X } from 'lucide-react'
import { ConfirmDialog } from './ConfirmDialog'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  width?: 'md' | 'lg' | 'xl'
  isDirty?: boolean
  footer?: React.ReactNode
  children: React.ReactNode
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  width = 'md',
  isDirty = false,
  footer,
  children,
}: DrawerProps) {
  const [confirmDiscard, setConfirmDiscard] = React.useState(false)

  const attemptClose = React.useCallback(() => {
    if (isDirty) {
      setConfirmDiscard(true)
    } else {
      onClose()
    }
  }, [isDirty, onClose])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') attemptClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, attemptClose])

  if (!open) return null

  const widthClass =
    width === 'xl' ? 'max-w-2xl' : width === 'lg' ? 'max-w-xl' : 'max-w-md'

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] flex justify-end"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) attemptClose()
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          className={`w-full ${widthClass} bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-150`}
        >
          <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={attemptClose}
              aria-label="Close drawer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>

          {footer && (
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false)
          onClose()
        }}
        title="Discard unsaved changes?"
        description="You have unsaved changes in this form. If you close now, your edits will be lost."
        confirmLabel="Discard changes"
        variant="warning"
      />
    </>
  )
}
