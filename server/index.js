const express = require('express');
const cors = require('cors');
const db = require('./db');

const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const customersRouter = require('./routes/customers');
const salesRouter = require('./routes/sales');
const settingsRouter = require('./routes/settings');
const authModule = require('./routes/auth');
const cashRouter = require('./routes/cash');
const receivablesRouter = require('./routes/receivables');
const reportsRouter = require('./routes/reports');

const app = express();
app.use(cors());
app.use(express.json());

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

app.get('/api/reports/summary', (req, res) => {
  const from = req.query.from ? new Date(req.query.from).toISOString() : new Date('1970-01-01').toISOString();
  const to = req.query.to ? new Date(req.query.to).toISOString() : new Date().toISOString();
  const rows = db.get('SELECT COUNT(*) AS count, SUM(total) AS total FROM sales WHERE created_at BETWEEN ? AND ?', [from, to]);
  res.json(rows);
});

app.get('/api/reports/products', (req, res) => {
  const from = req.query.from ? new Date(req.query.from).toISOString() : new Date('1970-01-01').toISOString();
  const to = req.query.to ? new Date(req.query.to).toISOString() : new Date().toISOString();
  const rows = db.all(`SELECT si.product_id, p.name, SUM(si.quantity) AS qty, SUM(si.line_total) AS total
    FROM sale_items si JOIN sales s ON si.sale_id = s.id JOIN products p ON si.product_id = p.id
    WHERE s.created_at BETWEEN ? AND ? GROUP BY si.product_id ORDER BY total DESC`, [from, to]);
  res.json(rows);
});

app.get('/api/reports/customers', (req, res) => {
  const from = req.query.from ? new Date(req.query.from).toISOString() : new Date('1970-01-01').toISOString();
  const to = req.query.to ? new Date(req.query.to).toISOString() : new Date().toISOString();
  const rows = db.all(`SELECT s.customer_id, c.name, COUNT(s.id) AS count, SUM(s.total) AS total
    FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.created_at BETWEEN ? AND ? GROUP BY s.customer_id ORDER BY total DESC`, [from, to]);
  res.json(rows);
});

app.get('/api/reports/demo-summary', (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from).toISOString() : new Date('1970-01-01').toISOString();
    const to = req.query.to ? new Date(req.query.to).toISOString() : new Date().toISOString();
    const setting = db.get('SELECT value FROM settings WHERE key = ?', ['demo_sales']);
    let ids = [];
    try {
      const parsed = JSON.parse(setting?.value || '[]');
      if (Array.isArray(parsed)) ids = parsed;
      else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.ids)) ids = parsed.ids;
    } catch {}
    let demo = { count: 0, total: 0 };
    let real = { count: 0, total: 0 };
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      demo = db.get(`SELECT COUNT(*) AS count, SUM(total) AS total FROM sales WHERE id IN (${placeholders}) AND created_at BETWEEN ? AND ?`, [...ids, from, to]);
      real = db.get(`SELECT COUNT(*) AS count, SUM(total) AS total FROM sales WHERE id NOT IN (${placeholders}) AND created_at BETWEEN ? AND ?`, [...ids, from, to]);
    } else {
      real = db.get('SELECT COUNT(*) AS count, SUM(total) AS total FROM sales WHERE created_at BETWEEN ? AND ?', [from, to]);
    }
    res.json({ demo, real });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  db.init();
  console.log(`POS API escuchando en http://localhost:${PORT}`);
});
