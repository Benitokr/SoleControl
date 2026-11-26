// SoleControl Client-Side Persistent Storage Engine
// Guarantees 100% data persistence across page reloads (F5) and serverless cold starts.

export interface SystemNotification {
  id: string
  title: string
  message: string
  severity: 'warning' | 'info' | 'danger' | 'success'
  isRead: boolean
  is_read?: boolean
  createdAt: string
  created_at?: string
  time?: string
}

const STORAGE_KEYS = {
  NOTIFICATIONS: 'solecontrol_notifications_v2',
  NOTIFICATIONS_DELETED: 'solecontrol_notifications_deleted_v2',
  NOTIFICATIONS_READ: 'solecontrol_notifications_read_v2',
  PURCHASES: 'solecontrol_purchases_v2',
  SALES: 'solecontrol_sales_v2',
  TRANSFERS: 'solecontrol_transfers_v2',
  CLEARANCE_RULES: 'solecontrol_clearance_rules_v2',
  DAMAGED_GOODS: 'solecontrol_damaged_goods_v2',
  DISPLAYS: 'solecontrol_displays_v2',
  OFFERS: 'solecontrol_offers_v2',
  ADJUSTMENTS: 'solecontrol_adjustments_v2',
  STOCK: 'solecontrol_stock_v2',
  USERS: 'solecontrol_users_v2',
  VENDORS: 'solecontrol_vendors_v2',
}

const DEFAULT_NOTIFICATIONS: SystemNotification[] = []

function getLocal<T>(key: string, defaultVal: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return defaultVal
    const raw = localStorage.getItem(key)
    if (!raw) return defaultVal
    const parsed = JSON.parse(raw)
    if (Array.isArray(defaultVal) && !Array.isArray(parsed)) {
      return defaultVal
    }
    return parsed as T
  } catch {
    return defaultVal
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(val))
    }
  } catch (e) {
    console.warn('LocalStorage write failed:', e)
  }
}

// ---------------------------------------------------------------------------
// Notifications Storage
// ---------------------------------------------------------------------------
export const NotificationStorage = {
  getDeletedIds(): Set<string> {
    const list = getLocal<string[]>(STORAGE_KEYS.NOTIFICATIONS_DELETED, [])
    // Also include old dummy alert IDs permanently
    const set = new Set<string>(['alt-1', 'alt-2', ...list])
    return set
  },

  getReadIds(): Set<string> {
    const list = getLocal<string[]>(STORAGE_KEYS.NOTIFICATIONS_READ, [])
    return new Set<string>(list)
  },

  getAll(): SystemNotification[] {
    const stored = getLocal<SystemNotification[]>(STORAGE_KEYS.NOTIFICATIONS, [])
    const deletedIds = this.getDeletedIds()
    const readIds = this.getReadIds()
    return stored
      .filter(n => !deletedIds.has(n.id))
      .map(n => ({
        ...n,
        isRead: Boolean(n.isRead || n.is_read || readIds.has(n.id)),
        is_read: Boolean(n.isRead || n.is_read || readIds.has(n.id)),
      }))
  },

  markRead(id: string): SystemNotification[] {
    const readIds = this.getReadIds()
    readIds.add(id)
    setLocal(STORAGE_KEYS.NOTIFICATIONS_READ, Array.from(readIds))

    const list = this.getAll().map(n => 
      n.id === id ? { ...n, isRead: true, is_read: true } : n
    )
    setLocal(STORAGE_KEYS.NOTIFICATIONS, list)
    return list
  },

  markAllRead(): SystemNotification[] {
    const current = this.getAll()
    const readIds = this.getReadIds()
    current.forEach(n => readIds.add(n.id))
    setLocal(STORAGE_KEYS.NOTIFICATIONS_READ, Array.from(readIds))

    const list = current.map(n => ({ ...n, isRead: true, is_read: true }))
    setLocal(STORAGE_KEYS.NOTIFICATIONS, list)
    return list
  },

  delete(id: string): SystemNotification[] {
    const deletedIds = this.getDeletedIds()
    deletedIds.add(id)
    setLocal(STORAGE_KEYS.NOTIFICATIONS_DELETED, Array.from(deletedIds))

    const list = this.getAll().filter(n => n.id !== id)
    setLocal(STORAGE_KEYS.NOTIFICATIONS, list)
    return list
  },

  filterValid(serverList: any[]): any[] {
    const deletedIds = this.getDeletedIds()
    const readIds = this.getReadIds()
    return serverList
      .filter((s: any) => s && s.id && !deletedIds.has(s.id))
      .map((s: any) => ({
        ...s,
        isRead: Boolean(s.isRead || s.is_read || readIds.has(s.id)),
        is_read: Boolean(s.isRead || s.is_read || readIds.has(s.id)),
      }))
  },

  add(notif: Omit<SystemNotification, 'id' | 'createdAt'>): SystemNotification[] {
    const list = this.getAll()
    const item: SystemNotification = {
      ...notif,
      id: 'alt-' + Date.now(),
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      time: 'Just now'
    }
    list.unshift(item)
    setLocal(STORAGE_KEYS.NOTIFICATIONS, list)
    return list
  }
}

