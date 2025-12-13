const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');

// Legacy DB
const sqlitePath = path.resolve(__dirname, '../data.db');
const db = new Database(sqlitePath, { verbose: console.log });

async function migrate() {
    console.log('Starting migration from SQLite to Postgres...');

    try {
        // 1. Create Default Store
        const store = await prisma.store.upsert({
            where: { id: 1 },
            update: {},
            create: {
                id: 1,
                name: 'Tienda Principal (Migrada)',
                active: 1
            }
        });
        console.log('Store migrada/verificada.');

        // 2. Users
        const users = db.prepare('SELECT * FROM users').all();
        for (const u of users) {
            await prisma.user.upsert({
                where: { id: u.id },
                update: {},
                create: {
                    id: u.id,
                    username: u.username,
                    password_hash: u.password_hash,
                    active: u.active,
                    created_at: new Date(u.created_at || Date.now()),
                    last_login: u.last_login ? new Date(u.last_login) : null,
                    stores: {
                        create: {
                            store_id: store.id,
                            role: u.role || 'admin' // Default roll
                        }
                    }
                }
            });
            // Ensure UserStore link if user existed (upsert update doesn't do relations easily without nesting)
            // Manual check for link
            const link = await prisma.userStore.findUnique({
                where: { user_id_store_id: { user_id: u.id, store_id: store.id } }
            });
            if (!link) {
                await prisma.userStore.create({
                    data: { user_id: u.id, store_id: store.id, role: u.role || 'admin' }
                });
            }
        }
        console.log(`Usuarios migrados: ${users.length}`);

        // 3. Customers
        const customers = db.prepare('SELECT * FROM customers').all();
        for (const c of customers) {
            await prisma.customer.upsert({
                where: { id: c.id },
                update: {},
                create: {
                    id: c.id,
                    store_id: store.id,
                    name: c.name,
                    phone: c.phone,
                    email: c.email
                }
            });
        }
        console.log(`Clientes migrados: ${customers.length}`);

        // 4. Products
        const products = db.prepare('SELECT * FROM products').all();
        for (const p of products) {
            await prisma.product.upsert({
                where: { id: p.id },
                update: {},
                create: {
                    id: p.id,
                    store_id: store.id,
                    name: p.name,
                    price: p.price,
                    cost: p.cost,
                    stock: p.stock,
                    image_url: p.image_url,
                    active: 1
                }
            });
        }
        console.log(`Productos migrados: ${products.length}`);

        // 5. Sales & Items
        const sales = db.prepare('SELECT * FROM sales').all();
        for (const s of sales) {
            await prisma.sale.upsert({
                where: { id: s.id },
                update: {},
                create: {
                    id: s.id,
                    store_id: store.id,
                    customer_id: s.customer_id,
                    subtotal: s.subtotal || 0,
                    tax: 0, // Legacy didn't have explicit tax col maybe?
                    discount: s.discount || 0,
                    total: s.total,
                    payment_method: s.payment_method || 'cash',
                    created_at: new Date(s.created_at)
                }
            });
        }

        // Sale Items
        const saleItems = db.prepare('SELECT * FROM sale_items').all();
        for (const si of saleItems) {
            await prisma.saleItem.upsert({
                where: { id: si.id },
                update: {},
                create: {
                    id: si.id,
                    sale_id: si.sale_id,
                    product_id: si.product_id,
                    quantity: si.quantity,
                    unit_price: si.unit_price,
                    line_total: si.line_total
                }
            });
        }
        console.log(`Ventas y detalles migrados.`);

        console.log('Migración completada con éxito.');
    } catch (e) {
        console.error('Error en migración:', e);
    } finally {
        await prisma.$disconnect();
        db.close();
    }
}

migrate();
