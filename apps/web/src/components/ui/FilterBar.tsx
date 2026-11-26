import * as React from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface FilterChip {
  key: string
  label: string
  count?: number
}

interface FilterBarProps {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  chips?: FilterChip[]
  activeChip?: string
  onChipChange?: (key: string) => void
  actions?: React.ReactNode
  onReset?: () => void
  className?: string
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  chips,
  activeChip,
  onChipChange,
  actions,
  onReset,
  className,
}: FilterBarProps) {
  return (
    <div className={cn('bg-white rounded-lg border border-slate-200 p-3 flex flex-col gap-3', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {onSearchChange && (
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-9 pl-9 pr-8 text-sm bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {actions}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1.5"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {chips && chips.length > 0 && onChipChange && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
          {chips.map((c) => {
            const active = activeChip === c.key
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => onChipChange(c.key)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1.5',
                  active
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                )}
              >
                <span>{c.label}</span>
                {c.count !== undefined && (
                  <span
                    className={cn(
                      'text-[11px] tabular-nums px-1.5 py-0.2 rounded',
                      active ? 'bg-teal-700 text-teal-50' : 'bg-white text-slate-500'
                    )}
                  >
                    {c.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
