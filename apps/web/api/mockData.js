export const DB = {
  "brands": [
    {
      "id": "2b502ab6-c4a6-4d82-b167-d50befa972db",
      "code": "NIKE",
      "name": "Nike",
      "is_active": true,
      "created_at": "2026-11-24T14:10:29.596Z"
    },
    {
      "id": "570d2873-b24a-4d46-b65e-061a55d05423",
      "code": "ADIDAS",
      "name": "Adidas",
      "is_active": true,
      "created_at": "2026-11-24T14:10:29.611Z"
    },
    {
      "id": "4da26776-1892-4bc9-9af4-c2fa513054a9",
      "code": "PUMA",
      "name": "Puma",
      "is_active": true,
      "created_at": "2026-11-24T14:10:29.611Z"
    },
    {
      "id": "268553b8-6af4-4512-b3cb-9561a5f40791",
      "code": "SKECH",
      "name": "Skechers",
      "is_active": true,
      "created_at": "2026-11-24T14:10:29.611Z"
    },
    {
      "id": "f33fdb2e-3fb0-494d-a31d-5abd4edb3c62",
      "code": "RBK",
      "name": "Reebok",
      "is_active": true,
      "created_at": "2026-11-24T14:10:29.611Z"
    },
    {
      "id": "2a27d6be-f9f2-4608-b12e-74e29cf67f11",
      "code": "BATA",
      "name": "Bata Red Label",
      "is_active": true,
      "created_at": "2026-11-24T14:10:29.611Z"
    }
  ],
  "categories": [
    {
      "id": "fc8c4215-3a8b-4fc0-90dd-d26fff993ceb",
      "code": "CAT-RUN",
      "name": "Road Running",
      "gender": "UNISEX",
      "is_active": true
    },
    {
      "id": "31f19064-d64a-4510-a928-da6441ae1bc8",
      "code": "CAT-SNK",
      "name": "Lifestyle Sneakers",
      "gender": "UNISEX",
      "is_active": true
    },
    {
      "id": "92892edd-7daf-4a12-a995-12b3d2090c6b",
      "code": "CAT-FOR",
      "name": "Leather Formals",
      "gender": "UNISEX",
      "is_active": true
    },
    {
      "id": "f0283e59-ebc6-4d9d-b565-33c97412b41e",
      "code": "CAT-WLK",
      "name": "Comfort Walking",
      "gender": "UNISEX",
      "is_active": true
    }
  ],
  "sizes": [
    {
      "id": "1d289123-e839-40b2-995b-f253cd26a5c9",
      "code": "UK-6",
      "name": "UK 6",
      "system": "UK",
      "sequence": 1,
      "is_active": true
    },
    {
      "id": "515b9cc2-9257-412c-a5ad-7450aec80cb3",
      "code": "UK-7",
      "name": "UK 7",
      "system": "UK",
      "sequence": 2,
      "is_active": true
    },
    {
      "id": "e1321ef1-59ce-46e4-95dd-72ba52f10044",
      "code": "UK-8",
      "name": "UK 8",
      "system": "UK",
      "sequence": 3,
      "is_active": true
    },
    {
      "id": "9c3a890a-4175-4600-a802-12b73c5a91d3",
      "code": "UK-9",
      "name": "UK 9",
      "system": "UK",
      "sequence": 4,
      "is_active": true
    },
    {
      "id": "71110d38-bec9-420a-8afb-b3bbd1f833d1",
      "code": "UK-10",
      "name": "UK 10",
      "system": "UK",
      "sequence": 5,
      "is_active": true
    },
    {
      "id": "f521fe1f-33d0-4f07-a83d-766eec9b9f75",
      "code": "UK-11",
      "name": "UK 11",
      "system": "UK",
      "sequence": 6,
      "is_active": true
    }
  ],
  "colours": [
    {
      "id": "68fe5660-7f46-484b-a50d-a404e4e80633",
      "code": "BLK",
      "name": "Triple Black",
      "hex_code": "#111827",
      "is_active": true
    },
    {
      "id": "9ce80257-131b-4dcf-8737-561623b30756",
      "code": "WHT",
      "name": "Summit White",
      "hex_code": "#F9FAFB",
      "is_active": true
    },
    {
      "id": "2c23c9f2-f297-4bc8-9e55-1d7211d00046",
      "code": "NVY",
      "name": "Midnight Navy",
      "hex_code": "#1E3A8A",
      "is_active": true
    },
    {
      "id": "dfaa7317-1194-41a0-9896-761f59a1e2bd",
      "code": "RED",
      "name": "University Red",
      "hex_code": "#DC2626",
      "is_active": true
    }
  ],
  "roles": [
    {
      "id": "super-admin-role",
      "code": "SUPER_ADMIN",
      "name": "Super Admin",
      "isSystem": true,
      "is_system": true,
      "description": "Unrestricted enterprise owner"
    },
    {
      "id": "administrator-role",
      "code": "ADMINISTRATOR",
      "name": "Administrator",
      "isSystem": true,
      "is_system": true,
      "description": "Store manager operational administration"
    },
    {
      "id": "management-role",
      "code": "MANAGEMENT",
      "name": "Management",
      "isSystem": true,
      "is_system": true,
      "description": "Executive analytics & audit"
    },
    {
      "id": "sales-role",
      "code": "SALES_EXECUTIVE",
      "name": "Sales Executive",
      "isSystem": true,
      "is_system": true,
      "description": "POS billing & customer management"
    },
    {
      "id": "accounts-role",
      "code": "ACCOUNTS_USER",
      "name": "Accounts User",
      "isSystem": true,
      "is_system": true,
      "description": "Financial ledgers, payments & GST"
    },
    {
      "id": "inventory-role",
      "code": "INVENTORY_USER",
      "name": "Inventory User",
      "isSystem": true,
      "is_system": true,
      "description": "Stock, barcode & warehouse management"
    }
  ],
  "users": [
    {
      "id": "04ba54c1-bb94-4a81-8757-bb0fcdebd06c",
      "name": "Super Administrator",
      "email": "superadmin@fortyv.local",
      "role_id": "super-admin-role",
      "roleName": "Super Admin",
      "roleCode": "SUPER_ADMIN",
      "isActive": true,
      "is_active": true,
      "created_at": "2026-11-24T14:10:29.611Z"
    }
  ],
  "stores": [
    {
      "id": "addac467-9344-4786-9a92-1b5855402c25",
      "code": "STORE-01",
      "name": "Central Retail Flagship",
      "address": "155 Balaji Nagar, CBE - 46",
      "gstin": "33AABCF4050M1Z2",
      "isActive": true,
      "is_active": true
    }
  ],
  "locations": [
    {
      "id": "loc-floor-1",
      "name": "Ground Retail Floor",
      "type": "FLOOR",
      "store_id": "addac467-9344-4786-9a92-1b5855402c25",
      "parent_id": null
    },
    {
      "id": "loc-dept-shoes",
      "name": "Footwear & Athletic Department",
      "type": "DEPARTMENT",
      "store_id": "addac467-9344-4786-9a92-1b5855402c25",
      "parent_id": "loc-floor-1"
    },
    {
      "id": "loc-rack-1",
      "name": "Warehouse Rack R1 (Running)",
      "type": "RACK",
      "store_id": "addac467-9344-4786-9a92-1b5855402c25",
      "parent_id": "loc-dept-shoes"
    },
    {
      "id": "loc-rack-2",
      "name": "Warehouse Rack R2 (Sneakers)",
      "type": "RACK",
      "store_id": "addac467-9344-4786-9a92-1b5855402c25",
      "parent_id": "loc-dept-shoes"
    },
    {
      "id": "loc-rack-3",
      "name": "Warehouse Rack R3 (Formals)",
      "type": "RACK",
      "store_id": "addac467-9344-4786-9a92-1b5855402c25",
      "parent_id": "loc-dept-shoes"
    },
    {
      "id": "loc-rack-4",
      "name": "Display Window Rack (Showcase)",
      "type": "RACK",
      "store_id": "addac467-9344-4786-9a92-1b5855402c25",
      "parent_id": "loc-dept-shoes"
    }
  ],
  "accounts": [
    {
      "id": "acc-1110",
      "code": "1110",
      "name": "HDFC Corporate Current A/c",
      "type": "ASSET",
      "balance": 0
    },
    {
      "id": "acc-1120",
      "code": "1120",
      "name": "Store POS Cash Register",
      "type": "ASSET",
      "balance": 0
    },
    {
      "id": "acc-1300",
      "code": "1300",
      "name": "Footwear Merchandise Inventory",
      "type": "ASSET",
      "balance": 0
    },
    {
      "id": "acc-2100",
      "code": "2100",
      "name": "Trade Payables - Footwear Vendors",
      "type": "LIABILITY",
      "balance": 0
    },
    {
      "id": "acc-2210",
      "code": "2210",
      "name": "Input CGST 6%",
      "type": "ASSET",
      "balance": 0
    },
    {
      "id": "acc-2220",
      "code": "2220",
      "name": "Input SGST 6%",
      "type": "ASSET",
      "balance": 0
    },
    {
      "id": "acc-2230",
      "code": "2230",
      "name": "Output CGST 6%",
      "type": "LIABILITY",
      "balance": 0
    },
    {
      "id": "acc-2240",
      "code": "2240",
      "name": "Output SGST 6%",
      "type": "LIABILITY",
      "balance": 0
    },
    {
      "id": "acc-3000",
      "code": "3000",
      "name": "Partner Equity Capital",
      "type": "EQUITY",
      "balance": 0
    },
    {
      "id": "acc-4000",
      "code": "4000",
      "name": "Footwear Sales Revenue",
      "type": "REVENUE",
      "balance": 0
    }
  ],
  "bankAccounts": [
    {
      "id": "bank-01",
      "name": "HDFC Commercial Current A/c",
      "accountNumber": "50200088991122",
      "account_number": "50200088991122",
      "ifsc": "HDFC0001234",
      "bankName": "HDFC Bank Ltd",
      "bank_name": "HDFC Bank Ltd",
      "balance": 0,
      "current_balance": 0,
      "opening_balance": 0
    }
  ],
  "articles": [],
  "variants": [],
  "vendors": [],
  "customers": [],
  "purchases": [],
  "sales": [],
  "transfers": [],
  "displays": [],
  "damages": [],
  "bankLines": [],
  "capitalEntries": [],
  "withdrawals": [],
  "auditLogs": [],
  "balances": [],
  "offers": [],
  "alertRules": [
    {
      "id": "ar-01",
      "name": "Critical Stockout Threshold",
      "condition": "STOCK_BELOW",
      "threshold": 5,
      "severity": "DANGER",
      "is_active": true
    },
    {
      "id": "ar-02",
      "name": "Deadstock Ageing Alert",
      "condition": "AGE_OVER_DAYS",
      "threshold": 90,
      "severity": "WARNING",
      "is_active": true
    },
    {
      "id": "ar-03",
      "name": "Large Cash Transaction Audit",
      "condition": "CASH_SALE_OVER",
      "threshold": 20000,
      "severity": "INFO",
      "is_active": true
    }
  ]
};
