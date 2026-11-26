import * as React from 'react'
import { Printer, X } from 'lucide-react'
import { Button } from './Button'

interface PrintPreviewProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function PrintPreview({ open, onClose, title, children }: PrintPreviewProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="no-print px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              icon={<Printer className="w-4 h-4" />}
              onClick={() => window.print()}
            >
              Print
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Close print preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
          <div className="bg-white shadow-sm border border-slate-200 p-6 w-full max-w-lg text-slate-900">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
