# SoleControl — Entity-Relationship (ER) Specification

## 1. Overview
The database schema consists of **56 relational tables** organized into functional domains. All money attributes use `DECIMAL(14,2)` or `NUMERIC(14,2)`, quantities use `INTEGER`, timestamps use `TIMESTAMPTZ`, and all operational records carry a `store_id` foreign key.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CORE DOMAIN MAP                                 │
└─────────────────────────────────────────────────────────────────────────────┘
  [Company / Stores] ──< [Locations Tree] ──< [Stock Balances] >── [Variants]
           │                                          │                 │
           ├──< [Purchases] ──> [Vendors]             │                 ├── [Articles]
           │         │                                │                 ├── [Sizes]
           │         └──> [Stock Movements] (append) ─┘                 └── [Colours]
           │                      ▲
           ├──< [Sales] ──> [Customers]
           │         │            │
           │         └──> [Journals] (Dr/Cr)
           │                      │
           └──< [Capital / Bank / GST]
```

---

## 2. Domain Entities & Schemas

### 2.1 Identity, Access & Auth
- **`users`**: `id`, `name`, `email`, `password_hash`, `role_id`, `status` (`ACTIVE`/`INACTIVE`/`LOCKED`), `failed_login_attempts`, `locked_until`, `last_login_at`, `created_at`, `updated_at`.
- **`roles`**: `id`, `name`, `code` (`SUPER_ADMIN`, `ADMINISTRATOR`, etc.), `description`, `is_system`, `created_at`, `updated_at`.
- **`permissions`**: `id`, `module`, `action`, `code` (e.g., `inventory.view`, `sales.create`), `description`.
- **`role_permissions`**: `role_id`, `permission_id` *(composite PK)*.
- **`user_locations`**: `user_id`, `store_id` *(composite PK)*.
- **`user_sessions`**: `id`, `user_id`, `refresh_token_hash`, `ip_address`, `user_agent`, `expires_at`, `revoked_at`, `created_at`.
- **`login_events`**: `id`, `user_id`, `email`, `success`, `ip_address`, `user_agent`, `failure_reason`, `created_at`.

### 2.2 Organization & System Settings
- **`company_profile`**: `id`, `name`, `legal_name`, `gstin`, `pan`, `email`, `phone`, `address`, `logo_url`, `currency`, `created_at`, `updated_at`.
- **`stores`**: `id`, `name`, `code`, `address`, `gstin`, `phone`, `email`, `is_active`, `created_at`, `updated_at`.
- **`settings`**: `id`, `key`, `value`, `description`, `group`, `is_public`, `created_at`, `updated_at`.
- **`financial_years`**: `id`, `name`, `start_date`, `end_date`, `is_active`, `is_locked`, `created_at`, `updated_at`.
- **`document_series`**: `id`, `store_id`, `type` (`PURCHASE`, `SALE`, `TRANSFER`, etc.), `prefix`, `next_number`, `padding`, `fiscal_year_id`.
- **`tax_rates`**: `id`, `name`, `rate`, `hsn_code`, `is_active`, `created_at`.

### 2.3 Product Catalogue & Locations
- **`brands`**: `id`, `name`, `code`, `is_active`, `created_at`, `updated_at`.
- **`categories`**: `id`, `name`, `code`, `parent_id`, `is_active`, `created_at`, `updated_at`.
- **`products`**: `id`, `category_id`, `brand_id`, `name`, `description`, `gender`, `hsn_code`, `created_at`, `updated_at`.
- **`articles`**: `id`, `product_id`, `name`, `code`, `style_code`, `created_at`, `updated_at`.
- **`sizes`**: `id`, `name`, `sort_order`, `is_active`.
- **`colours`**: `id`, `name`, `hex`, `is_active`.
- **`product_variants`**: `id`, `article_id`, `size_id`, `colour_id`, `sku` *(unique)*, `barcode` *(unique)*, `cost`, `selling_price`, `mrp`, `created_at`, `updated_at`.
- **`locations`**: `id`, `store_id`, `parent_id`, `name`, `code`, `type` (`FLOOR`, `DEPARTMENT`, `RACK`, `SHELF`, `POSITION`), `is_active`.

### 2.4 Purchasing & Vendors
- **`vendors`**: `id`, `name`, `code`, `contact_person`, `phone`, `email`, `gstin`, `pan`, `address`, `balance`, `is_active`, `created_at`, `updated_at`.
- **`purchases`**: `id`, `store_id`, `vendor_id`, `doc_number`, `bill_number`, `bill_date`, `purchase_class` (`A`/`B`), `status` (`DRAFT`/`FINALISED`/`RETURNED`), `total_taxable`, `total_tax`, `total_amount`, `created_by`, `created_at`, `updated_at`.
- **`purchase_items`**: `id`, `purchase_id`, `variant_id`, `location_id`, `quantity`, `unit_cost`, `tax_rate`, `tax_amount`, `total_cost`.
- **`purchase_expenses`**: `id`, `purchase_id`, `type` (`FREIGHT`, `PACKAGING`, `INSURANCE`), `amount`, `allocation_method`.
- **`purchase_attachments`**: `id`, `purchase_id`, `file_id`, `created_at`.
- **`purchase_returns`**: `id`, `store_id`, `purchase_id`, `vendor_id`, `return_number`, `status`, `total_amount`, `created_at`.

### 2.5 Stock, Warehousing & Ageing
- **`stock_balances`**: `id`, `store_id`, `variant_id`, `location_id`, `quantity`, `reserved_qty`, `updated_at` *(unique on store+variant+location)*.
- **`stock_movements`**: `id`, `store_id`, `variant_id`, `location_id`, `type` (`PURCHASE_IN`, `SALE_OUT`, `TRANSFER_IN`, `TRANSFER_OUT`, `ADJUST_IN`, `ADJUST_OUT`, `DAMAGE_OUT`), `quantity`, `reference_type`, `reference_id`, `actor_id`, `note`, `created_at` *(append-only)*.
- **`stock_adjustments`**: `id`, `store_id`, `doc_number`, `reason`, `status` (`PENDING`, `APPROVED`, `REJECTED`), `created_by`, `created_at`.
- **`stock_adjustment_items`**: `id`, `adjustment_id`, `variant_id`, `location_id`, `current_qty`, `new_qty`, `diff_qty`.
- **`stock_audit_sessions`**: `id`, `store_id`, `cycle_name`, `status`, `started_at`, `completed_at`.
- **`stock_audit_lines`**: `id`, `session_id`, `variant_id`, `location_id`, `system_qty`, `counted_qty`, `variance`.
- **`display_allocations`**: `id`, `store_id`, `variant_id`, `from_location_id`, `display_location_id`, `quantity`, `returned_qty`, `status`, `actor_id`, `created_at`.
- **`stock_transfers`**: `id`, `from_store_id`, `to_store_id`, `from_location_id`, `to_location_id`, `status` (`REQUESTED`, `IN_TRANSIT`, `RECEIVED`), `requested_by`, `dispatched_by`, `received_by`, `created_at`.
- **`stock_transfer_items`**: `id`, `transfer_id`, `variant_id`, `requested_qty`, `dispatched_qty`, `received_qty`.
- **`damage_records`**: `id`, `store_id`, `variant_id`, `location_id`, `quantity`, `status` (`REPORTED`, `INSPECTED`, `REPAIRED`, `DISPOSED`, `WRITTEN_OFF`), `written_off_value`, `created_at`.
- **`damage_events`**: `id`, `damage_id`, `from_status`, `to_status`, `notes`, `actor_id`, `created_at`.
- **`ageing_rules`**: `id`, `category_id`, `min_days`, `max_days`, `action`, `discount_pct`, `is_active`.
- **`clearance_recommendations`**: `id`, `variant_id`, `store_id`, `age_days`, `recommended_discount`, `status` (`PENDING`, `ACCEPTED`, `REJECTED`), `created_at`.
- **`clearance_movements`**: `id`, `recommendation_id`, `variant_id`, `from_location_id`, `to_location_id`, `quantity`, `created_at`.

### 2.6 Sales, Customers & Offers
- **`customers`**: `id`, `name`, `phone` *(unique)*, `email`, `lifetime_value`, `credit_outstanding`, `is_active`, `created_at`, `updated_at`.
- **`customer_communications`**: `id`, `customer_id`, `channel` (`SMS`, `WHATSAPP`, `EMAIL`), `content`, `sent_at`.
- **`offers`**: `id`, `name`, `scope_type` (`ALL`, `BRAND`, `CATEGORY`, `ARTICLE`), `discount_type` (`PERCENTAGE`, `FIXED`), `discount_value`, `valid_from`, `valid_to`, `priority`, `is_active`.
- **`sales`**: `id`, `store_id`, `customer_id`, `doc_number`, `sale_date`, `status` (`PAID`, `PARTIAL`, `PENDING`, `VOID`), `payment_mode` (`CASH`, `CARD`, `UPI`, `SPLIT`, `CREDIT`), `total_taxable`, `total_tax`, `discount_amount`, `total_amount`, `paid_amount`, `created_by`, `created_at`.
- **`sale_items`**: `id`, `sale_id`, `variant_id`, `location_id`, `quantity`, `unit_price`, `discount_amount`, `tax_rate`, `tax_amount`, `total_amount`.
- **`sale_payments`**: `id`, `sale_id`, `mode`, `amount`, `reference`, `created_at`.
- **`sale_returns`**: `id`, `store_id`, `sale_id`, `return_number`, `total_amount`, `reason`, `status`, `created_at`.
- **`sale_return_items`**: `id`, `return_id`, `variant_id`, `quantity`, `unit_price`, `refund_amount`.
- **`offer_redemptions`**: `id`, `offer_id`, `sale_id`, `customer_id`, `discount_applied`, `created_at`.

### 2.7 General Ledger, Accounting & GST
- **`accounts`**: `id`, `code` *(unique)*, `name`, `type` (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`), `parent_id`, `is_active`, `created_at`.
- **`journal_entries`**: `id`, `store_id`, `reference`, `type` (`SALE`, `PURCHASE`, `WRITE_OFF`, `CAPITAL`, `MANUAL`), `status` (`DRAFT`, `POSTED`), `total_debit`, `total_credit`, `notes`, `posted_by`, `posted_at`, `created_by`, `created_at` *(append-only reversal)*.
- **`journal_lines`**: `id`, `entry_id`, `account_id`, `type` (`DEBIT`, `CREDIT`), `amount`, `description`.
- **`payment_receipts`**: `id`, `store_id`, `party_type` (`VENDOR`, `CUSTOMER`), `party_id`, `doc_number`, `amount`, `mode`, `reference`, `created_at`.
- **`capital_entries`**: `id`, `store_id`, `type` (`CAPITAL_IN`, `WITHDRAWAL`), `amount`, `description`, `reference`, `status` (`PENDING`, `APPROVED`), `approved_by`, `created_at`.
- **`withdrawals`**: `id`, `store_id`, `amount`, `description`, `status`, `approved_by`, `created_at`.
- **`bank_accounts`**: `id`, `store_id`, `name`, `account_number`, `ifsc`, `bank_name`, `created_at`.
- **`bank_statement_lines`**: `id`, `bank_account_id`, `transaction_date`, `description`, `debit`, `credit`, `balance`, `is_reconciled`, `reconciled_journal_line_id`.
- **`bank_reconciliations`**: `id`, `bank_account_id`, `period_start`, `period_end`, `status`, `created_at`.
- **`gst_transactions`**: `id`, `store_id`, `transaction_date`, `type` (`INPUT`, `OUTPUT`), `reference_type` (`PURCHASE`, `SALE`), `reference_id`, `purchase_class`, `taxable_amount`, `tax_amount`, `cgst`, `sgst`, `igst`.

### 2.8 Audit, Diagnostics & Integrations
- **`audit_logs`**: `id`, `user_id`, `action`, `entity_type`, `entity_id`, `before_state` *(jsonb)*, `after_state` *(jsonb)*, `ip_address`, `created_at` *(append-only)*.
- **`notifications`**: `id`, `user_id`, `title`, `message`, `type` (`INFO`, `WARNING`, `DANGER`), `is_read`, `created_at`.
- **`alert_rules`**: `id`, `name`, `condition`, `threshold`, `severity`, `is_active`.
- **`integration_settings`**: `id`, `provider` (`WHATSAPP`, `BARCODE`, `BANK`, `GST`, `PRINTER`), `config` *(encrypted)*, `is_connected`, `last_tested_at`.
- **`integration_logs`**: `id`, `provider`, `action`, `success`, `request_payload`, `response_payload`, `error_message`, `created_at`.
- **`files`**: `id`, `filename`, `path`, `mime_type`, `size`, `created_at`.
- **`label_templates`**: `id`, `name`, `width_mm`, `height_mm`, `fields_json`, `is_default`.
- **`print_jobs`**: `id`, `store_id`, `sku`, `quantity`, `template_id`, `status` (`PENDING`, `PRINTED`), `created_at`.

