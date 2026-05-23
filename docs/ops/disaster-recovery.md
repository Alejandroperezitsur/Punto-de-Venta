# Disaster Recovery Plan — Punto de Venta Pro

## RPO / RTO Objectives

| Tier | Metric | Target |
|------|--------|--------|
| RPO | Max data loss | 1 hour (auto-backup) |
| RTO | Full recovery | < 30 minutes |
| RTO | Minimal recovery (DB only) | < 5 minutes |
| MTD | Max tolerable downtime | 4 hours |

## Failure Scenarios

### 1. Database Corruption

**Detection:** Health check `GET /api/health/ready` → `database: false`

**Immediate actions:**
```bash
# 1. Stop server to prevent further writes
docker-compose stop server

# 2. Identify latest good backup
ls -lt backups/*.db | head -5

# 3. Restore from backup
cp backups/pos-2026-05-23-0600.db prisma/data.db

# 4. Verify integrity
npx prisma db push --accept-data-loss --dry-run

# 5. Restart
docker-compose start server

# 6. Run reconciliation
curl -X GET /api/reconciliation/inventory-summary -H "Authorization: Bearer $TOKEN"
```

**Rollback:** Restore previous backup if data loss is detected.

### 2. Server Crash

**Detection:** Monitoring alert (server unreachable > 30s)

**Recovery:**
```bash
# Auto-recovery (Docker restart policy)
docker-compose restart server

# If container fails:
docker-compose logs server --tail=100
docker-compose up -d --force-recreate server
```

### 3. IndexedDB Corruption (Client-side)

**Detection:** `healthMonitor.checkIndexedDB()` → `error`

**Client auto-recovery:**
```javascript
// Automatic in initSyncEngineV2():
await attemptCrashRecovery();
await runIntegrityCheck();
await safeQueueReplay();
```

**Manual recovery (cashier):**
1. System detects corruption → shows "Datos locales dañados"
2. Button: "Reintentar recuperación automática"
3. If fails → "Restaurar desde snapshot" (last 10 snapshots available)
4. Last resort → "Limpiar datos locales y resincronizar"

### 4. Network Failure (Extended)

**Procedure:**
- POS continues working offline indefinitely
- Queue accumulates in IndexedDB
- When network returns, queue processes automatically
- If queue exceeds 1000 items: batch sync activates adaptive throttling
- If offline > 24h: token expires, cashier must re-authenticate when online

### 5. Power Outage / Browser Crash

**Client-side recovery (automatic):**
```
1. App loads → initSyncEngineV2() runs
2. attemptCrashRecovery() reads latest snapshot
3. Recovers queue items that were in processing state
4. attemptCartRollback() checks for orphaned carts
5. runIntegrityCheck() validates queue consistency
6. safeQueueReplay() resets dead/processing items to pending
```

### 6. Data Center Failure

**For cloud deployments:**
- PostgreSQL with WAL streaming to standby
- Application stateless → spawn new instances
- DNS failover to standby region
- RPO: < 5 minutes (WAL), RTO: < 15 minutes

## Backup Strategy

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Auto DB | Every hour (dedup daily) | 7 days | `./backups/` |
| Manual | On demand | Permanent | Download |
| WAL (PG) | Continuous | 24 hours | PG archive |
| Snapshot (client) | Every 10 queue items | 10 versions | IndexedDB |

## Recovery Drills

| Drill | Frequency | Success Criteria |
|-------|-----------|------------------|
| DB restore from backup | Monthly | All sales intact |
| Simulated crash recovery | Monthly | Queue replay succeeds |
| Network outage simulation | Quarterly | Offline queue works |
| Full DR exercise | Quarterly | RTO < 30 min, RPO < 1 hour |

## Contacts

| Role | Contact |
|------|---------|
| System Administrator | admin@example.com |
| Database Administrator | dba@example.com |
| POS Support | support@example.com |
