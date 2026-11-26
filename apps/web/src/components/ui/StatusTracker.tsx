import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

interface StatusTrackerProps {
  steps: string[]
  currentStep: string
  className?: string
}

export function StatusTracker({ steps, currentStep, className }: StatusTrackerProps) {
  const currentIdx = Math.max(
    0,
    steps.findIndex((s) => s.toLowerCase() === currentStep.toLowerCase())
  )

  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto py-1', className)} aria-label="Status progress">
      {steps.map((step, idx) => {
        const done = idx < currentIdx
        const active = idx === currentIdx
        return (
          <div key={step} className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-5 h-5 rounded-full text-[11px] font-semibold flex items-center justify-center border',
                  done
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : active
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'bg-white border-slate-300 text-slate-400'
                )}
              >
                {done ? <Check className="w-3 h-3" /> : idx + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  active ? 'text-teal-700 font-semibold' : done ? 'text-slate-700' : 'text-slate-400'
                )}
              >
                {step}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={cn('w-6 h-px', done ? 'bg-emerald-500' : 'bg-slate-200')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