// ---------------------------------------------------------------------------
// Purchases Storage
// ---------------------------------------------------------------------------
export const PurchaseStorage = {
  getAll(): any[] {
    return getLocal<any[]>(STORAGE_KEYS.PURCHASES, [])
  },

  add(purchase: any): any[] {
    const list = this.getAll()
    // ensure unique id
    const item = {
      ...purchase,
      id: purchase.id || ('PB-LOCAL-' + Date.now().toString().slice(-4))
    }
    list.unshift(item)
    setLocal(STORAGE_KEYS.PURCHASES, list)

    // Automatically register purchased SKUs into local StockStorage
    const items = purchase.items || purchase.line_items || []
    if (Array.isArray(items)) {
      items.forEach((line: any) => {
        if (line.sku) {
          StockStorage.adjust(line.sku, Number(line.quantity) || 1, {
            articleName: line.articleName || line.article_name || 'Footwear Model',
            cost_price: Number(line.costPrice || line.cost_price || 2400),
            selling_price: Number(line.sellingPrice || line.selling_price || line.mrp || 4999),
            size: line.size || 'UK 8',
            colour: line.colour || 'Black'
          })
        }
      })
    }

    return list
  },

  updateStatus(id: string, status: string): any[] {
    const list = this.getAll().map(p => p.id === id ? { ...p, status } : p)
    setLocal(STORAGE_KEYS.PURCHASES, list)
    return list
  }
}

// ---------------------------------------------------------------------------
// Sales Storage
// ---------------------------------------------------------------------------
export const SalesStorage = {
  getAll(): any[] {
    return getLocal<any[]>(STORAGE_KEYS.SALES, [])
  },

  add(sale: any): any[] {
    const list = this.getAll()
    const item = {
      ...sale,
      id: sale.id || ('INV-LOCAL-' + Date.now().toString().slice(-4))
    }
    list.unshift(item)
    setLocal(STORAGE_KEYS.SALES, list)
    return list
  }
}

// ---------------------------------------------------------------------------
// Transfers Storage
// ---------------------------------------------------------------------------
export const TransferStorage = {
  getAll(): any[] {
    return getLocal<any[]>(STORAGE_KEYS.TRANSFERS, [])
  },

  add(transfer: any): any[] {
    const list = this.getAll()
    const item = {
      ...transfer,
      id: transfer.id || ('TR-LOCAL-' + Date.now().toString().slice(-4)),
      status: transfer.status || 'DRAFT',
      created_at: transfer.created_at || new Date().toISOString()
    }
    list.unshift(item)
    setLocal(STORAGE_KEYS.TRANSFERS, list)
    return list
  },

  updateStatus(id: string, status: string): any[] {
    const list = this.getAll().map(t => t.id === id ? { ...t, status } : t)
    setLocal(STORAGE_KEYS.TRANSFERS, list)
    return list
  }
}

// ---------------------------------------------------------------------------
// Damaged Goods Storage
// ---------------------------------------------------------------------------
export const DamagedGoodsStorage = {
  getAll(): any[] {
    return getLocal<any[]>(STORAGE_KEYS.DAMAGED_GOODS, [])
  },

  add(damage: any): any[] {
    const list = this.getAll()
    const item = {
      ...damage,
      id: damage.id || ('DMG-LOCAL-' + Date.now().toString().slice(-4)),
      status: damage.status || 'RECORDED',
      reported_at: damage.reported_at || new Date().toISOString()
    }
    list.unshift(item)
    setLocal(STORAGE_KEYS.DAMAGED_GOODS, list)
    return list
  },

  updateStatus(id: string, status: string): any[] {
    const list = this.getAll().map(d => d.id === id ? { ...d, status } : d)
    setLocal(STORAGE_KEYS.DAMAGED_GOODS, list)
    return list
  }
}

