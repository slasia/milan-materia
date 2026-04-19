import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCart = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const items = get().items;
        const existing = items.find(i => i.productId === product.id);
        const stock = product.stock ?? 9999;

        if (existing) {
          // Don't exceed available stock
          if (existing.quantity >= stock) return;
          set({
            items: items.map(i =>
              i.productId === product.id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          });
        } else {
          if (stock <= 0) return; // double-guard
          set({
            items: [
              ...items,
              {
                productId: product.id,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
                stock,            // ← kept so CartDrawer can enforce the cap
                quantity: 1,
              },
            ],
          });
        }
      },

      removeItem: (productId) =>
        set({ items: get().items.filter(i => i.productId !== productId) }),

      changeQty: (productId, delta) => {
        const items = get()
          .items.map(i => {
            if (i.productId !== productId) return i;
            const newQty = i.quantity + delta;
            // Cap at stock, floor at 0 (filter removes it)
            const capped = Math.min(newQty, i.stock ?? 9999);
            return { ...i, quantity: capped };
          })
          .filter(i => i.quantity > 0);
        set({ items });
      },

      clear: () => set({ items: [] }),

      total: () =>
        get().items.reduce((s, i) => s + i.price * i.quantity, 0),

      count: () =>
        get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: 'mm_cart' },
  ),
);
