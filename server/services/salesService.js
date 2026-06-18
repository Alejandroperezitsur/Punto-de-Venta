const prisma = require('../db');

function nowISO() { return new Date().toISOString(); }

const DECIMAL_PRECISION = 4;

function toDecimal(value) {
  const num = Number(value) || 0;
  return Math.round(num * 10 ** DECIMAL_PRECISION) / 10 ** DECIMAL_PRECISION;
}

async function createSale({ customer_id = null, items = [], discount = 0, payment_method = 'cash', payments = null, userId = null, storeId, idempotencyKey = null }) {
  if (!storeId) throw Object.assign(new Error('storeId requerido para crear venta'), { status: 400 });
  if (!Array.isArray(items) || items.length === 0) throw Object.assign(new Error('Items requeridos'), { status: 400 });

  const settings = await prisma.storeSetting.findMany({ where: { store_id: storeId } });
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
  const taxRate = parseFloat(map.tax_rate || '0.16');

  if (isNaN(taxRate) || taxRate < 0) throw Object.assign(new Error('Configuración de IVA inválida'), { status: 500 });

  let subtotal = 0;
  let totalTax = 0;

  return await prisma.$transaction(async (tx) => {
    const productIds = items.map(it => it.product_id);
    if (productIds.length === 0) throw Object.assign(new Error('Items requeridos'), { status: 400 });

    const products = await tx.product.findMany({
      where: { id: { in: productIds }, store_id: storeId, deleted_at: null }
    });

    if (products.length !== productIds.length) {
      const found = new Set(products.map(p => p.id));
      const missing = productIds.filter(id => !found.has(id));
      throw Object.assign(new Error(`Productos no encontrados: ${missing.join(', ')}`), { status: 400 });
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    for (const it of items) {
      const product = productMap.get(it.product_id);
      if (!product) throw Object.assign(new Error(`Producto ${it.product_id} no existe`), { status: 400 });
      if (product.active !== 1) throw Object.assign(new Error(`Producto ${product.name} inactivo`), { status: 400 });
      if (Number(product.stock) < Number(it.quantity)) {
        throw Object.assign(new Error(`Stock insuficiente para ${product.name}: disponible ${Number(product.stock)}, solicitado ${Number(it.quantity)}`), { status: 409 });
      }

      const unit_price = it.unit_price ?? Number(product.price);
      const qty = Number(it.quantity);
      if (qty <= 0) throw Object.assign(new Error(`Cantidad inválida para ${product.name}`), { status: 400 });

      const line_subtotal = unit_price * qty;

      let itemTax = 0;
      if (!product.tax_exempt) {
        const rate = product.tax_rate !== null ? Number(product.tax_rate) : taxRate;
        itemTax = line_subtotal * rate;
      }

      subtotal += line_subtotal;
      totalTax += itemTax;
    }

    const tax = toDecimal(totalTax);
    const discountVal = Math.max(0, typeof discount === 'number' ? discount : 0);
    const total = toDecimal(Math.max(0, subtotal + tax - discountVal));
    const created_at = new Date();

    const sale = await tx.sale.create({
      data: {
        store_id: storeId,
        customer_id: customer_id ? parseInt(customer_id) : null,
        subtotal: toDecimal(subtotal),
        tax,
        discount: discountVal,
        total,
        payment_method,
        created_at,
        idempotency_key: idempotencyKey
      }
    });

    for (const it of items) {
      const product = productMap.get(it.product_id);
      const unit_price = it.unit_price ?? Number(product.price);
      const qty = Number(it.quantity);
      const line_total = toDecimal(unit_price * qty);

      await tx.saleItem.create({
        data: {
          sale_id: sale.id,
          product_id: it.product_id,
          quantity: qty,
          unit_price: toDecimal(unit_price),
          line_total,
          product_name: product.name
        }
      });

      const newStock = Math.max(0, Number(product.stock) - qty);
      await tx.product.update({
        where: { id: it.product_id },
        data: { stock: toDecimal(newStock) }
      });

      await tx.inventoryMovement.create({
        data: {
          product_id: it.product_id,
          change: -qty,
          reason: `Venta #${sale.id}`,
          created_at
        }
      });
    }

    const payList = Array.isArray(payments) && payments.length ? payments : [{ method: payment_method, amount: total }];

    // Validate payment amounts sum covers the total
    const paymentSum = payList.reduce((sum, p) => sum + toDecimal(p.amount), 0);
    if (paymentSum < total - 0.01) {
      throw Object.assign(
        new Error(`Suma de pagos (${toDecimal(paymentSum)}) insuficiente para el total (${total})`),
        { status: 400 }
      );
    }

    // Validate payment methods
    const validMethods = ['cash', 'card', 'transfer', 'credit'];
    for (const p of payList) {
      if (!validMethods.includes(p.method)) {
        throw Object.assign(new Error(`Método de pago inválido: ${p.method}`), { status: 400 });
      }
      if (toDecimal(p.amount) < 0) {
        throw Object.assign(new Error('Los montos de pago no pueden ser negativos'), { status: 400 });
      }
    }

    let cashAmount = 0;
    for (const p of payList) {
      const amount = toDecimal(p.amount);
      if (amount <= 0) continue;

      await tx.payment.create({
        data: {
          sale_id: sale.id,
          method: p.method,
          amount,
          created_at,
          user_id: userId
        }
      });

      if (p.method === 'cash') cashAmount += amount;
    }

    if (payList.some(p => p.method === 'credit')) {
      if (!customer_id) throw Object.assign(new Error('Crédito requiere cliente'), { status: 400 });
      await tx.receivable.create({
        data: {
          customer_id: parseInt(customer_id),
          sale_id: sale.id,
          amount_due: toDecimal(total),
          status: 'open',
          created_at
        }
      });
    }

    if (userId && cashAmount > 0) {
      const session = await tx.cashSession.findFirst({
        where: {
          user_id: userId,
          store_id: storeId,
          closed_at: null
        },
        orderBy: { id: 'desc' }
      });

      if (session) {
        await tx.cashMovement.create({
          data: {
            session_id: session.id,
            type: 'sale',
            reference: `Venta #${sale.id}`,
            amount: toDecimal(cashAmount),
            created_at
          }
        });
      }
    }

    try {
      await tx.audit.create({
        data: {
          store_id: storeId,
          event: 'sale_create',
          user_id: userId,
          ref_type: 'sale',
          ref_id: sale.id,
          data: JSON.stringify({
            total: Number(total),
            payment_method,
            payments: payList.map(p => ({ method: p.method, amount: Number(p.amount) }))
          })
        }
      });
    } catch { }

    const createdSale = await tx.sale.findUnique({
      where: { id: sale.id },
      include: { items: true, customer: true }
    });

    return {
      ...createdSale,
      customer_name: createdSale.customer?.name || null,
      customer_phone: createdSale.customer?.phone || null,
      customer_email: createdSale.customer?.email || null,
      customer_rfc: createdSale.customer?.rfc || null,
      items: createdSale.items,
      total: Number(createdSale.total),
      subtotal: Number(createdSale.subtotal),
      tax: Number(createdSale.tax),
      discount: Number(createdSale.discount)
    };
  });
}

async function deleteSaleWithReversal(sale_id, userId = null, storeId) {
  return await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: sale_id, store_id: storeId }
    });
    if (!sale) return false;

    const items = await tx.saleItem.findMany({ where: { sale_id } });

    for (const it of items) {
      const product = await tx.product.findUnique({ where: { id: it.product_id } });
      if (!product) continue;

      const newStock = Math.max(0, Number(product.stock) + Number(it.quantity));
      await tx.product.update({
        where: { id: it.product_id },
        data: { stock: newStock }
      });

      await tx.inventoryMovement.deleteMany({
        where: {
          product_id: it.product_id,
          reason: `Venta #${sale_id}`
        }
      });
    }

    await tx.cashMovement.deleteMany({ where: { reference: `Venta #${sale_id}` } });

    try {
      await tx.payment.deleteMany({ where: { sale_id } });
      await tx.saleItem.deleteMany({ where: { sale_id } });
      await tx.receivable.deleteMany({ where: { sale_id } });
      await tx.sale.delete({ where: { id: sale_id } });
    } catch (e) {
      throw Object.assign(new Error(`No se pudo revertir la venta #${sale_id}: ${e.message}`), { status: 400 });
    }

    try {
      await tx.audit.create({
        data: {
          store_id: storeId,
          event: 'sale_reverse',
          user_id: userId,
          ref_type: 'sale',
          ref_id: sale_id,
          data: null
        }
      });
    } catch { }

    return true;
  });
}

module.exports = { createSale, deleteSaleWithReversal };
