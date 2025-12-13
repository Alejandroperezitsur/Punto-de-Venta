const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const db = require('../db');
const { auth } = require('./auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');

const BACKUP_DIR = path.join(__dirname, '../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Get machine fingerprint
function getMachineId() {
    const info = [
        os.hostname(),
        os.platform(),
        os.arch(),
        os.cpus()[0]?.model || 'unknown',
        os.totalmem()
    ].join('|');
    return crypto.createHash('sha256').update(info).digest('hex').slice(0, 32);
}

// Get license status
router.get('/status', auth, (req, res) => {
    try {
        const settings = {};
        const rows = db.all("SELECT key, value FROM settings WHERE key LIKE 'license%' OR key LIKE 'app%'");
        rows.forEach(r => settings[r.key] = r.value);

        const machineId = getMachineId();
        const licenseType = settings.license_type || 'trial';
        const expiresAt = settings.license_expires;

        let isValid = true;
        let daysRemaining = null;

        if (licenseType === 'trial' && expiresAt) {
            const expires = new Date(expiresAt);
            const now = new Date();
            daysRemaining = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
            isValid = daysRemaining > 0;
        } else if (licenseType === 'trial' && !expiresAt) {
            // Set trial for 30 days
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
            db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_expires', ?)", [expiryDate.toISOString()]);
            daysRemaining = 30;
        }

        res.jsonResponse({
            type: licenseType,
            isValid,
            daysRemaining,
            machineId,
            appName: settings.app_name || 'POS Pro',
            appVersion: settings.app_version || '1.0.0',
            copyright: settings.app_copyright || '',
            features: getFeatures(licenseType)
        });
    } catch (e) {
        res.jsonError(e.message);
    }
});

// Activate license
router.post('/activate', auth, requirePermission(PERMISSIONS.SETTINGS_EDIT), (req, res) => {
    try {
        const { licenseKey } = req.body || {};
        if (!licenseKey) return res.jsonError('Clave de licencia requerida', 400);

        const machineId = getMachineId();

        // Simple license key validation (in production, validate against server)
        // Format: XXXX-XXXX-XXXX-XXXX
        if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(licenseKey)) {
            return res.jsonError('Formato de licencia inválido', 400);
        }

        // Determine license type from key prefix
        let licenseType = 'pro';
        if (licenseKey.startsWith('FREE')) licenseType = 'free';
        else if (licenseKey.startsWith('TRIA')) licenseType = 'trial';

        // Save license
        db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_key', ?)", [licenseKey]);
        db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_type', ?)", [licenseType]);
        db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('machine_id', ?)", [machineId]);

        if (licenseType === 'pro') {
            db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_expires', '')", []);
        }

        // Log activation
        db.run("INSERT INTO licenses (license_key, license_type, machine_id, activated_at, created_at) VALUES (?, ?, ?, ?, ?)",
            [licenseKey, licenseType, machineId, new Date().toISOString(), new Date().toISOString()]);

        db.audit('license_activate', req.user.uid, 'license', null, { licenseType });

        res.jsonResponse({ success: true, type: licenseType });
    } catch (e) {
        res.jsonError(e.message);
    }
});

// Get feature matrix
function getFeatures(type) {
    const features = {
        free: {
            maxProducts: 50,
            reports: false,
            multiUser: false,
            backup: false,
            support: false
        },
        trial: {
            maxProducts: 1000,
            reports: true,
            multiUser: true,
            backup: true,
            support: false
        },
        pro: {
            maxProducts: -1, // unlimited
            reports: true,
            multiUser: true,
            backup: true,
            support: true
        }
    };
    return features[type] || features.trial;
}

// ===== BACKUPS =====

// List backups
router.get('/backups', auth, requirePermission(PERMISSIONS.SETTINGS_VIEW), (req, res) => {
    try {
        const backups = db.all('SELECT * FROM backups ORDER BY created_at DESC');
        res.jsonResponse(backups);
    } catch (e) {
        res.jsonError(e.message);
    }
});

