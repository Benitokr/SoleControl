import * as React from 'react'
import { cn } from '../../lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: React.ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'teal'
  onClick?: () => void
  active?: boolean
  className?: string
}

export function StatCard({
  label,
  value,
  subtext,
  icon,
  tone = 'default',
  onClick,
  active,
  className,
}: StatCardProps) {
  const toneStyles: Record<string, string> = {
    default: 'text-slate-900',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-red-600',
    teal: 'text-teal-700',
  }

  const iconBg: Record<string, string> = {
    default: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-600',
    teal: 'bg-teal-50 text-teal-700',
  }

  const Comp = onClick ? 'button' : 'div'

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full text-left bg-white rounded-lg border p-4 transition-all',
        active
          ? 'border-teal-600 ring-2 ring-teal-600/15'
          : 'border-slate-200 hover:border-slate-300',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className={cn('text-xl sm:text-2xl font-semibold tabular-nums tracking-tight', toneStyles[tone])}>
            {value}
          </p>
        </div>
        {icon && (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', iconBg[tone])}>
            {icon}
          </div>
        )}
      </div>
      {subtext && <p className="text-xs text-slate-500 mt-2">{subtext}</p>}
    </Comp>
  )
}
