import { StatusBadge } from '../ui/StatusBadge'

export function StockBadge({ quantity, lowThreshold = 5 }: { quantity: number; lowThreshold?: number }) {
  const qty = Number(quantity ?? 0)
  if (qty <= 0) {
    return <StatusBadge status="OUT_OF_STOCK" label="Out of stock" tone="danger" />
  }
  if (qty <= lowThreshold) {
    return <StatusBadge status="LOW_STOCK" label={`Low (${qty})`} tone="warning" />
  }
  return <StatusBadge status="IN_STOCK" label={`In stock (${qty})`} tone="success" />
}

export function AgeingBadge({ days }: { days: number }) {
  const d = Number(days ?? 0)
  if (d > 90) return <StatusBadge status="OVERDUE" label={`${d}d (Deadstock)`} tone="danger" />
  if (d > 60) return <StatusBadge status="PENDING" label={`${d}d (Slow)`} tone="warning" />
  if (d > 30) return <StatusBadge status="SCHEDULED" label={`${d}d`} tone="info" />
  return <StatusBadge status="ACTIVE" label={`${d}d (Fresh)`} tone="success" />
}

export function MarginBadge({ cost, mrp }: { cost: number; mrp: number }) {
  const c = Number(cost || 0)
  const m = Number(mrp || 0)
  if (m <= 0) return <StatusBadge status="DRAFT" label="0% margin" tone="neutral" />
  const pct = ((m - c) / m) * 100
  if (m < c) return <StatusBadge status="OVERDUE" label={`Loss (${pct.toFixed(1)}%)`} tone="danger" />
  if (pct < 15) return <StatusBadge status="PENDING" label={`${pct.toFixed(1)}% margin`} tone="warning" />
  return <StatusBadge status="ACTIVE" label={`${pct.toFixed(1)}% margin`} tone="success" />
}
