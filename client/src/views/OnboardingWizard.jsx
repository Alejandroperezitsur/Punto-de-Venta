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
        admin_password: 'admin123',
        product_name: '',
        product_price: '',
    });

    const updateData = (key, value) => {
        setData(prev => ({ ...prev, [key]: value }));
    };

    const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
    const prev = () => setStep(s => Math.max(s - 1, 0));

    const handleComplete = async () => {
        setLoading(true);
        try {
            // Save settings - Automated defaults
            await api('/settings', {
                method: 'PUT',
                body: JSON.stringify({
                    business_name: data.business_name || 'Mi Negocio',
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
                        sku: `SKU-${Date.now()}`,
                        stock: 999, // High default
                    })
                });
            }

            // Login - Automated for first time
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
            <Card className="w-full max-w-xl p-10 rounded-[3rem] shadow-2xl animate-fade-in border-4 border-white/20 backdrop-blur-sm">
                {/* Progress */}
                <div className="mb-10">
                    <div className="flex justify-between mb-4 px-2">
                        {STEPS.map((s, i) => (
                            <div
                                key={s.id}
                                className={cn(
                                    "flex items-center justify-center h-12 w-12 rounded-2xl transition-all duration-500",
                                    i < step ? 'bg-green-500 text-white' :
                                        i === step ? 'bg-white text-blue-600 shadow-xl scale-110' :
                                            'bg-white/20 text-white/50'
                                )}
                            >
                                {i < step ? <Check className="h-6 w-6" /> : <s.icon className="h-6 w-6" />}
                            </div>
                        ))}
                    </div>
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white transition-all duration-700 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Step Content */}
                <div className="min-h-[320px] text-white">
                    {step === 0 && (
                        <div className="text-center py-10 space-y-4">
                            <div className="h-24 w-24 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                <Sparkles className="h-12 w-12 text-white" />
                            </div>
                            <h2 className="text-4xl font-black tracking-tighter">¡Hola!</h2>
                            <p className="text-xl font-medium text-white/80">
                                Vamos a preparar tu caja en menos de 1 minuto.
                            </p>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6">
                            <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
                                <Building className="h-8 w-8" /> Tu Negocio
                            </h2>
                            <div className="space-y-4">
                                <Input
                                    placeholder="Nombre de tu negocio (ej: Abarrotes Mary)"
                                    value={data.business_name}
                                    onChange={e => updateData('business_name', e.target.value)}
                                    className="h-16 text-xl rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-white/40"
                                />
                                <Input
                                    placeholder="Teléfono (opcional)"
                                    value={data.business_phone}
                                    onChange={e => updateData('business_phone', e.target.value)}
                                    className="h-16 text-xl rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-white/40"
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
                                <Package className="h-8 w-8" /> Tu Primer Producto
                            </h2>
                            <p className="text-white/70 font-medium">No te preocupes, puedes agregar más después.</p>
                            <div className="space-y-4">
                                <Input
                                    placeholder="Nombre del producto (ej: Coca Cola)"
                                    value={data.product_name}
                                    onChange={e => updateData('product_name', e.target.value)}
                                    className="h-16 text-xl rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-white/40"
                                />
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-white/40">$</span>
                                    <Input
                                        type="number"
                                        placeholder="Precio de venta"
                                        value={data.product_price}
                                        onChange={e => updateData('product_price', e.target.value)}
                                        className="h-16 pl-12 text-2xl font-black rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-white/40"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center py-10 space-y-4">
                            <div className="h-24 w-24 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                <PartyPopper className="h-12 w-12 text-white" />
                            </div>
                            <h2 className="text-4xl font-black tracking-tighter">¡Listo para vender!</h2>
                            <p className="text-xl font-medium text-white/80">
                                Tu sistema está configurado con las mejores opciones para tu negocio.
                            </p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-12">
                    {step > 0 && step < STEPS.length - 1 ? (
                        <Button variant="ghost" onClick={prev} className="text-white hover:bg-white/10 px-8 h-14 rounded-2xl font-bold">
                            <ChevronLeft className="h-5 w-5 mr-2" /> Atrás
                        </Button>
                    ) : <div />}

                    {step < STEPS.length - 1 ? (
                        <Button onClick={next} className="bg-white text-blue-600 hover:bg-blue-50 px-10 h-14 rounded-2xl font-black text-lg shadow-xl">
                            Siguiente <ChevronRight className="h-5 w-5 ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleComplete} isLoading={loading} className="bg-green-500 hover:bg-green-600 text-white px-10 h-16 rounded-2xl font-black text-xl shadow-2xl">
                            ¡A VENDER! <ShoppingCart className="h-6 w-6 ml-2" />
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

import { cn } from '../utils/cn';

export default OnboardingWizard;
