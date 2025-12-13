const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const username = 'admin'; // Or pass as arg
    try {
        const user = await prisma.user.update({
            where: { username },
            data: { is_super_admin: true }
        });
        console.log(`User ${user.username} is now Super Admin.`);
    } catch (e) {
        console.error('Error upgrading user:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
