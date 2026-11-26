import { cn } from '../../lib/utils'
import { DEFAULT_UK_SIZES } from './SizeRunGrid'

interface SizeStripProps {
  stockBySize: Record<string, number | undefined>
  sizes?: string[]
  className?: string
}

export function SizeStrip({ stockBySize, sizes = DEFAULT_UK_SIZES, className }: SizeStripProps) {
  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)} aria-label="Stock by size">
      {sizes.map((sz) => {
        const val = stockBySize[sz]
        const shortSz = sz.replace('UK ', '')
        const tone =
          val === undefined
            ? 'bg-slate-100 text-slate-400 border-slate-200'
            : val <= 0
            ? 'bg-red-50 text-red-700 border-red-200'
            : val <= 3
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-teal-50 text-teal-800 border-teal-200'

        return (
          <div
            key={sz}
            title={`${sz}: ${val === undefined ? 'Not stocked' : `${val} pairs`}`}
            className={cn(
              'min-w-[28px] px-1 py-0.5 rounded border text-center leading-tight',
              tone
            )}
          >
            <div className="text-[10px] font-medium">{shortSz}</div>
            <div className="text-[10px] font-semibold tabular-nums">
              {val === undefined ? '–' : val}
            </div>
          </div>
        )
      })}
    </div>
  )
}
