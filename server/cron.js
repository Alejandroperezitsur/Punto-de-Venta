const fs = require('fs');
const path = require('path');
const prisma = require('./db');
const { logger } = require('./logger');

const BACKUP_DIR = path.join(__dirname, '../backups');
const DATA_DB_PATH = path.join(__dirname, 'prisma', 'data.db');
const DATA_DIR_PATH = path.join(__dirname, 'prisma');

async function runDailyBackup() {
  try {
    if (!fs.existsSync(DATA_DB_PATH)) {
      logger.warn('No database file found for backup');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.backup.findFirst({
      where: {
        type: 'auto',
        created_at: { gte: today }
      }
    });
    if (existing) return;

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-auto-${timestamp}.db`;
    const destPath = path.join(BACKUP_DIR, filename);

    fs.copyFileSync(DATA_DB_PATH, destPath);
    const stats = fs.statSync(destPath);

    await prisma.backup.create({
      data: {
        filename,
        size: stats.size,
        type: 'auto',
        created_at: new Date()
      }
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const oldBackups = await prisma.backup.findMany({
      where: {
        type: 'auto',
        created_at: { lt: sevenDaysAgo }
      }
    });

    for (const b of oldBackups) {
      const p = path.join(BACKUP_DIR, b.filename);
      try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { }
      await prisma.backup.delete({ where: { id: b.id } }).catch(() => { });
    }

    logger.info(`Auto-backup created: ${filename}`);
  } catch (e) {
    logger.error({ err: e }, 'Auto-backup failed');
  }
}

function startCron() {
  runDailyBackup();
  setInterval(runDailyBackup, 60 * 60 * 1000);
  logger.info('Cron jobs started');
}

module.exports = { startCron };
