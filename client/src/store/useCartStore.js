import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
    items: [],
    customer: null,
    discount: 0,
    checkoutId: null,

    addItem: (product, quantity = 1) => set((state) => {
        const qty = Math.max(1, Math.floor(Number(quantity) || 1));
        const existing = state.items.find((i) => i.id === product.id);
        const maxStock = product.stock !== undefined ? Number(product.stock) : Infinity;

        if (existing) {
            const newQty = existing.quantity + qty;
            if (newQty > maxStock) return state;
            return {
                items: state.items.map((i) =>
                    i.id === product.id ? { ...i, quantity: newQty } : i
                ),
            };
        }

        if (qty > maxStock) return state;
        const safePrice = Number(product.price) || 0;
        return {
            items: [...state.items, {
                ...product,
                price: safePrice,
                quantity: qty,
                discount: 0
            }]
        };
    }),

    removeItem: (productId) => set((state) => ({
        items: state.items.filter((i) => i.id !== productId),
    })),

    updateQuantity: (productId, quantity) => set((state) => {
        const qty = Math.max(0, Math.floor(Number(quantity) || 0));
        if (qty === 0) {
            return { items: state.items.filter((i) => i.id !== productId) };
        }
        return {
            items: state.items.map((i) => {
                if (i.id !== productId) return i;
                const maxStock = i.stock !== undefined ? Number(i.stock) : Infinity;
                return { ...i, quantity: Math.min(qty, maxStock) };
            })
        };
    }),

    setCustomer: (customer) => set({ customer }),

    setDiscount: (discount) => set({
        discount: Math.max(0, Number(discount) || 0)
    }),

    clearCart: () => set({
        items: [],
        customer: null,
        discount: 0,
        checkoutId: null
    }),

    generateCheckoutId: () => {
        const id = crypto.randomUUID ? crypto.randomUUID() :
            'sale-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        set({ checkoutId: id });
        return id;
    },

    getTotals: () => {
        const { items, discount } = get();
        const subtotal = items.reduce((acc, item) => {
            const price = Number(item.price) || 0;
            const qty = Number(item.quantity) || 0;
            return acc + (price * qty);
        }, 0);
        const tax = subtotal * 0.16;
        const safeDiscount = Math.max(0, Number(discount) || 0);
        const total = Math.max(0, subtotal + tax - safeDiscount);
        return {
            subtotal: Math.round(subtotal * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            discount: safeDiscount,
            total: Math.round(total * 100) / 100
        };
    },

    validateStock: () => {
        const { items } = get();
        for (const item of items) {
            if (item.stock !== undefined && item.quantity > Number(item.stock)) {
                return {
                    valid: false,
                    message: `Stock insuficiente para ${item.name}: disponible ${Number(item.stock)}, solicitado ${item.quantity}`
                };
            }
        }
        return { valid: true };
    }
}));