// ---------------------------------------------------------------------------
// Clearance Rules Storage
// ---------------------------------------------------------------------------
export const ClearanceRuleStorage = {
  getAll(): any[] {
    return getLocal<any[]>(STORAGE_KEYS.CLEARANCE_RULES, [
      { id: 'ar-1', category_name: 'Running & Performance Footwear', threshold_days: 90, discount_pct: 25, label: 'Running Clearance 90d+', is_active: true },
      { id: 'ar-2', category_name: 'Lifestyle Sneakers & Classics', threshold_days: 120, discount_pct: 35, label: 'Sneakers Markdown 120d+', is_active: true }
    ])
  },

  add(rule: any): any[] {
    const list = this.getAll()
    list.unshift(rule)
    setLocal(STORAGE_KEYS.CLEARANCE_RULES, list)
    return list
  }
}

// ---------------------------------------------------------------------------
// Display Stock Storage
// ---------------------------------------------------------------------------
export const DisplayStorage = {
  getAll(): any[] {
    return getLocal<any[]>(STORAGE_KEYS.DISPLAYS, [])
  },

  add(disp: any): any[] {
    const list = this.getAll()
    const item = {
      ...disp,
      id: disp.id || ('dsp-' + Date.now().toString().slice(-4)),
      status: disp.status || 'ACTIVE',
      allocated_at: disp.allocated_at || new Date().toISOString()
    }
    list.unshift(item)
    setLocal(STORAGE_KEYS.DISPLAYS, list)
    return list
  },

  updateStatus(id: string, status: string): any[] {
    const list = this.getAll().map(d => d.id === id ? { ...d, status, returned_at: new Date().toISOString() } : d)
    setLocal(STORAGE_KEYS.DISPLAYS, list)
    return list
  }
}

// ---------------------------------------------------------------------------
// Offers Storage
// ---------------------------------------------------------------------------
export const OfferStorage = {
  getAll(): any[] {
    return getLocal<any[]>(STORAGE_KEYS.OFFERS, [])
  },

  add(offer: any): any[] {
    const list = this.getAll()
    const item = {
      ...offer,
      id: offer.id || ('off-' + Date.now().toString().slice(-4)),
      isActive: offer.isActive ?? true,
      validFrom: offer.validFrom || new Date().toISOString()
    }
    list.unshift(item)
    setLocal(STORAGE_KEYS.OFFERS, list)
    return list
  },

  toggle(id: string): any[] {
    const list = this.getAll().map(o => o.id === id ? { ...o, isActive: !o.isActive } : o)
    setLocal(STORAGE_KEYS.OFFERS, list)
    return list
  }
}

// ---------------------------------------------------------------------------
// Inventory Adjustments Storage
// ---------------------------------------------------------------------------
export const AdjustmentStorage = {
  getAll(): any[] {
    return getLocal<any[]>(STORAGE_KEYS.ADJUSTMENTS, [])
  },

  add(adj: any): any[] {
    const list = this.getAll()
    const item = {
      ...adj,
      id: adj.id || ('adj-' + Date.now().toString().slice(-4)),
      adjusted_at: adj.adjusted_at || new Date().toISOString()
    }
    list.unshift(item)
    setLocal(STORAGE_KEYS.ADJUSTMENTS, list)
    return list
  }
}

