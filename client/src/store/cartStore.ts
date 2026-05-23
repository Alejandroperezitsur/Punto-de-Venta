import { create } from 'zustand';
import { persistCart, getPersistedCart, removePersistedCart } from '../lib/db';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock?: number;
  discount?: number;
  isManual?: boolean;
}

export interface CartTotals {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export interface CartCustomer {
  id: string;
  name: string;
}

interface CartStoreState {
  items: CartItem[];
  customer: CartCustomer | null;
  discount: number;
  checkoutId: string | null;
  hydrated: boolean;
}

interface CartStoreActions {
  addItem: (product: CartItem, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setCustomer: (customer: CartCustomer | null) => void;
  setDiscount: (discount: number) => void;
  clearCart: () => void;
  generateCheckoutId: () => string;
  getTotals: () => CartTotals;
  validateStock: () => { valid: boolean; message?: string };
  hydrate: () => Promise<void>;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedPersist(state: CartStoreState) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistCart({
      id: 'current',
      items: state.items,
      customer: state.customer,
      discount: state.discount,
      checkoutId: state.checkoutId,
      updated_at: Date.now(),
    });
  }, 300);
}

export const useCartStore = create<CartStoreState & CartStoreActions>((set, get) => ({
  items: [],
  customer: null,
  discount: 0,
  checkoutId: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const saved = await getPersistedCart();
      if (saved) {
        const age = Date.now() - saved.updated_at;
        if (age < 24 * 60 * 60 * 1000) {
          set({
            items: saved.items,
            customer: saved.customer,
            discount: saved.discount,
            checkoutId: saved.checkoutId,
            hydrated: true,
          });
          return;
        }
        await removePersistedCart();
      }
    } catch {
      // ignore hydrate errors
    }
    set({ hydrated: true });
  },

  addItem: (product, quantity = 1) =>
    set((state) => {
      const qty = Math.max(1, Math.floor(Number(quantity) || 1));
      const existing = state.items.find((i) => i.id === product.id);
      const maxStock = product.stock !== undefined ? Number(product.stock) : Infinity;

      let newItems: CartItem[];
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > maxStock) return state;
        newItems = state.items.map((i) =>
          i.id === product.id ? { ...i, quantity: newQty } : i
        );
      } else {
        if (qty > maxStock) return state;
        const safePrice = Number(product.price) || 0;
        newItems = [
          ...state.items,
          { ...product, price: safePrice, quantity: qty, discount: 0 },
        ];
      }
      const nextState = { ...state, items: newItems };
      debouncedPersist(nextState);
      return { items: newItems };
    }),

  removeItem: (productId) =>
    set((state) => {
      const newItems = state.items.filter((i) => i.id !== productId);
      const nextState = { ...state, items: newItems };
      debouncedPersist(nextState);
      return { items: newItems };
    }),

  updateQuantity: (productId, quantity) =>
    set((state) => {
      const qty = Math.max(0, Math.floor(Number(quantity) || 0));
      let newItems: CartItem[];
      if (qty === 0) {
        newItems = state.items.filter((i) => i.id !== productId);
      } else {
        newItems = state.items.map((i) => {
          if (i.id !== productId) return i;
          const maxStock = i.stock !== undefined ? Number(i.stock) : Infinity;
          return { ...i, quantity: Math.min(qty, maxStock) };
        });
      }
      const nextState = { ...state, items: newItems };
      debouncedPersist(nextState);
      return { items: newItems };
    }),

  setCustomer: (customer) =>
    set((state) => {
      const nextState = { ...state, customer };
      debouncedPersist(nextState);
      return { customer };
    }),

  setDiscount: (discount) =>
    set((state) => {
      const safeDiscount = Math.max(0, Number(discount) || 0);
      const nextState = { ...state, discount: safeDiscount };
      debouncedPersist(nextState);
      return { discount: safeDiscount };
    }),

  clearCart: () => {
    if (persistTimer) clearTimeout(persistTimer);
    removePersistedCart();
    set({ items: [], customer: null, discount: 0, checkoutId: null });
  },

  generateCheckoutId: () => {
    const id = crypto.randomUUID
      ? crypto.randomUUID()
      : 'sale-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    set({ checkoutId: id });
    return id;
  },

  getTotals: () => {
    const { items, discount } = get();
    const subtotal = items.reduce((acc, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      return acc + price * qty;
    }, 0);
    const tax = subtotal * 0.16;
    const safeDiscount = Math.max(0, Number(discount) || 0);
    const total = Math.max(0, subtotal + tax - safeDiscount);
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      discount: safeDiscount,
      total: Math.round(total * 100) / 100,
    };
  },

  validateStock: () => {
    const { items } = get();
    for (const item of items) {
      if (item.stock !== undefined && item.quantity > Number(item.stock)) {
        return {
          valid: false,
          message: `Stock insuficiente para ${item.name}: disponible ${Number(item.stock)}, solicitado ${item.quantity}`,
        };
      }
    }
    return { valid: true };
  },
}));
