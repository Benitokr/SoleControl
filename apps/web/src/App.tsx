import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, Component, ErrorInfo, ReactNode } from 'react'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { LoginPage } from './pages/LoginPage'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'
import { RolesPage } from './pages/RolesPage'
import { CompanyConfigPage } from './pages/CompanyConfigPage'
import { MastersPage } from './pages/MastersPage'
import { LocationsPage } from './pages/LocationsPage'
import { VendorsPage } from './pages/VendorsPage'
import { PurchasesPage } from './pages/PurchasesPage'
import { InventoryPage } from './pages/InventoryPage'
import { SalesPage } from './pages/SalesPage'
import { CustomersPage } from './pages/CustomersPage'
import { OffersPage } from './pages/OffersPage'
import { BarcodesPage } from './pages/BarcodesPage'
import { AccountingPage } from './pages/AccountingPage'
import { CapitalPage } from './pages/CapitalPage'
import { BankGSTPage } from './pages/BankGSTPage'
import { ReportsPage } from './pages/ReportsPage'
import { AuditPage } from './pages/AuditPage'
import { IntegrationsPage } from './pages/IntegrationsPage'
import { TransfersPage } from './pages/TransfersPage'
import { DisplayStockPage } from './pages/DisplayStockPage'
import { AgeingPage } from './pages/AgeingPage'
import { DamagedGoodsPage } from './pages/DamagedGoodsPage'
import { DatabasePage } from './pages/DatabasePage'
import { InsightsPage } from './pages/InsightsPage'
import { SystemHealthPage } from './pages/SystemHealthPage'

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
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
          <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-500 font-bold text-xl">
              !
            </div>
            <h2 className="text-xl font-bold">Something went wrong</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {this.state.error?.message || 'An unexpected error occurred while rendering the page.'}
            </p>
            <div className="pt-2 flex gap-3 justify-center">
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/login' }}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Back to Sign In
              </button>
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Reload Page
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
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { theme } = useThemeStore()
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="company" element={<CompanyConfigPage />} />
          <Route path="masters" element={<MastersPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="purchases" element={<PurchasesPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="display" element={<DisplayStockPage />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="ageing" element={<AgeingPage />} />
          <Route path="damage" element={<DamagedGoodsPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="barcodes" element={<BarcodesPage />} />
          <Route path="accounting" element={<AccountingPage />} />
          <Route path="capital" element={<CapitalPage />} />
          <Route path="bank-gst" element={<BankGSTPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="database" element={<DatabasePage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="system-health" element={<SystemHealthPage />} />
          <Route path="*" element={<div className="p-8 text-center"><p className="text-2xl font-semibold mb-2">Page not found</p><a href="/dashboard" className="text-primary underline">Go to Dashboard</a></div>} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}

