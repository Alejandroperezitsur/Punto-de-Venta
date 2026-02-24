const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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

const app = express();
app.use(helmet());
app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: false }));
app.use(express.json());
const { responseHandler } = require('./middleware/responseHandler');
app.use(responseHandler);
app.use(morgan('combined'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Métricas Prometheus
client.collectDefaultMetrics({ prefix: 'pos_' });
const httpRequestDuration = new client.Histogram({
  name: 'pos_http_request_duration_seconds',
  help: 'Duración de solicitudes HTTP',
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

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

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

app.get('/api/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.send(await client.register.metrics());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reportes centralizados en routes/reports

const { errorHandler } = require('./middleware/errorHandler');
app.use((req, res, next) => next());
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
ensureConfig();
// Start Cron Jobs
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
