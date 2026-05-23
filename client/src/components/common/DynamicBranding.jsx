import React, { useEffect } from 'react';
import { useUserStore } from '../../store/userStore';

export function DynamicBranding() {
    const { reseller } = useUserStore();

    useEffect(() => {
        if (reseller && reseller.primary_color) {
            document.documentElement.style.setProperty('--primary', reseller.primary_color);
            // We could generate shades here too
            // document.documentElement.style.setProperty('--primary-focus', ...);
        }

        if (reseller && reseller.name) {
            document.title = `${reseller.name} - POS`;
        }
    }, [reseller]);

    return null; // Logic only
}
