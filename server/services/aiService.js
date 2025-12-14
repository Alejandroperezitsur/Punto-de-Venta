const prisma = require('../db');

class AiService {
    /**
     * Predict inventory exhaustion based on average daily sales
     */
    async predictInventory(storeId) {
        const products = await prisma.product.findMany({
            where: { store_id: storeId, active: 1, stock: { gt: 0 } },
            include: {
                sale_items: {
                    where: { sale: { created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } } // Last 30 days
                }
            }
        });

        const predictions = products.map(p => {
            const totalSold = p.sale_items.reduce((sum, item) => sum + item.quantity, 0);
            const dailyAvg = totalSold / 30;

            if (dailyAvg === 0) return null;

            const daysLeft = Math.floor(p.stock / dailyAvg);
            const depletionDate = new Date();
            depletionDate.setDate(depletionDate.getDate() + daysLeft);

            return {
                productId: p.id,
                product: p.name,
                stock: p.stock,
                dailyAvg: dailyAvg.toFixed(2),
                daysLeft,
                depletionDate
            };
        }).filter(p => p !== null && p.daysLeft < 14) // Alert if less than 2 weeks
            .sort((a, b) => a.daysLeft - b.daysLeft);

        return predictions;
    }

    /**
     * Generate simple association rules (Cross-sell)
     */
    async getRecommendations(storeId, productId) {
        // Find sales that contain this product
        const salesWithProduct = await prisma.sale.findMany({
            where: {
                store_id: storeId,
                items: { some: { product_id: parseInt(productId) } }
            },
            include: { items: { include: { product: true } } },
            take: 50,
            orderBy: { created_at: 'desc' }
        });

        const companionCounts = {};

        salesWithProduct.forEach(sale => {
            sale.items.forEach(item => {
                if (item.product_id !== parseInt(productId)) {
                    companionCounts[item.product_id] = companionCounts[item.product_id] || {
                        product: item.product,
                        count: 0
                    };
                    companionCounts[item.product_id].count++;
                }
            });
        });

        const sorted = Object.values(companionCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3) // Top 3
            .map(c => c.product);

        return sorted;
    }

    /**
     * Natural Language Query Mapper (Mock NLP)
     */
    async getAssistantResponse(storeId, query) {
        const q = query.toLowerCase();

        if (q.includes('ventas') && (q.includes('hoy') || q.includes('dia'))) {
            const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
            const sales = await prisma.sale.aggregate({
                where: { store_id: storeId, created_at: { gte: startOfDay } },
                _sum: { total: true },
                _count: { id: true }
            });
            return `Hoy llevas ${sales._count.id} ventas por un total de $${(sales._sum.total || 0).toFixed(2)}.`;
        }

        if (q.includes('inventario') || q.includes('agotad')) {
            const lowStock = await prisma.product.count({
                where: { store_id: storeId, stock: { lte: 5 } }
            });
            return `Tienes ${lowStock} productos con bajo inventario (5 o menos).`;
        }

        if (q.includes('mejor') && q.includes('producto')) {
            // Find top selling product
            // (Simplified for performance, ideally pre-calculated)
            return "Tu mejor producto este mes es 'Coca Cola 600ml'. (Simulado)";
        }

        return "Lo siento, soy una IA en entrenamiento. Prueba preguntar 'ventas de hoy' o 'inventario bajo'.";
    }

    /**
     * Generate automated insights
     */
    async generateDailyInsights(storeId) {
        const predictions = await this.predictInventory(storeId);
        const critical = predictions.filter(p => p.daysLeft <= 3);

        const insights = [];

        if (critical.length > 0) {
            insights.push({
                type: 'warning',
                title: 'Riesgo de Agotamiento',
                description: `${critical.length} productos se agotarán en menos de 3 días.`,
                priority: 'high'
            });
        }

        // Sales Trend
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0, 0, 0, 0);
        const today = new Date(); today.setHours(0, 0, 0, 0);

        const countToday = await prisma.sale.count({ where: { store_id: storeId, created_at: { gte: today } } });
        if (countToday === 0 && new Date().getHours() > 20) {
            insights.push({
                type: 'alert',
                title: 'Sin ventas hoy',
                description: 'No se han registrado ventas hoy. ¿Todo bien en la tienda?',
                priority: 'warning'
            });
        }

        return insights;
    }
}

module.exports = new AiService();
