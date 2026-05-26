import React, { useEffect, useState } from 'react';
import { useUserStore } from '../../store/userStore';

// Función utilitaria para convertir colores Hexadecimales a formato de números HSL (separados por espacio)
// necesario para que funcione la fórmula hsl(var(--primary)) de Tailwind CSS v4.
function hexToHslNumbers(hexColor) {
    if (!hexColor || typeof hexColor !== 'string') return '221 83% 53%';
    
    let hex = hexColor.trim();
    if (!hex.startsWith('#')) {
        if (/^\d+\s+\d+%\s+\d+%$/.test(hex)) {
            return hex; // ya está en formato HSL
        }
        return '221 83% 53%';
    }
    
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    
    if (hex.length !== 6) return '221 83% 53%';
    
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    const hDeg = Math.round(h * 360);
    const sPct = Math.round(s * 100);
    const lPct = Math.round(l * 100);
    
    return `${hDeg} ${sPct}% ${lPct}%`;
}

export function DynamicBranding() {
    const { reseller } = useUserStore();
    const [branding, setBranding] = useState(null);

    useEffect(() => {
        // Cargar marca personalizada de localStorage
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
        let activeColor = '#3b82f6'; // Color por defecto

        if (branding?.primaryColor) {
            activeColor = branding.primaryColor;
        } else if (reseller && reseller.primary_color) {
            activeColor = reseller.primary_color;
        }

        // Convertir el color hexadecimal activo a formato HSL
        const hslString = hexToHslNumbers(activeColor);

        // Fijar variables HSL (para hojas de estilo CSS locales que usan hsl(var(--primary)))
        document.documentElement.style.setProperty('--primary', hslString);
        document.documentElement.style.setProperty('--accent', hslString);
        document.documentElement.style.setProperty('--ring', hslString);

        // Fijar variables Hex directas (para Tailwind CSS v4)
        document.documentElement.style.setProperty('--color-primary', activeColor);
        document.documentElement.style.setProperty('--color-accent', activeColor);
        document.documentElement.style.setProperty('--color-ring', activeColor);

        // Establecer título de página
        const title = branding?.businessName || reseller?.name || 'Punto de Venta';
        document.title = `${title} - POS`;
    }, [branding, reseller]);

    return null; // Solo lógica
}
