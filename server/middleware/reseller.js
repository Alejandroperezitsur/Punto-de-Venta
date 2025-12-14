const prisma = require('../db');

module.exports = async (req, res, next) => {
    // 1. Try to identify reseller by domain (Host header)
    // Production: would check subdomains e.g. tenant.reseller.com
    // Dev: fallback to query param ?ref=reseller_id or default to 1 (Ventify)

    let resellerId = 1; // Default to Ventify

    const host = req.get('host');
    // Mock logic for domain detection
    if (host && host.includes('partner-a.com')) {
        // resellerId = 2; 
    }

    // Allow override for testing
    if (req.query.ref) {
        resellerId = parseInt(req.query.ref) || 1;
    }

    try {
        // Cache this in production (Redis)
        const reseller = await prisma.reseller.findUnique({
            where: { id: resellerId }
        });

        if (reseller) {
            req.reseller = reseller;
        } else {
            // Fallback to minimal default
            req.reseller = {
                id: 1,
                name: 'Ventify',
                primary_color: '#4f46e5',
                logo_url: null
            };
        }
    } catch (e) {
        console.error('Reseller middleware error:', e);
        req.reseller = { id: 1, name: 'Ventify' };
    }

    next();
};
