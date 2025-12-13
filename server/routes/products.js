const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { productCreateRules, productUpdateRules } = require('../validators/productsValidator');
const { validationResult } = require('express-validator');

// Helper to format product with barcodes
const formatProduct = (p) => ({
  ...p,
  barcodes: p.barcodes ? p.barcodes.map(b => b.code) : []
});

router.get('/', async (req, res) => {
  try {
    const q = req.query.q;
    const where = { store_id: req.user.storeId };

    if (q) {
      where.OR = [
        { name: { contains: q } }, // Prisma default contains is case-insensitive in SQLite usually? Or depends.
        { sku: { contains: q } },
        { barcodes: { some: { code: { contains: q } } } }
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: { barcodes: true },
      orderBy: { id: 'desc' }
    });

    res.jsonResponse(products.map(formatProduct));
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener productos', 500);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const product = await prisma.product.findFirst({
      where: { id, store_id: req.user.storeId },
      include: { barcodes: true }
    });

    if (!product) return res.jsonError('No encontrado', 404);
    res.jsonResponse(formatProduct(product));
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener producto', 500);
  }
});

router.get('/scan/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const product = await prisma.product.findFirst({
      where: {
        store_id: req.user.storeId,
        active: 1,
        OR: [
          { sku: code },
          { barcodes: { some: { code } } }
        ]
      },
      include: { barcodes: true }
    });

    if (!product) return res.jsonError('Producto no encontrado', 404);
    res.jsonResponse(formatProduct(product));
  } catch (e) {
    console.error(e);
    res.jsonError('Error al escanear producto', 500);
  }
});

router.get('/:id/movements', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Verify ownership first? Or just filter by store via product relation?
    // InventoryMovement -> Product -> Store.
    // Prisma query:
    const movements = await prisma.inventoryMovement.findMany({
      where: {
        product_id: id,
        product: { store_id: req.user.storeId }
      },
      orderBy: { created_at: 'desc' }
    });

    // Rewrite created_at to string if it's DateTime object?
    // Prisma returns Date object. Frontend might expect ISO string.
    // JSON.stringify serialization handles it automatically as ISO string.
    res.jsonResponse(movements);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener movimientos', 500);
  }
});

router.post('/', productCreateRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.jsonError(errors.array()[0].msg, 400);

  const { name, sku, price, cost = 0, stock = 0, category_id = null, active = 1, image_url = '', barcodes = [] } = req.body;

  try {
    // Transaction to create product + inventory + barcodes
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          store_id: req.user.storeId,
          name,
          sku: sku || null,
          price: parseFloat(price),
          cost: parseFloat(cost),
          stock: parseFloat(stock),
          category_id: category_id ? parseInt(category_id) : null,
          active: parseInt(active),
          image_url
        }
      });

      if (stock !== 0) {
        await tx.inventoryMovement.create({
          data: {
            product_id: product.id,
            change: parseFloat(stock),
            reason: 'Inventario Inicial',
            created_at: new Date()
          }
        });
      }

      if (Array.isArray(barcodes) && barcodes.length > 0) {
        for (const code of barcodes) {
          if (code && code.trim()) {
            await tx.productBarcode.create({
              data: {
                product_id: product.id,
                code: code.trim()
              }
            });
          }
        }
      }

      // Return full object with barcodes
      return tx.product.findUnique({
        where: { id: product.id },
        include: { barcodes: true }
      });
    });

    res.jsonResponse(formatProduct(result), { status: 201 });
  } catch (e) {
    if (e.code === 'P2002') return res.jsonError('El SKU o código de barras ya existe', 400);
    console.error(e);
    res.jsonError('Error al crear producto', 500);
  }
});

router.put('/:id', productUpdateRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.jsonError(errors.array()[0].msg, 400);

  const { name, sku, price, cost, stock, category_id, active, image_url, barcodes } = req.body;
  const id = parseInt(req.params.id);

  try {
    // Verify existence + store
    const current = await prisma.product.findFirst({
      where: { id, store_id: req.user.storeId }
    });
    if (!current) return res.jsonError('No encontrado', 404);

    const oldStock = current.stock || 0;
    const newStock = stock !== undefined ? parseFloat(stock) : oldStock;
    const diff = newStock - oldStock;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          name,
          sku: sku || null,
          price: price !== undefined ? parseFloat(price) : undefined,
          cost: cost !== undefined ? parseFloat(cost) : undefined,
          stock: newStock,
          category_id: category_id !== undefined ? (category_id ? parseInt(category_id) : null) : undefined,
          active: active !== undefined ? parseInt(active) : undefined,
          image_url
        }
      });

      if (Math.abs(diff) > 0.0001) { // Float comparison safe-ish
        await tx.inventoryMovement.create({
          data: {
            product_id: id,
            change: diff,
            reason: 'Ajuste Manual',
            created_at: new Date()
          }
        });
      }

      if (Array.isArray(barcodes)) {
        // Replace strategy
        await tx.productBarcode.deleteMany({ where: { product_id: id } });
        for (const code of barcodes) {
          if (code && code.trim()) {
            await tx.productBarcode.create({
              data: { product_id: id, code: code.trim() }
            });
          }
        }
      }

      return tx.product.findUnique({ where: { id }, include: { barcodes: true } });
    });

    res.jsonResponse(formatProduct(result));
  } catch (e) {
    if (e.code === 'P2002') return res.jsonError('El SKU o código de barras ya existe', 400);
    console.error(e);
    res.jsonError('Error al actualizar producto', 500);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Verify existence in store
    const count = await prisma.product.count({ where: { id, store_id: req.user.storeId } });
    if (count === 0) return res.jsonError('No encontrado', 404);

    await prisma.product.delete({ where: { id } });
    res.jsonResponse({ ok: true });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al eliminar producto', 500);
  }
});

module.exports = router;
