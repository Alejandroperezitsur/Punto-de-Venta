import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {
    ChevronRight, ChevronLeft, Check, Building, User, Package,
    ShoppingCart, Percent, Sparkles, PartyPopper
} from 'lucide-react';

const STEPS = [
    { id: 'welcome', title: 'Bienvenido', icon: Sparkles },
    { id: 'business', title: 'Tu Negocio', icon: Building },
    { id: 'tax', title: 'Impuestos', icon: Percent },
    { id: 'admin', title: 'Administrador', icon: User },
    { id: 'product', title: 'Primer Producto', icon: Package },
    { id: 'done', title: '¡Listo!', icon: PartyPopper },
];

const OnboardingWizard = () => {
    const navigate = useNavigate();
    const { login } = useAppStore();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({
        business_name: '',
        business_address: '',
        business_phone: '',
        tax_rate: '16',
        tax_name: 'IVA',
        admin_username: 'admin',
        admin_password: '',
        product_name: '',
        product_price: '',
        product_sku: '',
    });

    const updateData = (key, value) => {
        setData(prev => ({ ...prev, [key]: value }));
    };

    const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
    const prev = () => setStep(s => Math.max(s - 1, 0));

    const handleComplete = async () => {
        setLoading(true);
        try {
            // Save settings
            await api('/settings', {
                method: 'PUT',
                body: JSON.stringify({
                    business_name: data.business_name,
                    business_address: data.business_address,
                    business_phone: data.business_phone,
                    tax_rate: (parseFloat(data.tax_rate) / 100).toFixed(4),
                    tax_name: data.tax_name,
                    onboarding_complete: '1',
                })
            });

            // Create first product if provided
            if (data.product_name && data.product_price) {
                await api('/products', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: data.product_name,
                        price: parseFloat(data.product_price),
                        sku: data.product_sku || `SKU-${Date.now()}`,
                        stock: 100,
                    })
                });
            }

            // Login
            const res = await api('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username: 'admin', password: 'admin123' })
            });
            login(res.user, res.token);
            navigate('/ventas');
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const currentStep = STEPS[step];
    const progress = ((step + 1) / STEPS.length) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
            <Card className="w-full max-w-xl p-8 shadow-2xl animate-fade-in">
                {/* Progress */}
                <div className="mb-8">
                    <div className="flex justify-between mb-2">
                        {STEPS.map((s, i) => (
                            <div
                                key={s.id}
                                className={`flex items-center justify-center h-8 w-8 rounded-full transition-all ${i < step ? 'bg-green-500 text-white' :
                                        i === step ? 'bg-[hsl(var(--primary))] text-white ring-4 ring-blue-200' :
                                            'bg-gray-200 text-gray-400'
                                    }`}
                            >
                                {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                            </div>
                        ))}
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Step Content */}
                <div className="min-h-[280px]">
                    {step === 0 && (
                        <div className="text-center py-8">
                            <Sparkles className="h-16 w-16 mx-auto text-[hsl(var(--primary))] mb-4" />
                            <h2 className="text-2xl font-bold mb-2">¡Bienvenido a POS Pro!</h2>
                            <p className="text-[hsl(var(--muted-foreground))]">
                                Configuremos tu sistema de punto de venta en solo unos minutos.
                            </p>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Building className="h-5 w-5" /> Información del Negocio
                            </h2>
                            <Input
                                placeholder="Nombre del negocio"
                                value={data.business_name}
                                onChange={e => updateData('business_name', e.target.value)}
                            />
                            <Input
                                placeholder="Dirección (opcional)"
                                value={data.business_address}
                                onChange={e => updateData('business_address', e.target.value)}
                            />
                            <Input
                                placeholder="Teléfono (opcional)"
                                value={data.business_phone}
                                onChange={e => updateData('business_phone', e.target.value)}
                            />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Percent className="h-5 w-5" /> Configuración de Impuestos
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    placeholder="Nombre (ej: IVA)"
                                    value={data.tax_name}
                                    onChange={e => updateData('tax_name', e.target.value)}
                                />
                                <Input
                                    type="number"
                                    placeholder="Tasa (%)"
                                    value={data.tax_rate}
                                    onChange={e => updateData('tax_rate', e.target.value)}
                                />
                            </div>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                Puedes cambiar esto después en Configuración.
                            </p>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <User className="h-5 w-5" /> Usuario Administrador
                            </h2>
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm"><strong>Usuario:</strong> admin</p>
                                <p className="text-sm"><strong>Contraseña:</strong> admin123</p>
                            </div>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                Recuerda cambiar la contraseña después de iniciar sesión.
                            </p>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Package className="h-5 w-5" /> Tu Primer Producto
                            </h2>
                            <Input
                                placeholder="Nombre del producto"
                                value={data.product_name}
                                onChange={e => updateData('product_name', e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    type="number"
                                    placeholder="Precio"
                                    value={data.product_price}
                                    onChange={e => updateData('product_price', e.target.value)}
                                />
                                <Input
                                    placeholder="SKU (opcional)"
                                    value={data.product_sku}
                                    onChange={e => updateData('product_sku', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="text-center py-8">
                            <PartyPopper className="h-16 w-16 mx-auto text-green-500 mb-4" />
                            <h2 className="text-2xl font-bold mb-2">¡Todo Listo!</h2>
                            <p className="text-[hsl(var(--muted-foreground))]">
                                Tu sistema POS está configurado y listo para usar.
                            </p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                    {step > 0 && step < STEPS.length - 1 ? (
                        <Button variant="outline" onClick={prev}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                        </Button>
                    ) : <div />}

                    {step < STEPS.length - 1 ? (
                        <Button onClick={next}>
                            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    ) : (
                        <Button onClick={handleComplete} isLoading={loading} className="bg-green-600 hover:bg-green-700">
                            <ShoppingCart className="h-4 w-4 mr-2" /> Comenzar a Vender
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default OnboardingWizard;
