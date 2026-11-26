import * as React from 'react'
import { cn } from '../../lib/utils'

interface MoneyInputProps {
  value: number | string
  onChange: (value: number) => void
  placeholder?: string
  disabled?: boolean
  min?: number
  max?: number
  id?: string
  className?: string
}

export function MoneyInput({
  value,
  onChange,
  placeholder = '0.00',
  disabled = false,
  min = 0,
  max,
  id,
  className,
}: MoneyInputProps) {
  const [focused, setFocused] = React.useState(false)
  const [draft, setDraft] = React.useState('')

  const numVal = Number(value ?? 0)
  const formatted = Number.isFinite(numVal)
    ? numVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00'

  const handleFocus = () => {
    setFocused(true)
    setDraft(numVal === 0 ? '' : String(numVal))
  }

  const handleBlur = () => {
    setFocused(false)
    const parsed = parseFloat(draft.replace(/,/g, ''))
    if (!Number.isFinite(parsed)) {
      onChange(0)
      return
    }
    let clamped = parsed
    if (min !== undefined) clamped = Math.max(min, clamped)
    if (max !== undefined) clamped = Math.min(max, clamped)
    onChange(Math.round(clamped * 100) / 100)
  }

  return (
    <div className={cn('relative flex items-center', className)}>
      <span className="absolute left-3 text-sm font-medium text-slate-500 select-none pointer-events-none">
        ₹
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        value={focused ? draft : formatted}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.]/g, '')
          setDraft(v)
          const parsed = parseFloat(v)
          if (Number.isFinite(parsed)) {
            onChange(parsed)
          } else if (v === '') {
            onChange(0)
          }
        }}
        className="w-full h-9 pl-7 pr-3 text-sm text-right tabular-nums bg-white text-slate-900 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  )
}
