import React from 'react';
import { Store } from 'lucide-react';

export function DynamicBranding() {
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('app_branding');
      if (stored) {
        const branding = JSON.parse(stored);
        if (branding.primaryColor) {
          document.documentElement.style.setProperty('--accent', branding.primaryColor);
        }
      }
    } catch {}
  }, []);
  return null;
}