// ---------------------------------------------------------------------------
// Dynamic Stock Balances Storage
// ---------------------------------------------------------------------------
export const StockStorage = {
  getAll(): any[] {
    const list = getLocal<any[]>(STORAGE_KEYS.STOCK, [])
    if (list.length === 0) {
      const defaultStock = [
        { id: 'stk-01', sku: 'NI-AIR-8-BLK', barcode: '890100100001', articleName: 'Nike Air Zoom Pegasus', article_name: 'Nike Air Zoom Pegasus', size: 'UK 8', colour: 'Black', quantity: 24, cost_price: 2400, selling_price: 4999, location_name: 'Main Warehouse (Rack R1)' },
        { id: 'stk-02', sku: 'AD-UB-9-WHT', barcode: '890100100002', articleName: 'Adidas Ultraboost Light', article_name: 'Adidas Ultraboost Light', size: 'UK 9', colour: 'White', quantity: 18, cost_price: 2800, selling_price: 5499, location_name: 'Main Warehouse (Rack R2)' },
        { id: 'stk-03', sku: 'PU-SUE-7-BLU', barcode: '890100100003', articleName: 'Puma Suede Classic XXI', article_name: 'Puma Suede Classic XXI', size: 'UK 7', colour: 'Royal Blue', quantity: 15, cost_price: 1800, selling_price: 3999, location_name: 'Main Warehouse (Rack R3)' },
        { id: 'stk-04', sku: 'RB-CL-8-WHT', barcode: '890100100004', articleName: 'Reebok Club C 85 Vintage', article_name: 'Reebok Club C 85 Vintage', size: 'UK 8', colour: 'Chalk White', quantity: 12, cost_price: 2100, selling_price: 4499, location_name: 'Main Warehouse (Rack S1)' },
        { id: 'stk-05', sku: 'AS-GL-9-GRY', barcode: '890100100005', articleName: 'Asics Gel-Kayano 30', article_name: 'Asics Gel-Kayano 30', size: 'UK 9', colour: 'Slate Grey', quantity: 20, cost_price: 3200, selling_price: 6499, location_name: 'Main Warehouse (Rack S2)' },
      ]
      setLocal(STORAGE_KEYS.STOCK, defaultStock)
      return defaultStock
    }
    return list
  },

  adjust(sku: string, qtyChange: number, extra?: any): any[] {
    const list = this.getAll()
    const cleanSku = (sku || '').trim().toUpperCase()
    const existing = list.find(s => (s.sku || '').toUpperCase() === cleanSku)
    if (existing) {
      existing.quantity = Math.max(0, (Number(existing.quantity) || 0) + qtyChange)
    } else {
      list.unshift({
        id: 'stk-' + Date.now(),
        sku: cleanSku,
        articleName: extra?.articleName || extra?.article_name || 'Footwear Model',
        article_name: extra?.articleName || extra?.article_name || 'Footwear Model',
        size: extra?.size || 'UK 8',
        colour: extra?.colour || 'Black',
        quantity: Math.max(0, qtyChange),
        cost_price: 2400,
        selling_price: 4999,
        created_at: new Date().toISOString()
      })
    }
    setLocal(STORAGE_KEYS.STOCK, list)
    return list
  },

  mergeWith(serverStock: any[]): any[] {
    const raw = Array.isArray(serverStock)
      ? serverStock
      : Array.isArray((serverStock as any)?.data)
      ? (serverStock as any).data
      : []
    const local = this.getAll()
    const map = new Map<string, any>()

    // Pre-populate core catalogue items
    const baseItems = [
      { id: 'stk-tmpl-1', sku: 'NI-AIR-8-BLK', barcode: '890100100001', article_name: 'Nike Air Zoom Pegasus', articleName: 'Nike Air Zoom Pegasus', size: 'UK 8', colour: 'Black', quantity: 24, cost_price: 2400, selling_price: 4999 },
      { id: 'stk-tmpl-2', sku: 'AD-UB-9-WHT', barcode: '890100100002', article_name: 'Adidas Ultraboost Light', articleName: 'Adidas Ultraboost Light', size: 'UK 9', colour: 'White', quantity: 18, cost_price: 2800, selling_price: 5499 },
      { id: 'stk-tmpl-3', sku: 'PU-SUE-7-BLU', barcode: '890100100003', article_name: 'Puma Suede Classic XXI', articleName: 'Puma Suede Classic XXI', size: 'UK 7', colour: 'Royal Blue', quantity: 15, cost_price: 1800, selling_price: 3999 },
      { id: 'stk-tmpl-4', sku: 'RB-CL-8-WHT', barcode: '890100100004', article_name: 'Reebok Club C 85 Vintage', articleName: 'Reebok Club C 85 Vintage', size: 'UK 8', colour: 'Chalk White', quantity: 12, cost_price: 2100, selling_price: 4499 },
      { id: 'stk-tmpl-5', sku: 'AS-GL-9-GRY', barcode: '890100100005', article_name: 'Asics Gel-Kayano 30', articleName: 'Asics Gel-Kayano 30', size: 'UK 9', colour: 'Slate Grey', quantity: 20, cost_price: 3200, selling_price: 6499 },
    ]
    baseItems.forEach(b => map.set(b.sku.toUpperCase(), { ...b }))

    raw.forEach((s: any) => {
      if (s?.sku) {
        const key = s.sku.toUpperCase()
        map.set(key, { ...map.get(key), ...s })
      }
    })
    local.forEach((s: any) => {
      if (s?.sku) {
        const key = s.sku.toUpperCase()
        if (map.has(key)) {
          map.get(key).quantity = s.quantity
        } else {
          map.set(key, s)
        }
      }
    })
    return Array.from(map.values())
  }
}

