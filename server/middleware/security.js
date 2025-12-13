const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Basic Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Limit each IP to 300 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes, por favor intente más tarde.' }
});

// Stricter Limiter for Auth
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit login attempts
    message: { error: 'Demasiados intentos de inicio de sesión.' }
});

// Helmet Configuration
const helmetConfig = helmet();

// Input Sanitization Helper (Simplified)
// In a full app, use 'express-validator' on all routes or a global sanitizer
const sanitizeInput = (req, res, next) => {
    // Basic stripping of dangerous chars could go here
    // For now, relies on Prisma parameterization which prevents SQLi
    next();
};

module.exports = { apiLimiter, authLimiter, helmetConfig, sanitizeInput };
