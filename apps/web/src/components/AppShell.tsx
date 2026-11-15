import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Building2, Database, Users, ShieldCheck,
  ReceiptText, Boxes, ScanBarcode, Warehouse, Store, Receipt,
  ArrowLeftRight, Hourglass, PackageX, Truck, HeartHandshake,
  BadgePercent, BookOpen, Wallet, Landmark, BarChart3, ScrollText,
  Plug, ChevronLeft, ChevronRight, Moon, Sun, Bell, LogOut, Search,
  Plus, X, CheckCircle2, AlertTriangle, Info, ArrowUpRight, Check
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

type NavItem = { label: string; icon: React.ReactNode; to: string }
type NavGroup = { title: string; items: NavItem[] }

const NAV: NavGroup[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', icon: <LayoutDashboard size={18} strokeWidth={1.5} />, to: '/dashboard' }] },
  { title: 'Setup', items: [
    { label: 'Company Config', icon: <Building2 size={18} strokeWidth={1.5} />, to: '/company' },
    { label: 'Master Data', icon: <Database size={18} strokeWidth={1.5} />, to: '/masters' },
    { label: 'Rack & Location', icon: <Warehouse size={18} strokeWidth={1.5} />, to: '/locations' },
    { label: 'Barcodes', icon: <ScanBarcode size={18} strokeWidth={1.5} />, to: '/barcodes' },
    { label: 'Integrations', icon: <Plug size={18} strokeWidth={1.5} />, to: '/integrations' },
  ]},
  { title: 'Access', items: [
    { label: 'Users', icon: <Users size={18} strokeWidth={1.5} />, to: '/users' },
    { label: 'Roles & Permissions', icon: <ShieldCheck size={18} strokeWidth={1.5} />, to: '/roles' },
  ]},
  { title: 'Purchasing & Stock', items: [
    { label: 'Purchases', icon: <ReceiptText size={18} strokeWidth={1.5} />, to: '/purchases' },
    { label: 'Vendors', icon: <Truck size={18} strokeWidth={1.5} />, to: '/vendors' },
    { label: 'Inventory', icon: <Boxes size={18} strokeWidth={1.5} />, to: '/inventory' },
    { label: 'Display Stock', icon: <Store size={18} strokeWidth={1.5} />, to: '/display' },
    { label: 'Stock Transfers', icon: <ArrowLeftRight size={18} strokeWidth={1.5} />, to: '/transfers' },
    { label: 'Ageing & Clearance', icon: <Hourglass size={18} strokeWidth={1.5} />, to: '/ageing' },
    { label: 'Damaged Goods', icon: <PackageX size={18} strokeWidth={1.5} />, to: '/damage' },
  ]},
  { title: 'Sales & Customers', items: [
    { label: 'Sales & POS', icon: <Receipt size={18} strokeWidth={1.5} />, to: '/sales' },
    { label: 'Customers & CRM', icon: <HeartHandshake size={18} strokeWidth={1.5} />, to: '/customers' },
    { label: 'Offers & Discounts', icon: <BadgePercent size={18} strokeWidth={1.5} />, to: '/offers' },
  ]},
  { title: 'Finance', items: [
    { label: 'Accounting', icon: <BookOpen size={18} strokeWidth={1.5} />, to: '/accounting' },
    { label: 'Capital & Withdrawals', icon: <Wallet size={18} strokeWidth={1.5} />, to: '/capital' },
    { label: 'Bank & GST', icon: <Landmark size={18} strokeWidth={1.5} />, to: '/bank-gst' },
  ]},
  { title: 'Insight & Control', items: [
    { label: 'Reports & Analytics', icon: <BarChart3 size={18} strokeWidth={1.5} />, to: '/reports' },
    { label: 'Notifications & Audit', icon: <ScrollText size={18} strokeWidth={1.5} />, to: '/audit' },
    { label: 'Database Explorer', icon: <Database size={18} strokeWidth={1.5} />, to: '/database' },
  ]},
]

const ALL_SEARCH_ITEMS = NAV.flatMap(g => g.items.map(i => ({ ...i, group: g.title })))

