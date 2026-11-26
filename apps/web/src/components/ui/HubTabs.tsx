import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'

export interface HubTabItem {
  key: string
  label: string
  to?: string
  active?: boolean
  onClick?: () => void
}

export function HubTabs({ tabs }: { tabs: HubTabItem[] }) {
  const navigate = useNavigate()

  return (
    <div
      role="tablist"
      className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 overflow-x-auto"
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={!!t.active}
          type="button"
          onClick={() => {
            if (t.onClick) t.onClick()
            else if (t.to) navigate(t.to)
          }}
          className={cn(
            'px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
            t.active
              ? 'bg-teal-600 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
