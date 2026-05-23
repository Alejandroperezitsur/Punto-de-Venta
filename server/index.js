const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const client = require('prom-client');
const { logger } = require('./logger');
require('dotenv').config();
const db = require('./db');
const { allowedOrigins, ensureConfig } = require('./config');

const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const customersRouter = require('./routes/customers');
const salesRouter = require('./routes/sales');
const settingsRouter = require('./routes/settings');
const authModule = require('./routes/auth');
const cashRouter = require('./routes/cash');
const receivablesRouter = require('./routes/receivables');
const reportsRouter = require('./routes/reports');
const auditsRouter = require('./routes/audits');
const systemRouter = require('./routes/system');

const healthRouter = require('./routes/health');
const reconciliationRouter = require('./routes/reconciliation');
const batchRouter = require('./routes/batch');
const { evaluateSaleRisk, logFraudAlert } = require('./services/fraudDetectionService');

const { apiLimiter, cashLimiter } = require('./middleware/rateLimiter');
const sessionRouter = require('./routes/session');

const app = express();
app.use(helmet());
app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: false }));
app.use(express.json());

const { responseHandler } = require('./middleware/responseHandler');
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
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = (req.route && req.route.path) ? req.route.path : (req.originalUrl ? req.originalUrl.split('?')[0] : 'unknown');
    end({ method: req.method, route, status: String(res.statusCode) });
  });
  next();
});

// CSP Headers
app.use((req, res, next) => {
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

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/auth', apiLimiter);
app.use('/api/cash', cashLimiter);
app.use('/api/', apiLimiter);

app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/sales', salesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/auth', authModule.router);
app.use('/api/cash', cashRouter);
app.use('/api/receivables', receivablesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/audits', auditsRouter);
app.use('/api/system', systemRouter);
app.use('/api/admin-saas', require('./routes/admin_saas'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/roadmap', require('./routes/roadmap'));
app.use('/api/support', require('./routes/support'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/fraud', require('./routes/fraud'));
app.use('/api/sessions', sessionRouter);
app.use('/api/health', healthRouter);
app.use('/api/reconciliation', reconciliationRouter);
app.use('/api', batchRouter);

// Fraud middleware on sales creation
app.use('/api/sales', (req, res, next) => {
  if (req.method === 'POST' && req.user) {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode === 201 || res.statusCode === 200) {
        const saleData = body?.data || body;
        evaluateSaleRisk(req.user.uid, req.user.storeId, req.body).then((risk) => {
          if (risk.alert) {
            logFraudAlert(req.user.uid, req.user.storeId, risk);
          }
        }).catch(() => {});
      }
      return originalJson(body);
    };
  }
  next();
});

app.get('/api/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.send(await client.register.metrics());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const { attachTokenRotation } = authModule;
app.use(attachTokenRotation);

const { errorHandler } = require('./middleware/errorHandler');
app.use((req, res, next) => next());
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
    logger.error('Database connection failed', e);
  }
  logger.info(`Server running on port ${PORT}`);
});
