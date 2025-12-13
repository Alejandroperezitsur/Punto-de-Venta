# Operations Manual - POS SaaS

## 1. System Overview
Architecture:
- **Frontend**: React (Vite) / Electron
- **Backend**: Node.js (Express) + Prisma ORM
- **Database**: PostgreSQL
- **Containerization**: Docker Compose

## 2. Deployment
### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local scripts)

### Start Production
```bash
docker-compose up -d --scale server=2
```
This starts 2 replicas of the backend and the database with healthchecks enabled.

### Database Migration
On first deploy or update:
```bash
docker-compose exec server npx prisma migrate deploy
```

## 3. Monitoring
### Health Check
Endpoint: `GET /api/health`
Response: `{"status":"ok", "uptime":...}`

### Metrics
Endpoint: `GET /metrics` (Prometheus format)
Includes:
- HTTP Request Duration
- Throughput
- Error Rates

### Logs
Logs are JSON formatted for ingestion (e.g., Datadog, ELK).
View logs:
```bash
docker-compose logs -f server
```

## 4. Disaster Recovery
### Backup Database
```bash
docker-compose exec db pg_dump -U postgres pos_saas > backup_$(date +%F).sql
```

### Restore Database
```bash
cat backup.sql | docker-compose exec -T db psql -U postgres pos_saas
```

## 5. Scaling
To scale backend instances:
```bash
docker-compose up -d --scale server=4
```
Ensure load balancer (Nginx recommended in front) distributes traffic.

## 6. Troubleshooting
- **DB Connection Error**: Check `docker-compose logs db`. Ensure volume persistence.
- **502 Bad Gateway**: Check backend health `docker-compose ps`.
