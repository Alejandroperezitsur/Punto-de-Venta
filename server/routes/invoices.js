const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth } = require('./auth');
const invoiceService = require('../services/invoiceService');

// Helper to get Fiscal Config
async function getStoreFiscalData(storeId) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store || !store.rfc) throw new Error('Tienda no configurada fiscalmente. Falta RFC.');
    return {
        rfc: store.rfc,
        name: store.fiscal_name || store.name,
        regime: store.tax_regime || '601',
        zipCode: store.zip_code
    };
}

// Emit Invoice from Sale
router.post('/emit', auth, async (req, res) => {
    const { saleId, customerData } = req.body; // customerData override optional

    try {
        const sale = await prisma.sale.findUnique({
            where: { id: parseInt(saleId) },
            include: { items: { include: { product: true } }, customer: true }
        });

        if (!sale) return res.jsonError('Venta no encontrada', 404);
        if (sale.store_id !== req.user.storeId) return res.jsonError('Acceso denegado', 403);

        const existing = await prisma.invoice.findFirst({
            where: { sale_id: sale.id, status: { not: 'cancelled' } }
        });
        if (existing) return res.jsonError('Esta venta ya fue facturada', 400);

        // Prepare Data
        const emitter = await getStoreFiscalData(req.user.storeId);

        // Receiver Data: Use provided or fallback to customer DB
        const receiver = {
            rfc: customerData?.rfc || sale.customer?.rfc,
            name: customerData?.fiscal_name || sale.customer?.fiscal_name || sale.customer?.name,
            regime: customerData?.tax_regime || sale.customer?.tax_regime || '616',
            zipCode: customerData?.zip_code || sale.customer?.zip_code,
            useCFDI: customerData?.use_cfdi || sale.customer?.use_cfdi || 'G03'
        };

        if (!receiver.rfc) return res.jsonError('Falta RFC del cliente', 400);

        // Generate XML
        const invoiceData = {
            emitter,
            receiver,
            items: sale.items.map(i => ({
                quantity: i.quantity,
                description: i.product.name,
                unitPrice: i.unit_price,
                lineTotal: i.line_total
            })),
            subtotal: sale.subtotal,
            tax: sale.tax,
            total: sale.total,
            paymentMethod: 'PUE', // Simplified
            zipCode: emitter.zipCode
        };

        const xmlRaw = invoiceService.generateXML(invoiceData);

        // Stamp
        const stampResult = await invoiceService.stampInvoice(xmlRaw);

        // Save to DB
        const invoice = await prisma.invoice.create({
            data: {
                store_id: req.user.storeId,
                sale_id: sale.id,
                customer_id: sale.customer_id,
                uuid: stampResult.uuid,
                rfc_emisor: emitter.rfc,
                rfc_receptor: receiver.rfc,
                total: sale.total,
                status: 'stamped',
                xml_url: `https://api.fake-pac.com/xml/${stampResult.uuid}`, // Mock URL
                pdf_url: `https://api.fake-pac.com/pdf/${stampResult.uuid}`, // Mock URL
                stamped_at: new Date()
            }
        });

        // Audit
        try {
            await prisma.audit.create({
                data: {
                    store_id: req.user.storeId,
                    event: 'invoice_emit',
                    user_id: req.user.uid,
                    ref_type: 'invoice',
                    ref_id: invoice.id,
                    data: JSON.stringify({ uuid: invoice.uuid, amount: invoice.total })
                }
            });
        } catch { }

        res.jsonResponse(invoice);

    } catch (e) {
        console.error(e);
        res.jsonError(e.message || 'Error al facturar', 500);
    }
});

router.get('/:id', auth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const invoice = await prisma.invoice.findFirst({
            where: { id, store_id: req.user.storeId }
        });
        if (!invoice) return res.jsonError('Factura no encontrada', 404);
        res.jsonResponse(invoice);
    } catch (e) {
        res.jsonError(e.message);
    }
});

module.exports = router;
