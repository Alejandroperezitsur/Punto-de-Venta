import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
    items: [],
    customer: null,
    discount: 0,

    addItem: (product) => set((state) => {
        const existing = state.items.find((i) => i.id === product.id);
        if (existing) {
            return {
                items: state.items.map((i) =>
                    i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
                ),
            };
        }
        return { items: [...state.items, { ...product, quantity: 1, discount: 0 }] };
    }),

    removeItem: (productId) => set((state) => ({
        items: state.items.filter((i) => i.id !== productId),
    })),

    updateQuantity: (productId, quantity) => set((state) => ({
        items: state.items.map((i) =>
            i.id === productId ? { ...i, quantity: Math.max(0, quantity) } : i
        ),
    })),

    setCustomer: (customer) => set({ customer }),

    clearCart: () => set({ items: [], customer: null, discount: 0 }),

    getTotals: () => {
        const { items, discount } = get();
        const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const tax = subtotal * 0.16; // Assuming 16% tax, can be parameterized later
        const total = subtotal + tax - discount;
        return { subtotal, tax, discount, total };
    }
}));
