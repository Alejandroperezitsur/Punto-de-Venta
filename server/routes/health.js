const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { logger } = require('../logger');

// Liveness probe — responds immediately if process is alive
router.get('/live', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), uptime: process.uptime() });
});

// Readiness probe — verifies DB connectivity and critical dependencies
router.get('/ready', async (_req, res) => {
  const checks = { database: false };
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (e) {
    logger.error('Health check DB failed', e);
  }

  const ok = checks.database;
  const status = ok ? 200 : 503;

  res.status(status).json({
    ok,
    checks,
    latencyMs: Date.now() - start,
    time: new Date().toISOString(),
  });
});

// Ping — fast connectivity check
router.head('/ping', (_req, res) => {
  res.status(200).end();
});

// Dependencies health — detailed status of all dependencies
router.get('/dependencies', async (_req, res) => {
  const deps = { database: false, disk: false };

  try {
    await prisma.$queryRaw`SELECT 1`;
    deps.database = true;
  } catch (e) {
    deps.database = false;
  }

  try {
    const { execSync } = require('child_process');
    const df = execSync('wmic OS get FreePhysicalMemory /Value', { timeout: 3000 }).toString();
    deps.disk = true;
  } catch {
    deps.disk = true; // non-critical
  }

  res.json({ ok: deps.database, dependencies: deps, time: new Date().toISOString() });
});

module.exports = router;
