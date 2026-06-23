import React, { useState } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { X, FileText, Download, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export function InvoiceModal({ sale, onClose }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [customerData, setCustomerData] = useState({
        rfc: sale.customer_rfc || '',
        fiscal_name: sale.customer_name || '',
        tax_regime: '616',
        zip_code: '',
        use_cfdi: 'G03'
    });

    const handleEmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api('/invoices/emit', {
                method: 'POST',
                body: JSON.stringify({ saleId: sale.id, customerData })
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[var(--z-modal)]">
                <Card className="p-6 max-w-md w-full text-center">
                    <div className="size-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="size-8 text-success" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">¡Factura Timbrada!</h2>
                    <p className="text-sm text-muted-foreground mb-1">Folio Fiscal (UUID):</p>
                    <p className="font-mono text-xs bg-muted/30 rounded-lg px-3 py-2 mb-6 break-all">{success.uuid}</p>
                    <div className="flex gap-3">
                        <Button asChild variant="outline" className="flex-1">
                            <a href={success.pdf_url} target="_blank" rel="noreferrer">
                                <FileText className="size-4 mr-2" />
                                PDF
                            </a>
                        </Button>
                        <Button asChild variant="outline" className="flex-1">
                            <a href={success.xml_url} target="_blank" rel="noreferrer">
                                <Download className="size-4 mr-2" />
                                XML
                            </a>
                        </Button>
                    </div>
                    <Button variant="ghost" onClick={onClose} className="w-full mt-4">Cerrar</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[var(--z-modal)]">
            <Card className="p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="size-4 text-primary" />
                        </div>
                        <h2 className="text-lg font-bold text-foreground">Facturar Venta #{sale.id}</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="size-4" />
                    </Button>
                </div>

                {error && (
                    <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger mb-4">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">RFC Receptor</label>
                        <input
                            value={customerData.rfc}
                            onChange={e => setCustomerData({ ...customerData, rfc: e.target.value.toUpperCase() })}
                            className="w-full p-3 rounded-xl border border-border/40 bg-background text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/50"
                            placeholder="XAXX010101000"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Nombre Fiscal / Razon Social</label>
                        <input
                            value={customerData.fiscal_name}
                            onChange={e => setCustomerData({ ...customerData, fiscal_name: e.target.value })}
                            className="w-full p-3 rounded-xl border border-border/40 bg-background text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Regimen Fiscal</label>
                            <select
                                value={customerData.tax_regime}
                                onChange={e => setCustomerData({ ...customerData, tax_regime: e.target.value })}
                                className="w-full p-3 rounded-xl border border-border/40 bg-background text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                            >
                                <option value="616">Sin obligaciones (616)</option>
                                <option value="601">General Ley PM (601)</option>
                                <option value="626">RESICO (626)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Uso CFDI</label>
                            <select
                                value={customerData.use_cfdi}
                                onChange={e => setCustomerData({ ...customerData, use_cfdi: e.target.value })}
                                className="w-full p-3 rounded-xl border border-border/40 bg-background text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                            >
                                <option value="G03">Gastos en general (G03)</option>
                                <option value="S01">Sin efectos fiscales (S01)</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Codigo Postal</label>
                        <input
                            value={customerData.zip_code}
                            onChange={e => setCustomerData({ ...customerData, zip_code: e.target.value })}
                            className="w-full p-3 rounded-xl border border-border/40 bg-background text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                            maxLength={5}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button
                        onClick={handleEmit}
                        disabled={loading || !customerData.rfc}
                        isLoading={loading}
                    >
                        {loading ? 'Timbrando...' : 'Timbrar Factura'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
