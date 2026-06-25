import { getDB } from './db';

// Interfaces y Claves de LocalStorage
const USERS_KEY = 'pos_offline_users_v1';
const SETTINGS_KEY = 'pos_offline_settings_v1';
const CUSTOMERS_KEY = 'pos_offline_customers_v1';
const CASH_SESSION_KEY = 'pos_offline_cash_session_v1';
const CASH_MOVEMENTS_KEY = 'pos_offline_cash_movements_v1';
const CASH_HISTORY_KEY = 'pos_offline_cash_history_v1';

export interface OfflineUser {
  id: number;
  username: string;
  passwordHash: string; // En esta implementación local guardamos la clave para validación
  role: 'admin' | 'supervisor' | 'cajero';
  active: number;
}

export interface OfflineCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  rfc?: string;
}

// 1. Semillado inicial
const MOCK_PRODUCTS = [
  { id: 'prod-1', name: 'Café Americano Organico', price: 35.00, stock: 150, sku: '11111', image_url: null, active: 1 },
  { id: 'prod-2', name: 'Capuchino Vainilla Caliente', price: 45.00, stock: 100, sku: '22222', image_url: null, active: 1 },
  { id: 'prod-3', name: 'Croissant de Mantequilla Calientito', price: 28.00, stock: 45, sku: '33333', image_url: null, active: 1 },
  { id: 'prod-4', name: 'Muffin de Arándanos y Nuez', price: 32.00, stock: 30, sku: '44444', image_url: null, active: 1 },
  { id: 'prod-5', name: 'Botella de Agua Purificada 600ml', price: 15.00, stock: 200, sku: '55555', image_url: null, active: 1 },
  { id: 'prod-6', name: 'Refresco de Cola Frío 355ml', price: 22.00, stock: 120, sku: '66666', image_url: null, active: 1 },
  { id: 'prod-7', name: 'Sandwich Gourmet de Jamón de Pavo', price: 55.00, stock: 25, sku: '77777', image_url: null, active: 1 },
  { id: 'prod-8', name: 'Rebanada de Tarta de Chocolate', price: 48.00, stock: 15, sku: '88888', image_url: null, active: 1 },
  { id: 'prod-9', name: 'Galleta de Avena y Chispas', price: 18.00, stock: 80, sku: '99999', image_url: null, active: 1 },
  { id: 'prod-10', name: 'Bagel con Queso Crema Doble', price: 65.00, stock: 12, sku: '10101', image_url: null, active: 1 },
];

const MOCK_CUSTOMERS: OfflineCustomer[] = [
  { id: 'cust-1', name: 'Alejandro Pérez', email: 'alejandro@example.com', phone: '555-123-4567', rfc: 'PERA880101XX1' },
  { id: 'cust-2', name: 'María Gómez Flores', email: 'maria.gomez@example.com', phone: '555-987-6543', rfc: 'GOMM900512YY2' },
  { id: 'cust-3', name: 'Juan Carlos Rodríguez', email: 'juan.rod@example.com', phone: '555-456-7890', rfc: 'RODJ851123ZZ3' },
];

const DEFAULT_SETTINGS = {
  business_name: 'Punto de Venta',
  business_rfc: 'XAXX010101000',
  business_address: 'Av. de la Reforma 123, Col. Centro, CP 06000',
  business_phone: '+52 55 1234 5678',
  business_email: 'contacto@mitienda.com',
  business_logo: '',
  currency: 'MXN',
  tax_name: 'IVA',
  tax_rate: '0.16',
  tax_included: '1',
  ticket_width: '80',
  ticket_footer: '¡Gracias por su compra! Vuelva pronto.',
  app_name: 'POS Pro',
  app_copyright: '© 2026 POS Pro',
  app_version: '1.0.2-Offline',
  sound_enabled: '1',
  compact_mode: '0',
  theme_primary: '#3b82f6',
  low_stock_threshold: '5',
  require_customer: '0'
};

