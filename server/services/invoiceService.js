const { v4: uuidv4 } = require('uuid');

class InvoiceService {
    /**
     * Generates a CFDI 4.0 XML (Mock)
     * @param {Object} data - Invoice data (emitter, receiver, items, totals)
     */
    generateXML(data) {
        // In a real app, use a library like 'cfdi40' or 'xmlbuilder'
        // Constructing a minimal reliable mock XML string
        const date = new Date().toISOString();
        const subtotal = data.subtotal.toFixed(2);
        const total = data.total.toFixed(2);
        const tax = data.tax.toFixed(2);

        return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante Version="4.0" Fecha="${date}" SubTotal="${subtotal}" Total="${total}" Moneda="MXN" TipoDeComprobante="I" Exportacion="01" MetodoPago="${data.paymentMethod}" LugarExpedicion="${data.zipCode}" xmlns:cfdi="http://www.sat.gob.mx/cfd/4">
    <cfdi:Emisor Rfc="${data.emitter.rfc}" Nombre="${data.emitter.name}" RegimenFiscal="${data.emitter.regime}"/>
    <cfdi:Receptor Rfc="${data.receiver.rfc}" Nombre="${data.receiver.name}" UsoCFDI="${data.receiver.useCFDI}" DomicilioFiscalReceptor="${data.receiver.zipCode}" RegimenFiscalReceptor="${data.receiver.regime}"/>
    <cfdi:Conceptos>
        ${data.items.map(item => `
        <cfdi:Concepto ClaveProdServ="01010101" Cantidad="${item.quantity}" ClaveUnidad="H87" Description="${item.description}" ValorUnitario="${item.unitPrice}" Importe="${item.lineTotal}" ObjetoImp="02">
            <cfdi:Impuestos>
                <cfdi:Traslados>
                    <cfdi:Traslado Base="${item.lineTotal}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${(item.lineTotal * 0.16).toFixed(2)}"/>
                </cfdi:Traslados>
            </cfdi:Impuestos>
        </cfdi:Concepto>`).join('')}
    </cfdi:Conceptos>
    <cfdi:Impuestos TotalImpuestosTrasladados="${tax}">
        <cfdi:Traslados>
            <cfdi:Traslado Base="${subtotal}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${tax}"/>
        </cfdi:Traslados>
    </cfdi:Impuestos>
</cfdi:Comprobante>`;
    }

    /**
     * Simulates sending XML to PAC for stamping
     * @param {String} xml 
     */
    async stampInvoice(xml) {
        // Mock PAC delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate UUID, simulate SAT/PAC Stamp
        const uuid = uuidv4();
        const stampDate = new Date().toISOString();

        // Inject TimbreFiscalDigital
        const stampedXml = xml.replace('</cfdi:Comprobante>', `
    <cfdi:Complemento>
        <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="${uuid}" FechaTimbrado="${stampDate}" SelloCFD="MOCK_SIGNATURE_CFD" NoCertificadoSAT="00001000000504465028" SelloSAT="MOCK_SIGNATURE_SAT"/>
    </cfdi:Complemento>
</cfdi:Comprobante>`);

        return {
            uuid,
            xml: stampedXml,
            status: 'stamped',
            pac_message: 'Timbrado exitoso (Simulado)'
        };
    }

    async cancelInvoice(uuid) {
        // Mock cancellation
        await new Promise(resolve => setTimeout(resolve, 800));
        return {
            uuid,
            status: 'cancelled',
            ack: 'MOCK_CANCELLATION_ACKNOWLEDGE'
        };
    }
}

module.exports = new InvoiceService();
