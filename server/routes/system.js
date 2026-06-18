const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const prisma = require('../db');
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

// Get feature matrix
function getFeatures(type) {
    const features = {
        free: { maxProducts: 50, reports: false, multiUser: false, backup: false, support: false },
        trial: { maxProducts: 1000, reports: true, multiUser: true, backup: true, support: false },
        pro: { maxProducts: -1, reports: true, multiUser: true, backup: true, support: true }
    };
    return features[type] || features.trial;
}

// Get license status
router.get('/status', auth, async (req, res) => {
    try {
        const settingsRows = await prisma.globalSetting.findMany({
            where: {
                OR: [
                    { key: { startsWith: 'license' } },
                    { key: { startsWith: 'app' } }
                ]
            }
        });
        const settings = {};
        settingsRows.forEach(r => settings[r.key] = r.value);

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
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
            await prisma.globalSetting.upsert({
                where: { key: 'license_expires' },
                update: { value: expiryDate.toISOString() },
                create: { key: 'license_expires', value: expiryDate.toISOString() }
            });
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
router.post('/activate', auth, requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
        const { licenseKey } = req.body || {};
        if (!licenseKey) return res.jsonError('Clave de licencia requerida', 400);

        const machineId = getMachineId();

        if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(licenseKey)) {
            return res.jsonError('Formato de licencia inválido', 400);
        }

        let licenseType = 'pro';
        if (licenseKey.startsWith('FREE')) licenseType = 'free';
        else if (licenseKey.startsWith('TRIA')) licenseType = 'trial';

        // Save license settings
        const settingsToSave = [
            { key: 'license_key', value: licenseKey },
            { key: 'license_type', value: licenseType },
            { key: 'machine_id', value: machineId }
        ];
        if (licenseType === 'pro') {
            settingsToSave.push({ key: 'license_expires', value: '' });
        }

        for (const s of settingsToSave) {
            await prisma.globalSetting.upsert({
                where: { key: s.key },
                update: { value: s.value },
                create: s
            });
        }

        // Record in licenses table
        await prisma.license.create({
            data: {
                license_key: licenseKey,
                license_type: licenseType,
                machine_id: machineId,
                activated_at: new Date(),
                store_id: req.user.storeId
            }
        });

        // Audit
        try {
            await prisma.audit.create({
                data: {
                    store_id: req.user.storeId,
                    event: 'license_activate',
                    user_id: req.user.uid,
                    ref_type: 'license',
                    data: JSON.stringify({ licenseType })
                }
            });
        } catch { }

        res.jsonResponse({ success: true, type: licenseType });
    } catch (e) {
        res.jsonError(e.message);
    }
});

// ===== BACKUPS =====

router.get('/backups', auth, requirePermission(PERMISSIONS.SETTINGS_VIEW), async (req, res) => {
    try {
        const backups = await prisma.backup.findMany({ orderBy: { created_at: 'desc' } });
        res.jsonResponse(backups);
    } catch (e) {
        res.jsonError(e.message);
    }
});

