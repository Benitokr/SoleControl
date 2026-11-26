import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Could not load data',
  message = 'The server did not respond as expected. Check your connection and try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="bg-white rounded-lg border border-red-200 px-6 py-10 text-center flex flex-col items-center justify-center">
      <div className="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}
