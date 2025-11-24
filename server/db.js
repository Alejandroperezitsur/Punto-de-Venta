const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data.db');
let db;

function getDb() {
  if (!db) db = new Database(DB_PATH);
  return db;
}

function run(sql, params = []) {
  const stmt = getDb().prepare(sql);
  const info = stmt.run(...params);
  return { id: info.lastInsertRowid, changes: info.changes };
}

function all(sql, params = []) {
  const stmt = getDb().prepare(sql);
  return stmt.all(...params);
}

function get(sql, params = []) {
  const stmt = getDb().prepare(sql);
  return stmt.get(...params);
}

function init() {
  const db = getDb();
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    price REAL NOT NULL,
    cost REAL DEFAULT 0,
    stock REAL DEFAULT 0,
    category_id INTEGER,
    active INTEGER DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT
  )`);
  try {
    const cols = all('PRAGMA table_info(customers)')
    if (!cols.find(c => c.name === 'rfc')) {
      run('ALTER TABLE customers ADD COLUMN rfc TEXT')
    }
  } catch {}
  db.exec(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    discount REAL NOT NULL,
    total REAL NOT NULL,
    payment_method TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    line_total REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    method TEXT NOT NULL CHECK(method IN ('cash','card','transfer','credit')),
    amount REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
  )`);
  try {
    const cols = all('PRAGMA table_info(payments)')
    if (!cols.find(c => c.name === 'user_id')) {
      run('ALTER TABLE payments ADD COLUMN user_id INTEGER')
    }
  } catch {}

  db.exec(`CREATE TABLE IF NOT EXISTS receivables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    sale_id INTEGER NOT NULL,
    amount_due REAL NOT NULL,
    amount_paid REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK(status IN ('open','closed')),
    created_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS receivable_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receivable_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (receivable_id) REFERENCES receivables(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    change REAL NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);
  run(`INSERT OR IGNORE INTO settings (key, value) VALUES
    ('currency', 'MXN'),
    ('tax_rate', '0.16'),
    ('theme_primary', '#1e88e5'),
    ('theme_accent', '#e53935')
  `);

  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','cajero'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS cash_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    opening_balance REAL NOT NULL,
    closing_balance REAL,
    status TEXT NOT NULL CHECK(status IN ('open','closed')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS cash_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('sale','withdraw','deposit')),
    reference TEXT,
    amount REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE
  )`);

  const existsAdmin = get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!existsAdmin) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
  }

  run('INSERT OR IGNORE INTO categories (name) VALUES (?)', ['General']);
  run('INSERT OR IGNORE INTO categories (name) VALUES (?)', ['Bebidas']);
  run('INSERT OR IGNORE INTO categories (name) VALUES (?)', ['Snacks']);

  const catGeneral = get('SELECT id FROM categories WHERE name = ?', ['General'])?.id;
  const catBebidas = get('SELECT id FROM categories WHERE name = ?', ['Bebidas'])?.id;
  const catSnacks = get('SELECT id FROM categories WHERE name = ?', ['Snacks'])?.id;
  run('INSERT OR IGNORE INTO products (name, sku, price, cost, stock, category_id) VALUES (?, ?, ?, ?, ?, ?)', ['Café Americano', 'CAF-001', 25.00, 8.00, 100, catBebidas]);
  run('INSERT OR IGNORE INTO products (name, sku, price, cost, stock, category_id) VALUES (?, ?, ?, ?, ?, ?)', ['Agua 600ml', 'AGU-600', 12.00, 4.00, 200, catBebidas]);
  run('INSERT OR IGNORE INTO products (name, sku, price, cost, stock, category_id) VALUES (?, ?, ?, ?, ?, ?)', ['Galletas Chocolate', 'GAL-CHO', 18.50, 7.50, 150, catSnacks]);
  run('INSERT OR IGNORE INTO products (name, sku, price, cost, stock, category_id) VALUES (?, ?, ?, ?, ?, ?)', ['Papas Sal', 'PAP-SAL', 20.00, 9.00, 120, catSnacks]);
  run('INSERT OR IGNORE INTO products (name, sku, price, cost, stock, category_id) VALUES (?, ?, ?, ?, ?, ?)', ['Bolígrafo Azul', 'BOL-AZ', 7.00, 2.00, 300, catGeneral]);

  if (!get('SELECT id FROM customers WHERE email = ?', ['juan.perez@example.com'])) {
    run('INSERT INTO customers (name, phone, email, rfc) VALUES (?, ?, ?, ?)', ['Juan Pérez', '555-111-2222', 'juan.perez@example.com', 'JUAP800101XXX']);
  }
  if (!get('SELECT id FROM customers WHERE email = ?', ['maria.lopez@example.com'])) {
    run('INSERT INTO customers (name, phone, email, rfc) VALUES (?, ?, ?, ?)', ['María López', '555-333-4444', 'maria.lopez@example.com', 'MALO810202YYY']);
  }
  if (!get('SELECT id FROM customers WHERE email = ?', ['compras@xyz.com'])) {
    run('INSERT INTO customers (name, phone, email, rfc) VALUES (?, ?, ?, ?)', ['Empresa XYZ', '555-777-8888', 'compras@xyz.com', 'XYZ010203ZZZ']);
  }
}

module.exports = { getDb, run, all, get, init };