router.post('/backups', auth, requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-manual-${timestamp}.db`;
        const destPath = path.join(BACKUP_DIR, filename);

        // Find the SQLite database path
        const dbUrl = process.env.DATABASE_URL || '';
        const srcPath = dbUrl.startsWith('file:')
            ? path.resolve(__dirname, '..', dbUrl.replace('file:', '').replace(/^\.\//, ''))
            : path.join(__dirname, '../prisma/data.db');

        if (!fs.existsSync(srcPath)) {
            return res.jsonError('Base de datos no encontrada', 500);
        }

        fs.copyFileSync(srcPath, destPath);
        const stats = fs.statSync(destPath);

        const backup = await prisma.backup.create({
            data: {
                filename,
                size: stats.size,
                type: 'manual',
                created_at: new Date()
            }
        });

        try {
            await prisma.audit.create({
                data: {
                    store_id: req.user.storeId,
                    event: 'backup_create',
                    user_id: req.user.uid,
                    ref_type: 'backup',
                    ref_id: String(backup.id),
                    data: JSON.stringify({ filename, type: 'manual' })
                }
            });
        } catch { }

        res.jsonResponse({ id: backup.id, filename, size: stats.size }, { status: 201 });
    } catch (e) {
        res.jsonError(e.message);
    }
});

router.get('/backups/:id/download', auth, requirePermission(PERMISSIONS.SETTINGS_VIEW), async (req, res) => {
    try {
        const backup = await prisma.backup.findUnique({ where: { id: parseInt(req.params.id) } });
        if (!backup) return res.jsonError('Backup no encontrado', 404);

        const filePath = path.join(BACKUP_DIR, backup.filename);
        if (!fs.existsSync(filePath)) return res.jsonError('Archivo no encontrado', 404);

        res.download(filePath, backup.filename);
    } catch (e) {
        res.jsonError(e.message);
    }
});

router.post('/backups/:id/restore', auth, requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
        const backup = await prisma.backup.findUnique({ where: { id: parseInt(req.params.id) } });
        if (!backup) return res.jsonError('Backup no encontrado', 404);

        const dbUrl = process.env.DATABASE_URL || '';
        const destPath = dbUrl.startsWith('file:')
            ? path.resolve(__dirname, '..', dbUrl.replace('file:', '').replace(/^\.\//, ''))
            : path.join(__dirname, '../prisma/data.db');

        const srcPath = path.join(BACKUP_DIR, backup.filename);
        if (!fs.existsSync(srcPath)) return res.jsonError('Archivo no encontrado', 404);

        // Safety backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safetyBackup = `backup-pre-restore-${timestamp}.db`;
        fs.copyFileSync(destPath, path.join(BACKUP_DIR, safetyBackup));

        fs.copyFileSync(srcPath, destPath);
        res.jsonResponse({ success: true, safetyBackup });
    } catch (e) {
        res.jsonError(e.message);
    }
});

router.delete('/backups/:id', auth, requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
        const backup = await prisma.backup.findUnique({ where: { id: parseInt(req.params.id) } });
        if (!backup) return res.jsonError('Backup no encontrado', 404);

        const filePath = path.join(BACKUP_DIR, backup.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await prisma.backup.delete({ where: { id: parseInt(req.params.id) } });

        try {
            await prisma.audit.create({
                data: {
                    store_id: req.user.storeId,
                    event: 'backup_delete',
                    user_id: req.user.uid,
                    ref_type: 'backup',
                    ref_id: req.params.id,
                    data: JSON.stringify({ filename: backup.filename })
                }
            });
        } catch { }

        res.jsonResponse({ ok: true });
    } catch (e) {
        res.jsonError(e.message);
    }
});

// ===== DIAGNOSTICS =====

router.get('/diagnostics', auth, requirePermission(PERMISSIONS.SETTINGS_VIEW), async (req, res) => {
    try {
        const dbUrl = process.env.DATABASE_URL || '';
        const dbPath = dbUrl.startsWith('file:')
            ? path.resolve(__dirname, '..', dbUrl.replace('file:', '').replace(/^\.\//, ''))
            : path.join(__dirname, '../prisma/data.db');
        const dbStats = fs.existsSync(dbPath) ? fs.statSync(dbPath) : null;

        const [products, sales, customers, users] = await Promise.all([
            prisma.product.count(),
            prisma.sale.count(),
            prisma.customer.count(),
            prisma.user.count()
        ]);

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
                counts: { products, sales, customers, users }
            },
            machineId: getMachineId()
        });
    } catch (e) {
        res.jsonError(e.message);
    }
});

// Export settings
router.get('/export-config', auth, requirePermission(PERMISSIONS.SETTINGS_VIEW), async (req, res) => {
    try {
        const settingsRows = await prisma.globalSetting.findMany();
        const config = {};
        settingsRows.forEach(s => config[s.key] = s.value);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=pos-config.json');
        res.send(JSON.stringify(config, null, 2));
    } catch (e) {
        res.jsonError(e.message);
    }
});

// Import settings
router.post('/import-config', auth, requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
        const config = req.body;
        if (!config || typeof config !== 'object') {
            return res.jsonError('Configuración inválida', 400);
        }

        const protectedKeys = ['license_key', 'machine_id', 'license_type'];
        const entries = Object.entries(config).filter(([key]) => !protectedKeys.includes(key));

        for (const [key, value] of entries) {
            await prisma.globalSetting.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) }
            });
        }

        try {
            await prisma.audit.create({
                data: {
                    store_id: req.user.storeId,
                    event: 'config_import',
                    user_id: req.user.uid,
                    ref_type: 'settings',
                    data: JSON.stringify({ keys: entries.length })
                }
            });
        } catch { }

        res.jsonResponse({ success: true, imported: entries.length });
    } catch (e) {
        res.jsonError(e.message);
    }
});

module.exports = router;
