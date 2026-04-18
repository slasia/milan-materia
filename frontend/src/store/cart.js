import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCart = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const items = get().items;
        const existing = items.find(i => i.productId === product.id);
        if (existing) {
          set({
            items: items.map(i =>
              i.productId === product.id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            )
          });
        } else {
          set({
            items: [
              ...items,
              {
                productId: product.id,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
                quantity: 1
              }
            ]
          });
        }
      },

      removeItem: (productId) =>
        set({ items: get().items.filter(i => i.productId !== productId) }),

      changeQty: (productId, delta) => {
        const items = get()
          .items.map(i =>
            i.productId === productId
              ? { ...i, quantity: i.quantity + delta }
              : i
          )
          .filter(i => i.quantity > 0);
        set({ items });
      },

      clear: () => set({ items: [] }),

      total: () =>
        get().items.reduce((s, i) => s + i.price * i.quantity, 0),

      count: () =>
        get().items.reduce((s, i) => s + i.quantity, 0)
    }),
    { name: 'mm_cart' }
  )
);
