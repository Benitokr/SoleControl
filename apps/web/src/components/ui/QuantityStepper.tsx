import { Minus, Plus } from 'lucide-react'
import { cn } from '../../lib/utils'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  size?: 'sm' | 'touch'
  disabled?: boolean
  className?: string
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max,
  size = 'sm',
  disabled = false,
  className,
}: QuantityStepperProps) {
  const btnSize = size === 'touch' ? 'w-11 h-11' : 'w-8 h-8'
  const inputSize = size === 'touch' ? 'w-14 h-11 text-base' : 'w-12 h-8 text-sm'

  const setSafe = (next: number) => {
    let val = Math.floor(next)
    if (!Number.isFinite(val)) val = min
    if (min !== undefined) val = Math.max(min, val)
    if (max !== undefined) val = Math.min(max, val)
    onChange(val)
  }

  return (
    <div className={cn('inline-flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden', className)}>
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => setSafe(value - 1)}
        aria-label="Decrease quantity"
        className={cn(
          btnSize,
          'flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors border-r border-slate-200'
        )}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        disabled={disabled}
        min={min}
        max={max}
        value={value}
        onChange={(e) => setSafe(parseInt(e.target.value, 10) || min)}
        aria-label="Quantity"
        className={cn(
          inputSize,
          'text-center tabular-nums font-medium text-slate-900 focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
        )}
      />
      <button
        type="button"
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={() => setSafe(value + 1)}
        aria-label="Increase quantity"
        className={cn(
          btnSize,
          'flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors border-l border-slate-200'
        )}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
