import * as React from 'react'
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface ComboboxOption {
  value: string
  label: string
  sublabel?: string
  keywords?: string
  disabled?: boolean
}

interface SearchableComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  clearable?: boolean
  onQuickAdd?: () => void
  quickAddLabel?: string
  className?: string
  id?: string
}

export function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder = 'Select an option…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matching options found',
  disabled = false,
  clearable = false,
  onQuickAdd,
  quickAddLabel = 'Add new',
  className,
  id,
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [activeIndex, setActiveIndex] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selected = React.useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(q)) ||
        (o.keywords && o.keywords.toLowerCase().includes(q)) ||
        o.value.toLowerCase().includes(q)
    )
  }, [options, query])

  React.useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10)
    } else {
      setQuery('')
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (!disabled) setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = filtered[activeIndex]
      if (opt && !opt.disabled) {
        onChange(opt.value)
        setOpen(false)
      }
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)} onKeyDown={handleKeyDown}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm text-left flex items-center justify-between gap-2 transition-colors',
          'hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600',
          'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed'
        )}
      >
        <span className={cn('truncate', selected ? 'text-slate-900 font-medium' : 'text-slate-400')}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {clearable && value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear selection"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full min-w-[220px] bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
            />
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-slate-500 text-center">{emptyMessage}</div>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = opt.value === value
                const isHighlighted = idx === activeIndex
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value)
                        setOpen(false)
                      }
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-2 transition-colors',
                      isHighlighted && 'bg-teal-50 text-teal-900',
                      !isHighlighted && 'text-slate-700 hover:bg-slate-50',
                      opt.disabled && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <div className="min-w-0">
                      <div className={cn('truncate', isSelected && 'font-medium text-teal-700')}>
                        {opt.label}
                      </div>
                      {opt.sublabel && (
                        <div className="text-xs text-slate-500 truncate">{opt.sublabel}</div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                  </button>
                )
              })
            )}
          </div>

          {onQuickAdd && (
            <div className="border-t border-slate-100 p-1.5 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onQuickAdd()
                }}
                className="w-full px-2.5 py-1.5 rounded-md text-xs font-medium text-teal-700 hover:bg-teal-50 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {quickAddLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
