import * as React from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateIN, toISODate } from '../../lib/format'
import { cn } from '../../lib/utils'

interface DatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (isoDate: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function DatePicker({
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
  disabled = false,
  id,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const parsed = React.useMemo(() => {
    if (!value) return null
    const d = new Date(value + 'T00:00:00')
    return isNaN(d.getTime()) ? null : d
  }, [value])

  const [viewYear, setViewYear] = React.useState(() => (parsed || new Date()).getFullYear())
  const [viewMonth, setViewMonth] = React.useState(() => (parsed || new Date()).getMonth())

  React.useEffect(() => {
    if (parsed) {
      setViewYear(parsed.getFullYear())
      setViewMonth(parsed.getMonth())
    }
  }, [parsed])

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const selectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day)
    onChange(toISODate(d))
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm text-left flex items-center justify-between gap-2 transition-colors',
          'hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600',
          'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed'
        )}
      >
        <span className={cn('tabular-nums', parsed ? 'text-slate-900' : 'text-slate-400')}>
          {parsed ? formatDateIN(parsed) : placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded hover:bg-slate-100 text-slate-600"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-800">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded hover:bg-slate-100 text-slate-600"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-[11px] font-medium text-slate-400 py-0.5">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />
              const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isSelected = iso === value
              const isToday = iso === toISODate(new Date())
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    'h-8 w-8 mx-auto rounded-md text-xs tabular-nums flex items-center justify-center transition-colors',
                    isSelected
                      ? 'bg-teal-600 text-white font-semibold'
                      : isToday
                      ? 'bg-teal-50 text-teal-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between">
            <button
              type="button"
              onClick={() => {
                onChange(toISODate(new Date()))
                setOpen(false)
              }}
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
