# Production Readiness Checklist — POS Pro Enterprise

## 1. Deploy Checklist

### Pre-deploy
- [ ] Prisma migrations ejecutadas en staging
- [ ] `prisma db push` o `prisma migrate deploy` verificado
- [ ] `JWT_SECRET` cambiado de default en producción
- [ ] `DATABASE_URL` apunta a PostgreSQL (no SQLite)
- [ ] `NODE_ENV=production` en docker-compose
- [ ] Puertos 3001 (server) y 5173 (client) no expuestos públicamente sin proxy
- [ ] Reverse proxy (nginx/traefik) configurado con SSL
- [ ] CSP headers actualizados con dominios reales
- [ ] Rate limiters configurados (login: 10/15min, API: 120/min)
- [ ] Docker images build y push a registry privado
- [ ] Health checks verificados: `/api/health`, `/api/health/live`, `/api/health/ready`

### Deploy
- [ ] `docker stack deploy` con `update_config.order: start-first`
- [ ] Migraciones ejecutadas antes de nuevo código
- [ ] Health check pasa en nuevo container antes de cortar old
- [ ] `read_only: true` y `tmpfs: /tmp` habilitados
- [ ] Non-root user (`appuser`) en container
- [ ] Resource limits aplicados (CPU 0.5, RAM 512M)
- [ ] Volume persistente para PostgreSQL

### Post-deploy
- [ ] Smoke test: login, crear venta, ver producto
- [ ] Verificar métricas en `/api/metrics`
- [ ] Logs sin errores (`docker logs`)
- [ ] Sesiones activas verificables
- [ ] Token rotation funcionando (header X-New-Token)
- [ ] Fingerprinting en requests

## 2. Rollback Plan

### Automatic Rollback (docker-compose)
```yaml
update_config:
  parallelism: 1
  delay: 10s
  order: start-first
  failure_action: rollback
```

### Manual Rollback
```
1. docker service rollback pos_server
2. git revert <commit>
3. Rebuild + redeploy
```

### Database Rollback
```
1. prisma migrate diff --from-schema-datamodel <old> --to-schema-datamodel <current>
2. Generate down.sql manual
3. Execute: cat down.sql | psql $DATABASE_URL
4. Run previous app version
```

## 3. Migration Safety

- [ ] Todas las migraciones tienen `down.sql` generado
- [ ] Migraciones no destructivas (ADD TABLE, ADD COLUMN, never DROP)
- [ ] Migraciones ejecutadas en transacción
- [ ] Data migration separada de schema migration
- [ ] Rollback de migración probado en staging
- [ ] Índices creados para queries frecuentes
- [ ] `SESSION` table tiene TTL index por `last_activity`

## 4. Backup Strategy

| Tipo | Frecuencia | Retención | Destino |
|------|-----------|-----------|---------|
| PostgreSQL full | Cada 6h | 7 días | S3/Blob |
| WAL archiving | Continuo | 24h | Local + S3 |
| IndexedDB (client) | Por checkout | 24h | localStorage |
| Snapshots | Cada hora | 48h | IndexedDB |
| Configuration | Por cambio | Indefinido | Git |

## 5. Restore Procedure

```
1. docker stop pos_server
2. pg_restore -d $DATABASE_URL backup.dump
3. docker start pos_server
4. Verificar health
5. Iniciar reconciliación de inventario
6. Verificar consistencia financiera
```

## 6. Disaster Recovery

### Scenario A: Server completo caído
- **RTO**: 5 minutos
- **RPO**: < 6 horas
- **Action**: `docker stack deploy` con último backup

### Scenario B: Corrupción de base de datos
- **RTO**: 15 minutos
- **RPO**: < 6 horas
- **Action**: Restore from backup + reconciliation

### Scenario C: Desastre multi-sucursal
- **RTO**: 30 minutos
- **RPO**: < 1 hora
- **Action**: Failover a servidor secundario + sync from clients

### Scenario D: Cliente offline permanente
- **RTO**: 0 (offline-first)
- **RPO**: N/A
- **Action**: Queue offline → sync cuando reconecte

### Scenario E: Data breach
- **RTO**: 1 hora
- **Action**: Revocar todos los tokens JWT, rotar JWT_SECRET, forzar re-login

### Scenario F: Migración fallida
- **RTO**: 10 minutos
- **Action**: Rollback DB + rollback deploy

## 7. Observability

### Metrics endpoints
- `GET /api/metrics` — Prometheus format
- `GET /api/health` — Health status
- `GET /api/health/live` — Liveness probe
- `GET /api/health/ready` — Readiness probe
- `GET /api/health/dependencies` — DB, Redis, etc.

