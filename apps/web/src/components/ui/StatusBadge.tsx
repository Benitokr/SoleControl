import * as React from 'react'
import { cn } from '../../lib/utils'

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'teal' | 'info'

const TONE_MAP: Record<BadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
}

const AUTO_STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: 'success',
  PAID: 'success',
  COMPLETED: 'success',
  FINALISED: 'success',
  FINALIZED: 'success',
  RECEIVED: 'success',
  POSTED: 'success',
  RECONCILED: 'success',
  IN_STOCK: 'success',
  APPROVED: 'teal',
  DISPATCHED: 'info',
  IN_TRANSIT: 'info',
  SCHEDULED: 'info',
  PENDING: 'warning',
  LOW_STOCK: 'warning',
  PARTIALLY_RECEIVED: 'warning',
  PARTIAL: 'warning',
  REQUESTED: 'warning',
  REPORTED: 'warning',
  DRAFT: 'neutral',
  INACTIVE: 'neutral',
  EXPIRED: 'neutral',
  CANCELLED: 'danger',
  VOID: 'danger',
  OVERDUE: 'danger',
  OUT_OF_STOCK: 'danger',
  WRITTEN_OFF: 'danger',
  DISCREPANCY: 'danger',
}

function humanizeStatus(s: string): string {
  return s
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

interface StatusBadgeProps {
  status: string
  label?: string
  tone?: BadgeTone
  className?: string
}

export function StatusBadge({ status, label, tone, className }: StatusBadgeProps) {
  const key = String(status || 'DRAFT').toUpperCase()
  const resolvedTone = tone || AUTO_STATUS_TONE[key] || 'neutral'
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap',
        TONE_MAP[resolvedTone],
        className
      )}
    >
      {label || humanizeStatus(String(status || 'Draft'))}
    </span>
  )
}
