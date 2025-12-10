import { create } from 'zustand'
export const useCartStore = create((set) => ({
  items: [],
  add: (p, qty=1) => set(state => {
    const q = Math.max(1, parseInt(qty||1))
    const existing = state.items.find(i=> i.product_id===p.id)
    if (existing) return { items: state.items.map(i=> i.product_id===p.id?{...i,quantity:i.quantity+q}:i) }
    return { items: [...state.items, { product_id:p.id, name:p.name, unit_price:p.price, quantity:q }] }
  }),
  inc: (id) => set(state => ({ items: state.items.map(i=> i.product_id===id?{...i,quantity:i.quantity+1}:i) })),
  dec: (id) => set(state => ({ items: state.items.map(i=> i.product_id===id?{...i,quantity:Math.max(1,i.quantity-1)}:i) })),
  remove: (id) => set(state => ({ items: state.items.filter(i=> i.product_id!==id) })),
  clear: () => set({ items: [] })
}))
