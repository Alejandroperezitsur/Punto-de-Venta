-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_audits" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL DEFAULT 1,
    "event" TEXT NOT NULL,
    "event_version" INTEGER NOT NULL DEFAULT 1,
    "user_id" INTEGER,
    "actor_id" INTEGER,
    "actor_ip" TEXT,
    "actor_agent" TEXT,
    "session_id" TEXT,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "data" TEXT,
    "before_snapshot" TEXT,
    "after_snapshot" TEXT,
    "metadata" TEXT,
    "prev_hash" TEXT,
    "hash" TEXT,
    "fingerprint" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audits_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_audits" ("created_at", "data", "event", "id", "ref_id", "ref_type", "store_id", "user_id") SELECT "created_at", "data", "event", "id", "ref_id", "ref_type", "store_id", "user_id" FROM "audits";
DROP TABLE "audits";
ALTER TABLE "new_audits" RENAME TO "audits";
CREATE UNIQUE INDEX "audits_hash_key" ON "audits"("hash");
CREATE INDEX "audits_store_id_created_at_idx" ON "audits"("store_id", "created_at");
CREATE INDEX "audits_event_idx" ON "audits"("event");
CREATE INDEX "audits_ref_type_ref_id_idx" ON "audits"("ref_type", "ref_id");
CREATE INDEX "audits_hash_idx" ON "audits"("hash");
CREATE TABLE "new_inventory_versions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "checksum" TEXT,
    "last_conflict" DATETIME,
    "vector_clock" TEXT,
    CONSTRAINT "inventory_versions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_versions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_inventory_versions" ("checksum", "id", "last_conflict", "product_id", "store_id", "vector_clock", "version") SELECT "checksum", "id", "last_conflict", "product_id", "store_id", "vector_clock", "version" FROM "inventory_versions";
DROP TABLE "inventory_versions";
ALTER TABLE "new_inventory_versions" RENAME TO "inventory_versions";
CREATE UNIQUE INDEX "inventory_versions_store_id_product_id_key" ON "inventory_versions"("store_id", "product_id");
CREATE TABLE "new_stores" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "zip_code" TEXT,
    "rfc" TEXT,
    "fiscal_name" TEXT,
    "tax_regime" TEXT,
    "active" INTEGER NOT NULL DEFAULT 1,
    "reseller_id" INTEGER DEFAULT 1,
    "country" TEXT DEFAULT 'MX',
    "currency" TEXT DEFAULT 'MXN',
    "timezone" TEXT DEFAULT 'America/Mexico_City',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stores_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "resellers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_stores" ("address", "country", "currency", "fiscal_name", "id", "name", "phone", "reseller_id", "rfc", "tax_regime", "timezone", "zip_code") SELECT "address", "country", "currency", "fiscal_name", "id", "name", "phone", "reseller_id", "rfc", "tax_regime", "timezone", "zip_code" FROM "stores";
DROP TABLE "stores";
ALTER TABLE "new_stores" RENAME TO "stores";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