const DEFAULT_USERS: OfflineUser[] = [
  { id: 0, username: 'admin', passwordHash: 'admin123', role: 'admin', active: 1 },
  { id: 1, username: 'cajero', passwordHash: 'cajero123', role: 'cajero', active: 1 },
  { id: 2, username: 'supervisor', passwordHash: 'super123', role: 'supervisor', active: 1 }
];

export async function seedOfflineDB() {
  try {
    const db = await getDB();
    // 1. Semillar Productos en IndexedDB si está vacío
    const prodCount = await db.count('products');
    if (prodCount === 0) {
      console.log('[OfflineDB] Se semillan productos de prueba en IndexedDB...');
      const tx = db.transaction('products', 'readwrite');
      for (const p of MOCK_PRODUCTS) {
        await tx.store.put(p);
      }
      await tx.done;
    }

    // 2. Semillar Usuarios en LocalStorage
    if (!localStorage.getItem(USERS_KEY)) {
      console.log('[OfflineDB] Se inicializan usuarios locales...');
      localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    }

    // 3. Semillar Configuración en LocalStorage
    if (!localStorage.getItem(SETTINGS_KEY)) {
      console.log('[OfflineDB] Se inicializan configuraciones locales...');
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }

    // 4. Semillar Clientes en LocalStorage
    if (!localStorage.getItem(CUSTOMERS_KEY)) {
      console.log('[OfflineDB] Se inicializan clientes locales...');
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(MOCK_CUSTOMERS));
    }
  } catch (err) {
    console.error('[OfflineDB] Error al semillar base de datos local:', err);
  }
}

