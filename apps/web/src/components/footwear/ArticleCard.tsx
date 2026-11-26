import { Package } from 'lucide-react'
import { formatINR } from '../../lib/format'
import { ColourSwatch } from './ColourSwatch'
import { StockBadge } from './FootwearBadges'
import { SizeStrip } from './SizeStrip'
import { cn } from '../../lib/utils'

interface ArticleCardProps {
  name: string
  brand?: string
  sku?: string
  mrp: number
  stockQty: number
  colours?: string[]
  stockBySize?: Record<string, number>
  imageUrl?: string
  onClick?: () => void
  className?: string
}

export function ArticleCard({
  name,
  brand,
  sku,
  mrp,
  stockQty,
  colours = [],
  stockBySize,
  imageUrl,
  onClick,
  className,
}: ArticleCardProps) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full text-left bg-white rounded-lg border border-slate-200 p-3.5 transition-all flex flex-col justify-between gap-3',
        onClick && 'hover:border-teal-500 hover:shadow-sm active:scale-[0.99] cursor-pointer',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-5 h-5 text-slate-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {brand && <p className="text-xs font-medium text-teal-700">{brand}</p>}
          <h3 className="text-sm font-semibold text-slate-900 leading-snug break-words">{name}</h3>
          {sku && <p className="text-xs font-mono text-slate-500 mt-0.5">{sku}</p>}
        </div>
      </div>

      {colours.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {colours.slice(0, 3).map((c) => (
            <ColourSwatch key={c} name={c} />
          ))}
          {colours.length > 3 && (
            <span className="text-xs text-slate-400">+{colours.length - 3}</span>
          )}
        </div>
      )}

      {stockBySize && <SizeStrip stockBySize={stockBySize} />}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
        <span className="text-sm font-semibold tabular-nums text-slate-900">{formatINR(mrp)}</span>
        <StockBadge quantity={stockQty} />
      </div>
    </Comp>
  )
}
