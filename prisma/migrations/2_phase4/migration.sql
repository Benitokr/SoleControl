-- Phase 4: Inventory operations
-- Using TEXT for enum-like fields (PGlite does not support dollar-quoting)

-- Stock Adjustments
CREATE TABLE IF NOT EXISTS "stock_adjustments" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "reference" TEXT,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'APPROVED',
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "stock_adjustments_store_status_idx" ON "stock_adjustments"("store_id", "status");

-- Stock Adjustment Items
CREATE TABLE IF NOT EXISTS "stock_adjustment_items" (
  "id" TEXT NOT NULL,
  "adjustment_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "before_qty" INTEGER NOT NULL DEFAULT 0,
  "after_qty" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "stock_adjustment_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "stock_adjustment_items_adj_idx" ON "stock_adjustment_items"("adjustment_id");

-- Stock Audit Sessions
CREATE TABLE IF NOT EXISTS "stock_audit_sessions" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "reference" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "snapshot_at" TIMESTAMP(3),
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_audit_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "stock_audit_sessions_store_idx" ON "stock_audit_sessions"("store_id", "status");

-- Stock Audit Lines
CREATE TABLE IF NOT EXISTS "stock_audit_lines" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "snapshot_qty" INTEGER NOT NULL DEFAULT 0,
  "counted_qty" INTEGER,
  "variance" INTEGER,
  CONSTRAINT "stock_audit_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "stock_audit_lines_session_idx" ON "stock_audit_lines"("session_id");

-- Display Allocations
CREATE TABLE IF NOT EXISTS "display_allocations" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "from_location_id" TEXT NOT NULL,
  "display_location_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "returned_qty" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "display_allocations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "display_allocations_store_idx" ON "display_allocations"("store_id", "status");

-- Stock Transfers
CREATE TABLE IF NOT EXISTS "stock_transfers" (
  "id" TEXT NOT NULL,
  "reference" TEXT,
  "from_store_id" TEXT NOT NULL,
  "to_store_id" TEXT NOT NULL,
  "from_location_id" TEXT,
  "to_location_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "requested_by" TEXT NOT NULL,
  "dispatched_by" TEXT,
  "dispatched_at" TIMESTAMP(3),
  "received_by" TEXT,
  "received_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "stock_transfers_status_idx" ON "stock_transfers"("status");

-- Stock Transfer Items
CREATE TABLE IF NOT EXISTS "stock_transfer_items" (
  "id" TEXT NOT NULL,
  "transfer_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "requested_qty" INTEGER NOT NULL DEFAULT 0,
  "dispatched_qty" INTEGER NOT NULL DEFAULT 0,
  "received_qty" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "stock_transfer_items_transfer_idx" ON "stock_transfer_items"("transfer_id");

-- Damage Records
CREATE TABLE IF NOT EXISTS "damage_records" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'REPORTED',
  "description" TEXT,
  "photo_url" TEXT,
  "repair_due_date" DATE,
  "written_off_value" DECIMAL(14,2),
  "written_off_account" TEXT,
  "approved_by" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "damage_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "damage_records_store_status_idx" ON "damage_records"("store_id", "status");

-- Damage Events (lifecycle audit trail)
CREATE TABLE IF NOT EXISTS "damage_events" (
  "id" TEXT NOT NULL,
  "damage_id" TEXT NOT NULL,
  "from_status" TEXT,
  "to_status" TEXT NOT NULL,
  "notes" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "damage_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "damage_events_damage_idx" ON "damage_events"("damage_id");

-- Ageing Rules
CREATE TABLE IF NOT EXISTS "ageing_rules" (
  "id" TEXT NOT NULL,
  "category_id" TEXT,
  "threshold_days" INTEGER NOT NULL,
  "discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "label" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ageing_rules_pkey" PRIMARY KEY ("id")
);

-- Clearance Recommendations
CREATE TABLE IF NOT EXISTS "clearance_recommendations" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "location_id" TEXT,
  "age_days" INTEGER NOT NULL,
  "current_qty" INTEGER NOT NULL,
  "suggested_discount_pct" DECIMAL(5,2),
  "rationale" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clearance_recommendations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "clearance_recs_store_status_idx" ON "clearance_recommendations"("store_id", "status");

-- Clearance Movements
CREATE TABLE IF NOT EXISTS "clearance_movements" (
  "id" TEXT NOT NULL,
  "recommendation_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "location_id" TEXT,
  "quantity" INTEGER NOT NULL,
  "discount_pct" DECIMAL(5,2) NOT NULL,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clearance_movements_pkey" PRIMARY KEY ("id")
);

