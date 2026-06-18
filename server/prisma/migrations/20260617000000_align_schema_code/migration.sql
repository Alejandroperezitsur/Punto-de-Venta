/*
  Phase 0: Align schema with code — fix Session model,
  create missing Phase 8 tables.
  Note: stores table already has active + created_at columns from init migration.
*/

-- Create sessions table (aligned with code)
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "store_id" INTEGER NOT NULL,
    "jti" TEXT NOT NULL,
    "refresh_token" TEXT,
    "device_fingerprint" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "last_activity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sessions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_jti_key" ON "sessions"("jti");
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_refresh_token_key" ON "sessions"("refresh_token");
CREATE INDEX IF NOT EXISTS "sessions_jti_idx" ON "sessions"("jti");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions"("user_id");

-- Create reconciliation_logs table
CREATE TABLE IF NOT EXISTS "reconciliation_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "product_id" INTEGER,
    "server_version" INTEGER,
    "client_version" INTEGER,
    "drift_amount" DECIMAL,
    "resolved_by" INTEGER,
    "resolution" TEXT,
    "details" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reconciliation_logs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "reconciliation_logs_store_id_idx" ON "reconciliation_logs"("store_id");
CREATE INDEX IF NOT EXISTS "reconciliation_logs_type_idx" ON "reconciliation_logs"("type");

-- Create inventory_versions table
CREATE TABLE IF NOT EXISTS "inventory_versions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "checksum" TEXT,
    "last_conflict" DATETIME,
    "vector_clock" TEXT,
    CONSTRAINT "inventory_versions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_versions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_versions_store_id_product_id_key" ON "inventory_versions"("store_id", "product_id");

-- Create fraud_alerts table
CREATE TABLE IF NOT EXISTS "fraud_alerts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "score" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "heuristics" TEXT NOT NULL,
    "details" TEXT,
    "acknowledged_by" INTEGER,
    "acknowledged_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fraud_alerts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "fraud_alerts_store_id_idx" ON "fraud_alerts"("store_id");
CREATE INDEX IF NOT EXISTS "fraud_alerts_severity_idx" ON "fraud_alerts"("severity");

-- Create idempotency_keys table
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_key_key" ON "idempotency_keys"("key");
CREATE INDEX IF NOT EXISTS "idempotency_keys_created_at_idx" ON "idempotency_keys"("created_at");
