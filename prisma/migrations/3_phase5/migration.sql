-- Phase 5: Customers, Sales, Offers
-- Using TEXT for enum-like fields (PGlite compatibility)

-- Customers
CREATE TABLE IF NOT EXISTS "customers" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "gstin" TEXT,
  "credit_limit" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "credit_outstanding" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "lifetime_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers"("phone");
CREATE INDEX IF NOT EXISTS "customers_email_idx" ON "customers"("email");

-- Customer Communications
CREATE TABLE IF NOT EXISTS "customer_communications" (
  "id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'NOTE',
  "message" TEXT NOT NULL,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_communications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "customer_comms_customer_idx" ON "customer_communications"("customer_id");

-- Offers
CREATE TABLE IF NOT EXISTS "offers" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "scope_type" TEXT NOT NULL DEFAULT 'ALL',
  "scope_id" TEXT,
  "discount_type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
  "discount_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "buy_x" INTEGER,
  "get_y" INTEGER,
  "min_qty" INTEGER NOT NULL DEFAULT 1,
  "min_amount" DECIMAL(14,2),
  "priority" INTEGER NOT NULL DEFAULT 0,
  "valid_from" DATE NOT NULL,
  "valid_until" DATE,
  "store_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "offers_active_valid_idx" ON "offers"("is_active", "valid_from");

-- Sales
CREATE TABLE IF NOT EXISTS "sales" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "document_number" TEXT,
  "customer_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "class" TEXT NOT NULL DEFAULT 'CLASS_A',
  "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "credit_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_by" TEXT NOT NULL,
  "voided_at" TIMESTAMP(3),
  "voided_by" TEXT,
  "void_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "sales_store_date_idx" ON "sales"("store_id", "created_at");
CREATE INDEX IF NOT EXISTS "sales_customer_idx" ON "sales"("customer_id");
CREATE INDEX IF NOT EXISTS "sales_document_idx" ON "sales"("document_number");

-- Sale Items
CREATE TABLE IF NOT EXISTS "sale_items" (
  "id" TEXT NOT NULL,
  "sale_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "mrp" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "selling_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "offer_id" TEXT,
  CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "sale_items_sale_idx" ON "sale_items"("sale_id");
CREATE INDEX IF NOT EXISTS "sale_items_variant_idx" ON "sale_items"("variant_id");

-- Sale Payments
CREATE TABLE IF NOT EXISTS "sale_payments" (
  "id" TEXT NOT NULL,
  "sale_id" TEXT NOT NULL,
  "payment_mode" TEXT NOT NULL DEFAULT 'CASH',
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "reference" TEXT,
  CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "sale_payments_sale_idx" ON "sale_payments"("sale_id");

-- Sale Returns
CREATE TABLE IF NOT EXISTS "sale_returns" (
  "id" TEXT NOT NULL,
  "sale_id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "document_number" TEXT,
  "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "refund_mode" TEXT NOT NULL DEFAULT 'CASH',
  "notes" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sale_returns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "sale_returns_sale_idx" ON "sale_returns"("sale_id");

-- Sale Return Items
CREATE TABLE IF NOT EXISTS "sale_return_items" (
  "id" TEXT NOT NULL,
  "return_id" TEXT NOT NULL,
  "sale_item_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  CONSTRAINT "sale_return_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "sale_return_items_return_idx" ON "sale_return_items"("return_id");

-- Offer Redemptions
CREATE TABLE IF NOT EXISTS "offer_redemptions" (
  "id" TEXT NOT NULL,
  "offer_id" TEXT NOT NULL,
  "sale_id" TEXT NOT NULL,
  "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offer_redemptions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "offer_redemptions_offer_idx" ON "offer_redemptions"("offer_id");
CREATE INDEX IF NOT EXISTS "offer_redemptions_sale_idx" ON "offer_redemptions"("sale_id");