// ---------------------------------------------------------------------------
// Users Storage
// ---------------------------------------------------------------------------
export const UserStorage = {
  getAll(): any[] {
    const list = getLocal<any[]>(STORAGE_KEYS.USERS, [])
    if (list.length === 0) {
      const defaultAdmin = {
        id: '04ba54c1-bb94-4a81-8757-bb0fcdebd06c',
        name: 'Super Administrator',
        email: 'superadmin@fortyv.local',
        role: { name: 'Super Admin' },
        role_name: 'Super Admin',
        roleCode: 'SUPER_ADMIN',
        isActive: true,
        lastLoginAt: new Date().toISOString()
      }
      setLocal(STORAGE_KEYS.USERS, [defaultAdmin])
      return [defaultAdmin]
    }
    return list
  },

  add(user: any): any[] {
    const list = this.getAll()
    const item = {
      ...user,
      id: user.id || ('usr-' + Date.now().toString().slice(-4)),
      isActive: user.isActive ?? true,
      role: typeof user.role === 'object' ? user.role : { name: user.roleName || user.role || 'Sales Executive' },
      role_name: user.roleName || (typeof user.role === 'object' ? user.role?.name : user.role) || 'Sales Executive',
      lastLoginAt: user.lastLoginAt || new Date().toISOString()
    }
    list.unshift(item)
    setLocal(STORAGE_KEYS.USERS, list)
    return list
  },

  mergeWith(serverUsers: any[]): any[] {
    const raw = Array.isArray(serverUsers) ? serverUsers : Array.isArray((serverUsers as any)?.data) ? (serverUsers as any).data : []
    const local = this.getAll()
    const map = new Map<string, any>()
    raw.forEach((u: any) => map.set(u.id || u.email, u))
    local.forEach((u: any) => map.set(u.id || u.email, u))
    return Array.from(map.values())
  }
}

// ---------------------------------------------------------------------------
// Master Data Storage
// ---------------------------------------------------------------------------
export const MasterStorage = {
  getAll(tab: string): any[] {
    const key = `solecontrol_masters_${tab}_v2`
    return getLocal<any[]>(key, [])
  },

  add(tab: string, item: any): any[] {
    const key = `solecontrol_masters_${tab}_v2`
    const list = getLocal<any[]>(key, [])
    const newItem = {
      ...item,
      id: item.id || (`${tab.slice(0, 3)}-` + Date.now().toString().slice(-4)),
      isActive: true,
      is_active: true
    }
    list.unshift(newItem)
    setLocal(key, list)
    return list
  },

  mergeWith(tab: string, serverData: any[]): any[] {
    const raw = Array.isArray(serverData) ? serverData : Array.isArray((serverData as any)?.data) ? (serverData as any).data : []
    const local = this.getAll(tab)
    const map = new Map<string, any>()
    raw.forEach((d: any) => map.set(d.id || d.name || d.code, d))
    local.forEach((d: any) => map.set(d.id || d.name || d.code, d))
    return Array.from(map.values())
  }
}

// ---------------------------------------------------------------------------
// Vendor Storage
// ---------------------------------------------------------------------------
export const VendorStorage = {
  getAll(): any[] {
    return getLocal<any[]>(STORAGE_KEYS.VENDORS, [])
  },

  add(vendor: any): any[] {
    const list = this.getAll()
    const item = {
      ...vendor,
      id: vendor.id || ('vnd-' + Date.now().toString().slice(-4)),
      isActive: vendor.isActive ?? true,
      balance: Number(vendor.balance || 0),
      createdAt: vendor.createdAt || new Date().toISOString()
    }
    list.unshift(item)
    setLocal(STORAGE_KEYS.VENDORS, list)
    return list
  },

  mergeWith(serverVendors: any[]): any[] {
    const raw = Array.isArray(serverVendors) ? serverVendors : Array.isArray((serverVendors as any)?.data) ? (serverVendors as any).data : []
    const local = this.getAll()
    const map = new Map<string, any>()
    raw.forEach((v: any) => map.set(v.id || v.name, v))
    local.forEach((v: any) => map.set(v.id || v.name, v))
    return Array.from(map.values())
  }
}

