import { initDatabase } from '../apps/api/src/lib/db.js';
import { prisma } from '../apps/api/src/lib/prisma.js';
import bcrypt from 'bcrypt';
import { getAllPermissionKeys, MODULE_METADATA } from '../packages/shared/dist/index.js';

async function seed() {
  await initDatabase();
  console.log('--- SoleControl System Seed Starting ---');

  // 1. Seed Store
  const store = await prisma.store.upsert({
    where: { code: 'STORE-01' },
    update: {},
    create: {
      code: 'STORE-01',
      name: 'Forty V Flagship - Coimbatore',
      address: '155, Balaji Nagar, IOB Colony, BU Post, CBE - 46',
      gstin: '33AAAAA0000A1Z5',
      isActive: true
    }
  });
  console.log(`✓ Store seeded: ${store.name} (${store.code})`);

  // 2. Seed Permissions
  const allPermissionKeys = getAllPermissionKeys();
  const permissions = [];
  for (const key of allPermissionKeys) {
    const [module, action] = key.split('.');
    const modMeta = MODULE_METADATA[module as keyof typeof MODULE_METADATA];
    const p = await prisma.permission.upsert({
      where: { key },
      update: {
        description: `Can ${action} ${modMeta?.label || module}`
      },
      create: {
        key,
        module,
        action,
        description: `Can ${action} ${modMeta?.label || module}`
      }
    });
    permissions.push(p);
  }
  console.log(`✓ Permissions seeded: ${permissions.length} total permissions`);

  // 3. Seed Roles
  const superAdminRole = await prisma.role.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: { isSystem: true },
    create: {
      code: 'SUPER_ADMIN',
      name: 'Super Admin',
      description: 'Unrestricted system owner with complete administrative access',
      isSystem: true
    }
  });

  const administratorRole = await prisma.role.upsert({
    where: { code: 'ADMINISTRATOR' },
    update: { isSystem: true },
    create: {
      code: 'ADMINISTRATOR',
      name: 'Administrator',
      description: 'Operations administrator with store management and workflow capabilities',
      isSystem: true
    }
  });

  const managementRole = await prisma.role.upsert({
    where: { code: 'MANAGEMENT' },
    update: { isSystem: true },
    create: {
      code: 'MANAGEMENT',
      name: 'Management',
      description: 'Executive oversight, KPI monitoring, approval workflows, and business reports',
      isSystem: true
    }
  });

  const salesExecutiveRole = await prisma.role.upsert({
    where: { code: 'SALES_EXECUTIVE' },
    update: { isSystem: true },
    create: {
      code: 'SALES_EXECUTIVE',
      name: 'Sales Executive',
      description: 'Floor sales, customer service, barcode scanning, and billing',
      isSystem: true
    }
  });

  const accountsUserRole = await prisma.role.upsert({
    where: { code: 'ACCOUNTS_USER' },
    update: { isSystem: true },
    create: {
      code: 'ACCOUNTS_USER',
      name: 'Accounts User',
      description: 'Accounting ledger entry, bank reconciliation, vendor payables, and GST',
      isSystem: true
    }
  });

  const inventoryUserRole = await prisma.role.upsert({
    where: { code: 'INVENTORY_USER' },
    update: { isSystem: true },
    create: {
      code: 'INVENTORY_USER',
      name: 'Inventory User',
      description: 'Stock receipt, rack management, display allocation, transfers, and damages',
      isSystem: true
    }
  });

  // Assign permissions to roles
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: perm.id
        }
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: perm.id
      }
    });

    if (!perm.key.startsWith('audit.delete')) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: administratorRole.id,
            permissionId: perm.id
          }
        },
        update: {},
        create: {
          roleId: administratorRole.id,
          permissionId: perm.id
        }
      });
    }

    if (perm.action === 'view' || perm.action === 'export' || perm.action === 'approve') {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: managementRole.id,
            permissionId: perm.id
          }
        },
        update: {},
        create: {
          roleId: managementRole.id,
          permissionId: perm.id
        }
      });
    }
  }

  // 4. Seed Super Admin User
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'superadmin@fortyv.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@123';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      roleId: superAdminRole.id,
      status: 'ACTIVE'
    },
    create: {
      name: 'Super Administrator',
      email: adminEmail,
      phone: '+91 98765 00000',
      passwordHash,
      status: 'ACTIVE',
      mustChangePassword: true,
      roleId: superAdminRole.id
    }
  });

  await prisma.userLocation.upsert({
    where: {
      userId_storeId: {
        userId: superAdmin.id,
        storeId: store.id
      }
    },
    update: {},
    create: {
      userId: superAdmin.id,
      storeId: store.id
    }
  });

  console.log(`✓ Super Admin seeded: ${superAdmin.email} (Role: SUPER_ADMIN)`);

  // 5. Seed Company Profile
  await prisma.companyProfile.upsert({
    where: { id: 'default-profile' },
    update: {},
    create: {
      id: 'default-profile',
      legalName: 'Forty V Footwear Private Limited',
      tradeName: 'SoleControl Retail',
      address: '155, Balaji Nagar, IOB Colony, BU Post, CBE - 46',
      phone: '+91 98765 43210',
      email: 'admin@fortyv.local',
      gstin: '33AAAAA0000A1Z5'
    }
  });

  // 6. Seed Current Financial Year
  await prisma.financialYear.upsert({
    where: { code: 'FY2026-27' },
    update: {},
    create: {
      code: 'FY2026-27',
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T23:59:59.999Z'),
      isCurrent: true,
      isClosed: false
    }
  });

  // 7. Seed Document Series
  const series = [
    { type: 'SALE_INVOICE', prefix: 'INV-26-' },
    { type: 'PURCHASE_BILL', prefix: 'PUR-26-' },
    { type: 'STOCK_TRANSFER', prefix: 'TRN-26-' },
    { type: 'STOCK_ADJUSTMENT', prefix: 'ADJ-26-' },
    { type: 'STOCK_AUDIT', prefix: 'AUD-26-' },
    { type: 'DAMAGE_RECORD', prefix: 'DAM-26-' }
  ];

  for (const s of series) {
    await prisma.documentSeries.upsert({
      where: {
        storeId_type: {
          storeId: store.id,
          type: s.type
        }
      },
      update: {},
      create: {
        storeId: store.id,
        type: s.type,
        prefix: s.prefix,
        currentNumber: 1000
      }
    });
  }

  // 8. Seed Default Config Settings (Rule A9 & Open Questions)
  const defaultSettings = [
    { key: 'sales.admin_entry_enabled', value: true, category: 'sales', description: 'Enable Super Admin to record new sales invoices and receipts directly' },
    { key: 'accounting.gst_include_class_b', value: false, category: 'accounting', description: 'Include Class B (non-GST) purchases in official GST compliance registers' },
    { key: 'purchases.landed_cost_allocation_method', value: 'VALUE', category: 'purchases', description: 'Landed cost allocation method across purchase bill items (VALUE, QUANTITY, EQUAL)' },
    { key: 'inventory.valuation_method', value: 'WEIGHTED_AVERAGE', category: 'inventory', description: 'Inventory valuation formula for COGS (WEIGHTED_AVERAGE, FIFO)' },
    { key: 'inventory.audit_cycle_days', value: 60, category: 'inventory', description: 'Mandatory rack audit verification cycle in days' },
    { key: 'barcode.label_price_encoding', value: 'PLAIN', category: 'barcodes', description: 'Cost cipher scheme printed on thermal barcode tags' }
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: {
        key: s.key,
        value: s.value,
        category: s.category,
        description: s.description
      }
    });
  }

  console.log('✓ System configuration settings seeded');
  console.log('--- SoleControl System Seed Completed Successfully ---');
}

seed().catch(console.error);

