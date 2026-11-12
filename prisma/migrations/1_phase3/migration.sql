-- Phase 3: Vendors, Purchases, Stock Core, Barcodes
-- Using TEXT for enum-like fields since PGlite doesn't support dollar-quoting

-- Vendors (already created above)

-- Purchases (using TEXT for status/class instead of enum)
CREATE TABLE IF NOT EXISTS "purchases" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "bill_number" TEXT,
  "document_number" TEXT,
  "bill_date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "received_date" DATE,
  "class" TEXT NOT NULL DEFAULT 'CLASS_A',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "freight" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "packaging" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "other_expenses" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "landed_cost_method" TEXT NOT NULL DEFAULT 'VALUE',
  "notes" TEXT,
  "bill_image_url" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "finalised_at" TIMESTAMP(3),
  "finalised_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "purchases_store_id_status_idx" ON "purchases"("store_id", "status");
CREATE INDEX IF NOT EXISTS "purchases_vendor_id_idx" ON "purchases"("vendor_id");
CREATE INDEX IF NOT EXISTS "purchases_bill_date_idx" ON "purchases"("bill_date");

-- Purchase Items
CREATE TABLE IF NOT EXISTS "purchase_items" (
  "id" TEXT NOT NULL,
  "purchase_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "cost_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "mrp" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "selling_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "landed_cost_allocated" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "effective_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "rack_location_id" TEXT,
  CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "purchase_items_purchase_id_idx" ON "purchase_items"("purchase_id");

-- Stock Balances
CREATE TABLE IF NOT EXISTS "stock_balances" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "location_id" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stock_balances_variant_id_idx" ON "stock_balances"("variant_id");
CREATE INDEX IF NOT EXISTS "stock_balances_store_variant_idx" ON "stock_balances"("store_id", "variant_id");

-- Stock Movements (append-only)
CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "location_id" TEXT,
  "type" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reference_type" TEXT,
  "reference_id" TEXT,
  "note" TEXT,
  "actor_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stock_movements_variant_id_idx" ON "stock_movements"("variant_id");
CREATE INDEX IF NOT EXISTS "stock_movements_store_id_created_at_idx" ON "stock_movements"("store_id", "created_at");

-- Barcode Labels
CREATE TABLE IF NOT EXISTS "barcode_labels" (
  "id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "template_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "print_job_id" TEXT,
  "reference_type" TEXT,
  "reference_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "barcode_labels_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "barcode_labels_variant_id_idx" ON "barcode_labels"("variant_id");
CREATE INDEX IF NOT EXISTS "barcode_labels_status_idx" ON "barcode_labels"("status");

-- Label Templates
CREATE TABLE IF NOT EXISTS "label_templates" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "width_mm" DECIMAL(5,2) NOT NULL DEFAULT 50,
  "height_mm" DECIMAL(5,2) NOT NULL DEFAULT 25,
  "fields" JSONB NOT NULL DEFAULT '[]',
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "label_templates_pkey" PRIMARY KEY ("id")
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS "journal_entries" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "reference_type" TEXT NOT NULL,
  "reference_id" TEXT NOT NULL,
  "description" TEXT,
  "is_posted" BOOLEAN NOT NULL DEFAULT true,
  "is_reversed" BOOLEAN NOT NULL DEFAULT false,
  "reversal_of" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "journal_entries_reference_idx" ON "journal_entries"("reference_type", "reference_id");

-- Journal Lines
CREATE TABLE IF NOT EXISTS "journal_lines" (
  "id" TEXT NOT NULL,
  "journal_entry_id" TEXT NOT NULL,
  "account_code" TEXT NOT NULL,
  "account_name" TEXT NOT NULL,
  "debit" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "description" TEXT,
  CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "journal_lines_journal_entry_id_idx" ON "journal_lines"("journal_entry_id");
