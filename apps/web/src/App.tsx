import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { Component, ErrorInfo, ReactNode, Suspense, lazy } from 'react'
import { useAuthStore } from './store/authStore'
import { LoginPage } from './pages/LoginPage'
import { AppShell } from './components/AppShell'
import { Skeleton } from './components/ui'

// Route-level code splitting for fast initial load
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const UsersPage = lazy(() => import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })))
const RolesPage = lazy(() => import('./pages/RolesPage').then((m) => ({ default: m.RolesPage })))
const CompanyConfigPage = lazy(() => import('./pages/CompanyConfigPage').then((m) => ({ default: m.CompanyConfigPage })))
const MastersPage = lazy(() => import('./pages/MastersPage').then((m) => ({ default: m.MastersPage })))
const ArticleNewPage = lazy(() => import('./pages/ArticleNewPage').then((m) => ({ default: m.ArticleNewPage })))
const LocationsPage = lazy(() => import('./pages/LocationsPage').then((m) => ({ default: m.LocationsPage })))
const VendorsPage = lazy(() => import('./pages/VendorsPage').then((m) => ({ default: m.VendorsPage })))
const PurchasesPage = lazy(() => import('./pages/PurchasesPage').then((m) => ({ default: m.PurchasesPage })))
const PurchaseNewPage = lazy(() => import('./pages/PurchaseNewPage').then((m) => ({ default: m.PurchaseNewPage })))
const InventoryPage = lazy(() => import('./pages/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const SalesPage = lazy(() => import('./pages/SalesPage').then((m) => ({ default: m.SalesPage })))
const PosBillingPage = lazy(() => import('./pages/PosBillingPage').then((m) => ({ default: m.PosBillingPage })))
const CustomersPage = lazy(() => import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })))
const OffersPage = lazy(() => import('./pages/OffersPage').then((m) => ({ default: m.OffersPage })))
const BarcodesPage = lazy(() => import('./pages/BarcodesPage').then((m) => ({ default: m.BarcodesPage })))
const AccountingPage = lazy(() => import('./pages/AccountingPage').then((m) => ({ default: m.AccountingPage })))
const CapitalPage = lazy(() => import('./pages/CapitalPage').then((m) => ({ default: m.CapitalPage })))
const BankGSTPage = lazy(() => import('./pages/BankGSTPage').then((m) => ({ default: m.BankGSTPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const AuditPage = lazy(() => import('./pages/AuditPage').then((m) => ({ default: m.AuditPage })))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage').then((m) => ({ default: m.IntegrationsPage })))
const TransfersPage = lazy(() => import('./pages/TransfersPage').then((m) => ({ default: m.TransfersPage })))
const DisplayStockPage = lazy(() => import('./pages/DisplayStockPage').then((m) => ({ default: m.DisplayStockPage })))
const AgeingPage = lazy(() => import('./pages/AgeingPage').then((m) => ({ default: m.AgeingPage })))
const DamagedGoodsPage = lazy(() => import('./pages/DamagedGoodsPage').then((m) => ({ default: m.DamagedGoodsPage })))
const DatabasePage = lazy(() => import('./pages/DatabasePage').then((m) => ({ default: m.DatabasePage })))
const InsightsPage = lazy(() => import('./pages/InsightsPage').then((m) => ({ default: m.InsightsPage })))
const SystemHealthPage = lazy(() => import('./pages/SystemHealthPage').then((m) => ({ default: m.SystemHealthPage })))

function PageFallback() {
  return (
    <div className="space-y-4 py-4">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-10 text-center max-w-md mx-auto my-12 space-y-3">
      <p className="text-xs font-mono font-semibold text-teal-700">404</p>
      <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-500">
        The screen you requested does not exist or may have moved.
      </p>
      <div className="pt-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#F7F8FA] text-slate-900">
          <div className="max-w-md w-full p-8 rounded-xl bg-white shadow-lg border border-slate-200 text-center space-y-4">
            <p className="text-xs font-mono font-semibold text-red-600">500</p>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-sm text-slate-500">
              {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
            </p>
            <div className="pt-2 flex gap-3 justify-center">
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/dashboard' }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Suspense fallback={<PageFallback />}><DashboardPage /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<PageFallback />}><UsersPage /></Suspense>} />
          <Route path="roles" element={<Suspense fallback={<PageFallback />}><RolesPage /></Suspense>} />
          <Route path="company" element={<Suspense fallback={<PageFallback />}><CompanyConfigPage /></Suspense>} />
          <Route path="masters" element={<Suspense fallback={<PageFallback />}><MastersPage /></Suspense>} />
          <Route path="masters/articles/new" element={<Suspense fallback={<PageFallback />}><ArticleNewPage /></Suspense>} />
          <Route path="locations" element={<Suspense fallback={<PageFallback />}><LocationsPage /></Suspense>} />
          <Route path="vendors" element={<Suspense fallback={<PageFallback />}><VendorsPage /></Suspense>} />
          <Route path="purchases" element={<Suspense fallback={<PageFallback />}><PurchasesPage /></Suspense>} />
          <Route path="purchases/new" element={<Suspense fallback={<PageFallback />}><PurchaseNewPage /></Suspense>} />
          <Route path="inventory" element={<Suspense fallback={<PageFallback />}><InventoryPage /></Suspense>} />
          <Route path="display" element={<Suspense fallback={<PageFallback />}><DisplayStockPage /></Suspense>} />
          <Route path="transfers" element={<Suspense fallback={<PageFallback />}><TransfersPage /></Suspense>} />
          <Route path="ageing" element={<Suspense fallback={<PageFallback />}><AgeingPage /></Suspense>} />
          <Route path="damage" element={<Suspense fallback={<PageFallback />}><DamagedGoodsPage /></Suspense>} />
          <Route path="sales" element={<Suspense fallback={<PageFallback />}><SalesPage /></Suspense>} />
          <Route path="sales/pos" element={<Suspense fallback={<PageFallback />}><PosBillingPage /></Suspense>} />
          <Route path="customers" element={<Suspense fallback={<PageFallback />}><CustomersPage /></Suspense>} />
          <Route path="offers" element={<Suspense fallback={<PageFallback />}><OffersPage /></Suspense>} />
          <Route path="barcodes" element={<Suspense fallback={<PageFallback />}><BarcodesPage /></Suspense>} />
          <Route path="accounting" element={<Suspense fallback={<PageFallback />}><AccountingPage /></Suspense>} />
          <Route path="capital" element={<Suspense fallback={<PageFallback />}><CapitalPage /></Suspense>} />
          <Route path="bank-gst" element={<Suspense fallback={<PageFallback />}><BankGSTPage /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<PageFallback />}><ReportsPage /></Suspense>} />
          <Route path="notifications" element={<Suspense fallback={<PageFallback />}><NotificationsPage /></Suspense>} />
          <Route path="audit" element={<Suspense fallback={<PageFallback />}><AuditPage /></Suspense>} />
          <Route path="integrations" element={<Suspense fallback={<PageFallback />}><IntegrationsPage /></Suspense>} />
          <Route path="database" element={<Suspense fallback={<PageFallback />}><DatabasePage /></Suspense>} />
          <Route path="insights" element={<Suspense fallback={<PageFallback />}><InsightsPage /></Suspense>} />
          <Route path="system-health" element={<Suspense fallback={<PageFallback />}><SystemHealthPage /></Suspense>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}
