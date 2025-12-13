const fs = require('fs');
const path = require('path');
const db = require('./db');
const { logger } = require('./logger');

const BACKUP_DIR = path.join(__dirname, '../backups');

function runDailyBackup() {
    try {
        // Check if backup already exists for today
        const headers = db.all("SELECT * FROM backups WHERE type = 'auto' AND created_at > date('now', 'start of day')");
        if (headers.length > 0) return;

        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-auto-${timestamp}.db`;
        const destPath = path.join(BACKUP_DIR, filename);
        const srcPath = path.join(__dirname, 'data.db');

        fs.copyFileSync(srcPath, destPath);
        const stats = fs.statSync(destPath);

        db.run(
            'INSERT INTO backups (filename, size, type, created_at) VALUES (?, ?, ?, ?)',
            [filename, stats.size, 'auto', new Date().toISOString()]
        );

        // Cleanup old backups (keep last 7 days)
        const oldBackups = db.all("SELECT * FROM backups WHERE type = 'auto' AND created_at < date('now', '-7 days')");
        for (const b of oldBackups) {
            const p = path.join(BACKUP_DIR, b.filename);
            if (fs.existsSync(p)) fs.unlinkSync(p);
            db.run('DELETE FROM backups WHERE id = ?', [b.id]);
        }

        logger.info(`Auto-backup created: ${filename}`);
    } catch (e) {
        logger.error('Auto-backup failed:', e);
    }
}

function startCron() {
    // Run on startup
    runDailyBackup();

    // Check every hour
    setInterval(runDailyBackup, 60 * 60 * 1000);
}

module.exports = { startCron };
