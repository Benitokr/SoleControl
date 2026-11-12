-- Gate tests hardening migration

CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT UNIQUE,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "purchase_expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchase_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "purchase_attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchase_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "purchase_returns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchase_id" TEXT NOT NULL,
    "doc_number" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "bank_reconciliations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bank_account_id" TEXT NOT NULL,
    "statement_line_id" TEXT,
    "matched_type" TEXT,
    "matched_id" TEXT,
    "notes" TEXT,
    "reconciled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime_type" TEXT,
    "size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "print_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "template_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "copies" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "payment_mode" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entity_type" TEXT;
UPDATE "audit_logs" SET "entity_type" = "entity" WHERE "entity_type" IS NULL;

-- Vendors table
CREATE TABLE IF NOT EXISTS "vendors" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "contact_person" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "gstin" TEXT,
  "pan" TEXT,
  "address" TEXT,
  "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payment Receipts table
CREATE TABLE IF NOT EXISTS "payment_receipts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "store_id" TEXT,
  "party_type" TEXT NOT NULL DEFAULT 'VENDOR',
  "party_id" TEXT,
  "doc_number" TEXT,
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "mode" TEXT DEFAULT 'CASH',
  "reference" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entries columns
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'MANUAL';
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'POSTED';
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "total_debit" DECIMAL(14,2) DEFAULT 0;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "total_credit" DECIMAL(14,2) DEFAULT 0;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "posted_by" TEXT;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "posted_at" TIMESTAMP(3);
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "created_by" TEXT;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Journal Lines columns
ALTER TABLE "journal_lines" ADD COLUMN IF NOT EXISTS "entry_id" TEXT;
ALTER TABLE "journal_lines" ADD COLUMN IF NOT EXISTS "account_id" TEXT;
ALTER TABLE "journal_lines" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'DEBIT';
ALTER TABLE "journal_lines" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(14,2) DEFAULT 0;
UPDATE "journal_lines" SET "entry_id" = "journal_entry_id" WHERE "entry_id" IS NULL;

-- Core Chart of Accounts seed
INSERT INTO "accounts" ("id", "code", "name", "type", "is_active", "created_at", "updated_at")
VALUES 
  ('acc-1000', '1000', 'Cash on Hand', 'ASSET', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('acc-1300', '1300', 'Stock on Hand', 'ASSET', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('acc-2000', '2000', 'Accounts Payable', 'LIABILITY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('acc-3000', '3000', 'Capital Account', 'EQUITY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('acc-4000', '4000', 'Sales Revenue', 'REVENUE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- Sales Targets table
CREATE TABLE IF NOT EXISTS "sales_targets" (
  "id" TEXT PRIMARY KEY,
  "store_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "target_amount" DECIMAL(14,2) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
