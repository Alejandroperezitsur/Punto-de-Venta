import React, { useEffect, useState } from 'react';
import { useUserStore } from '../../store/userStore';

export function DynamicBranding() {
    const { reseller } = useUserStore();
    const [branding, setBranding] = useState(null);

    useEffect(() => {
        // Load custom branding from localStorage
        const stored = localStorage.getItem('app_branding');
        if (stored) {
            try {
                setBranding(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to load branding:', e);
            }
        }
    }, []);

    useEffect(() => {
        // Apply custom branding color
        if (branding?.primaryColor) {
            document.documentElement.style.setProperty('--primary', branding.primaryColor);
        } else if (reseller && reseller.primary_color) {
            document.documentElement.style.setProperty('--primary', reseller.primary_color);
        }

        // Set page title
        const title = branding?.businessName || reseller?.name || 'Punto de Venta';
        document.title = `${title} - POS`;
    }, [branding, reseller]);

    return null; // Logic only
}
