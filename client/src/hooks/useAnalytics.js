import { api } from '../lib/api';

export function useAnalytics() {
    const track = (eventName, data = {}) => {
        // Fire and forget, don't await
        api('/analytics/event', {
            method: 'POST',
            body: JSON.stringify({ type: eventName, data }),
            headers: { 'Content-Type': 'application/json' }
        }).catch(err => console.debug('Analytics skipped', err));
    };

    return { track };
}