// Create manual backup
router.post('/backups', auth, requirePermission(PERMISSIONS.SETTINGS_EDIT), (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-manual-${timestamp}.db`;
        const destPath = path.join(BACKUP_DIR, filename);
        const srcPath = path.join(__dirname, '../data.db');

        fs.copyFileSync(srcPath, destPath);
        const stats = fs.statSync(destPath);

        const result = db.run(
            'INSERT INTO backups (filename, size, type, created_at) VALUES (?, ?, ?, ?)',
            [filename, stats.size, 'manual', new Date().toISOString()]
        );

        db.audit('backup_create', req.user.uid, 'backup', result.id, { filename, type: 'manual' });

        res.jsonResponse({ id: result.id, filename, size: stats.size }, { status: 201 });
    } catch (e) {
        res.jsonError(e.message);
    }
});

// Download backup
router.get('/backups/:id/download', auth, requirePermission(PERMISSIONS.SETTINGS_VIEW), (req, res) => {
    try {
        const backup = db.get('SELECT * FROM backups WHERE id = ?', [req.params.id]);
        if (!backup) return res.jsonError('Backup no encontrado', 404);

        const filePath = path.join(BACKUP_DIR, backup.filename);
        if (!fs.existsSync(filePath)) return res.jsonError('Archivo no encontrado', 404);

        res.download(filePath, backup.filename);
    } catch (e) {
        res.jsonError(e.message);
    }
});

// Restore backup
router.post('/backups/:id/restore', auth, requirePermission(PERMISSIONS.SETTINGS_EDIT), (req, res) => {
    try {
        const backup = db.get('SELECT * FROM backups WHERE id = ?', [req.params.id]);
        if (!backup) return res.jsonError('Backup no encontrado', 404);

        const srcPath = path.join(BACKUP_DIR, backup.filename);
        const destPath = path.join(__dirname, '../data.db');

        if (!fs.existsSync(srcPath)) return res.jsonError('Archivo no encontrado', 404);

        // Create safety backup before restore
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safetyBackup = `backup-pre-restore-${timestamp}.db`;
        fs.copyFileSync(destPath, path.join(BACKUP_DIR, safetyBackup));

        // Restore
        fs.copyFileSync(srcPath, destPath);

        res.jsonResponse({ success: true, safetyBackup });
    } catch (e) {
        res.jsonError(e.message);
    }
});

// Delete backup
router.delete('/backups/:id', auth, requirePermission(PERMISSIONS.SETTINGS_EDIT), (req, res) => {
    try {
        const backup = db.get('SELECT * FROM backups WHERE id = ?', [req.params.id]);
        if (!backup) return res.jsonError('Backup no encontrado', 404);

        const filePath = path.join(BACKUP_DIR, backup.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        db.run('DELETE FROM backups WHERE id = ?', [req.params.id]);
        db.audit('backup_delete', req.user.uid, 'backup', req.params.id, { filename: backup.filename });

        res.jsonResponse({ ok: true });
    } catch (e) {
        res.jsonError(e.message);
    }
});

// ===== DIAGNOSTICS =====

router.get('/diagnostics', auth, requirePermission(PERMISSIONS.SETTINGS_VIEW), (req, res) => {
    try {
        const dbPath = path.join(__dirname, '../data.db');
        const dbStats = fs.existsSync(dbPath) ? fs.statSync(dbPath) : null;

        const counts = {
            products: db.get('SELECT COUNT(*) as count FROM products')?.count || 0,
            sales: db.get('SELECT COUNT(*) as count FROM sales')?.count || 0,
            customers: db.get('SELECT COUNT(*) as count FROM customers')?.count || 0,
            users: db.get('SELECT COUNT(*) as count FROM users')?.count || 0,
        };

        res.jsonResponse({
            system: {
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                uptime: os.uptime(),
                nodeVersion: process.version,
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    used: os.totalmem() - os.freemem()
                }
            },
            database: {
                path: dbPath,
                size: dbStats?.size || 0,
                lastModified: dbStats?.mtime || null,
                counts
            },
            machineId: getMachineId()
        });
    } catch (e) {
        res.jsonError(e.message);
    }
});

// Export settings
router.get('/export-config', auth, requirePermission(PERMISSIONS.SETTINGS_VIEW), (req, res) => {
    try {
        const settings = db.all('SELECT key, value FROM settings');
        const config = {};
        settings.forEach(s => config[s.key] = s.value);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=pos-config.json');
        res.send(JSON.stringify(config, null, 2));
    } catch (e) {
        res.jsonError(e.message);
    }
});

// Import settings
router.post('/import-config', auth, requirePermission(PERMISSIONS.SETTINGS_EDIT), (req, res) => {
    try {
        const config = req.body;
        if (!config || typeof config !== 'object') {
            return res.jsonError('Configuración inválida', 400);
        }

        // Protected keys that shouldn't be imported
        const protected = ['license_key', 'machine_id', 'license_type'];

        Object.entries(config).forEach(([key, value]) => {
            if (!protected.includes(key)) {
                db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
            }
        });

        db.audit('config_import', req.user.uid, 'settings', null, { keys: Object.keys(config).length });

        res.jsonResponse({ success: true, imported: Object.keys(config).length });
    } catch (e) {
        res.jsonError(e.message);
    }
});

module.exports = router;
