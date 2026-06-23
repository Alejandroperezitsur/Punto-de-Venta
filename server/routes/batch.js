const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth, attachTokenRotation } = require('./auth');
const { requirePermission, PERMISSIONS } = require('./../middleware/permissions');
const { createSale } = require('./../services/salesService');
const { logger } = require('./../logger');
router.use(attachTokenRotation);

// POST /api/sales/batch
// Processes multiple sales in a single transaction
router.post('/sales/batch', auth, requirePermission(PERMISSIONS.SALES_CREATE), async (req, res) => {
  const { operations, store_id, user_id } = req.body;

  if (!Array.isArray(operations) || operations.length === 0) {
    return res.jsonError('Se requiere al menos una operación', 400);
  }

  const results = [];
  const errors = [];

  for (const op of operations) {
    try {
      const payload = op.payload || {};
      const idempotencyKey = op.idempotency_key;

      // Check idempotency
      if (idempotencyKey) {
        const existing = await prisma.sale.findUnique({
          where: { idempotency_key: idempotencyKey },
          select: { id: true },
        });

        if (existing) {
          results.push({
            client_id: op.client_id,
            server_id: existing.id,
            ok: true,
            idempotent: true,
          });
          continue;
        }

        await prisma.idempotencyKey.create({
          data: {
            key: idempotencyKey,
            store_id: store_id || req.user.storeId,
          },
        }).catch(() => {});
      }

      const sale = await createSale({
        customer_id: payload.customer_id,
        items: payload.items,
        discount: payload.discount,
        payment_method: payload.payment_method,
        payments: payload.payments,
        userId: user_id || req.user.uid,
        storeId: store_id || req.user.storeId,
        idempotencyKey,
      });

      results.push({
        client_id: op.client_id,
        server_id: sale.id,
        ok: true,
        idempotent: false,
      });
    } catch (e) {
      const status = e.status || 500;
      errors.push({
        client_id: op.client_id,
        error: e.message,
        status,
      });

      if (status < 500) {
        results.push({
          client_id: op.client_id,
          ok: false,
          error: e.message,
        });
      } else {
        results.push({
          client_id: op.client_id,
          ok: false,
          error: 'Server error',
        });
      }
    }
  }

  const allOk = results.every((r) => r.ok);
  res.status(allOk ? 200 : 207).jsonResponse({
    results,
    total: operations.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    errors: errors.length > 0 ? errors : undefined,
  });
});

// POST /api/inventory/batch-move
// Processes multiple inventory movements in a single transaction
router.post('/inventory/batch-move', auth, requirePermission(PERMISSIONS.INVENTORY_ADJUST), async (req, res) => {
  const { operations, store_id } = req.body;

  if (!Array.isArray(operations) || operations.length === 0) {
    return res.jsonError('Se requiere al menos una operación', 400);
  }

  const results = [];
  const storeId = store_id || req.user.storeId;

  for (const op of operations) {
    try {
      const payload = op.payload || {};
      const productId = parseInt(payload.product_id);

      if (isNaN(productId)) {
        results.push({ client_id: op.client_id, ok: false, error: 'Invalid product_id' });
        continue;
      }

      const product = await prisma.product.findFirst({
        where: { id: productId, store_id: storeId },
      });

      if (!product) {
        results.push({ client_id: op.client_id, ok: false, error: `Product ${productId} not found` });
        continue;
      }

      const change = parseFloat(payload.change) || 0;
      const newStock = Math.max(0, Number(product.stock) + change);

      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: productId },
          data: { stock: newStock },
        });

        await tx.inventoryMovement.create({
          data: {
            product_id: productId,
            change,
            reason: payload.reason || 'Sync batch',
          },
        });
      });

      results.push({ client_id: op.client_id, ok: true });
    } catch (e) {
      logger.error(`Batch movement error for ${op.client_id}`, e);
      results.push({ client_id: op.client_id, ok: false, error: e.message });
    }
  }

  res.jsonResponse({ results });
});

module.exports = router;
