import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import client from 'prom-client';
import { logger } from './logger';
import dotenv from 'dotenv';
import db from './db';
import { allowedOrigins, ensureConfig } from './config';

// Routers
import productsRouter from './routes/products';
import categoriesRouter from './routes/categories';
import customersRouter from './routes/customers';
import salesRouter from './routes/sales';
import settingsRouter from './routes/settings';
import authModule from './routes/auth';
import cashRouter from './routes/cash';
import receivablesRouter from './routes/receivables';
import reportsRouter from './routes/reports';
import auditsRouter from './routes/audits';
import systemRouter from './routes/system';
import healthRouter from './routes/health';
import reconciliationRouter from './routes/reconciliation';
import batchRouter from './routes/batch';
import sessionRouter from './routes/session';
import invoicesRouter from './routes/invoices';
import paymentsRouter from './routes/payments';
import adminSaasRouter from './routes/admin_saas';
import analyticsRouter from './routes/analytics';
import feedbackRouter from './routes/feedback';
import roadmapRouter from './routes/roadmap';
import supportRouter from './routes/support';
import billingRouter from './routes/billing';
import aiRouter from './routes/ai';
import fraudRouter from './routes/fraud';
import dashboardsRouter from './routes/dashboards';

// Middleware
import { apiLimiter, cashLimiter, loginLimiter } from './middleware/rateLimiter';
import { responseHandler } from './middleware/responseHandler';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();

// Basic security & utilities
app.use(helmet());
app.use(cors({ 
  origin: allowedOrigins, 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  credentials: false 
}));
app.use(express.json());
app.use(responseHandler);
app.use(morgan('combined'));

// Metrics
client.collectDefaultMetrics({ prefix: 'pos_' });
const httpRequestDuration = new client.Histogram({
  name: 'pos_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = (req.route && req.route.path) ? req.route.path : (req.originalUrl ? req.originalUrl.split('?')[0] : 'unknown');
    end({ method: req.method, route, status: String(res.statusCode) });
  });
  next();
});

// Security Headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws:; font-src 'self' data:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Token rotation — BEFORE routes so it wraps res.json() on all authenticated endpoints
const { attachTokenRotation } = authModule;
app.use(attachTokenRotation);

// API Rate Limiters
app.use('/api/auth', loginLimiter);
app.use('/api/auth', apiLimiter);
app.use('/api/cash', cashLimiter);
app.use('/api/', apiLimiter);

// API Routes (fraudInterceptor moved inside sales router after auth)
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/sales', salesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/auth', authModule.router);
app.use('/api/cash', cashRouter);
app.use('/api/receivables', receivablesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/audits', auditsRouter);
app.use('/api/system', systemRouter);
app.use('/api/admin-saas', adminSaasRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/roadmap', roadmapRouter);
app.use('/api/support', supportRouter);
app.use('/api/billing', billingRouter);
app.use('/api/ai', aiRouter);
app.use('/api/fraud', fraudRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/dashboards', dashboardsRouter);
app.use('/api/health', healthRouter);
app.use('/api/reconciliation', reconciliationRouter);
app.use('/api', batchRouter);

app.get('/api/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.send(await client.register.metrics());
  } catch (e: any) {
    res.status(500).json({ data: null, error: { message: e.message, code: 'METRICS_ERROR' } });
  }
});

// Error Handling
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
ensureConfig();

const { startCron } = require('./cron');
startCron();

app.listen(PORT, async () => {
  try {
    await db.$connect();
    logger.info('Database connected successfully');
  } catch (e) {
    logger.error({ err: e }, 'Database connection failed');
  }
  logger.info(`Server running on port ${PORT}`);
});
