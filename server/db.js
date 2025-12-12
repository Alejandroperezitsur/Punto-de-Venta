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

  db.exec(`CREATE TABLE IF NOT EXISTS audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT NOT NULL,
    user_id INTEGER,
    ref_type TEXT,
    ref_id INTEGER,
    data TEXT,
    created_at TEXT NOT NULL
  )`);
  try {
    const cols = all('PRAGMA table_info(customers)');
    if (!cols.find(c => c.name === 'rfc')) {
      run('ALTER TABLE customers ADD COLUMN rfc TEXT');
    }
  } catch { }
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
    const cols = all('PRAGMA table_info(payments)');
    if (!cols.find(c => c.name === 'user_id')) {
      run('ALTER TABLE payments ADD COLUMN user_id INTEGER');
    }
  } catch { }

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
  // Phase 2: Categories Hierarchy
  try {
    const cols = all('PRAGMA table_info(categories)');
    if (!cols.find(c => c.name === 'parent_id')) {
      run('ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL');
    }
    if (!cols.find(c => c.name === 'image_url')) {
      run('ALTER TABLE categories ADD COLUMN image_url TEXT');
    }
  } catch { }

  // Phase 2: Product Images
  try {
    const cols = all('PRAGMA table_info(products)');
    if (!cols.find(c => c.name === 'image_url')) {
      run('ALTER TABLE products ADD COLUMN image_url TEXT');
    }
  } catch { }

  // Phase 2: Multiple Barcodes
  db.exec(`CREATE TABLE IF NOT EXISTS product_barcodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )`);

  // Phase 2: Settings Table (Ensured)
  db.exec(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  // Phase 2: Inventory Movements (Ensured)
  db.exec(`CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    change REAL NOT NULL,
    reason TEXT,
    reference_id INTEGER,
    reference_type TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
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

  // Indices for performance
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_product_barcodes_code ON product_barcodes(code)'); // New Index
    db.exec('CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_cash_movements_session_id ON cash_movements(session_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_cash_movements_created_at ON cash_movements(created_at)');
  } catch { }
}

function audit(event, user_id, ref_type, ref_id, data) {
  const created_at = new Date().toISOString();
  const payload = data ? JSON.stringify(data) : null;
  run('INSERT INTO audits (event, user_id, ref_type, ref_id, data, created_at) VALUES (?, ?, ?, ?, ?, ?)', [event, user_id || null, ref_type || null, ref_id || null, payload, created_at]);
}

module.exports = { getDb, run, all, get, init, audit };
