const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth } = require('./auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const { logger } = require('../logger');

// GET /api/reconciliation/inventory-summary
// Returns version vectors and stock for all products in a store
router.get('/inventory-summary', auth, requirePermission(PERMISSIONS.INVENTORY_VIEW), async (req, res) => {
  try {
    const storeId = req.user.storeId;

    const products = await prisma.product.findMany({
      where: { store_id: storeId, deleted_at: null },
      select: {
        id: true,
        stock: true,
        name: true,
      },
    });

    // Build version vectors based on inventory movements
    const versions = [];
    const stock = [];

    for (const p of products) {
      const movements = await prisma.inventoryMovement.findMany({
        where: { product_id: p.id },
        orderBy: { created_at: 'desc' },
        take: 1,
        select: { id: true, created_at: true },
      });

      const version = movements.length > 0 ? movements[0].id : 0;
      versions.push({
        productId: String(p.id),
        version,
        vectorClock: { server: version },
        stock: Number(p.stock),
      });

      stock.push({
        productId: String(p.id),
        stock: Number(p.stock),
      });
    }

    // Compute store-level checksum
    const crypto = require('crypto');
    const sorted = [...stock].sort((a, b) => a.productId.localeCompare(b.productId));
    const checksumData = sorted.map((s) => `${s.productId}:${s.stock}`).join('|');
    const checksum = crypto.createHash('sha256').update(checksumData).digest('hex');

    res.jsonResponse({
      versions,
      stock,
      checksum,
      productCount: products.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    logger.error('Reconciliation summary error', e);
    res.jsonError('Error generating inventory summary', 500);
  }
});

// GET /api/reconciliation/inventory-checksum
// Returns just the checksum for quick comparison
router.get('/inventory-checksum', auth, requirePermission(PERMISSIONS.INVENTORY_VIEW), async (req, res) => {
  try {
    const storeId = req.user.storeId;

    const products = await prisma.product.findMany({
      where: { store_id: storeId, deleted_at: null },
      select: { id: true, stock: true },
      orderBy: { id: 'asc' },
    });

    const crypto = require('crypto');
    const sorted = [...products].sort((a, b) => a.id - b.id);
    const data = sorted.map((p) => `${p.id}:${Number(p.stock)}`).join('|');
    const checksum = crypto.createHash('sha256').update(data).digest('hex');

    res.jsonResponse({ checksum, productCount: products.length });
  } catch (e) {
    logger.error('Checksum error', e);
    res.jsonError('Error generating checksum', 500);
  }
});

// POST /api/reconciliation/resolve-conflict
// Called when client resolves a conflict
router.post('/resolve-conflict', auth, requirePermission(PERMISSIONS.INVENTORY_ADJUST), async (req, res) => {
  try {
    const { productId, resolution, clientStock } = req.body;
    const storeId = req.user.storeId;

    const product = await prisma.product.findFirst({
      where: { id: parseInt(productId), store_id: storeId },
    });

    if (!product) {
      return res.jsonError('Producto no encontrado', 404);
    }

    if (resolution === 'server_wins') {
      // Keep server stock, log the decision
      logger.info(`Conflict resolved server_wins for product ${productId}`);
    } else if (resolution === 'client_wins') {
      // Apply client stock to server
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: parseFloat(clientStock) || product.stock },
      });

      await prisma.inventoryMovement.create({
        data: {
          product_id: product.id,
          change: (parseFloat(clientStock) || 0) - Number(product.stock),
          reason: 'Reconciliación: cliente ganó',
        },
      });

      logger.info(`Conflict resolved client_wins for product ${productId}: stock set to ${clientStock}`);
    } else if (resolution === 'merge') {
      const merged = Math.max(Number(product.stock), parseFloat(clientStock) || 0);
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: merged },
      });

      await prisma.inventoryMovement.create({
        data: {
          product_id: product.id,
          change: merged - Number(product.stock),
          reason: 'Reconciliación: merge',
        },
      });
    }

    try {
      await prisma.audit.create({
        data: {
          store_id: storeId,
          event: 'conflict_resolved',
          user_id: req.user.uid,
          ref_type: 'product',
          ref_id: parseInt(productId),
          data: JSON.stringify({ resolution, previousStock: Number(product.stock) }),
        },
      });
    } catch {}

    res.jsonResponse({ ok: true, resolution, productId });
  } catch (e) {
    logger.error('Conflict resolution error', e);
    res.jsonError('Error resolving conflict', 500);
  }
});

module.exports = router;
