const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || "file:./data.db"
        }
    }
});

async function main() {
    const defaultStore = await prisma.store.upsert({
        where: { id: 1 },
        update: {},
        create: {
            name: 'Mi Tienda Principal',
            active: 1
        },
    });

    const hashed = await bcrypt.hash('123', 10);
    const adminConfig = {
        username: 'admin',
        password_hash: hashed,
        active: 1,
    };

    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: adminConfig,
    });

    // Link admin to store
    await prisma.userStore.upsert({
        where: {
            user_id_store_id: {
                user_id: admin.id,
                store_id: defaultStore.id
            }
        },
        update: {},
        create: {
            user_id: admin.id,
            store_id: defaultStore.id,
            role: 'admin'
        }
    });

    // Create default license (TRIAL)
    // machine_id is usually set by client, but we set a default here or leave null
    await prisma.license.upsert({
        where: { license_key: 'TRIAL-DEFAULT' },
        update: {},
        create: {
            store_id: defaultStore.id,
            license_key: 'TRIAL-DEFAULT',
            license_type: 'trial',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            features: JSON.stringify({ maxProducts: 1000 })
        }
    });

    console.log({ defaultStore, admin });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
