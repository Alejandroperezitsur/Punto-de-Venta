import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';

export function InvoiceModal({ sale, onClose }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [customerData, setCustomerData] = useState({
        rfc: sale.customer_rfc || '',
        fiscal_name: sale.customer_name || '',
        tax_regime: '616', // Sin obligaciones fiscales default
        zip_code: '',
        use_cfdi: 'G03' // Gastos en general default
    });

    const handleEmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/invoices/emit', {
                saleId: sale.id,
                customerData
            });
            setSuccess(res);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h2 className="text-xl font-bold text-green-600 mb-4">¡Factura Timbrada!</h2>
                    <p className="mb-4">Folio Fiscal (UUID): <br /><span className="font-mono text-sm">{success.uuid}</span></p>
                    <div className="flex gap-4">
                        <a href={success.pdf_url} target="_blank" className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">PDF</a>
                        <a href={success.xml_url} target="_blank" className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800">XML</a>
                    </div>
                    <button onClick={onClose} className="mt-6 w-full text-gray-500 hover:text-gray-700">Cerrar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Facturar Venta #{sale.id}</h2>

                {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">RFC Receptor</label>
                        <input
                            value={customerData.rfc}
                            onChange={e => setCustomerData({ ...customerData, rfc: e.target.value.toUpperCase() })}
                            className="w-full border p-2 rounded"
                            placeholder="XAXX010101000"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Nombre Fiscal / Razón Social</label>
                        <input
                            value={customerData.fiscal_name}
                            onChange={e => setCustomerData({ ...customerData, fiscal_name: e.target.value })}
                            className="w-full border p-2 rounded"
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="w-1/2">
                            <label className="block text-sm font-medium">Régimen Fiscal</label>
                            <select
                                value={customerData.tax_regime}
                                onChange={e => setCustomerData({ ...customerData, tax_regime: e.target.value })}
                                className="w-full border p-2 rounded"
                            >
                                <option value="616">Sin obligaciones (616)</option>
                                <option value="601">General Ley PM (601)</option>
                                <option value="626">RESICO (626)</option>
                            </select>
                        </div>
                        <div className="w-1/2">
                            <label className="block text-sm font-medium">Uso CFDI</label>
                            <select
                                value={customerData.use_cfdi}
                                onChange={e => setCustomerData({ ...customerData, use_cfdi: e.target.value })}
                                className="w-full border p-2 rounded"
                            >
                                <option value="G03">Gastos en general (G03)</option>
                                <option value="S01">Sin efectos fiscales (S01)</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Código Postal</label>
                        <input
                            value={customerData.zip_code}
                            onChange={e => setCustomerData({ ...customerData, zip_code: e.target.value })}
                            className="w-full border p-2 rounded"
                            maxLength={5}
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button
                        onClick={handleEmit}
                        disabled={loading || !customerData.rfc}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Timbrando...' : 'Timbrar Factura'}
                    </button>
                </div>
            </div>
        </div>
    );
}
