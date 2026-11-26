import { cn } from '../../lib/utils'

const COLOUR_HEX_MAP: Record<string, string> = {
  black: '#111827',
  white: '#FFFFFF',
  'chalk white': '#F8FAFC',
  navy: '#1E3A8A',
  blue: '#2563EB',
  'royal blue': '#1D4ED8',
  red: '#DC2626',
  grey: '#64748B',
  'slate grey': '#475569',
  tan: '#D97706',
  brown: '#78350F',
  olive: '#3F6212',
  green: '#059669',
  beige: '#E7E5E4',
  pink: '#EC4899',
}

interface ColourSwatchProps {
  name: string
  hex?: string
  size?: 'sm' | 'md'
  className?: string
}

export function ColourSwatch({ name, hex, size = 'sm', className }: ColourSwatchProps) {
  const resolvedHex = hex || COLOUR_HEX_MAP[(name || '').toLowerCase()] || '#94A3B8'
  const dotClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-slate-700', className)}>
      <span
        className={cn(dotClass, 'rounded-full border border-slate-300 shrink-0')}
        style={{ backgroundColor: resolvedHex }}
        aria-hidden="true"
      />
      <span className="text-xs font-medium">{name || 'Standard'}</span>
    </span>
  )
}
