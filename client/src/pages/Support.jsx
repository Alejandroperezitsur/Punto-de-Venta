import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { ChevronDown, Send, CheckCircle, Wifi } from 'lucide-react';

export function Support() {
    const [issue, setIssue] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            console.log('Report sent:', issue);
            setSent(true);
        } catch (e) {
            alert('Error al enviar reporte');
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <nav className="border-b border-border/40 bg-card/80 backdrop-blur-md sticky top-0 z-[var(--z-sticky)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link to="/" className="text-2xl font-bold text-primary">POS Pro</Link>
                </div>
            </nav>

            <div className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
                <h1 className="text-3xl font-bold text-foreground mb-8">Centro de Ayuda</h1>

                <Card className="p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Estado del Sistema</h3>
                            <p className="text-sm text-muted-foreground">Todos los servicios operacionales</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="size-2.5 bg-success rounded-full animate-pulse" />
                            <span className="text-sm font-semibold text-success">Online</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4 text-foreground">Preguntas Frecuentes</h2>
                    <div className="space-y-3">
                        {[
                            { q: '¿Como puedo emitir una factura?', a: 'Ve al historial de ventas, selecciona una venta y haz clic en el boton "Facturar". Ingresa el RFC del cliente y listo.' },
                            { q: '¿Puedo usar POS Pro sin internet?', a: 'Si. POS Pro funciona offline gracias a su tecnologia PWA. Las ventas se sincronizan cuando recuperas la conexion.' },
                        ].map((faq, i) => (
                            <details key={i} className="group">
                                <summary className="list-none flex justify-between items-center font-medium cursor-pointer text-foreground py-3 px-4 rounded-xl hover:bg-muted/30 transition-colors">
                                    {faq.q}
                                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                                </summary>
                                <p className="text-sm text-muted-foreground mt-2 px-4 pb-3 group-open:animate-fade-in">
                                    {faq.a}
                                </p>
                            </details>
                        ))}
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-foreground">Reportar un problema</h2>
                    {sent ? (
                        <div className="p-6 rounded-xl bg-success/10 border border-success/20 text-center">
                            <CheckCircle className="size-10 text-success mx-auto mb-3" />
                            <p className="font-semibold text-foreground">¡Gracias! Tu reporte ha sido enviado.</p>
                            <p className="text-sm text-muted-foreground mt-1">Nuestro equipo lo revisara pronto.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">Descripcion del problema</label>
                                <textarea
                                    className="w-full p-3 rounded-xl border border-border/40 bg-background text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all min-h-[120px] placeholder:text-muted-foreground/50"
                                    placeholder="Describe que sucedio..."
                                    value={issue}
                                    onChange={e => setIssue(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                <Send className="size-4 mr-2" />
                                Enviar Reporte
                            </Button>
                        </form>
                    )}
                </Card>
            </div>
            <Footer />
        </div>
    );
}
