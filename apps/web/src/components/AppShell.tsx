import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import {
  LayoutDashboard, Building2, Database, Users, ShieldCheck,
  ReceiptText, Boxes, ScanBarcode, Warehouse, Store, Receipt,
  ArrowLeftRight, Hourglass, PackageX, Truck, HeartHandshake,
  BadgePercent, BookOpen, Wallet, Landmark, BarChart3, ScrollText,
  Plug, ChevronLeft, ChevronRight, Bell, LogOut, Search,
  Menu, X, ShoppingBag, Activity, Lightbulb, ClipboardList, Command,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { cn } from '../lib/utils'
import { SearchableCombobox } from './ui/SearchableCombobox'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  permission?: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, permission: 'dashboard.view' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'POS Billing', to: '/sales/pos', icon: <ShoppingBag className="w-4 h-4" />, permission: 'sales.create' },
      { label: 'Sales History & Returns', to: '/sales', icon: <Receipt className="w-4 h-4" />, permission: 'sales.view' },
      { label: 'Customers', to: '/customers', icon: <HeartHandshake className="w-4 h-4" />, permission: 'customers.view' },
      { label: 'Offers & Discounts', to: '/offers', icon: <BadgePercent className="w-4 h-4" />, permission: 'offers.view' },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Stock', to: '/inventory', icon: <Boxes className="w-4 h-4" />, permission: 'inventory.view' },
      { label: 'Display Stock', to: '/display', icon: <Store className="w-4 h-4" />, permission: 'display_stock.view' },
      { label: 'Stock Transfers', to: '/transfers', icon: <ArrowLeftRight className="w-4 h-4" />, permission: 'stock_transfers.view' },
      { label: 'Ageing & Clearance', to: '/ageing', icon: <Hourglass className="w-4 h-4" />, permission: 'ageing.view' },
      { label: 'Damaged Goods', to: '/damage', icon: <PackageX className="w-4 h-4" />, permission: 'damaged_goods.view' },
      { label: 'Barcodes & Labels', to: '/barcodes', icon: <ScanBarcode className="w-4 h-4" />, permission: 'barcodes.view' },
    ],
  },
  {
    title: 'Purchasing',
    items: [
      { label: 'Purchase Orders', to: '/purchases?tab=orders', icon: <ClipboardList className="w-4 h-4" />, permission: 'purchases.view' },
      { label: 'Purchase Bills / GRN', to: '/purchases', icon: <ReceiptText className="w-4 h-4" />, permission: 'purchases.view' },
      { label: 'Vendors', to: '/vendors', icon: <Truck className="w-4 h-4" />, permission: 'vendors.view' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Accounting & Ledgers', to: '/accounting', icon: <BookOpen className="w-4 h-4" />, permission: 'accounting.view' },
      { label: 'Capital & Withdrawals', to: '/capital', icon: <Wallet className="w-4 h-4" />, permission: 'capital.view' },
      { label: 'Bank & GST', to: '/bank-gst', icon: <Landmark className="w-4 h-4" />, permission: 'bank_gst.view' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Reports & Exports', to: '/reports', icon: <BarChart3 className="w-4 h-4" />, permission: 'reports.view' },
      { label: 'Business Insights', to: '/insights', icon: <Lightbulb className="w-4 h-4" />, permission: 'reports.view' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Master Data', to: '/masters', icon: <Database className="w-4 h-4" />, permission: 'masters.view' },
      { label: 'Company Settings', to: '/company', icon: <Building2 className="w-4 h-4" />, permission: 'company.view' },
      { label: 'Locations', to: '/locations', icon: <Warehouse className="w-4 h-4" />, permission: 'locations.view' },
      { label: 'Users', to: '/users', icon: <Users className="w-4 h-4" />, permission: 'users.view' },
      { label: 'Roles & Permissions', to: '/roles', icon: <ShieldCheck className="w-4 h-4" />, permission: 'roles.view' },
      { label: 'Notifications', to: '/notifications', icon: <Bell className="w-4 h-4" />, permission: 'audit.view' },
      { label: 'Audit Trail', to: '/audit', icon: <ScrollText className="w-4 h-4" />, permission: 'audit.view' },
      { label: 'Integrations', to: '/integrations', icon: <Plug className="w-4 h-4" />, permission: 'integrations.view' },
      { label: 'System Health', to: '/system-health', icon: <Activity className="w-4 h-4" />, permission: 'audit.view' },
      { label: 'Database Explorer', to: '/database', icon: <Database className="w-4 h-4" />, permission: 'audit.view' },
    ],
  },
]

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sales/pos': 'POS Billing',
  '/sales': 'Sales History & Returns',
  '/customers': 'Customers',
  '/offers': 'Offers & Discounts',
  '/inventory': 'Warehouse Stock',
  '/display': 'Display Stock',
  '/transfers': 'Stock Transfers',
  '/ageing': 'Ageing & Clearance',
  '/damage': 'Damaged Goods',
  '/barcodes': 'Barcodes & Labels',
  '/purchases': 'Purchasing & Goods Inward',
  '/purchases/new': 'New Purchase Bill',
  '/vendors': 'Vendors',
  '/accounting': 'Accounting & Ledgers',
  '/capital': 'Capital & Withdrawals',
  '/bank-gst': 'Bank & GST',
  '/reports': 'Reports & Exports',
  '/insights': 'Business Insights',
  '/masters': 'Master Data',
  '/masters/articles/new': 'New Footwear Article',
  '/company': 'Company Settings',
  '/locations': 'Locations',
  '/users': 'Users & Personnel',
  '/roles': 'Roles & Permissions',
  '/notifications': 'Notifications & Alerts',
  '/audit': 'Audit Trail',
  '/integrations': 'Integrations',
  '/system-health': 'System Health',
  '/database': 'Database Explorer',
}

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, hasPermission } = useAuthStore()

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sc-sidebar') === 'true')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [activeStoreId, setActiveStoreId] = useState('')

  const isFullScreenPos = location.pathname === '/sales/pos'

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/company/stores').then((r) => r.data?.data ?? []),
  })

  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get('/alerts').then((r) => r.data?.data ?? []),
  })

  const stores: any[] = Array.isArray(storesData) ? storesData : []
  const activeStores = stores.filter((s) => s.isActive !== false && s.is_active !== false)
  const currentStore =
    activeStores.find((s) => s.id === activeStoreId) ||
    activeStores[0] || { id: 'store-1', name: 'Forty V Flagship Store' }

  const alertsList: any[] = Array.isArray(alertsData) ? alertsData : []
  const unreadCount = alertsList.filter((a) => !a.isRead && !a.is_read).length

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => !item.permission || hasPermission(item.permission)),
    })).filter((g) => g.items.length > 0)
  }, [hasPermission])

  const allVisibleItems = useMemo(
    () => visibleGroups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title }))),
    [visibleGroups]
  )

  const filteredPalette = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase()
    if (!q) return allVisibleItems
    return allVisibleItems.filter(
      (i) => i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q)
    )
  }, [allVisibleItems, paletteQuery])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowPalette((p) => !p)
      }
      if (e.key === 'Escape') {
        setShowPalette(false)
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sc-sidebar', String(next))
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Proceed with local sign-out even if session already expired
    } finally {
      logout()
      navigate('/login')
    }
  }

  if (isFullScreenPos) {
    return (
      <div className="min-h-screen bg-[#F7F8FA]">
        <Outlet />
      </div>
    )
  }

  const currentTitle = ROUTE_TITLES[location.pathname] || 'SoleControl'

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-300 select-none">
      {/* Brand header */}
      <div className="h-14 px-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="bg-white rounded-md px-1.5 py-1 flex items-center justify-center shrink-0">
            <img
              src="/fortyv-logo.png"
              alt="Forty V"
              className="h-5 w-auto object-contain"
            />
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white leading-tight truncate">
                SoleControl
              </div>
              <div className="text-[11px] text-slate-400 truncate">Retail ERP</div>
            </div>
          )}
        </div>
        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 hidden lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5" aria-label="Main navigation">
        {visibleGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {(!collapsed || isMobile) && (
              <div className="px-2.5 text-[11px] font-medium text-slate-400">
                {group.title}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isPurchaseOrders = item.to.includes('tab=orders')
                const isActive = isPurchaseOrders
                  ? location.pathname === '/purchases' && location.search.includes('tab=orders')
                  : item.to === '/purchases'
                  ? location.pathname.startsWith('/purchases') && !location.search.includes('tab=orders')
                  : item.to === '/sales'
                  ? location.pathname === '/sales'
                  : location.pathname === item.to

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={collapsed && !isMobile ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors',
                      collapsed && !isMobile && 'justify-center px-2',
                      isActive
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer user card */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        {(!collapsed || isMobile) ? (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-medium text-white truncate">{user?.name || 'Admin'}</div>
              <div className="text-[11px] text-slate-400 truncate">{user?.roleName || 'Super Admin'}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="w-full flex justify-center p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-[#F7F8FA] text-slate-900">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:block shrink-0 sticky top-0 h-screen transition-all duration-150',
          collapsed ? 'w-[68px]' : 'w-[248px]'
        )}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile / Tablet Drawer Sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-slate-900/50 flex"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMobileOpen(false)
          }}
        >
          <aside className="w-[260px] h-full shadow-2xl">{renderSidebarContent(true)}</aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="h-14 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline">SoleControl</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-medium text-slate-800 truncate">{currentTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Global Search Trigger */}
            <button
              type="button"
              onClick={() => setShowPalette(true)}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-slate-500 text-xs flex items-center gap-2 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Search pages, SKU, bill…</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-white border border-slate-200 rounded text-slate-500">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>

            {/* Store badge or switcher */}
            {activeStores.length > 1 ? (
              <div className="hidden sm:block w-48">
                <SearchableCombobox
                  options={activeStores.map((st) => ({ value: st.id, label: st.name }))}
                  value={currentStore.id}
                  onChange={setActiveStoreId}
                />
              </div>
            ) : (
              <span className="hidden xl:inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-700">
                {currentStore.name}
              </span>
            )}

            {/* Notifications */}
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Prominent New Sale Shortcut */}
            {hasPermission('sales.create') && (
              <button
                type="button"
                onClick={() => navigate('/sales/pos')}
                className="h-9 px-3.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>New Sale</span>
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Command Palette (Ctrl/Cmd+K) */}
      {showPalette && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-start justify-center pt-20 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowPalette(false)
          }}
        >
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                placeholder="Jump to module or action…"
                className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPalette(false)}
                className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 border border-slate-200 rounded"
              >
                Esc
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
              {filteredPalette.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No matching pages found</div>
              ) : (
                filteredPalette.map((item) => (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => {
                      navigate(item.to)
                      setShowPalette(false)
                      setPaletteQuery('')
                    }}
                    className="w-full px-3 py-2 rounded-lg text-left hover:bg-teal-50 hover:text-teal-900 flex items-center justify-between gap-2 text-sm text-slate-700 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-slate-400">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </span>
                    <span className="text-xs text-slate-400">{item.group}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
