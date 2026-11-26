import * as React from 'react'
import { cn } from '../../lib/utils'

export const DEFAULT_UK_SIZES = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11']

interface SizeRunGridProps {
  sizes?: string[]
  values: Record<string, number>
  stockLimits?: Record<string, number>
  readOnly?: boolean
  onChange?: (size: string, qty: number) => void
  showTotals?: boolean
  className?: string
}

export function SizeRunGrid({
  sizes = DEFAULT_UK_SIZES,
  values,
  stockLimits,
  readOnly = false,
  onChange,
  showTotals = true,
  className,
}: SizeRunGridProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([])

  const total = sizes.reduce((sum, sz) => sum + (Number(values[sz]) || 0), 0)

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      inputRefs.current[Math.min(sizes.length - 1, idx + 1)]?.focus()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      inputRefs.current[Math.max(0, idx - 1)]?.focus()
    }
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="inline-flex items-stretch border border-slate-200 rounded-lg bg-white overflow-hidden min-w-full sm:min-w-0">
        {sizes.map((sz, idx) => {
          const qty = Number(values[sz] ?? 0)
          const limit = stockLimits ? stockLimits[sz] : undefined
          const isOut = readOnly ? qty <= 0 : limit !== undefined && limit <= 0
          const isLow = readOnly
            ? qty > 0 && qty <= 3
            : limit !== undefined && limit > 0 && limit <= 3
          const exceeds = limit !== undefined && qty > limit

          return (
            <div
              key={sz}
              className={cn(
                'flex-1 min-w-[64px] border-r border-slate-200 last:border-r-0 flex flex-col items-center',
                isOut && 'bg-red-50/40',
                isLow && !isOut && 'bg-amber-50/40'
              )}
            >
              <div className="w-full px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-50 border-b border-slate-200 text-center whitespace-nowrap">
                {sz}
              </div>

              {readOnly ? (
                <div
                  className={cn(
                    'w-full py-2 px-2 text-center text-sm font-semibold tabular-nums',
                    qty <= 0
                      ? 'text-red-600'
                      : qty <= 3
                      ? 'text-amber-700'
                      : 'text-slate-900'
                  )}
                >
                  {qty}
                </div>
              ) : (
                <div className="p-1.5 w-full flex flex-col items-center gap-0.5">
                  <input
                    ref={(el) => {
                      inputRefs.current[idx] = el
                    }}
                    type="number"
                    min={0}
                    max={limit}
                    value={qty === 0 ? '' : qty}
                    placeholder="0"
                    aria-label={`Quantity for ${sz}`}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onChange={(e) => {
                      const raw = parseInt(e.target.value, 10)
                      const next = Number.isFinite(raw) ? Math.max(0, raw) : 0
                      onChange?.(sz, next)
                    }}
                    className={cn(
                      'w-full h-8 text-center text-sm font-medium tabular-nums rounded border focus:outline-none focus:ring-2 focus:ring-teal-600/20',
                      exceeds
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-slate-200 bg-white text-slate-900 focus:border-teal-600',
                      '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                    )}
                  />
                  {limit !== undefined && (
                    <span
                      className={cn(
                        'text-[10px] tabular-nums',
                        limit <= 0 ? 'text-red-600' : limit <= 3 ? 'text-amber-700' : 'text-slate-400'
                      )}
                    >
                      Avail: {limit}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {showTotals && (
          <div className="min-w-[68px] bg-slate-50 flex flex-col items-center justify-between border-l border-slate-200">
            <div className="w-full px-2 py-1 text-[11px] font-medium text-slate-600 border-b border-slate-200 text-center">
              Total
            </div>
            <div className="py-2 px-2 text-sm font-semibold tabular-nums text-teal-700">
              {total}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
