const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { productCreateRules, productUpdateRules } = require('../validators/productsValidator');
const { validationResult } = require('express-validator');
const { auth, attachTokenRotation } = require('./auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');

// Apply token rotation after auth for all routes in this router
router.use(attachTokenRotation);

const PAGE_SIZE = 50;

const formatProduct = (p) => ({
  ...p,
  price: Number(p.price),
  cost: Number(p.cost || 0),
  stock: Number(p.stock || 0),
  tax_rate: p.tax_rate ? Number(p.tax_rate) : null,
  barcodes: p.barcodes ? p.barcodes.map(b => b.code) : []
});

router.get('/', auth, requirePermission(PERMISSIONS.PRODUCTS_VIEW), async (req, res) => {
  try {
    const q = req.query.q;
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : undefined;
    const take = Math.min(parseInt(req.query.take) || PAGE_SIZE, 200);

    const where = {
      store_id: req.user.storeId,
      deleted_at: null
    };

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { barcodes: { some: { code: { contains: q } } } }
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: { barcodes: true },
      orderBy: { id: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });

    const hasMore = products.length > take;
    const nextCursor = hasMore ? products[products.length - 1].id : null;
    const data = hasMore ? products.slice(0, take) : products;

    res.jsonResponse({
      data: data.map(formatProduct),
      pagination: {
        nextCursor,
        hasMore,
        total: await prisma.product.count({ where })
      }
    });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener productos', 500);
  }
});

router.get('/:id', auth, requirePermission(PERMISSIONS.PRODUCTS_VIEW), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.jsonError('ID inválido', 400);

    const product = await prisma.product.findFirst({
      where: { id, store_id: req.user.storeId, deleted_at: null },
      include: { barcodes: true }
    });

    if (!product) return res.jsonError('No encontrado', 404);
    res.jsonResponse(formatProduct(product));
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener producto', 500);
  }
});

router.get('/scan/:code', auth, requirePermission(PERMISSIONS.PRODUCTS_VIEW), async (req, res) => {
  try {
    const code = req.params.code;
    const product = await prisma.product.findFirst({
      where: {
        store_id: req.user.storeId,
        active: 1,
        deleted_at: null,
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

router.get('/:id/movements', auth, requirePermission(PERMISSIONS.PRODUCTS_VIEW), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.jsonError('ID inválido', 400);

    const movements = await prisma.inventoryMovement.findMany({
      where: {
        product_id: id,
        product: { store_id: req.user.storeId }
      },
      orderBy: { created_at: 'desc' },
      take: 100
    });

    res.jsonResponse(movements.map(m => ({
      ...m,
      change: Number(m.change)
    })));
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener movimientos', 500);
  }
});

router.post('/', auth, requirePermission(PERMISSIONS.PRODUCTS_CREATE), productCreateRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.jsonError(errors.array()[0].msg, 400);

  const { name, sku, price, cost = 0, stock = 0, category_id = null, active = 1, image_url = '', barcodes = [] } = req.body;

  if (!name || !name.trim()) return res.jsonError('Nombre del producto requerido', 400);
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) return res.jsonError('Precio inválido', 400);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          store_id: req.user.storeId,
          name: name.trim(),
          sku: sku || null,
          price: parseFloat(price),
          cost: parseFloat(cost),
          stock: parseFloat(stock),
          category_id: category_id ? parseInt(category_id) : null,
          active: parseInt(active),
          image_url
        }
      });

      if (Number(stock) !== 0) {
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
              data: { product_id: product.id, code: code.trim() }
            }).catch(() => { });
          }
        }
      }

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

router.put('/:id', auth, requirePermission(PERMISSIONS.PRODUCTS_EDIT), productUpdateRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.jsonError(errors.array()[0].msg, 400);

  const { name, sku, price, cost, stock, category_id, active, image_url, barcodes } = req.body;
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.jsonError('ID inválido', 400);

  try {
    const current = await prisma.product.findFirst({
      where: { id, store_id: req.user.storeId, deleted_at: null }
    });
    if (!current) return res.jsonError('No encontrado', 404);

    const oldStock = Number(current.stock || 0);
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

      if (Math.abs(diff) > 0.001) {
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
        await tx.productBarcode.deleteMany({ where: { product_id: id } });
        for (const code of barcodes) {
          if (code && code.trim()) {
            await tx.productBarcode.create({
              data: { product_id: id, code: code.trim() }
            }).catch(() => { });
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

router.delete('/:id', auth, requirePermission(PERMISSIONS.PRODUCTS_DELETE), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.jsonError('ID inválido', 400);

    const product = await prisma.product.findFirst({
      where: { id, store_id: req.user.storeId, deleted_at: null }
    });
    if (!product) return res.jsonError('No encontrado', 404);

    const hasSales = await prisma.saleItem.count({ where: { product_id: id } });
    if (hasSales > 0) {
      await prisma.product.update({
        where: { id },
        data: {
          deleted_at: new Date(),
          deleted_by: req.user.uid,
          active: 0
        }
      });
      return res.jsonResponse({ ok: true, softDeleted: true, message: 'Producto archivado (tiene ventas asociadas)' });
    }

    await prisma.product.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: req.user.uid,
        active: 0
      }
    });
    res.jsonResponse({ ok: true, softDeleted: false });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al eliminar producto', 500);
  }
});

module.exports = router;
