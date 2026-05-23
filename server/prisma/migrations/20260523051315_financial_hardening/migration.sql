/*
  Warnings:

  - You are about to alter the column `amount` on the `cash_movements` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `closing_balance` on the `cash_sessions` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `opening_balance` on the `cash_sessions` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `change` on the `inventory_movements` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `amount` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `cost` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `price` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `stock` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `amount` on the `receivable_payments` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `amount_due` on the `receivables` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `amount_paid` on the `receivables` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `line_total` on the `sale_items` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `quantity` on the `sale_items` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `unit_price` on the `sale_items` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `discount` on the `sales` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `subtotal` on the `sales` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `tax` on the `sales` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `total` on the `sales` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to drop the column `active` on the `stores` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `stores` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `stores` table. All the data in the column will be lost.
  - You are about to drop the column `logo_url` on the `stores` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "customers" ADD COLUMN "fiscal_name" TEXT;
ALTER TABLE "customers" ADD COLUMN "tax_regime" TEXT;
ALTER TABLE "customers" ADD COLUMN "use_cfdi" TEXT;
ALTER TABLE "customers" ADD COLUMN "zip_code" TEXT;

-- CreateTable
CREATE TABLE "invoices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "customer_id" INTEGER,
    "uuid" TEXT,
    "rfc_emisor" TEXT NOT NULL,
    "rfc_receptor" TEXT NOT NULL,
    "total" DECIMAL NOT NULL,
    "xml_url" TEXT,
    "pdf_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stamped_at" DATETIME,
    CONSTRAINT "invoices_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invoices_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "user_id" INTEGER,
    "store_id" INTEGER,
    "data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_feedback" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "type" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "rating" INTEGER,
    "url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "feature_votes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "feature_name" TEXT NOT NULL,
    "description" TEXT,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "resellers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT DEFAULT '#4f46e5',
    "support_email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "support_tickets_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticket_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "message" TEXT NOT NULL,
    "is_staff" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ticket_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "current_period_end" DATETIME,
    "payment_method" TEXT,
    CONSTRAINT "subscriptions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "data" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'info',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_insights_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_configs" (
    "store_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "enable_predictions" BOOLEAN NOT NULL DEFAULT true,
    "enable_recommendations" BOOLEAN NOT NULL DEFAULT true,
    "enable_assistant" BOOLEAN NOT NULL DEFAULT true,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "analysis_period_days" INTEGER NOT NULL DEFAULT 30,
    CONSTRAINT "ai_configs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_cash_movements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT,
    "amount" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cash_movements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cash_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_cash_movements" ("amount", "created_at", "id", "reference", "session_id", "type") SELECT "amount", "created_at", "id", "reference", "session_id", "type" FROM "cash_movements";
DROP TABLE "cash_movements";
ALTER TABLE "new_cash_movements" RENAME TO "cash_movements";
CREATE INDEX "cash_movements_created_at_idx" ON "cash_movements"("created_at");
CREATE INDEX "cash_movements_type_idx" ON "cash_movements"("type");
CREATE INDEX "cash_movements_session_id_idx" ON "cash_movements"("session_id");
CREATE TABLE "new_cash_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL DEFAULT 1,
    "user_id" INTEGER NOT NULL,
    "opened_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" DATETIME,
    "opening_balance" DECIMAL NOT NULL,
    "closing_balance" DECIMAL,
    "counted_cash" DECIMAL,
    "expected_cash" DECIMAL,
    "difference" DECIMAL,
    "status" TEXT NOT NULL,
    CONSTRAINT "cash_sessions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cash_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_cash_sessions" ("closed_at", "closing_balance", "id", "opened_at", "opening_balance", "status", "store_id", "user_id") SELECT "closed_at", "closing_balance", "id", "opened_at", "opening_balance", "status", "store_id", "user_id" FROM "cash_sessions";
DROP TABLE "cash_sessions";
ALTER TABLE "new_cash_sessions" RENAME TO "cash_sessions";
CREATE INDEX "cash_sessions_store_id_user_id_status_idx" ON "cash_sessions"("store_id", "user_id", "status");
CREATE TABLE "new_inventory_movements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "product_id" INTEGER NOT NULL,
    "change" DECIMAL NOT NULL,
    "reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_inventory_movements" ("change", "created_at", "id", "product_id", "reason") SELECT "change", "created_at", "id", "product_id", "reason" FROM "inventory_movements";
DROP TABLE "inventory_movements";
ALTER TABLE "new_inventory_movements" RENAME TO "inventory_movements";
CREATE INDEX "inventory_movements_product_id_idx" ON "inventory_movements"("product_id");
CREATE INDEX "inventory_movements_created_at_idx" ON "inventory_movements"("created_at");
CREATE TABLE "new_payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sale_id" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "user_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "external_id" TEXT,
    "provider" TEXT,
    "status" TEXT DEFAULT 'completed',
    CONSTRAINT "payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_payments" ("amount", "created_at", "id", "method", "sale_id", "user_id") SELECT "amount", "created_at", "id", "method", "sale_id", "user_id" FROM "payments";
DROP TABLE "payments";
ALTER TABLE "new_payments" RENAME TO "payments";
CREATE TABLE "new_products" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "price" DECIMAL NOT NULL DEFAULT 0,
    "cost" DECIMAL NOT NULL DEFAULT 0,
    "stock" DECIMAL NOT NULL DEFAULT 0,
    "category_id" INTEGER,
    "image_url" TEXT,
    "active" INTEGER DEFAULT 1,
    "tax_rate" DECIMAL DEFAULT 0.16,
    "tax_exempt" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" DATETIME,
    "deleted_by" INTEGER,
    CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_products" ("active", "category_id", "cost", "id", "image_url", "name", "price", "sku", "stock", "store_id") SELECT "active", "category_id", coalesce("cost", 0) AS "cost", "id", "image_url", "name", "price", "sku", coalesce("stock", 0) AS "stock", "store_id" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE INDEX "products_name_idx" ON "products"("name");
CREATE INDEX "products_store_id_active_idx" ON "products"("store_id", "active");
CREATE INDEX "products_store_id_deleted_at_idx" ON "products"("store_id", "deleted_at");
CREATE UNIQUE INDEX "products_store_id_sku_key" ON "products"("store_id", "sku");
CREATE TABLE "new_receivable_payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "receivable_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "receivable_payments_receivable_id_fkey" FOREIGN KEY ("receivable_id") REFERENCES "receivables" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "receivable_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_receivable_payments" ("amount", "created_at", "id", "receivable_id", "user_id") SELECT "amount", "created_at", "id", "receivable_id", "user_id" FROM "receivable_payments";
DROP TABLE "receivable_payments";
ALTER TABLE "new_receivable_payments" RENAME TO "receivable_payments";
CREATE TABLE "new_receivables" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customer_id" INTEGER NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "amount_due" DECIMAL NOT NULL,
    "amount_paid" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "receivables_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "receivables_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_receivables" ("amount_due", "amount_paid", "created_at", "customer_id", "id", "sale_id", "status") SELECT "amount_due", "amount_paid", "created_at", "customer_id", "id", "sale_id", "status" FROM "receivables";
DROP TABLE "receivables";
ALTER TABLE "new_receivables" RENAME TO "receivables";
CREATE TABLE "new_sale_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sale_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit_price" DECIMAL NOT NULL,
    "line_total" DECIMAL NOT NULL,
    "product_name" TEXT,
    CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_sale_items" ("id", "line_total", "product_id", "quantity", "sale_id", "unit_price") SELECT "id", "line_total", "product_id", "quantity", "sale_id", "unit_price" FROM "sale_items";
DROP TABLE "sale_items";
ALTER TABLE "new_sale_items" RENAME TO "sale_items";
CREATE TABLE "new_sales" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL DEFAULT 1,
    "customer_id" INTEGER,
    "subtotal" DECIMAL NOT NULL,
    "tax" DECIMAL NOT NULL,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL,
    "payment_method" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotency_key" TEXT,
    CONSTRAINT "sales_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_sales" ("created_at", "customer_id", "discount", "id", "payment_method", "store_id", "subtotal", "tax", "total") SELECT "created_at", "customer_id", "discount", "id", "payment_method", "store_id", "subtotal", "tax", "total" FROM "sales";
DROP TABLE "sales";
ALTER TABLE "new_sales" RENAME TO "sales";
CREATE UNIQUE INDEX "sales_idempotency_key_key" ON "sales"("idempotency_key");
CREATE INDEX "sales_created_at_idx" ON "sales"("created_at");
CREATE INDEX "sales_store_id_created_at_idx" ON "sales"("store_id", "created_at");
CREATE INDEX "sales_customer_id_idx" ON "sales"("customer_id");
CREATE INDEX "sales_idempotency_key_idx" ON "sales"("idempotency_key");
CREATE TABLE "new_stores" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "zip_code" TEXT,
    "rfc" TEXT,
    "fiscal_name" TEXT,
    "tax_regime" TEXT,
    "reseller_id" INTEGER DEFAULT 1,
    "country" TEXT DEFAULT 'MX',
    "currency" TEXT DEFAULT 'MXN',
    "timezone" TEXT DEFAULT 'America/Mexico_City',
    CONSTRAINT "stores_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "resellers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_stores" ("address", "id", "name", "phone") SELECT "address", "id", "name", "phone" FROM "stores";
DROP TABLE "stores";
ALTER TABLE "new_stores" RENAME TO "stores";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "product_events_type_idx" ON "product_events"("type");

-- CreateIndex
CREATE INDEX "product_events_store_id_idx" ON "product_events"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_votes_feature_name_key" ON "feature_votes"("feature_name");

-- CreateIndex
CREATE UNIQUE INDEX "resellers_domain_key" ON "resellers"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_store_id_key" ON "subscriptions"("store_id");

-- CreateIndex
CREATE INDEX "audits_store_id_created_at_idx" ON "audits"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "audits_event_idx" ON "audits"("event");

-- CreateIndex
CREATE INDEX "audits_ref_type_ref_id_idx" ON "audits"("ref_type", "ref_id");
