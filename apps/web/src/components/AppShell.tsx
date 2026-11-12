import { Outlet, NavLink } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Building2, Database, Users, ShieldCheck,
  ReceiptText, Boxes, ScanBarcode, Warehouse, Store, Receipt,
  ArrowLeftRight, Hourglass, PackageX, Truck, HeartHandshake,
  BadgePercent, BookOpen, Wallet, Landmark, BarChart3, ScrollText,
  Plug, ChevronLeft, ChevronRight, Moon, Sun, Bell, LogOut
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
  ]},
]

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sc-sidebar') === 'true')
  const { user, logout } = useAuthStore()
  const { theme, toggle } = useThemeStore()

  const { data: storeData } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/company/stores').then(r => r.data.data).catch(() => []),
  })
  const stores: any[] = storeData || []
  const storeName = stores[0]?.name || 'SoleControl'

  const handleCollapse = () => { const v = !collapsed; setCollapsed(v); localStorage.setItem('sc-sidebar', String(v)) }
  const handleLogout = async () => { try { await api.post('/auth/logout') } finally { logout() } }

  const s = { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside className="flex flex-col border-r flex-shrink-0 transition-all duration-200" style={{ ...s, width: collapsed ? 72 : 264 }}>
        {/* Logo */}
        <div className="flex items-center px-3 py-4 border-b" style={{ borderColor: 'var(--color-border)', minHeight: 56 }}>
          {collapsed
            ? <div className="w-9 h-9 rounded-lg overflow-hidden bg-white flex items-center justify-center"><img src="/fortyv-logo.png" alt="FV" className="w-8 h-8 object-contain" /></div>
            : <div className="flex items-center gap-2 overflow-hidden"><div className="bg-white p-1 rounded-lg"><img src="/fortyv-logo.png" alt="Forty V" className="h-6 object-contain" /></div><span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--color-muted)' }}>SoleControl</span></div>
          }
        </div>
        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV.map(g => (
            <div key={g.title}>
              {!collapsed && <div className="px-2 mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{g.title}</div>}
              <ul className="space-y-0.5">
                {g.items.map(item => (
                  <li key={item.to}>
                    <NavLink to={item.to} title={collapsed ? item.label : undefined}
                      className={({ isActive }) => `flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? '' : 'hover:opacity-75'}`}
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
          <button onClick={handleCollapse} className="w-full flex items-center justify-center p-2 rounded-lg transition-colors hover:opacity-75" style={{ color: 'var(--color-muted)' }}>
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span className="ml-2 text-xs">Collapse</span></>}
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 border-b flex-shrink-0" style={{ ...s, height: 56 }}>
          <span className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>{storeName}</span>
          <div className="flex-1" />
          <button onClick={toggle} className="p-2 rounded-lg transition-colors hover:opacity-75" style={{ color: 'var(--color-muted)' }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="p-2 rounded-lg" style={{ color: 'var(--color-muted)' }}><Bell size={16} /></button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: 'var(--color-primary)' }}>
              {user?.name?.charAt(0) || 'S'}
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{user?.name || 'Super Admin'}</span>
            <button onClick={handleLogout} className="p-1.5 rounded-lg transition-colors hover:opacity-75" style={{ color: 'var(--color-muted)' }} title="Logout"><LogOut size={14} /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  )
}