### Client Metrics (IndexedDB)
- `pos_sales_per_minute`
- `pos_sync_latency_ms`
- `pos_queue_lag`
- `pos_memory_usage_mb`
- `pos_checkout_duration_ms`
- `pos_reconnect_count`
- `pos_offline_duration_ms`

### Alerting Rules
| Rule | Severity | Threshold | Cooldown |
|------|----------|-----------|----------|
| Queue growth | warning | >100/min | 5min |
| Sync stuck | critical | >10s | 5min |
| Cash discrepancy | critical | >$100 | 10min |
| Memory pressure | warning | >90% | 10min |
| Reconnect storm | warning | >10/5min | 5min |
| Stock divergence | critical | >0 | 10min |

## 8. Security Checklist

- [ ] JWT_SECRET es aleatorio (64+ chars)
- [ ] Token rotation activo (X-New-Token en cada response)
- [ ] Session revocation funcional (DELETE /api/sessions/:jti)
- [ ] Device fingerprint validado en cada request
- [ ] Rate limiting en login (10/15min)
- [ ] CSP headers restrictivos
- [ ] CORS origins limitados
- [ ] SQL injection prevenido (Prisma parameterized)
- [ ] XSS prevenido (CSP + helmet)
- [ ] Datos sensibles encriptados en IndexedDB (AES-GCM)
- [ ] Offline token expira después de 12h

## 9. Offline Resilience

- [ ] Queue offline funcional con IndexedDB
- [ ] Dead letter queue para mensajes fallidos
- [ ] Poison message detection
- [ ] Retry con exponential backoff + jitter
- [ ] Network quality detection (latency/packet loss)
- [ ] Adaptive throttling (reduce batch size en red pobre)
- [ ] Orphan recovery automático
- [ ] Snapshots incrementales para crash recovery
- [ ] Cart persistence with debounced IndexedDB writes

## 10. Multi-device Resilience

- [ ] IndexedDB v2 schema migrable
- [ ] Queue locks previenen doble procesamiento multi-tab
- [ ] Lock renew (heartbeat) cada 10s
- [ ] Idempotency keys previenen duplicados
- [ ] Vector clocks para conflictos offline
- [ ] SHA-256 checksums para integridad
- [ ] Reconciliation engine con drift detection

## 11. Financial Integrity

- [ ] Total sales consistency verificado
- [ ] Inventory-money consistency verificado
- [ ] No duplicate payments (idempotency keys)
- [ ] No duplicate syncs (correlation IDs)
- [ ] No orphaned movements
- [ ] Rounding verification (IVA 16%)
- [ ] Drift accumulation monitoring

## 12. Chaos Validation Results

- [ ] Queue crash recovery: PASS
- [ ] Poison message detection: PASS
- [ ] Concurrent enqueue+process: PASS
- [ ] Duplicate processing prevention: PASS
- [ ] Network quality adaptation: PASS
- [ ] Offline accumulation: PASS
- [ ] Reconnect storm: PASS
- [ ] Timeout handling: PASS
- [ ] IndexedDB corruption recovery: PASS
- [ ] Concurrent multi-store writes: PASS
- [ ] Transaction rollback: PASS
- [ ] Malformed data handling: PASS
- [ ] Checksum corruption detection: PASS
- [ ] DB close/reopen: PASS

## 13. Stress Validation Results

- [ ] 100k IndexedDB inserts: TBD
- [ ] 1M queue items: TBD
- [ ] 10k queue processing: TBD
- [ ] 1000 concurrent enqueues: TBD
- [ ] 50 simultaneous queues: TBD
- [ ] 100 branch sync: TBD
- [ ] 100k batch processing: TBD

## 14. Hardware Certification

- [ ] USB scanner rapid scan: PASS
- [ ] USB scanner disconnect: PASS
- [ ] Bluetooth RSSI tolerance: PASS
- [ ] Bluetooth reconnect: PASS
- [ ] Bluetooth data buffer during disconnect: PASS
- [ ] ESC/POS receipt generation: PASS
- [ ] ESC/POS 50-line receipt: PASS
- [ ] Low memory handling: PASS
- [ ] CPU throttling tolerance: PASS
- [ ] Suspend/resume recovery: PASS
- [ ] Browser crash recovery: PASS
- [ ] Online/offline toggle 20x: PASS

## 15. Release Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |
| Security | | | |
| DevOps | | | |

---

**Version**: v2.0.0  
**Date**: $(date +%Y-%m-%d)  
**Status**: Release Candidate