// 2. Interceptor de Peticiones Offline
export async function handleOfflineRequest(path: string, options: any = {}): Promise<any> {
  await seedOfflineDB();
  
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : null;
  const db = await getDB();

  console.log(`[OfflineDB Interceptor] ${method} ${path}`, body);

  // ─── RUTAS DE AUTENTICACIÓN ───
  if (path.startsWith('/auth/login')) {
    const { username, password } = body;
    const users: OfflineUser[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find(u => u.username === username.trim());
    
    if (!user || user.passwordHash !== password) {
      throw new Error('Usuario o contraseña incorrectos.');
    }
    
    const token = `offline-token-${user.username}-${Date.now()}`;
    const userProfile = {
      id: user.id,
      username: user.username,
      role: user.role,
      storeId: 1,
      storeName: 'Sucursal Offline'
    };
    
    return {
      token,
      user: userProfile
    };
  }

  if (path.startsWith('/auth/users')) {
    const users: OfflineUser[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    
    // GET /auth/users
    if (method === 'GET') {
      return users.map(({ id, username, role, active }) => ({ id, username, role, active: active ?? 1 }));
    }

    // POST /auth/users
    if (method === 'POST') {
      const { username, password, role } = body;
      if (users.some(u => u.username === username.trim())) {
        throw new Error('El nombre de usuario ya existe.');
      }
      const newUser: OfflineUser = {
        id: Date.now(),
        username: username.trim(),
        passwordHash: password,
        role: role || 'cajero',
        active: 1
      };
      users.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return { success: true, user: { id: newUser.id, username: newUser.username, role: newUser.role } };
    }

    // PUT /auth/users/:id
    if (method === 'PUT') {
      const idStr = path.split('/').pop() || '';
      const userId = parseInt(idStr);
      const { role, password } = body;
      
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex === -1) throw new Error('Usuario no encontrado.');
      
      if (role) users[userIndex].role = role;
      if (password) users[userIndex].passwordHash = password;
      
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return { success: true };
    }

    // DELETE /auth/users/:id
    if (method === 'DELETE') {
      const idStr = path.split('/').pop() || '';
      const userId = parseInt(idStr);
      
      const user = users.find(u => u.id === userId);
      if (!user) throw new Error('Usuario no encontrado.');
      if (user.username === 'admin') throw new Error('No se puede eliminar al administrador principal.');
      
      const filtered = users.filter(u => u.id !== userId);
      localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
      return { success: true };
    }
  }

  // ─── CONFIGURACIONES (SETTINGS) ───
  if (path.startsWith('/settings')) {
    if (method === 'GET') {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    }
    if (method === 'PUT') {
      const current = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      const updated = { ...current, ...body };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    }
  }

  // ─── PRODUCTOS (INVENTARIO) ───
  if (path.startsWith('/products')) {
    // GET /products/scan/:sku
    if (path.startsWith('/products/scan/')) {
      const code = decodeURIComponent(path.split('/').pop() || '');
      const products = await db.getAll('products');
      const prod = products.find(p => 
        p.sku === code || 
        (p.barcodes && Array.isArray(p.barcodes) && p.barcodes.includes(code))
      );
      if (!prod) throw new Error('Producto no encontrado por código de barras.');
      return prod;
    }

    // GET /products y búsqueda
    if (method === 'GET') {
      const url = new URL(path, 'http://localhost');
      const q = url.searchParams.get('q') || '';
      const products = await db.getAll('products');
      
      let filtered = products;
      if (q) {
        const query = q.toLowerCase();
        filtered = products.filter(p => 
          (p.name && p.name.toLowerCase().includes(query)) || 
          (p.sku && p.sku.toLowerCase().includes(query)) ||
          (p.barcodes && Array.isArray(p.barcodes) && p.barcodes.some((b: string) => b.includes(query)))
        );
      }
      
      // Simular paginación para evitar colapso visual (layout bounds)
      return {
        data: filtered,
        pagination: {
          nextCursor: null,
          hasMore: false,
          total: filtered.length
        }
      };
    }

    // POST /products
    if (method === 'POST') {
      const barcodeValue = body.barcodes && Array.isArray(body.barcodes) && body.barcodes.length > 0 ? body.barcodes : [];
      const newProd = {
        id: body.id || `prod-${Date.now()}`,
        name: body.name,
        price: Number(body.price) || 0,
        stock: Number(body.stock) || 0,
        sku: body.sku || `SKU-${Date.now()}`,
        barcodes: barcodeValue,
        image_url: body.image_url || null,
        active: 1
      };
      
      // Evitar SKU duplicado
      const products = await db.getAll('products');
      if (products.some(p => p.sku === newProd.sku)) {
        throw new Error('Ya existe un producto con este código de barras (SKU).');
      }

      await db.put('products', newProd);
      return newProd;
    }

    // PUT /products/:id
    if (method === 'PUT') {
      const id = path.split('/').pop() || '';
      const existing = await db.get('products', id);
      if (!existing) throw new Error('Producto no encontrado.');

      const newPrice = body.price !== undefined ? Number(body.price) : existing.price;
      if (newPrice !== undefined && (isNaN(newPrice) || newPrice < 0)) {
        throw new Error('Precio inválido.');
      }

      const newStock = body.stock !== undefined ? Math.max(0, Number(body.stock)) : existing.stock;

      const updated = {
        ...existing,
        name: body.name !== undefined ? body.name : existing.name,
        price: newPrice,
        stock: newStock,
        sku: body.sku !== undefined ? body.sku : existing.sku,
        barcodes: body.barcodes !== undefined ? body.barcodes : (existing.barcodes || []),
        image_url: body.image_url !== undefined ? body.image_url : existing.image_url,
      };

      await db.put('products', updated);
      return updated;
    }

    // DELETE /products/:id
    if (method === 'DELETE') {
      const id = path.split('/').pop() || '';
      const existing = await db.get('products', id);
      if (!existing) throw new Error('Producto no encontrado.');
      const softDeleted = { ...existing, active: 0, deleted_at: new Date().toISOString() };
      await db.put('products', softDeleted);
      return { success: true };
    }
  }

  // ─── CLIENTES ───
  if (path.startsWith('/customers') && !path.startsWith('/auth/')) {
    const customers: OfflineCustomer[] = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || '[]');
    
    if (method === 'GET') {
      return customers;
    }

    if (method === 'POST') {
      const newCust: OfflineCustomer = {
        id: body.id || `cust-${Date.now()}`,
        name: body.name,
        email: body.email,
        phone: body.phone,
        rfc: body.rfc
      };
      customers.push(newCust);
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
      return newCust;
    }

    if (method === 'PUT') {
      const id = path.split('/').pop() || '';
      const idx = customers.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Cliente no encontrado.');
      customers[idx] = { ...customers[idx], ...body };
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
      return customers[idx];
    }

    if (method === 'DELETE') {
      const id = path.split('/').pop() || '';
      const filtered = customers.filter(c => c.id !== id);
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(filtered));
      return { success: true };
    }
  }

  // ─── CONTROL DE CAJA ───
  if (path.startsWith('/cash')) {
    // GET /cash/status
    if (path.startsWith('/cash/status')) {
      const session = JSON.parse(localStorage.getItem(CASH_SESSION_KEY) || 'null');
      const movements = JSON.parse(localStorage.getItem(CASH_MOVEMENTS_KEY) || '[]');
      
      let summary = null;
      if (session && session.status === 'open') {
        const salesTotal = movements.filter((m: any) => m.type === 'sale').reduce((acc: number, m: any) => acc + m.amount, 0);
        const depositsTotal = movements.filter((m: any) => m.type === 'deposit').reduce((acc: number, m: any) => acc + m.amount, 0);
        const withdrawalsTotal = movements.filter((m: any) => m.type === 'withdraw').reduce((acc: number, m: any) => acc + Math.abs(m.amount), 0);
        const expected = session.opening_balance + salesTotal + depositsTotal - withdrawalsTotal;
        
        summary = {
          sales: salesTotal,
          deposits: depositsTotal,
          withdrawals: withdrawalsTotal,
          expected
        };
      }
      
      return { session, summary, movements };
    }

    // POST /cash/open
    if (path.startsWith('/cash/open')) {
      const activeSession = JSON.parse(localStorage.getItem(CASH_SESSION_KEY) || 'null');
      if (activeSession && activeSession.status === 'open') {
        throw new Error('La caja ya está abierta.');
      }
      
      const newSession = {
        id: `session-${Date.now()}`,
        opened_at: new Date().toISOString(),
        opening_balance: Number(body.opening_balance) || 0,
        status: 'open'
      };
      
      const initialMovement = {
        id: `mov-${Date.now()}`,
        type: 'opening',
        reference: 'Apertura de Caja',
        amount: newSession.opening_balance,
        created_at: new Date().toISOString()
      };
      
      localStorage.setItem(CASH_SESSION_KEY, JSON.stringify(newSession));
      localStorage.setItem(CASH_MOVEMENTS_KEY, JSON.stringify([initialMovement]));
      
      // Emitir evento
      try { window.dispatchEvent(new CustomEvent('cash-status')); } catch {}
      return { success: true, session: newSession };
    }

    // POST /cash/close
    if (path.startsWith('/cash/close')) {
      const session = JSON.parse(localStorage.getItem(CASH_SESSION_KEY) || 'null');
      if (!session || session.status !== 'open') {
        throw new Error('No hay ninguna caja abierta para cerrar.');
      }

      const movements = JSON.parse(localStorage.getItem(CASH_MOVEMENTS_KEY) || '[]');
      const salesTotal = movements.filter((m: any) => m.type === 'sale').reduce((acc: number, m: any) => acc + m.amount, 0);
      const depositsTotal = movements.filter((m: any) => m.type === 'deposit').reduce((acc: number, m: any) => acc + m.amount, 0);
      const withdrawalsTotal = movements.filter((m: any) => m.type === 'withdraw').reduce((acc: number, m: any) => acc + Math.abs(m.amount), 0);
      const expected = session.opening_balance + salesTotal + depositsTotal - withdrawalsTotal;
      
      const counted = Number(body.counted_cash) || 0;
      const difference = counted - expected;
      
      const historyRecord = {
        id: session.id,
        closed_at: new Date().toISOString(),
        user: 'admin',
        expected_cash: expected,
        counted_cash: counted,
        difference,
        status: Math.abs(difference) < 0.01 ? 'closed' : 'discrepancy'
      };

      // Guardar en el historial
      const history = JSON.parse(localStorage.getItem(CASH_HISTORY_KEY) || '[]');
      history.unshift(historyRecord);
      localStorage.setItem(CASH_HISTORY_KEY, JSON.stringify(history));

      // Limpiar sesión activa
      localStorage.removeItem(CASH_SESSION_KEY);
      localStorage.removeItem(CASH_MOVEMENTS_KEY);

      // Emitir evento
      try { window.dispatchEvent(new CustomEvent('cash-status')); } catch {}
      return historyRecord;
    }

    // POST /cash/deposit y POST /cash/withdraw
    if (path.startsWith('/cash/deposit') || path.startsWith('/cash/withdraw')) {
      const session = JSON.parse(localStorage.getItem(CASH_SESSION_KEY) || 'null');
      if (!session || session.status !== 'open') {
        throw new Error('La caja debe estar abierta para registrar movimientos.');
      }
      
      const type = path.endsWith('deposit') ? 'deposit' : 'withdraw';
      const amount = Number(body.amount) || 0;
      
      if (amount <= 0) throw new Error('El monto debe ser mayor a cero.');

      if (type === 'withdraw') {
        const movements = JSON.parse(localStorage.getItem(CASH_MOVEMENTS_KEY) || '[]');
        let currentBalance = session.opening_balance || 0;
        for (const m of movements) {
          if (m.type === 'sale' || m.type === 'deposit') currentBalance += m.amount || 0;
          else if (m.type === 'withdraw') currentBalance -= Math.abs(m.amount || 0);
        }
        if (amount > currentBalance + 0.001) {
          throw new Error(`Fondos insuficientes. Disponible: $${currentBalance.toFixed(2)}, solicitado: $${amount.toFixed(2)}`);
        }
      }
      
      const newMovement = {
        id: `mov-${Date.now()}`,
        type,
        reference: body.reference || (type === 'deposit' ? 'Depósito' : 'Retiro'),
        amount: type === 'deposit' ? amount : -amount,
        created_at: new Date().toISOString()
      };
      
      const movements = JSON.parse(localStorage.getItem(CASH_MOVEMENTS_KEY) || '[]');
      movements.push(newMovement);
      localStorage.setItem(CASH_MOVEMENTS_KEY, JSON.stringify(movements));
      
      try { window.dispatchEvent(new CustomEvent('cash-status')); } catch {}
      return { success: true };
    }

    // GET /cash/movements
    if (path.startsWith('/cash/movements')) {
      const movements = JSON.parse(localStorage.getItem(CASH_MOVEMENTS_KEY) || '[]');
      return movements;
    }

    // GET /cash/history
    if (path.startsWith('/cash/history')) {
      const history = JSON.parse(localStorage.getItem(CASH_HISTORY_KEY) || '[]');
      return { data: history };
    }
  }

  // ─── USUARIOS (ruta /users, alias de /auth/users) ───
  if (path.startsWith('/users') && !path.startsWith('/auth/')) {
    const users: OfflineUser[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (method === 'GET') {
      return users.map(({ id, username, role, active }) => ({ id, username, role, active: active ?? 1 }));
    }
    if (method === 'POST') {
      const { username, password, role } = body;
      if (users.some(u => u.username === username.trim())) {
        throw new Error('El nombre de usuario ya existe.');
      }
      const newUser: OfflineUser = {
        id: Date.now(),
        username: username.trim(),
        passwordHash: password,
        role: role || 'cajero',
        active: 1
      };
      users.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return { success: true, user: { id: newUser.id, username: newUser.username, role: newUser.role } };
    }
    if (method === 'PUT') {
      const idStr = path.split('/').pop() || '';
      const userId = parseInt(idStr);
      const { role, password } = body;
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex === -1) throw new Error('Usuario no encontrado.');
      if (role) users[userIndex].role = role;
      if (password) users[userIndex].passwordHash = password;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return { success: true };
    }
    if (method === 'DELETE') {
      const idStr = path.split('/').pop() || '';
      const userId = parseInt(idStr);
      const user = users.find(u => u.id === userId);
      if (!user) throw new Error('Usuario no encontrado.');
      if (user.username === 'admin') throw new Error('No se puede eliminar al administrador principal.');
      const filtered = users.filter(u => u.id !== userId);
      localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
      return { success: true };
    }
  }

  // ─── TRANSACCIONES DE VENTA ───
  if (path.startsWith('/sales')) {
    // GET /sales (Historial)
    if (method === 'GET') {
      const sales = await db.getAll('sales');
      // Ordenar por fecha descendente
      sales.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
      return { data: sales };
    }

    // POST /sales (Registrar Venta)
    if (method === 'POST') {
      const { items: cartItems, discount, payment_method, payments } = body;
      const totals = { subtotal: 0, tax: 0, discount: discount || 0, total: 0 };
      
      // Single readwrite transaction for stock validation + decrement
      const tx = db.transaction('products', 'readwrite');
      const productsToUpdate: any[] = [];

      for (const item of cartItems) {
        const prod = await tx.store.get(item.product_id);
        if (!prod) throw new Error(`El producto con ID ${item.product_id} no existe.`);
        if ((prod.active === 0) || prod.deleted_at) throw new Error(`El producto "${prod.name}" no está activo.`);
        if (prod.stock < item.quantity) {
          throw new Error(`Stock insuficiente para "${prod.name}". Disponible: ${prod.stock}`);
        }
        totals.subtotal += (Number(prod.price) || 0) * (Number(item.quantity) || 0);
        productsToUpdate.push({
          ...prod,
          stock: Math.max(0, prod.stock - item.quantity)
        });
      }

      // Write stock decrements within same transaction
      for (const p of productsToUpdate) {
        await tx.store.put(p);
      }
      await tx.done;

      // Calcular impuestos
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      const taxRate = parseFloat(settings.tax_rate || '0.16');
      const isTaxIncluded = settings.tax_included === '1';

      if (isTaxIncluded) {
        totals.total = totals.subtotal - totals.discount;
        totals.tax = totals.total - (totals.total / (1 + taxRate));
      } else {
        totals.tax = (totals.subtotal - totals.discount) * taxRate;
        totals.total = totals.subtotal - totals.discount + totals.tax;
      }

      // Round to 2 decimals
      totals.subtotal = Math.round(totals.subtotal * 100) / 100;
      totals.tax = Math.round(totals.tax * 100) / 100;
      totals.total = Math.round(totals.total * 100) / 100;

      // Guardar venta
      const saleId = `ticket-${Date.now()}`;
      const newSale = {
        id: saleId,
        items: await Promise.all(cartItems.map(async (i: any) => {
          const original = await db.get('products', i.product_id);
          return {
            product_id: i.product_id,
            name: original?.name || 'Producto Desconocido',
            price: original?.price || i.unit_price,
            quantity: i.quantity,
          };
        })),
        totals,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
        payment_method,
        payments: payments || [{ method: payment_method, amount: totals.total }],
        created_at: new Date().toISOString()
      };

      await db.put('sales', newSale);

      // Register cash movement atomically with sale
      const session = JSON.parse(localStorage.getItem(CASH_SESSION_KEY) || 'null');
      if (session && session.status === 'open') {
        const cashAmount = newSale.payments
          .filter((p: any) => p.method === 'cash')
          .reduce((acc: number, p: any) => acc + p.amount, 0);

        if (cashAmount > 0) {
          const cashMov = {
            id: `mov-${Date.now()}`,
            type: 'sale',
            reference: `Venta #${saleId}`,
            amount: Math.round(cashAmount * 100) / 100,
            created_at: new Date().toISOString()
          };
          const movements = JSON.parse(localStorage.getItem(CASH_MOVEMENTS_KEY) || '[]');
          movements.push(cashMov);
          localStorage.setItem(CASH_MOVEMENTS_KEY, JSON.stringify(movements));
          try { window.dispatchEvent(new CustomEvent('cash-status')); } catch {}
        }
      }

      return newSale;
    }
  }

  // ─── REPORTES ───
  if (path.startsWith('/reports/top-products')) {
    const products = await db.getAll('products');
    const sales = await db.getAll('sales');
    const productSales: Record<string, { name: string; qty: number; total: number }> = {};
    for (const sale of sales) {
      for (const item of sale.items || []) {
        const key = item.product_id;
        if (!productSales[key]) productSales[key] = { name: item.name, qty: 0, total: 0 };
        productSales[key].qty += item.quantity;
        productSales[key].total += (item.price || 0) * item.quantity;
      }
    }
    const url = new URL(path, 'http://localhost');
    const limit = parseInt(url.searchParams.get('limit') || '5');
    return Object.entries(productSales)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, limit)
      .map(([id, data]) => ({ product_id: id, ...data }));
  }

  if (path.startsWith('/reports/sales')) {
    const sales = await db.getAll('sales');
    const url = new URL(path, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') || '30');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const filtered = sales.filter((s: any) => new Date(s.created_at) >= cutoff);
    const byDate: Record<string, { date: string; count: number; total: number }> = {};
    for (const s of filtered) {
      const d = s.created_at?.slice(0, 10) || 'unknown';
      if (!byDate[d]) byDate[d] = { date: d, count: 0, total: 0 };
      byDate[d].count++;
      byDate[d].total += s.totals?.total || s.total || 0;
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }

  if (path.startsWith('/reports/summary')) {
    const url = new URL(path, 'http://localhost');
    const fromStr = url.searchParams.get('from') || '';
    const toStr = url.searchParams.get('to') || '';
    
    const from = fromStr ? new Date(fromStr).getTime() : 0;
    const to = toStr ? new Date(toStr).getTime() : Infinity;

    const sales = await db.getAll('sales');
    const filtered = sales.filter((s: any) => {
      const date = new Date(s.created_at).getTime();
      return date >= from && date <= to;
    });

    const sum = filtered.reduce((acc: number, s: any) => acc + (s.totals?.total || s.total || 0), 0);
    return {
      total: sum
    };
  }

  // ─── AUDITORÍA ───
  if (path.startsWith('/audits')) {
    if (path.startsWith('/audits/events')) {
      return [
        'sale_create', 'sale_delete', 'user_create', 'user_update', 'user_delete',
        'cash_open', 'cash_close', 'cash_withdraw', 'cash_deposit', 'settings_update',
        'config_import', 'backup_create', 'backup_delete', 'license_activate'
      ];
    }

    if (method === 'GET') {
      const allAudits = await db.getAll('clientAudit');
      // Mapear al formato que espera la vista
      return allAudits.map(a => ({
        id: a.id,
        created_at: new Date(a.createdAt).toISOString(),
        action: a.event,
        entity_type: a.refType || 'system',
        entity_id: a.refId || '0',
        user_id: a.actor || 'admin',
        details: a.metadata || '{}'
      })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }

  // ─── AUTH LOGOUT ───
  if (path.startsWith('/auth/logout')) {
    return { success: true };
  }

  // ─── METRICS ───
  if (path.startsWith('/metrics')) {
    const sales = await db.getAll('sales');
    const products = await db.getAll('products');
    return {
      totalSales: sales.length,
      totalRevenue: sales.reduce((acc: number, s: any) => acc + (s.totals?.total || s.total || 0), 0),
      totalProducts: products.length,
      activeProducts: products.filter((p: any) => p.active !== 0).length,
    };
  }

  throw new Error(`Ruta offline no emulada para ${method} ${path}`);
}