export function AppShell() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sc-sidebar') === 'true')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [notificationsList, setNotificationsList] = useState([
    { id: 'n1', title: 'Running Stock Clearance Alert', message: '3 footwear models reached 90+ days threshold', time: '10m ago', unread: true, severity: 'warning' },
    { id: 'n2', title: 'New Vendor Bill Inward', message: 'Bill PB-2026-003 from Nike India awaits final review', time: '1h ago', unread: true, severity: 'info' },
    { id: 'n3', title: 'GSTR-3B Tax Filing Window', message: 'Statutory monthly GST return cycle open', time: '4h ago', unread: false, severity: 'success' },
  ])

  const { user, logout } = useAuthStore()
  const { theme, toggle } = useThemeStore()

  const { data: storeData } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/company/stores').then(r => r.data.data).catch(() => []),
  })
  const stores: any[] = storeData || []
  const storeName = stores[0]?.name || 'Forty V Flagship (Coimbatore)'

  const unreadCount = notificationsList.filter(n => n.unread).length

  // Global Ctrl+K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(prev => !prev)
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false)
        setShowNotifications(false)
        setShowQuickCreate(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleCollapse = () => {
    const v = !collapsed
    setCollapsed(v)
    localStorage.setItem('sc-sidebar', String(v))
  }

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } finally { logout() }
  }

  const markAllNotificationsRead = () => {
    setNotificationsList(prev => prev.map(n => ({ ...n, unread: false })))
  }

  const filteredPaletteItems = ALL_SEARCH_ITEMS.filter(item =>
    item.label.toLowerCase().includes(paletteQuery.toLowerCase()) ||
    item.group.toLowerCase().includes(paletteQuery.toLowerCase())
  )

  const s = { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside className="flex flex-col border-r flex-shrink-0 transition-all duration-200" style={{ ...s, width: collapsed ? 72 : 264 }}>
        {/* Logo */}
        <div className="flex items-center px-3 py-4 border-b" style={{ borderColor: 'var(--color-border)', minHeight: 56 }}>
          {collapsed
            ? <div className="w-9 h-9 rounded-lg overflow-hidden bg-white flex items-center justify-center shadow-xs"><img src="/fortyv-logo.png" alt="FV" className="w-8 h-8 object-contain" /></div>
            : <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="bg-white p-1 rounded-lg shadow-xs"><img src="/fortyv-logo.png" alt="Forty V" className="h-6 object-contain" /></div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-wider uppercase text-slate-800 dark:text-slate-100">SoleControl</span>
                  <span className="text-[10px] font-mono text-indigo-500 font-semibold">Retail v2.0</span>
                </div>
              </div>
          }
        </div>
        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV.map(g => (
            <div key={g.title}>
              {!collapsed && <div className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{g.title}</div>}
              <ul className="space-y-0.5">
                {g.items.map(item => (
                  <li key={item.to}>
                    <NavLink to={item.to} title={collapsed ? item.label : undefined}
                      className={({ isActive }) => `flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all ${collapsed ? 'justify-center' : ''} ${isActive ? 'shadow-xs font-semibold' : 'hover:opacity-80'}`}
                      style={({ isActive }) => ({ color: isActive ? 'var(--color-primary)' : 'var(--color-text)', background: isActive ? 'var(--color-primary-soft)' : 'transparent' })}
                    >
                      {item.icon}
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="p-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={handleCollapse} className="w-full flex items-center justify-center p-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800" style={{ color: 'var(--color-muted)' }}>
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span className="ml-2 text-xs font-medium">Collapse Sidebar</span></>}
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden relative">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-6 border-b flex-shrink-0 z-20" style={{ ...s, height: 56 }}>
          {/* Store chip & FY */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {storeName}
            </span>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[11px] font-mono font-semibold"
                  style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
              FY 2026-27
            </span>
          </div>

          {/* Search Trigger (Ctrl+K) */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs text-slate-500 hover:border-indigo-400 transition-colors cursor-pointer w-64 ml-4"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
          >
            <Search size={14} className="text-slate-400" />
            <span className="flex-1 text-left">Search SKU, menu or actions…</span>
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono border bg-slate-100 dark:bg-slate-800 dark:border-slate-700">⌘K</kbd>
          </button>

          <div className="flex-1" />

          {/* Quick Create (+ New) */}
          <div className="relative">
            <button
              onClick={() => { setShowQuickCreate(!showQuickCreate); setShowNotifications(false); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-xs transition-all hover:opacity-95"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={14} />
              <span>New</span>
            </button>

            {showQuickCreate && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl shadow-xl border p-2 space-y-1 z-50 animate-in fade-in"
                   style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => { setShowQuickCreate(false); navigate('/purchases'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  style={{ color: 'var(--color-text)' }}
                >
                  <ReceiptText size={15} className="text-indigo-600" />
                  <span>New Purchase Bill</span>
                </button>
                <button
                  onClick={() => { setShowQuickCreate(false); navigate('/sales'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  style={{ color: 'var(--color-text)' }}
                >
                  <Receipt size={15} className="text-emerald-600" />
                  <span>New POS Counter Sale</span>
                </button>
                <button
                  onClick={() => { setShowQuickCreate(false); navigate('/transfers'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  style={{ color: 'var(--color-text)' }}
                >
                  <ArrowLeftRight size={15} className="text-sky-600" />
                  <span>Stock Transfer Consignment</span>
                </button>
                <button
                  onClick={() => { setShowQuickCreate(false); navigate('/customers'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  style={{ color: 'var(--color-text)' }}
                >
                  <HeartHandshake size={15} className="text-purple-600" />
                  <span>Add Customer</span>
                </button>
                <button
                  onClick={() => { setShowQuickCreate(false); navigate('/barcodes'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  style={{ color: 'var(--color-text)' }}
                >
                  <ScanBarcode size={15} className="text-amber-600" />
                  <span>Queue Barcode Print</span>
                </button>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ color: 'var(--color-muted)' }}
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowQuickCreate(false); }}
              className="p-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 relative cursor-pointer"
              style={{ color: 'var(--color-muted)' }}
              title="System Alerts & Notifications"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in"
                   style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: 'var(--color-border)' }}>
                  {notificationsList.map(n => (
                    <div
                      key={n.id}
                      onClick={() => navigate('/audit')}
                      className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex gap-3 ${n.unread ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}
                    >
                      <div className="mt-0.5">
                        {n.severity === 'warning' ? <AlertTriangle size={16} className="text-amber-500" /> :
                         n.severity === 'success' ? <CheckCircle2 size={16} className="text-emerald-500" /> :
                         <Info size={16} className="text-sky-500" />}
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{n.title}</div>
                        <div className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{n.message}</div>
                        <div className="text-[10px] font-mono text-slate-400">{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 border-t text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                  <button
                    onClick={() => { setShowNotifications(false); navigate('/audit'); }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1 mx-auto"
                  >
                    View All Audit Logs & Alerts <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Avatar Menu */}
          <div className="flex items-center gap-2 pl-2 border-l" style={{ borderColor: 'var(--color-border)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs" style={{ background: 'var(--color-primary)' }}>
              {user?.name?.charAt(0) || 'S'}
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>{user?.name || 'Super Admin'}</span>
              <span className="text-[10px] font-mono text-indigo-500">SUPER_ADMIN</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 ml-1"
              title="Logout session"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto"><Outlet /></main>

        {/* Global Command Palette Modal */}
        {showCommandPalette && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
            <div className="w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95"
                 style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--color-border)' }}>
                <Search size={18} className="text-slate-400" />
                <input
                  autoFocus
                  value={paletteQuery}
                  onChange={e => setPaletteQuery(e.target.value)}
                  placeholder="Jump to page, report, or module…"
                  className="flex-1 bg-transparent text-sm outline-none font-medium"
                  style={{ color: 'var(--color-text)' }}
                />
                <button onClick={() => setShowCommandPalette(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {filteredPaletteItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">No matching pages found</div>
                ) : (
                  filteredPaletteItems.map(item => (
                    <button
                      key={item.to}
                      onClick={() => {
                        setShowCommandPalette(false)
                        navigate(item.to)
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-indigo-600 dark:text-indigo-400">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[10px] uppercase font-mono text-slate-400">{item.group}</span>
                    </button>
                  ))
                )}
              </div>

              <div className="px-4 py-2 border-t flex items-center justify-between text-[11px] text-slate-400"
                   style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                <span>Navigation Shortcut</span>
                <span>Press <kbd className="font-mono border px-1 rounded">ESC</kbd> to exit</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
