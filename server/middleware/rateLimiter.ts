import { rateLimit } from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const saleLimiter = rateLimit({
  windowMs: 1000,
  max: 3,
  message: { error: 'Demasiadas ventas en poco tiempo. Espera un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const cashLimiter = rateLimit({
  windowMs: 5000,
  max: 10,
  message: { error: 'Demasiadas operaciones de caja. Espera un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});
