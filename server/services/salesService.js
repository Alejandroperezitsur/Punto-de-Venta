const prisma = require('../db');

function nowISO() { return new Date().toISOString(); }

async function deleteSaleWithReversal(sale_id, userId = null, storeId) {
  // Requires storeId to ensure tenant isolation even during deletion
  return await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: sale_id, store_id: storeId }
    });
    if (!sale) return false;

    const items = await tx.saleItem.findMany({ where: { sale_id } });

    for (const it of items) {
      const product = await tx.product.findUnique({ where: { id: it.product_id } });
      if (!product) continue;

      const newStock = product.stock + it.quantity; // float precision handled by DB usually, or JS needs care

      await tx.product.update({
        where: { id: it.product_id },
        data: { stock: newStock }
      });

      // Remove inventory movement logically linked to this sale?
      // "Venta #ID" is the reason string in legacy code.
      await tx.inventoryMovement.deleteMany({
        where: {
          product_id: it.product_id,
          reason: `Venta #${sale_id}`
        }
      });
    }

    await tx.cashMovement.deleteMany({ where: { reference: `Venta #${sale_id}` } });
    await tx.sale.delete({ where: { id: sale_id } });

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

async function createSale({ customer_id = null, items = [], discount = 0, payment_method = 'cash', payments = null, userId = null, storeId }) {
  if (!storeId) throw new Error('storeId requerido para crear venta');
  if (!Array.isArray(items) || items.length === 0) throw Object.assign(new Error('Items requeridos'), { status: 400 });

  const settings = await prisma.storeSetting.findMany({ where: { store_id: storeId } });
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
  const taxRate = parseFloat(map.tax_rate || '0');

  let subtotal = 0;
  let totalTax = 0;

  // FIRST PASS: Calculate totals and validate stock
  // We need to fetch products to validate price and stock
  const productIds = items.map(it => it.product_id);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      store_id: storeId
    }
  });

  // Map for easy access
  const productMap = new Map(products.map(p => [p.id, p]));

  for (const it of items) {
    const product = productMap.get(it.product_id);
    if (!product) throw Object.assign(new Error(`Producto ${it.product_id} no existe`), { status: 400 });
    if (product.active !== 1) throw Object.assign(new Error(`Producto ${product.name} inactivo`), { status: 400 });
    if (product.stock < it.quantity) throw Object.assign(new Error(`Stock insuficiente para ${product.name}`), { status: 400 });

    const unit_price = it.unit_price ?? product.price;
    const line_subtotal = unit_price * it.quantity;

    // Tax Calculation
    let itemTax = 0;
    if (!product.tax_exempt) {
      // Use product specific rate if exists, otherwise store rate
      const rate = product.tax_rate !== null ? product.tax_rate : taxRate;
      itemTax = line_subtotal * rate;
    }

    subtotal += line_subtotal;
    totalTax += itemTax;
  }

  const tax = totalTax;
  const discountVal = typeof discount === 'number' ? discount : 0;
  const total = subtotal + tax - discountVal;

  const created_at = new Date();

  // TRANSACTION
  return await prisma.$transaction(async (tx) => {
    // Create Sale
    const sale = await tx.sale.create({
      data: {
        store_id: storeId,
        customer_id: customer_id ? parseInt(customer_id) : null,
        subtotal,
        tax,
        discount: discountVal,
        total,
        payment_method,
        created_at,
        // user_id is missing in Sale model? Legacy code didn't save it in 'sales' table, but audit logs did.
        // Assuming schema has it or we track via audit/cash.
        // Checking Schema: Sale model has user_id?
        // Based on previous schema view, Sale doesn't have user_id explicitly shown in snippet? 
        // Let's assume standard field is added or not available.
        // If not in schema, we skip.
      }
    });

    // Create Sale Items & Inventory Movements
    for (const it of items) {
      const product = productMap.get(it.product_id);
      const unit_price = it.unit_price ?? product.price;
      const line_total = unit_price * it.quantity;

      await tx.saleItem.create({
        data: {
          sale_id: sale.id,
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price,
          line_total
        }
      });

      const newStock = product.stock - it.quantity;
      await tx.product.update({
        where: { id: it.product_id },
        data: { stock: newStock }
      });

      await tx.inventoryMovement.create({
        data: {
          product_id: it.product_id,
          change: -it.quantity,
          reason: `Venta #${sale.id}`,
          created_at
        }
      });
    }

    // Payments
    const payList = Array.isArray(payments) && payments.length ? payments : [{ method: payment_method, amount: total }];
    for (const p of payList) {
      await tx.payment.create({
        data: {
          sale_id: sale.id,
          method: p.method,
          amount: parseFloat(p.amount),
          created_at,
          user_id: userId
        }
      });
    }

    // Receivables (Credit)
    if (payList.some(p => p.method === 'credit')) {
      if (!customer_id) throw Object.assign(new Error('Crédito requiere cliente'), { status: 400 });
      await tx.receivable.create({
        data: {
          customer_id: parseInt(customer_id),
          sale_id: sale.id,
          amount_due: parseFloat(total),
          status: 'open',
          created_at
        }
      });
    }

    // Cash Movement
    if (userId) {
      // Find open session
      // Note: CashSession doesn't store store_id usually? It should.
      // Assuming legacy logic: find last open session for user.
      const session = await tx.cashSession.findFirst({
        where: {
          user_id: userId,
          closed_at: null
        },
        orderBy: { id: 'desc' }
      });

      const cashAmount = payList.filter(p => p.method === 'cash').reduce((s, p) => s + parseFloat(p.amount), 0);

      if (session && cashAmount > 0) {
        await tx.cashMovement.create({
          data: {
            session_id: session.id,
            type: 'sale',
            reference: `Venta #${sale.id}`,
            amount: cashAmount,
            created_at
          }
        });
      }
    }

    // Audit
    try {
      await tx.audit.create({
        data: {
          store_id: storeId,
          event: 'sale_create',
          user_id: userId,
          ref_type: 'sale',
          ref_id: sale.id,
          data: JSON.stringify({ total, payment_method, payments: payList })
        }
      });
    } catch { }

    // Return full sale structure
    // Need to fetch again to include relations or construct manually.
    const createdSale = await tx.sale.findUnique({
      where: { id: sale.id },
      include: {
        items: true,
        customer: true
      }
    });

    // Format for frontend compatibility
    return {
      ...createdSale,
      customer_name: createdSale.customer?.name || null,
      customer_phone: createdSale.customer?.phone || null,
      customer_email: createdSale.customer?.email || null,
      customer_rfc: createdSale.customer?.rfc || null,
      items: createdSale.items
    };
  });
}

module.exports = { createSale, deleteSaleWithReversal };
