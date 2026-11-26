import * as React from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Rows3,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { TableSkeleton } from './Skeleton'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'

export interface ColumnDef<T> {
  id: string
  header: string
  accessor?: (row: T) => any
  cell: (row: T) => React.ReactNode
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
  defaultHidden?: boolean
  exportValue?: (row: T) => string | number
  width?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  getRowId: (row: T, idx: number) => string
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  emptyIcon?: React.ReactNode
  onRowClick?: (row: T) => void
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  bulkActions?: (selectedRows: T[]) => React.ReactNode
  exportFilename?: string
  pageSize?: number
  toolbarExtra?: React.ReactNode
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  isLoading = false,
  error,
  onRetry,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filter criteria.',
  emptyAction,
  emptyIcon,
  onRowClick,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  bulkActions,
  exportFilename,
  pageSize: initialPageSize = 15,
  toolbarExtra,
}: DataTableProps<T>) {
  const [sortId, setSortId] = React.useState<string | null>(null)
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(initialPageSize)
  const [dense, setDense] = React.useState(false)
  const [showColMenu, setShowColMenu] = React.useState(false)
  const [hiddenCols, setHiddenCols] = React.useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id))
  )

  const colMenuRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setShowColMenu(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  React.useEffect(() => {
    setPage(1)
  }, [data.length])

  const visibleColumns = React.useMemo(
    () => columns.filter((c) => !hiddenCols.has(c.id)),
    [columns, hiddenCols]
  )

  const sortedData = React.useMemo(() => {
    if (!sortId) return data
    const col = columns.find((c) => c.id === sortId)
    if (!col || !col.accessor) return data
    const acc = col.accessor
    return [...data].sort((a, b) => {
      const va = acc(a) ?? ''
      const vb = acc(b) ?? ''
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va
      }
      const cmp = String(va).localeCompare(String(vb), 'en-IN', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, columns, sortId, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pagedData = React.useMemo(
    () => sortedData.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sortedData, safePage, pageSize]
  )

  const toggleSort = (id: string) => {
    if (sortId === id) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortId(id)
      setSortDir('asc')
    }
  }

  const toggleColumn = (id: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (visibleColumns.length > 1) next.add(id)
      return next
    })
  }

  const allPageIds = pagedData.map((r, i) => getRowId(r, (safePage - 1) * pageSize + i))
  const allSelectedOnPage =
    allPageIds.length > 0 && allPageIds.every((id) => selectedIds.includes(id))

  const toggleSelectAll = () => {
    if (!onSelectionChange) return
    if (allSelectedOnPage) {
      onSelectionChange(selectedIds.filter((id) => !allPageIds.includes(id)))
    } else {
      onSelectionChange(Array.from(new Set([...selectedIds, ...allPageIds])))
    }
  }

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const handleExportCsv = () => {
    const exportCols = visibleColumns
    const header = exportCols.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',')
    const rows = sortedData.map((row) =>
      exportCols
        .map((c) => {
          const val = c.exportValue ? c.exportValue(row) : c.accessor ? c.accessor(row) : ''
          return `"${String(val ?? '').replace(/"/g, '""')}"`
        })
        .join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportFilename || 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <TableSkeleton rows={6} cols={Math.min(6, visibleColumns.length)} />

  if (error) {
    return (
      <ErrorState
        message={(error as any)?.response?.data?.error?.message || (error as any)?.message || undefined}
        onRetry={onRetry}
      />
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  const selectedRows = data.filter((r, i) => selectedIds.includes(getRowId(r, i)))

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Table utility bar */}
      <div className="px-4 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {selectable && selectedIds.length > 0 ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-teal-700 tabular-nums">
                {selectedIds.length} selected
              </span>
              {bulkActions && bulkActions(selectedRows)}
            </div>
          ) : (
            <span className="tabular-nums">
              Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sortedData.length)} of{' '}
              {sortedData.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {toolbarExtra}
          <button
            type="button"
            onClick={() => setDense((d) => !d)}
            title="Toggle row density"
            className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5"
          >
            <Rows3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{dense ? 'Compact' : 'Comfortable'}</span>
          </button>

          <div ref={colMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowColMenu((o) => !o)}
              className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Columns</span>
            </button>
            {showColMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-30 space-y-1">
                {columns.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 text-xs text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!hiddenCols.has(c.id)}
                      onChange={() => toggleColumn(c.id)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                    />
                    <span className="truncate">{c.header}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {exportFilename && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop/Tablet table */}
      <div className="hidden md:block overflow-x-auto max-h-[65vh]">
        <table className="w-full text-[13px] border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-2.5 text-left">
                  <input
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={toggleSelectAll}
                    aria-label="Select all rows on page"
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                  />
                </th>
              )}
              {visibleColumns.map((col) => (
                <th
                  key={col.id}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'px-3.5 py-2.5 font-medium text-slate-600 whitespace-nowrap select-none',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  )}
                >
                  {col.sortable && col.accessor ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.id)}
                      className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
                    >
                      <span>{col.header}</span>
                      {sortId === col.id ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagedData.map((row, idx) => {
              const id = getRowId(row, (safePage - 1) * pageSize + idx)
              const isSelected = selectedIds.includes(id)
              return (
                <tr
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-slate-50',
                    isSelected && 'bg-teal-50/50'
                  )}
                >
                  {selectable && (
                    <td
                      className={cn('px-3', dense ? 'py-2' : 'py-3')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(id)}
                        aria-label={`Select row ${id}`}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                      />
                    </td>
                  )}
                  {visibleColumns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        'px-3.5 text-slate-800',
                        dense ? 'py-2' : 'py-3',
                        col.align === 'right'
                          ? 'text-right tabular-nums'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list (<768px) */}
      <div className="md:hidden divide-y divide-slate-100">
        {pagedData.map((row, idx) => {
          const id = getRowId(row, (safePage - 1) * pageSize + idx)
          return (
            <div
              key={id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn('p-4 space-y-2', onRowClick && 'cursor-pointer active:bg-slate-50')}
            >
              {visibleColumns.map((col) => (
                <div key={col.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-xs font-medium text-slate-500 shrink-0">{col.header}</span>
                  <div className="text-right text-slate-900 min-w-0">{col.cell(row)}</div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {sortedData.length > pageSize && (
        <div className="px-4 py-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50/40">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            {[15, 30, 50].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => {
                  setPageSize(sz)
                  setPage(1)
                }}
                className={cn(
                  'px-2 py-1 rounded border text-xs tabular-nums',
                  pageSize === sz
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                )}
              >
                {sz}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
